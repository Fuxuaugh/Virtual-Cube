/**
 * Skrip konversi data PLL: `data_source/pll.csv` → `src/data/pll.json`.
 *
 * Jalankan dengan `npm run build:data`. Skrip idempotent: input yang sama selalu
 * menghasilkan file yang sama, tanpa efek samping lain.
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
 * Catatan: `loadCases('PLL')` memakai `import.meta.glob` (khusus Vite) sehingga
 * tidak bisa dipanggil dari skrip Node ini; pemuatan lewat loader diuji di
 * `src/data/pll-data.test.ts` yang berjalan di Vitest.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'

import { isEmptyCsvRow, parseCsv } from '../src/data-build/csv.js'
import { normalizeAlgorithm } from '../src/data-build/normalize-algorithm.js'
import type { TrainingCase } from '../src/domain/training-case.js'
import { validateCaseData } from '../src/domain/validate-case-data.js'
import { invertAlg } from '../src/engine/index.js'

const CSV_PATH = fileURLToPath(
  new URL('../data_source/pll.csv', import.meta.url)
)
const OUTPUT_PATH = fileURLToPath(
  new URL('../src/data/pll.json', import.meta.url)
)

const REQUIRED_COLUMNS = ['id', 'name', 'algorithm', 'source_url'] as const

interface BuildFailure {
  id: string
  detail: string
  rawAlgorithm: string
}

async function main(): Promise<void> {
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8')).filter(
    (row) => !isEmptyCsvRow(row)
  )

  const [header, ...dataRows] = rows
  if (!header) {
    throw new Error(`CSV kosong: ${CSV_PATH}`)
  }

  const columnIndex = new Map<string, number>()
  for (const name of REQUIRED_COLUMNS) {
    const index = header.indexOf(name)
    if (index < 0) {
      throw new Error(
        `Kolom "${name}" tidak ada di ${CSV_PATH} (header: ${header.join(', ')})`
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
    const rawAlgorithm = field('algorithm')

    try {
      const { algorithm, auf } = normalizeAlgorithm(rawAlgorithm, id)
      const trainingCase: TrainingCase = {
        id,
        category: 'PLL',
        name: field('name'),
        algorithm,
        inverseAlgorithm: invertAlg(algorithm),
        alternatives: [],
        source: field('source_url'),
        tags: [],
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
      `GAGAL: ${failures.length} dari ${dataRows.length} baris tidak bisa dikonversi. File tidak ditulis.`
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
      `GAGAL: validateCaseData menolak ${validation.errors.length} masalah. File tidak ditulis.`
    )
    for (const error of validation.errors) {
      console.error(`- ${error}`)
    }
    process.exitCode = 1
    return
  }

  const json = `${JSON.stringify(cases, null, 2)}\n`
  writeFileSync(
    OUTPUT_PATH,
    await prettier.format(json, { filepath: OUTPUT_PATH })
  )

  const withAuf = cases.filter((item) => item.metadata?.['auf'] !== undefined)
  console.log(`Sumber    : ${CSV_PATH}`)
  console.log(`Output    : ${OUTPUT_PATH}`)
  console.log(`Baris CSV : ${dataRows.length}`)
  console.log(`Case PLL  : ${cases.length}`)
  console.log('validateCaseData: valid')
  console.log(
    `metadata.auf: ${withAuf.length} case (${
      withAuf
        .map((item) => `${item.id}=${String(item.metadata?.['auf'])}`)
        .join(', ') || '-'
    })`
  )
}

await main()
