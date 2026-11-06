/**
 * Skrip konversi data case: `data_source/<kategori>.csv` → `src/data/<kategori>.json`.
 *
 * Jalankan dengan kategori sebagai argumen:
 * - `npm run build:data`      → PLL lalu OLL
 * - `npm run build:data:pll`  → `data_source/pll.csv` → `src/data/pll.json`
 * - `npm run build:data:oll`  → `data_source/oll.csv` → `src/data/oll.json`
 *
 * Skrip idempotent: input yang sama selalu menghasilkan file yang sama, tanpa
 * efek samping lain (PLL yang sudah ada tetap byte-identik).
 *
 * File ini sengaja berada di `scripts/` (di luar `include` tsconfig.app.json)
 * karena memakai API Node (`node:fs`) yang tipenya tidak dimuat di project app;
 * logika murni yang perlu type-check dan test ada di `src/data-build/`.
 *
 * Aturan yang dipegang skrip ini:
 * - Algoritma TIDAK pernah diketik ulang, dikoreksi, atau diganti. Skrip hanya
 *   menormalkan penulisan (lihat `src/data-build/normalize-algorithm.ts`) dan
 *   mengambil `inverseAlgorithm` dari `invertAlg()` milik `src/engine/`.
 * - Bila ada baris yang gagal dinormalisasi, gagal `parseAlg`, atau gagal
 *   `validateCaseData`, skrip melaporkan id + algoritma aslinya dan TIDAK
 *   menulis file (supaya JSON tidak pernah berisi data setengah jadi).
 *
 * Catatan: `loadCases()` memakai `import.meta.glob` (khusus Vite) sehingga tidak
 * bisa dipanggil dari skrip Node ini; pemuatan lewat loader diuji di
 * `src/data/pll-data.test.ts` dan `src/data/oll-data.test.ts` (Vitest).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'

import { isEmptyCsvRow, parseCsv } from '../src/data-build/csv.js'
import { normalizeAlgorithm } from '../src/data-build/normalize-algorithm.js'
import { f2lGroupFromName } from '../src/data-build/f2l-group.js'
import type { CaseCategory, TrainingCase } from '../src/domain/training-case.js'
import { validateCaseData } from '../src/domain/validate-case-data.js'
import { invertAlg } from '../src/engine/index.js'

interface CategoryConfig {
  csvFile: string
  outputFile: string
  /** Tag tambahan per baris (mis. nama grup F2L). */
  tags?: (fields: { id: string; name: string }) => string[]
}

/** Kategori yang didukung skrip ini (satu CSV per kategori). */
const CATEGORY_CONFIG: Readonly<Record<string, CategoryConfig>> = {
  PLL: { csvFile: 'pll.csv', outputFile: 'pll.json' },
  OLL: { csvFile: 'oll.csv', outputFile: 'oll.json' },
  F2L: {
    csvFile: 'f2l.csv',
    outputFile: 'f2l.json',
    tags: (fields) => [f2lGroupFromName(fields.name)],
  },
}

const REQUIRED_COLUMNS = ['id', 'name', 'algorithm', 'source_url'] as const

interface BuildFailure {
  id: string
  detail: string
  rawAlgorithm: string
}

async function buildCategory(category: CaseCategory): Promise<void> {
  const config = CATEGORY_CONFIG[category]
  const csvPath = fileURLToPath(
    new URL(`../data_source/${config.csvFile}`, import.meta.url)
  )
  const outputPath = fileURLToPath(
    new URL(`../src/data/${config.outputFile}`, import.meta.url)
  )

  const rows = parseCsv(readFileSync(csvPath, 'utf8')).filter(
    (row) => !isEmptyCsvRow(row)
  )

  const [header, ...dataRows] = rows
  if (!header) {
    throw new Error(`CSV kosong: ${csvPath}`)
  }

  const columnIndex = new Map<string, number>()
  for (const name of REQUIRED_COLUMNS) {
    const index = header.indexOf(name)
    if (index < 0) {
      throw new Error(
        `Kolom "${name}" tidak ada di ${csvPath} (header: ${header.join(', ')})`
      )
    }
    columnIndex.set(name, index)
  }

  const cases: TrainingCase[] = []
  const failures: BuildFailure[] = []

  for (const row of dataRows) {
    const field = (name: (typeof REQUIRED_COLUMNS)[number]): string =>
      row[columnIndex.get(name) ?? -1] ?? ''

    const id = field('id')
    const name = field('name')
    const rawAlgorithm = field('algorithm')

    try {
      const { algorithm, auf } = normalizeAlgorithm(rawAlgorithm, id)
      const trainingCase: TrainingCase = {
        id,
        category,
        name,
        algorithm,
        inverseAlgorithm: invertAlg(algorithm),
        alternatives: [],
        source: field('source_url'),
        tags: config.tags?.({ id, name }) ?? [],
        ...(auf === null ? {} : { metadata: { auf } }),
      }
      cases.push(trainingCase)
    } catch (error) {
      failures.push({
        id,
        detail: error instanceof Error ? error.message : String(error),
        rawAlgorithm,
      })
    }
  }

  if (failures.length > 0) {
    console.error(
      `GAGAL (${category}): ${failures.length} dari ${dataRows.length} baris tidak bisa dikonversi. File tidak ditulis.`
    )
    for (const failure of failures) {
      console.error(`- ${failure.id}: ${failure.detail}`)
      console.error(`  algoritma asli: ${JSON.stringify(failure.rawAlgorithm)}`)
    }
    process.exitCode = 1
    return
  }

  const validation = validateCaseData(cases)
  if (!validation.valid) {
    console.error(
      `GAGAL (${category}): validateCaseData menolak ${validation.errors.length} masalah. File tidak ditulis.`
    )
    for (const error of validation.errors) {
      console.error(`- ${error}`)
    }
    process.exitCode = 1
    return
  }

  const json = `${JSON.stringify(cases, null, 2)}\n`
  writeFileSync(
    outputPath,
    await prettier.format(json, { filepath: outputPath })
  )

  const withAuf = cases.filter((item) => item.metadata?.['auf'] !== undefined)
  console.log(`Kategori  : ${category}`)
  console.log(`Sumber    : ${csvPath}`)
  console.log(`Output    : ${outputPath}`)
  console.log(`Baris CSV : ${dataRows.length}`)
  console.log(`Case      : ${cases.length}`)
  console.log('validateCaseData: valid')
  console.log(
    `metadata.auf: ${withAuf.length} case (${
      withAuf
        .map((item) => `${item.id}=${String(item.metadata?.['auf'])}`)
        .join(', ') || '-'
    })`
  )
}

async function main(): Promise<void> {
  const requested = process.argv[2]
  if (requested === undefined) {
    throw new Error(
      `Kategori tidak diberikan. Pakai: tsx scripts/build-case-data.ts <${Object.keys(CATEGORY_CONFIG).join('|')}>`
    )
  }

  const config = CATEGORY_CONFIG[requested]
  if (!config) {
    throw new Error(
      `Kategori "${requested}" tidak dikenal. Pilihan: ${Object.keys(CATEGORY_CONFIG).join(', ')}`
    )
  }

  await buildCategory(requested as CaseCategory)
}

await main()
