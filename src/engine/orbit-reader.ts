/**
 * Pembaca orbit patternData (adapter cubing.js).
 *
 * Bentuk data yang dipakai (diverifikasi dari tipe `KPatternData` cubing 0.66.1
 * dan dari `cube3x3x3.kpuzzle().definition`):
 *
 * ```ts
 * KPatternData = { [orbitName: string]: { pieces: number[]; orientation: number[] } }
 * ```
 *
 * - `pieces[slot]` = indeks *home slot* dari piece yang kini menempati `slot`.
 * - `orientation[slot]` = orientasi piece di `slot`.
 * - Orbit 3x3x3: `EDGES` (12 piece, 2 orientasi), `CORNERS` (8 piece, 3 orientasi),
 *   `CENTERS` (6 piece, 4 orientasi, tetapi `orientationMod: [1,1,1,1,1,1]`
 *   sehingga orientasi center tidak pernah terlacak dan selalu 0).
 *
 * Layer U dan D ditentukan dari *efek gerakan* `U` dan `D` (bukan dari indeks
 * yang ditulis dari ingatan), lihat `deriveLayerSlots()`.
 */

import type { CubeState } from './cube-state.js'
import { unwrapCubeState } from './cube-state.js'
import { applyAlg, solvedState } from './cube-engine.js'

/** Nama orbit pada patternData cubing.js untuk puzzle 3x3x3. */
export type OrbitName = 'CORNERS' | 'EDGES' | 'CENTERS'

export interface OrbitData {
  /** pieces[slot] = indeks home slot piece yang menempati slot tersebut. */
  pieces: number[]
  /** orientation[slot] = orientasi piece di slot tersebut. */
  orientation: number[]
}

export interface LayerSlots {
  /** 4 slot corner layer U, urut siklik mengikuti arah gerakan U. */
  uCorners: number[]
  /** 4 slot edge layer U, urut siklik mengikuti arah gerakan U. */
  uEdges: number[]
  /** 4 slot corner layer D (dua layer bawah / F2L). */
  bottomCorners: number[]
  /** 8 slot edge dua layer bawah (4 edge layer D + 4 edge slice E). */
  bottomEdges: number[]
  /** 6 slot center. */
  centers: number[]
}

/** Menyalin data satu orbit dari state. Melempar error bila orbit tidak ada. */
export function readOrbit(state: CubeState, orbit: OrbitName): OrbitData {
  const orbitData = unwrapCubeState(state).patternData[orbit]
  if (!orbitData) {
    throw new Error(`Orbit "${orbit}" not found in patternData`)
  }

  return {
    pieces: [...orbitData.pieces],
    orientation: [...orbitData.orientation],
  }
}

/**
 * True bila setiap slot pada daftar berisi piece home-nya sendiri (`pieces[slot] === slot`)
 * dan orientasinya 0.
 */
export function isOrbitSliceSolved(
  state: CubeState,
  orbit: OrbitName,
  slots: readonly number[]
): boolean {
  const { pieces, orientation } = readOrbit(state, orbit)
  return slots.every((slot) => pieces[slot] === slot && orientation[slot] === 0)
}

let cachedLayerSlots: LayerSlots | null = null

/**
 * Indeks slot tiap layer, diturunkan sekali dari definisi gerakan `U` dan `D`
 * pada state solved (memerlukan `initCubeEngine()`).
 */
export function layerSlots(): LayerSlots {
  if (!cachedLayerSlots) {
    cachedLayerSlots = deriveLayerSlots()
  }
  return cachedLayerSlots
}

function deriveLayerSlots(): LayerSlots {
  const solved = solvedState()

  const afterU = unwrapCubeState(applyAlg(solved, 'U')).patternData
  const afterD = unwrapCubeState(applyAlg(solved, 'D')).patternData

  const uCornerSlots = movedSlots(afterU['CORNERS'].pieces)
  const uEdgeSlots = movedSlots(afterU['EDGES'].pieces)
  const dCornerSlots = movedSlots(afterD['CORNERS'].pieces)
  const uEdgeSet = new Set(uEdgeSlots)

  return {
    uCorners: cycleOrder(afterU['CORNERS'].pieces, uCornerSlots),
    uEdges: cycleOrder(afterU['EDGES'].pieces, uEdgeSlots),
    bottomCorners: [...dCornerSlots].sort((a, b) => a - b),
    // Semua edge di luar layer U: 4 edge layer D + 4 edge slice E.
    bottomEdges: afterD['EDGES'].pieces
      .map((_, slot) => slot)
      .filter((slot) => !uEdgeSet.has(slot)),
    centers: afterU['CENTERS'].pieces.map((_, slot) => slot),
  }
}

/** Slot yang berpindah ketika sebuah gerakan diterapkan (`pieces[slot] !== slot`). */
function movedSlots(pieces: readonly number[]): number[] {
  const slots: number[] = []
  pieces.forEach((piece, slot) => {
    if (piece !== slot) {
      slots.push(slot)
    }
  })
  return slots
}

/**
 * Mengurutkan slot secara siklik mengikuti arah gerakan: `pieces[slot]` adalah
 * home slot piece yang kini ada di `slot`, jadi piece dari slot `s` berpindah
 * ke slot `k` dengan `pieces[k] === s`.
 */
function cycleOrder(
  pieces: readonly number[],
  slots: readonly number[]
): number[] {
  const slotSet = new Set(slots)
  const destination = new Map<number, number>()
  pieces.forEach((piece, slot) => {
    if (slotSet.has(piece)) {
      destination.set(piece, slot)
    }
  })

  const order: number[] = []
  let current = Math.min(...slots)
  for (let i = 0; i < slots.length; i++) {
    order.push(current)
    const next = destination.get(current)
    if (next === undefined) {
      break
    }
    current = next
  }
  return order
}
