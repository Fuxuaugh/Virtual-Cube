/**
 * Normalisasi orientasi seluruh kubus (adapter cubing.js).
 *
 * **Cara menemukan rotasinya dari `patternData.CENTERS`:**
 *
 * - Orbit `CENTERS` berisi 6 piece (satu per sisi) dengan `orientationMod: [1,1,1,1,1,1]`,
 *   sehingga orientasi center selalu 0. Yang tersisa hanya `pieces[slot]` = home
 *   slot dari center yang menempati `slot`.
 * - State solved → `pieces = [0,1,2,3,4,5]` (identitas).
 * - Rotasi seluruh kubus memindahkan center, dan grup rotasi kubus (24 anggota)
 *   bekerja secara *faithful* pada 6 center: ke-24 rotasi menghasilkan 24
 *   permutasi center yang berbeda (diverifikasi: 24 kunci unik). Jadi orientasi
 *   kubus bisa dibaca langsung dari `CENTERS.pieces`, dan rotasi yang diperlukan
 *   untuk mengembalikan center ke slot asal adalah invers dari permutasi itu.
 * - Daftar 24 rotasi tidak ditulis dari ingatan: diturunkan saat runtime dengan
 *   BFS memakai gerakan `x`/`y`/`z` (notasi yang sudah didukung engine) pada state
 *   solved, lalu dideduplikasi lewat kunci `CENTERS.pieces`.
 *
 * Untuk setiap state, rotasi yang menormalkan center bersifat unik: bila dua
 * rotasi T1 dan T2 sama-sama berhasil, maka T2⁻¹T1 mempertahankan center
 * (permutasi center identitas) sehingga T1 = T2 karena aksinya faithful.
 */

import type { CubeState } from './cube-state.js'
import { applyAlg, solvedState } from './cube-engine.js'
import { isOrbitSliceSolved, layerSlots, readOrbit } from './orbit-reader.js'

/** Gerakan rotasi seluruh kubus yang dipakai untuk menurunkan 24 orientasi. */
const ROTATION_MOVES = [
  'x',
  "x'",
  'x2',
  'y',
  "y'",
  'y2',
  'z',
  "z'",
  'z2',
] as const

let cachedRotationAlgs: readonly string[] | null = null

/**
 * Ke-24 alg rotasi seluruh kubus (termasuk `''` untuk identitas), diturunkan dari
 * gerakan x/y/z pada state solved. Memerlukan `initCubeEngine()`.
 */
export function wholeCubeRotationAlgs(): readonly string[] {
  if (!cachedRotationAlgs) {
    cachedRotationAlgs = deriveRotationAlgs()
  }
  return cachedRotationAlgs
}

/**
 * Memutar seluruh kubus sampai keenam center kembali ke slot asalnya, tanpa
 * mengubah posisi relatif piece lain (hanya satu rotasi x/y/z yang diterapkan).
 *
 * State yang center-nya sudah di slot asal dikembalikan apa adanya. Bila center
 * tidak berada dalam salah satu dari 24 orientasi rotasi (state yang bukan
 * "solved up to rotasi"), state dikembalikan apa adanya juga supaya pemanggil
 * bisa memeriksanya sendiri (mis. `f2lSolved` menjadi false).
 */
export function normalizeOrientation(state: CubeState): CubeState {
  const centerSlots = layerSlots().centers

  if (isOrbitSliceSolved(state, 'CENTERS', centerSlots)) {
    return state
  }

  for (const alg of wholeCubeRotationAlgs()) {
    if (alg === '') {
      continue
    }
    const candidate = applyAlg(state, alg)
    if (isOrbitSliceSolved(candidate, 'CENTERS', centerSlots)) {
      return candidate
    }
  }

  return state
}

/** Kunci permutasi center pada patternData. */
function centersKey(state: CubeState): string {
  return readOrbit(state, 'CENTERS').pieces.join(',')
}

function deriveRotationAlgs(): readonly string[] {
  const solved = solvedState()
  const algsByCenters = new Map<string, string>([[centersKey(solved), '']])
  let frontier: string[] = ['']

  while (frontier.length > 0) {
    const next: string[] = []

    for (const alg of frontier) {
      const state = alg === '' ? solved : applyAlg(solved, alg)

      for (const move of ROTATION_MOVES) {
        const candidate = alg === '' ? move : `${alg} ${move}`
        const key = centersKey(applyAlg(state, move))

        if (!algsByCenters.has(key)) {
          algsByCenters.set(key, candidate)
          next.push(candidate)
        }
      }
    }

    frontier = next
  }

  return [...algsByCenters.values()]
}
