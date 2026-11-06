/**
 * Pembuat state case (PRD §7: setup = inverse(algoritma case)).
 */

import {
  applyAlg,
  normalizeOrientation,
  solvedState,
  type CubeState,
} from '../../engine/index.js'
import type { TrainingCase } from '../training-case.js'

/**
 * State untuk sebuah case: cube solved lalu diterapkan `inverseAlgorithm`
 * milik case tersebut, tanpa AUF (AUF ditambahkan generator, lihat PRD §2).
 *
 * Hasilnya sudah dinormalisasi (`normalizeOrientation`): kalau `inverseAlgorithm`
 * mengandung rotasi seluruh kubus atau slice yang netto menggeser center, state
 * dikembalikan ke frame kanonik (center di slot asal) tanpa mengubah posisi
 * relatif piece lain.
 *
 * Memerlukan `initCubeEngine()` yang sudah di-await.
 */
export function buildCaseState(trainingCase: TrainingCase): CubeState {
  return normalizeOrientation(
    applyAlg(solvedState(), trainingCase.inverseAlgorithm)
  )
}
