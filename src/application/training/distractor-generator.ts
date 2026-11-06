/**
 * Generator opsi & distraktor untuk Recognition Practice (MILESTONES 7C, PRD §4).
 *
 * Aturan:
 * - selalu `optionCount` opsi (default 4): 1 jawaban benar dari case aktif + sisanya
 *   distraktor dari kelompok sekelompok/sejenis;
 * - tidak boleh ada nama atau id case yang duplikat di antara opsi;
 * - urutan opsi diacak supaya jawaban benar tidak selalu di posisi yang sama.
 *
 * "Kelompok mirip" memakai data yang ada: `tags` (grup F2L dari CSV, mis.
 * "Corner in Place") bila anggotanya cukup; kalau tidak ada tag (OLL/PLL),
 * dipakai seluruh kategori yang sama. Tidak ada pengelompokan yang dikarang.
 */

import type { TrainingCase } from '../../domain/training-case.js'

/** Jumlah opsi default. */
export const DEFAULT_OPTION_COUNT = 4

export interface RecognitionOption {
  /** id case. */
  readonly id: string
  /** Nama case yang ditampilkan pada tombol. */
  readonly label: string
  readonly isCorrect: boolean
}

export interface GenerateRecognitionOptionsInput {
  /** Case yang harus dikenali (jawaban benar). */
  correct: TrainingCase
  /** Kandidat distraktor, biasanya pool kategori aktif. */
  pool: readonly TrainingCase[]
  optionCount?: number
  /** Sumber angka acak (test deterministik). */
  random?: () => number
}

/**
 * Kandidat distraktor "sejenis" untuk sebuah case:
 * grup tag yang sama bila anggotanya cukup, kalau tidak seluruh kategori.
 */
export function similarCasePool(
  correct: TrainingCase,
  pool: readonly TrainingCase[],
  optionCount = DEFAULT_OPTION_COUNT
): TrainingCase[] {
  const inCategory = pool.filter(
    (item) => item.category === correct.category && item.id !== correct.id
  )

  const group = correct.tags[0]
  if (group !== undefined) {
    const sameGroup = inCategory.filter((item) => item.tags.includes(group))
    if (sameGroup.length >= optionCount - 1) {
      return sameGroup
    }
  }

  return inCategory
}

/**
 * Membuat daftar opsi jawaban (1 benar + distraktor) yang unik.
 * Melempar error bila kandidat distraktor tidak cukup.
 */
export function generateRecognitionOptions(
  input: GenerateRecognitionOptionsInput
): RecognitionOption[] {
  const optionCount = input.optionCount ?? DEFAULT_OPTION_COUNT
  const random = input.random ?? Math.random
  const correct = input.correct

  const usedNames = new Set<string>([correct.name])
  const usedIds = new Set<string>([correct.id])
  const candidates: TrainingCase[] = []

  for (const item of similarCasePool(correct, input.pool, optionCount)) {
    if (usedNames.has(item.name) || usedIds.has(item.id)) {
      continue
    }
    usedNames.add(item.name)
    usedIds.add(item.id)
    candidates.push(item)
  }

  if (candidates.length < optionCount - 1) {
    throw new Error(
      `generateRecognitionOptions: kandidat distraktor kurang untuk "${correct.id}" (${candidates.length} < ${optionCount - 1})`
    )
  }

  const distractors = shuffle(candidates, random).slice(0, optionCount - 1)

  return shuffle(
    [
      { id: correct.id, label: correct.name, isCorrect: true },
      ...distractors.map((item) => ({
        id: item.id,
        label: item.name,
        isCorrect: false,
      })),
    ],
    random
  )
}

/** Fisher-Yates dengan sumber acak yang bisa disuntik. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const bounded = Math.min(index, Math.max(0, swapIndex))
    const temporary = result[index]
    result[index] = result[bounded]
    result[bounded] = temporary
  }

  return result
}
