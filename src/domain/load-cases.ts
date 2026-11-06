/**
 * Loader data case (MILESTONES M3.4).
 *
 * Membaca `src/data/{f2l,oll,pll}.json`, memvalidasinya, lalu mengembalikan
 * `TrainingCase[]`. Sumber data bisa diganti lewat parameter `source` supaya
 * bisa dites tanpa file JSON asli.
 *
 * Modul ini murni: tanpa React dan tanpa API browser (tanpa `fetch`/DOM).
 * Pembacaan file memakai `import.meta.glob` dari Vite sehingga data ikut
 * ter-bundle, tapi hanya dimuat saat dipanggil (lazy).
 */

import {
  type CaseCategory,
  type TrainingCase,
  isCaseCategory,
} from './training-case.js'
import { validateCaseData } from './validate-case-data.js'

/** Lokasi file JSON tiap kategori, relatif terhadap root proyek (PRD §12). */
export const CASE_FILE_BY_CATEGORY: Readonly<Record<CaseCategory, string>> = {
  F2L: 'src/data/f2l.json',
  OLL: 'src/data/oll.json',
  PLL: 'src/data/pll.json',
}

/** Fungsi yang mengembalikan data case mentah (mis. pembaca file JSON). */
export type CaseDataProvider = () => unknown | Promise<unknown>

/**
 * Sumber data untuk `loadCases`:
 * - data yang sudah di-parse (array), atau
 * - fungsi yang mengembalikan data tersebut (boleh async).
 */
export type CaseDataSource = CaseDataProvider | readonly unknown[]

/** Semua file JSON di `src/data/`, dimuat lazy oleh Vite. */
const CASE_DATA_MODULES = import.meta.glob('../data/*.json')

/**
 * Memuat dan memvalidasi case untuk satu kategori.
 *
 * @param category Kategori yang dimuat ("F2L" | "OLL" | "PLL").
 * @param source Sumber data pengganti (untuk test atau import manual). Bila
 *   tidak diberikan, file JSON bawaan `src/data/{f2l,oll,pll}.json` dipakai.
 * @throws Error bila kategori tidak dikenal, file belum ada, atau data tidak valid.
 */
export async function loadCases(
  category: CaseCategory,
  source?: CaseDataSource
): Promise<TrainingCase[]> {
  if (!isCaseCategory(category)) {
    throw new Error(
      `Unknown case category ${JSON.stringify(category)}. Expected one of "F2L", "OLL", "PLL".`
    )
  }

  const dataFile = CASE_FILE_BY_CATEGORY[category]
  const raw =
    source === undefined
      ? await readBundledCaseData(category)
      : await readProvidedCaseData(source, category)

  const result = validateCaseData(raw)
  if (!result.valid) {
    throw new Error(
      `Invalid case data in ${dataFile}: ${result.errors.length} validation error(s):\n- ${result.errors.join('\n- ')}`
    )
  }

  const cases = raw as TrainingCase[]
  assertCategoryMatches(cases, category, dataFile)

  return cases
}

/**
 * Memuat file JSON bawaan untuk kategori tertentu.
 * Melempar error jelas bila file belum ada di `src/data/`.
 */
async function readBundledCaseData(category: CaseCategory): Promise<unknown> {
  const dataFile = CASE_FILE_BY_CATEGORY[category]
  const moduleKey = `../${dataFile.replace(/^src\//, '')}`
  const load = CASE_DATA_MODULES[moduleKey]

  if (!load) {
    throw new Error(
      `Case data file not found: ${dataFile} (category "${category}"). ` +
        `Add that JSON file or pass an explicit data source to loadCases().`
    )
  }

  try {
    const module = await load()
    const parsed = (module as { default?: unknown }).default
    return parsed === undefined ? module : parsed
  } catch (err) {
    throw new Error(
      `Failed to read case data file ${dataFile}: ${errorMessage(err)}`,
      { cause: err }
    )
  }
}

/** Memakai sumber data pengganti (array data atau provider). */
async function readProvidedCaseData(
  source: CaseDataSource,
  category: CaseCategory
): Promise<unknown> {
  if (typeof source !== 'function') {
    return source
  }

  try {
    return await source()
  } catch (err) {
    throw new Error(
      `Failed to read case data for category "${category}": ${errorMessage(err)}`,
      { cause: err }
    )
  }
}

/** Memastikan isi file memang case untuk kategori yang diminta. */
function assertCategoryMatches(
  cases: TrainingCase[],
  category: CaseCategory,
  dataFile: string
): void {
  const mismatched = cases.find((item) => item.category !== category)
  if (mismatched) {
    throw new Error(
      `Invalid case data in ${dataFile}: expected only "${category}" cases, ` +
        `but case "${mismatched.id}" has category ${JSON.stringify(mismatched.category)}`
    )
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
