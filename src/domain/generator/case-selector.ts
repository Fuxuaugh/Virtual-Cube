/**
 * Selection & Filter case (MILESTONES M4.2/M4.5).
 *
 * Pool case datang dari luar (biasanya `loadCases()`), sehingga modul ini tetap
 * murni dan mudah dites. Semua fungsi menerima `random` opsional supaya
 * pemilihan bisa deterministik di test.
 */

import type {
  CaseCategory,
  CaseDifficulty,
  TrainingCase,
} from '../training-case.js'

export interface CaseFilter {
  /** Satu kategori atau daftar kategori yang diterima. */
  category?: CaseCategory | readonly CaseCategory[]
  /** Tag/grup (mis. "Basic Inserts", "Corner in Place"); cocok bila salah satu ada. */
  tags?: readonly string[]
  /** Tingkat kesulitan; case tanpa difficulty tidak lolos filter ini. */
  difficulty?: CaseDifficulty | readonly CaseDifficulty[]
}

export interface SelectionOptions {
  /** Sumber angka acak; default `Math.random`. */
  random?: () => number
  /** Filter yang diterapkan ke pool sebelum memilih. */
  filter?: CaseFilter
}

/** Menyaring case berdasarkan kategori, tag/grup, dan/atau difficulty. */
export function filterCases(
  pool: readonly TrainingCase[],
  filter?: CaseFilter
): TrainingCase[] {
  if (!filter) {
    return [...pool]
  }

  return pool.filter((item) => {
    if (filter.category !== undefined) {
      const categories = Array.isArray(filter.category)
        ? filter.category
        : [filter.category]
      if (!categories.includes(item.category)) {
        return false
      }
    }

    if (filter.tags !== undefined && filter.tags.length > 0) {
      if (!filter.tags.some((tag) => item.tags.includes(tag))) {
        return false
      }
    }

    if (filter.difficulty !== undefined) {
      const levels = Array.isArray(filter.difficulty)
        ? filter.difficulty
        : [filter.difficulty]
      if (item.difficulty === undefined || !levels.includes(item.difficulty)) {
        return false
      }
    }

    return true
  })
}

/**
 * Memilih case berdasarkan id (satu atau beberapa). Urutan mengikuti `ids`.
 * Melempar error bila ada id yang tidak ada di pool.
 */
export function selectCasesById(
  pool: readonly TrainingCase[],
  ids: string | readonly string[]
): TrainingCase[] {
  const wanted = typeof ids === 'string' ? [ids] : [...ids]
  const byId = new Map(pool.map((item) => [item.id, item]))

  return wanted.map((id) => {
    const found = byId.get(id)
    if (!found) {
      throw new Error(`selectCasesById: case "${id}" tidak ada di pool`)
    }
    return found
  })
}

/** Memilih satu case acak dari pool (setelah filter). Melempar error bila kosong. */
export function selectRandomCase(
  pool: readonly TrainingCase[],
  options?: SelectionOptions
): TrainingCase {
  const candidates = filterCases(pool, options?.filter)
  if (candidates.length === 0) {
    throw new Error('selectRandomCase: tidak ada case yang cocok dengan filter')
  }

  return candidates[randomIndex(candidates.length, options)]
}

/**
 * Memilih `count` case acak TANPA pengulangan dari pool (setelah filter).
 * Melempar error bila `count` melebihi jumlah kandidat.
 */
export function selectRandomCases(
  pool: readonly TrainingCase[],
  count: number,
  options?: SelectionOptions
): TrainingCase[] {
  const candidates = filterCases(pool, options?.filter)
  if (count < 0) {
    throw new Error(`selectRandomCases: count tidak boleh negatif (${count})`)
  }
  if (count > candidates.length) {
    throw new Error(
      `selectRandomCases: diminta ${count} case, hanya ada ${candidates.length} kandidat`
    )
  }

  const remaining = [...candidates]
  const picked: TrainingCase[] = []
  for (let i = 0; i < count; i++) {
    const index = randomIndex(remaining.length, options)
    picked.push(remaining[index])
    remaining.splice(index, 1)
  }
  return picked
}

function randomIndex(length: number, options?: SelectionOptions): number {
  const random = options?.random ?? Math.random
  const index = Math.min(length - 1, Math.floor(random() * length))
  return Math.max(0, index)
}
