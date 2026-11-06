/**
 * Model data TrainingCase (PRD §13, MILESTONES M3.1).
 *
 * Modul ini murni: hanya berisi tipe dan konstanta, tanpa React maupun API browser.
 * Data algoritma TIDAK ditulis di sini — data hidup di `src/data/*.json` dan
 * divalidasi oleh `validate-case-data.ts` / `load-cases.ts`.
 */

/** Kategori case CFOP yang didukung. */
export const CASE_CATEGORIES = ['F2L', 'OLL', 'PLL'] as const

export type CaseCategory = (typeof CASE_CATEGORIES)[number]

/**
 * Tingkat kesulitan case (opsional, MILESTONES 3.5).
 * Belum ada keputusan final soal skala, jadi dipakai tiga tingkat.
 */
export const CASE_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export type CaseDifficulty = (typeof CASE_DIFFICULTIES)[number]

/** Metadata bebas per case (misalnya pengelompokan F2L). */
export type CaseMetadata = Record<string, unknown>

/**
 * Satu case latihan.
 *
 * Field `source` WAJIB dan tidak boleh kosong: setiap algoritma harus punya
 * sumber yang dicatat (AGENTS.md aturan 4). `inverseAlgorithm` harus sama
 * dengan `invertAlg(algorithm)` dari engine.
 */
export interface TrainingCase {
  id: string
  category: CaseCategory
  name: string
  algorithm: string
  inverseAlgorithm: string
  alternatives: string[]
  source: string
  difficulty?: CaseDifficulty
  tags: string[]
  metadata?: CaseMetadata
}

/** Type guard kategori case yang sah. */
export function isCaseCategory(value: unknown): value is CaseCategory {
  return (
    typeof value === 'string' &&
    (CASE_CATEGORIES as readonly string[]).includes(value)
  )
}

/** Type guard tingkat kesulitan yang sah. */
export function isCaseDifficulty(value: unknown): value is CaseDifficulty {
  return (
    typeof value === 'string' &&
    (CASE_DIFFICULTIES as readonly string[]).includes(value)
  )
}
