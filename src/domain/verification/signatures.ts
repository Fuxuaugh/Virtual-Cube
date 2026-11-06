/**
 * Signature layer atas untuk verifikasi OLL dan PLL (PRD §7.2/§7.3).
 *
 * Keduanya dihitung dari orientasi/permutasi slot layer U pada state engine,
 * bukan dari algoritma case, lalu dinormalisasi terhadap AUF:
 *
 * - OLL (orientasi): AUF memutar posisi slot dan tidak mengubah orientasi piece
 *   (`orientationDelta` gerakan U = 0), sehingga normalisasinya adalah memilih
 *   representasi kanonik terkecil dari 4 putaran U.
 * - PLL (permutasi): AUF sebelum algoritma menggeser posisi slot, sedangkan AUF
 *   sesudah algoritma menggeser label home slot. Keduanya harus dinormalisasi
 *   (16 kombinasi), kalau tidak dua state yang sama case-nya akan dianggap beda.
 *   Contoh: "corner solved, edge (01)(23)" dan "corner solved, edge (03)(12)"
 *   adalah satu case yang sama (dua pasang edge bersebelahan bertukar).
 *
 * Sebelum itu, state dinormalisasi orientasinya (`normalizeOrientation`) supaya
 * rotasi seluruh kubus atau slice yang netto menggeser center tidak mengubah
 * frame perhitungan. Opsi `{ strict: true }` memakai state apa adanya.
 */

import { layerSlots, readOrbit, type CubeState } from '../../engine/index.js'
import { canonicalState, type VerificationOptions } from './options.js'

/** Signature OLL untuk cube solved: 4 corner twist 0 dan 4 edge flip 0. */
export const SOLVED_OLL_SIGNATURE = '0000|0000'

/** Penanda label piece yang bukan berasal dari layer U (di luar prasyarat). */
const FOREIGN_LABEL = 9

/**
 * Signature orientasi layer atas (OLL) yang dinormalisasi terhadap putaran U.
 *
 * Format `"cccc|eeee"`: 4 digit twist corner layer U (0..2) diikuti 4 digit flip
 * edge layer U (0..1), urut siklik mengikuti arah gerakan U.
 */
export function ollSignature(
  state: CubeState,
  options?: VerificationOptions
): string {
  const slots = layerSlots()
  const canonical = canonicalState(state, options)
  const corners = readOrbit(canonical, 'CORNERS').orientation
  const edges = readOrbit(canonical, 'EDGES').orientation

  return ollSignatureFromTuples(
    slots.uCorners.map((slot) => corners[slot]),
    slots.uEdges.map((slot) => edges[slot])
  )
}

/**
 * Signature OLL dari tuple orientasi mentah (tanpa membaca state).
 * Dipakai juga oleh enumerasi kelas OLL agar memakai normalisasi yang sama.
 */
export function ollSignatureFromTuples(
  cornerTwist: readonly number[],
  edgeFlip: readonly number[]
): string {
  const [corners, edges] = canonicalUpRotation(cornerTwist, edgeFlip)
  return `${corners.join('')}|${edges.join('')}`
}

/**
 * Signature permutasi layer atas (PLL), dinormalisasi terhadap AUF sebelum dan
 * sesudah (16 kombinasi putaran U).
 *
 * Format `"c0,c1,c2,c3|e0,e1,e2,e3"`: indeks siklik (0..3) home slot dari piece
 * yang menempati tiap slot layer U, urut siklik mengikuti arah gerakan U.
 * Indeks siklik dipakai agar signature tidak bergantung penomoran slot internal
 * cubing.js.
 *
 * Hanya bermakna bila `f2lSolved(state)` benar dan layer atas sudah orientasi
 * solved (OLL solved). Fungsi ini tidak memeriksa prasyarat tersebut.
 *
 * Seluruh 288 state permutasi legal (permutasi corner dan edge dengan paritas
 * sama) terbagi menjadi 22 kelas: 21 case PLL + solved.
 */
export function pllSignature(
  state: CubeState,
  options?: VerificationOptions
): string {
  const slots = layerSlots()
  const canonical = canonicalState(state, options)
  const corners = readOrbit(canonical, 'CORNERS').pieces
  const edges = readOrbit(canonical, 'EDGES').pieces

  const [cornerLabels, edgeLabels] = canonicalAufBeforeAfter(
    cyclicLabels(corners, slots.uCorners),
    cyclicLabels(edges, slots.uEdges)
  )

  return `${cornerLabels.join(',')}|${edgeLabels.join(',')}`
}

/** Indeks siklik home slot tiap piece yang menempati slot layer U. */
function cyclicLabels(
  pieces: readonly number[],
  slots: readonly number[]
): number[] {
  return slots.map((slot) => {
    const index = slots.indexOf(pieces[slot])
    return index < 0 ? FOREIGN_LABEL : index
  })
}

/**
 * Representasi kanonik dari 4 rotasi U untuk sepasang tuple yang diputar
 * bersamaan (rotasi U selalu memutar corner dan edge sekaligus). Dipakai untuk
 * signature orientasi (OLL).
 */
function canonicalUpRotation(
  a: readonly number[],
  b: readonly number[]
): [number[], number[]] {
  let best: [number[], number[]] | null = null

  for (let offset = 0; offset < a.length; offset++) {
    const candidate: [number[], number[]] = [
      rotate(a, offset),
      rotate(b, offset),
    ]
    if (best === null || compareTuples(candidate, best) < 0) {
      best = candidate
    }
  }

  if (best === null) {
    throw new Error('canonicalUpRotation: empty tuples')
  }

  return best
}

/**
 * Representasi kanonik terhadap AUF sebelum dan sesudah untuk sepasang tuple
 * permutasi (PLL): setiap kombinasi `shiftPositions` (AUF sebelum, menggeser
 * posisi slot) dan `shiftLabels` (AUF sesudah, menggeser label home slot)
 * dihitung, lalu diambil yang terkecil.
 */
function canonicalAufBeforeAfter(
  a: readonly number[],
  b: readonly number[]
): [number[], number[]] {
  let best: [number[], number[]] | null = null

  for (let shiftLabels = 0; shiftLabels < a.length; shiftLabels++) {
    for (let shiftPositions = 0; shiftPositions < a.length; shiftPositions++) {
      const candidate: [number[], number[]] = [
        aufTransform(a, shiftLabels, shiftPositions),
        aufTransform(b, shiftLabels, shiftPositions),
      ]
      if (best === null || compareTuples(candidate, best) < 0) {
        best = candidate
      }
    }
  }

  if (best === null) {
    throw new Error('canonicalAufBeforeAfter: empty tuples')
  }

  return best
}

/**
 * Menggeser posisi slot mundur `shiftPositions` langkah lalu menambah
 * `shiftLabels` ke label home slot piece (label di luar layer U dibiarkan).
 */
function aufTransform(
  values: readonly number[],
  shiftLabels: number,
  shiftPositions: number
): number[] {
  const length = values.length
  const result: number[] = []

  for (let i = 0; i < length; i++) {
    const label = values[(i - shiftPositions + length) % length]
    result.push(label < FOREIGN_LABEL ? (label + shiftLabels) % length : label)
  }

  return result
}

function rotate(values: readonly number[], offset: number): number[] {
  return [...values.slice(offset), ...values.slice(0, offset)]
}

function compareTuples(
  a: readonly [readonly number[], readonly number[]],
  b: readonly [readonly number[], readonly number[]]
): number {
  return compareNumbers(a[0], b[0]) || compareNumbers(a[1], b[1])
}

function compareNumbers(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i]
    }
  }
  return 0
}
