/**
 * Geometri slot F2L (adapter cubing.js).
 *
 * Slot F2L = pasangan (corner layer D, edge slice E) yang berada di satu kolom,
 * mis. corner DFR dengan edge FR. Slot cross = 4 edge layer D.
 *
 * Semua pemetaan di sini DITURUNKAN dari efek gerakan pada `patternData`, bukan
 * dari daftar indeks yang ditulis dari ingatan:
 *
 * - Layer U / D / slice E diambil dari `layerSlots()` (diturunkan dari gerakan
 *   U dan D).
 * - Tiap piece "punya" satu atau dua face sisi (L/R/F/B): face sisi = gerakan
 *   face yang memindahkan slot tersebut (`U`/`D` memindahkan 0 atau 4 slot,
 *   jadi penyaringnya cukup gerakan L/R/F/B yang memindahkan tepat 2 corner D).
 * - Corner D dan edge E berada di slot yang sama bila himpunan face sisinya sama
 *   (mis. DFR dan FR sama-sama {F, R}).
 * - Corner U "di atas" sebuah slot = corner U dengan himpunan face sisi yang sama.
 * - Edge U referensi sebuah slot = edge U di antara corner U acuan dan corner U
 *   berikutnya searah gerakan U (pemetaan ini konsisten terhadap rotasi y, jadi
 *   signature tidak bergantung pada slot mana yang tidak selesai).
 */

import type { CubeState } from './cube-state.js'
import { applyAlg, solvedState } from './cube-engine.js'
import { layerSlots, readOrbit, type OrbitName } from './orbit-reader.js'

/** Gerakan face standar (notasi kubus, bukan algoritma case). */
const FACE_MOVES = ['U', 'D', 'L', 'R', 'F', 'B'] as const

export interface F2lSlotGeometry {
  /** Slot corner layer D (rumah corner pasangan). */
  cornerSlot: number
  /** Slot edge slice E (rumah edge pasangan). */
  edgeSlot: number
  /** Slot corner layer U acuan relatif untuk slot ini. */
  uCornerSlot: number
  /** Slot edge layer U acuan relatif untuk slot ini. */
  uEdgeSlot: number
}

export interface F2lGeometry {
  /** 4 slot F2L, urut siklik searah gerakan U. */
  slots: F2lSlotGeometry[]
  /** 4 slot edge cross (layer D). */
  crossEdgeSlots: number[]
  /** 4 slot corner layer U, urut siklik searah gerakan U (indeks = indeks siklik). */
  uCornerSlots: number[]
  /** 4 slot edge layer U, urut siklik searah gerakan U. */
  uEdgeSlots: number[]
}

let cachedGeometry: F2lGeometry | null = null
let cachedMovedSlots: Map<string, number[]> | null = null

/** Geometri slot F2L (memerlukan `initCubeEngine()`), dihitung sekali. */
export function f2lGeometry(): F2lGeometry {
  if (!cachedGeometry) {
    cachedGeometry = deriveF2lGeometry()
  }
  return cachedGeometry
}

/** Slot tempat piece dengan home slot `homeSlot` berada, atau -1 bila tidak ada. */
export function findPieceSlot(
  state: CubeState,
  orbit: OrbitName,
  homeSlot: number
): number {
  return readOrbit(state, orbit).pieces.indexOf(homeSlot)
}

/** Slot yang berpindah ketika sebuah gerakan diterapkan pada state solved. */
export function moveAffectedSlots(move: string, orbit: OrbitName): number[] {
  if (!cachedMovedSlots) {
    cachedMovedSlots = new Map()
  }
  const key = `${move}:${orbit}`
  const cached = cachedMovedSlots.get(key)
  if (cached) {
    return cached
  }

  const { pieces } = readOrbit(applyAlg(solvedState(), move), orbit)
  const slots: number[] = []
  pieces.forEach((piece, slot) => {
    if (piece !== slot) {
      slots.push(slot)
    }
  })
  cachedMovedSlots.set(key, slots)
  return slots
}

function sameFaceSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((face) => b.includes(face))
}

function deriveF2lGeometry(): F2lGeometry {
  const layers = layerSlots()
  const dCorners = layers.bottomCorners
  const uCornerSlots = layers.uCorners
  const uEdgeSlots = layers.uEdges

  const crossEdgeSlots = [...moveAffectedSlots('D', 'EDGES')].sort(
    (a, b) => a - b
  )

  const allEdgeSlots = readOrbit(solvedState(), 'EDGES').pieces.map(
    (_, slot) => slot
  )
  const uEdgeSet = new Set(uEdgeSlots)
  const crossEdgeSet = new Set(crossEdgeSlots)
  const eEdgeSlots = allEdgeSlots.filter(
    (slot) => !uEdgeSet.has(slot) && !crossEdgeSet.has(slot)
  )

  const sideMoves = FACE_MOVES.filter((move) => {
    const moved = new Set(moveAffectedSlots(move, 'CORNERS'))
    return dCorners.filter((slot) => moved.has(slot)).length === 2
  })
  if (sideMoves.length !== 4) {
    throw new Error(
      `F2lGeometry: diharapkan 4 gerakan sisi, dapat ${sideMoves.length}`
    )
  }

  const facesOf = (orbit: OrbitName, slot: number): string[] =>
    sideMoves.filter((move) => moveAffectedSlots(move, orbit).includes(slot))

  const slots: F2lSlotGeometry[] = []

  for (const cornerSlot of dCorners) {
    const cornerFaces = facesOf('CORNERS', cornerSlot)
    if (cornerFaces.length !== 2) {
      throw new Error(
        `F2lGeometry: corner D ${cornerSlot} punya ${cornerFaces.length} face sisi, diharapkan 2`
      )
    }

    const edgeSlot = eEdgeSlots.find((slot) =>
      sameFaceSet(facesOf('EDGES', slot), cornerFaces)
    )
    const uCornerSlot = uCornerSlots.find((slot) =>
      sameFaceSet(facesOf('CORNERS', slot), cornerFaces)
    )
    if (edgeSlot === undefined || uCornerSlot === undefined) {
      throw new Error(
        `F2lGeometry: slot F2L untuk corner D ${cornerSlot} tidak ditemukan`
      )
    }

    const uIndex = uCornerSlots.indexOf(uCornerSlot)
    const nextUCorner = uCornerSlots[(uIndex + 1) % uCornerSlots.length]
    const sharedFaces = facesOf('CORNERS', uCornerSlot).filter((face) =>
      facesOf('CORNERS', nextUCorner).includes(face)
    )
    if (sharedFaces.length !== 1) {
      throw new Error(
        `F2lGeometry: face bersama corner U ${uCornerSlot} dan ${nextUCorner} berjumlah ${sharedFaces.length}, diharapkan 1`
      )
    }

    const uEdgeSlot = uEdgeSlots.find((slot) =>
      moveAffectedSlots(sharedFaces[0], 'EDGES').includes(slot)
    )
    if (uEdgeSlot === undefined) {
      throw new Error(
        `F2lGeometry: edge U acuan untuk slot ${cornerSlot} tidak ditemukan`
      )
    }

    slots.push({ cornerSlot, edgeSlot, uCornerSlot, uEdgeSlot })
  }

  if (new Set(slots.map((slot) => slot.edgeSlot)).size !== slots.length) {
    throw new Error('F2lGeometry: pemetaan corner D ke edge E tidak unik')
  }
  if (new Set(slots.map((slot) => slot.uCornerSlot)).size !== slots.length) {
    throw new Error('F2lGeometry: pemetaan corner D ke corner U tidak unik')
  }

  slots.sort(
    (a, b) =>
      uCornerSlots.indexOf(a.uCornerSlot) - uCornerSlots.indexOf(b.uCornerSlot)
  )

  return {
    slots,
    crossEdgeSlots,
    uCornerSlots: [...uCornerSlots],
    uEdgeSlots: [...uEdgeSlots],
  }
}
