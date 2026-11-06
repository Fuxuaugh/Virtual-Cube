/**
 * Case Generator (PRD §7, MILESTONES M4.1).
 *
 * Alur: `setupState` = `solved` + `inverseAlgorithm` case (pose algoritma) +
 * AUF acak. Generator TIDAK mengarang state: seluruhnya diturunkan dari case di
 * `src/data/`.
 *
 * **Penanganan pose (penting).** Case dengan rotasi netto (1 PLL, 8 OLL, 18 F2L;
 * lihat `docs/data-verification-report.md`) hanya bisa diselesaikan algoritmanya
 * pada **pose mentah** (`buildCaseStateRaw` = `solved` + `inverseAlgorithm`).
 * Karena itu:
 *
 * - AUF ditambahkan pada layer U **pose algoritma** (state mentah), bukan pada
 *   pose ternormalisasi, sehingga kondisi awal case tidak rusak. AUF hanya
 *   memutar layer atas: orientasi OLL, permutasi PLL (modulo AUF), dan pasangan
 *   F2L tetap sesuai case.
 * - `alignmentAuf` = kebalikan AUF: AUF yang dipakai solver sebelum menjalankan
 *   algoritma supaya cube kembali solved. Inilah "memperhitungkan AUF" di PRD §7.1.
 * - `displayState` = setup state setelah normalisasi orientasi (center di slot
 *   asal) untuk tampilan; JANGAN memakai `displayState` untuk menjalankan
 *   algoritma case (pose-nya berbeda).
 */

import {
  applyAlg,
  equals,
  normalizeOrientation,
  solvedState,
  type CubeState,
} from '../../engine/index.js'
import type { CaseCategory, TrainingCase } from '../training-case.js'
import { buildCaseStateRaw } from '../verification/index.js'

/** Penyesuaian layer U yang didukung. */
export type Auf = '' | 'U' | "U'" | 'U2'

export const AUF_OPTIONS: readonly Auf[] = ['', 'U', "U'", 'U2']

/** Kebalikan tiap AUF (dipakai solver untuk menyelaraskan case). */
const AUF_INVERSE: Readonly<Record<Auf, Auf>> = {
  '': '',
  U: "U'",
  "U'": 'U',
  U2: 'U2',
}

export interface GeneratorOptions {
  /** AUF yang ditambahkan; default `'random'` (acak dari `AUF_OPTIONS`). */
  auf?: Auf | 'random'
  /** Sumber angka acak; default `Math.random`. Dipakai test agar deterministik. */
  random?: () => number
}

export interface GeneratedCase {
  /** Case sumber. */
  trainingCase: TrainingCase
  /** AUF yang ditambahkan ke setup. */
  auf: Auf
  /** AUF penyelarasan (kebalikan `auf`) sebelum algoritma dijalankan. */
  alignmentAuf: Auf
  /** Scramble state: `solved` + `inverseAlgorithm` + AUF, pada pose algoritma. */
  setupState: CubeState
  /** Setup state setelah normalisasi orientasi (center di slot asal) untuk tampilan. */
  displayState: CubeState
}

/**
 * Membuat setup state untuk sebuah case (kategori apa pun).
 * Memerlukan `initCubeEngine()` yang sudah di-await.
 */
export function generateCase(
  trainingCase: TrainingCase,
  options?: GeneratorOptions
): GeneratedCase {
  const auf = resolveAuf(options)
  const poseState = buildCaseStateRaw(trainingCase)

  // AUF ditambahkan pada layer U pose algoritma (state mentah).
  const setupState = auf === '' ? poseState : applyAlg(poseState, auf)

  return {
    trainingCase,
    auf,
    alignmentAuf: AUF_INVERSE[auf],
    setupState,
    displayState: normalizeOrientation(setupState),
  }
}

/**
 * Generator F2L (PRD §7.4): cross solved, 3 slot lain solved, slot target berisi
 * pasangan sesuai case, dengan AUF acak.
 */
export function generateF2lCase(
  trainingCase: TrainingCase,
  options?: GeneratorOptions
): GeneratedCase {
  return generateForCategory(trainingCase, 'F2L', options)
}

/**
 * Generator OLL (PRD §7.2): F2L solved, orientasi layer atas sesuai case,
 * dengan AUF acak.
 */
export function generateOllCase(
  trainingCase: TrainingCase,
  options?: GeneratorOptions
): GeneratedCase {
  return generateForCategory(trainingCase, 'OLL', options)
}

/**
 * Generator PLL (PRD §7.3): F2L + OLL solved, permutasi layer atas sesuai case
 * (memperhitungkan AUF), dengan AUF acak.
 */
export function generatePllCase(
  trainingCase: TrainingCase,
  options?: GeneratorOptions
): GeneratedCase {
  return generateForCategory(trainingCase, 'PLL', options)
}

/**
 * Menjalankan `alignmentAuf` + algoritma case pada `setupState`.
 * Hasilnya harus persis solved (dipakai test dan pengecekan solve).
 */
export function solveGeneratedCase(generated: GeneratedCase): CubeState {
  const algorithm =
    `${generated.alignmentAuf} ${generated.trainingCase.algorithm}`.trim()
  return applyAlg(generated.setupState, algorithm)
}

/**
 * AUF penyelarasan yang membuat `setupState` bisa diselesaikan algoritma case,
 * dicari dari 4 kemungkinan (tanpa perlu tahu AUF yang dipakai generator).
 */
/**
 * AUF penyelarasan yang membuat `setupState` bisa diselesaikan algoritma case,
 * dicari dari 4 kemungkinan (tanpa perlu tahu AUF yang dipakai generator).
 */
export function findAlignmentAuf(generated: GeneratedCase): Auf | undefined {
  return AUF_OPTIONS.find((candidate) => {
    const algorithm = `${candidate} ${generated.trainingCase.algorithm}`.trim()
    return equals(applyAlg(generated.setupState, algorithm), solvedState())
  })
}

function generateForCategory(
  trainingCase: TrainingCase,
  category: CaseCategory,
  options?: GeneratorOptions
): GeneratedCase {
  if (trainingCase.category !== category) {
    throw new Error(
      `generate${category}Case: case "${trainingCase.id}" berkategori "${trainingCase.category}", bukan "${category}"`
    )
  }
  return generateCase(trainingCase, options)
}

function resolveAuf(options?: GeneratorOptions): Auf {
  const requested = options?.auf ?? 'random'
  if (requested !== 'random') {
    return requested
  }

  const random = options?.random ?? Math.random
  const index = Math.min(
    AUF_OPTIONS.length - 1,
    Math.floor(random() * AUF_OPTIONS.length)
  )
  return AUF_OPTIONS[Math.max(0, index)]
}
