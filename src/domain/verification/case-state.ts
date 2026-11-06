/**
 * Pembuat state case (PRD §7: setup = inverse(algoritma case)).
 *
 * Ada dua pose yang dipakai di proyek ini:
 *
 * - **Pose mentah** (`buildCaseStateRaw`): `solved` + `inverseAlgorithm` apa
 *   adanya. Ini pose yang diasumsikan algoritma case. Algoritma yang memuat
 *   rotasi seluruh kubus tanpa pasangan (mis. `y` tanpa `y'` di PLL-V) hanya
 *   menyelesaikan cube kalau dijalankan dari pose ini, dan pada pose ini keenam
 *   center bisa belum berada di slot asalnya.
 * - **Pose ternormalisasi** (`buildCaseState`): pose mentah diputar seluruhnya
 *   sampai center kembali ke slot asal, tanpa mengubah posisi relatif piece lain.
 *   Dipakai untuk tampilan (kamera/frame aplikasi) dan untuk memeriksa kondisi
 *   awal case (F2L solved, OLL solved, signature).
 *
 * Verifikasi "algoritma menyelesaikan case" memakai pose mentah; lihat
 * `docs/decisions.md` dan `docs/data-verification-report.md`.
 */

import {
  applyAlg,
  normalizeOrientation,
  solvedState,
  type CubeState,
} from '../../engine/index.js'
import type { TrainingCase } from '../training-case.js'

/**
 * State case pada pose mentah: `solved` lalu `inverseAlgorithm`, TANPA
 * normalisasi orientasi dan tanpa AUF (AUF ditambahkan generator, PRD §2).
 *
 * Memerlukan `initCubeEngine()` yang sudah di-await.
 */
export function buildCaseStateRaw(trainingCase: TrainingCase): CubeState {
  return applyAlg(solvedState(), trainingCase.inverseAlgorithm)
}

/**
 * State case pada pose ternormalisasi (center kembali ke slot asal).
 * Dipakai untuk tampilan dan pemeriksaan kondisi awal case.
 *
 * Memerlukan `initCubeEngine()` yang sudah di-await.
 */
export function buildCaseState(trainingCase: TrainingCase): CubeState {
  return normalizeOrientation(buildCaseStateRaw(trainingCase))
}
