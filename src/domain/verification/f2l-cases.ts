/**
 * Alat verifikasi F2L (PRD §7.2/§7.4, MILESTONES M4.3/M4.4).
 *
 * Semua pemeriksaan dihitung dari state engine (bukan dari nama/isi algoritma).
 *
 * Slot F2L = pasangan (corner layer D, edge slice E) satu kolom; slot cross =
 * 4 edge layer D. Pemetaan slot diturunkan dari efek gerakan di
 * `src/engine/f2l-slots.ts`.
 *
 * `pairSignature` menyatakan posisi + orientasi pasangan RELATIF terhadap slot
 * asalnya, dinormalisasi terhadap putaran U (4 rotasi), sehingga case yang sama
 * dengan AUF berbeda menghasilkan signature yang sama:
 *
 * - posisi corner: `H` (di slot rumahnya) atau offset 0..3 dalam siklus slot U
 *   dihitung dari corner U acuan slot tersebut;
 * - posisi edge: `H` (di slot rumahnya) atau offset 0..3 dalam siklus slot U
 *   dihitung dari edge U acuan slot tersebut;
 * - orientasi: twist corner 0..2 dan flip edge 0..1.
 *
 * Jumlah kelas yang diharapkan: 24 (both-in-u-layer) + 6 (corner-in-place) +
 * 6 (edge-in-place) + 6 (both-in-place, termasuk solved) = 42.
 *
 * Catatan hasil verifikasi data: 41 case PDF tidak seluruhnya berbeda sebagai
 * konfigurasi pasangan — 12 di antaranya adalah konfigurasi pasangan yang sama di
 * slot berbeda (netto `y`). Rinciannya ada di `docs/data-verification-report.md`.
 */

import {
  clonePatternData,
  createCustomCubeState,
  f2lGeometry,
  findPieceSlot,
  isOrbitSliceSolved,
  normalizeOrientation,
  readOrbit,
  solvedState,
  type CubeState,
  type F2lSlotGeometry,
} from '../../engine/index.js'
import type { TrainingCase } from '../training-case.js'
import { buildCaseStateRaw } from './case-state.js'
import { canonicalState, type VerificationOptions } from './options.js'

/** Posisi "di slot rumahnya" di dalam signature. */
const HOME = -1

export type F2lPairGroup =
  'both-in-u-layer' | 'corner-in-place' | 'edge-in-place' | 'both-in-place'

export interface F2lPairEnumeration {
  /** Jumlah konfigurasi yang dienumerasi (posisi × orientasi legal). */
  configurationCount: number
  /** Jumlah kelas signature setelah normalisasi putaran U. */
  classCount: number
  /** Signature tiap kelas, urut menaik. */
  signatures: string[]
  /** Jumlah kelas per pairGroup. */
  classCountByGroup: Record<F2lPairGroup, number>
}

/** True bila 4 edge cross berada di slot asalnya dengan orientasi 0. */
export function crossSolved(
  state: CubeState,
  options?: VerificationOptions
): boolean {
  const canonical = canonicalState(state, options)
  return isOrbitSliceSolved(canonical, 'EDGES', f2lGeometry().crossEdgeSlots)
}

/** Daftar slot F2L yang belum selesai (corner atau edge pasangannya belum benar). */
export function unsolvedSlots(
  state: CubeState,
  options?: VerificationOptions
): F2lSlotGeometry[] {
  const canonical = canonicalState(state, options)
  return f2lGeometry().slots.filter((slot) => !slotSolved(canonical, slot))
}

/**
 * State case F2L untuk tampilan: pose mentah (`solved` + `inverseAlgorithm`)
 * lalu dinormalisasi orientasinya (center kembali ke slot asal).
 *
 * Memerlukan `initCubeEngine()` yang sudah di-await.
 */
export function f2lCaseState(trainingCase: TrainingCase): CubeState {
  return normalizeOrientation(buildCaseStateRaw(trainingCase))
}

/**
 * Signature pasangan corner-edge untuk satu slot F2L yang belum selesai.
 *
 * Hanya valid bila `crossSolved(state)` benar dan tepat satu slot F2L belum
 * selesai; selain itu fungsi ini melempar error.
 */
export function pairSignature(
  state: CubeState,
  options?: VerificationOptions
): string {
  const canonical = canonicalState(state, options)
  return formatPlacement(
    readPlacementForSlot(canonical, singleUnsolvedSlot(canonical))
  )
}

/** Kelompok pasangan berdasarkan posisi corner dan edge. */
export function pairGroup(
  state: CubeState,
  options?: VerificationOptions
): F2lPairGroup {
  const canonical = canonicalState(state, options)
  return readPlacementForSlot(canonical, singleUnsolvedSlot(canonical)).group
}

/**
 * Enumerasi semua kelas `pairSignature` yang mungkin, dengan membangun state
 * sintetis dari `patternData` untuk satu slot F2L:
 *
 * - corner pasangan: di slot rumahnya (3 orientasi) atau di salah satu dari 4
 *   slot corner layer U (3 orientasi) → 5 × 3 = 15 konfigurasi;
 * - edge pasangan: di slot rumahnya (2 orientasi) atau di salah satu dari 4 slot
 *   edge layer U (2 orientasi) → 5 × 2 = 10 konfigurasi;
 * - cross dan slot F2L lain solved, isi layer atas sisanya tidak penting.
 *
 * 15 × 10 = 150 konfigurasi. Normalisasi putaran U: 96 both-in-u-layer / 4 = 24,
 * 24 corner-in-place / 4 = 6, 24 edge-in-place / 4 = 6, dan 6 both-in-place
 * (tidak berubah oleh AUF) → 42 kelas.
 *
 * Memerlukan `initCubeEngine()` yang sudah di-await.
 */
export function enumerateF2lPairClasses(): F2lPairEnumeration {
  const geometry = f2lGeometry()
  const slot = geometry.slots[0]

  const classCountByGroup: Record<F2lPairGroup, number> = {
    'both-in-u-layer': 0,
    'corner-in-place': 0,
    'edge-in-place': 0,
    'both-in-place': 0,
  }

  const signatures = new Set<string>()
  let configurationCount = 0

  for (const cornerPosition of [HOME, 0, 1, 2, 3]) {
    for (
      let cornerOrientation = 0;
      cornerOrientation < 3;
      cornerOrientation++
    ) {
      for (const edgePosition of [HOME, 0, 1, 2, 3]) {
        for (let edgeOrientation = 0; edgeOrientation < 2; edgeOrientation++) {
          configurationCount += 1

          const state = buildSyntheticPairState(
            slot,
            cornerPosition,
            cornerOrientation,
            edgePosition,
            edgeOrientation
          )
          const placement = readPlacementForSlot(state, slot)
          const signature = formatPlacement(placement)

          if (!signatures.has(signature)) {
            signatures.add(signature)
            classCountByGroup[placement.group] += 1
          }
        }
      }
    }
  }

  return {
    configurationCount,
    classCount: signatures.size,
    signatures: [...signatures].sort(),
    classCountByGroup,
  }
}

interface PairPlacement {
  slot: F2lSlotGeometry
  group: F2lPairGroup
  cornerPosition: number
  cornerOrientation: number
  edgePosition: number
  edgeOrientation: number
}

function slotSolved(state: CubeState, slot: F2lSlotGeometry): boolean {
  const corners = readOrbit(state, 'CORNERS')
  const edges = readOrbit(state, 'EDGES')

  return (
    corners.pieces[slot.cornerSlot] === slot.cornerSlot &&
    corners.orientation[slot.cornerSlot] === 0 &&
    edges.pieces[slot.edgeSlot] === slot.edgeSlot &&
    edges.orientation[slot.edgeSlot] === 0
  )
}

/** Slot F2L yang belum selesai, dan hanya valid bila tepat satu. */
function singleUnsolvedSlot(state: CubeState): F2lSlotGeometry {
  const geometry = f2lGeometry()

  if (!isOrbitSliceSolved(state, 'EDGES', geometry.crossEdgeSlots)) {
    throw new Error('pairSignature/pairGroup: cross belum solved')
  }

  const unsolved = geometry.slots.filter((slot) => !slotSolved(state, slot))
  if (unsolved.length !== 1) {
    throw new Error(
      `pairSignature/pairGroup: diharapkan tepat 1 slot F2L belum selesai, dapat ${unsolved.length}`
    )
  }

  return unsolved[0]
}

function readPlacementForSlot(
  state: CubeState,
  slot: F2lSlotGeometry
): PairPlacement {
  const geometry = f2lGeometry()
  const corners = readOrbit(state, 'CORNERS')
  const edges = readOrbit(state, 'EDGES')

  const cornerAt = findPieceSlot(state, 'CORNERS', slot.cornerSlot)
  const edgeAt = findPieceSlot(state, 'EDGES', slot.edgeSlot)
  if (cornerAt < 0 || edgeAt < 0) {
    throw new Error(
      `pairSignature/pairGroup: piece pasangan slot ${slot.cornerSlot} tidak ditemukan`
    )
  }

  const cornerPosition = relativePosition(
    geometry.uCornerSlots,
    slot.uCornerSlot,
    cornerAt,
    slot.cornerSlot,
    'corner'
  )
  const edgePosition = relativePosition(
    geometry.uEdgeSlots,
    slot.uEdgeSlot,
    edgeAt,
    slot.edgeSlot,
    'edge'
  )

  return {
    slot,
    group: classifyGroup(cornerPosition, edgePosition),
    cornerPosition,
    cornerOrientation: corners.orientation[cornerAt],
    edgePosition,
    edgeOrientation: edges.orientation[edgeAt],
  }
}

/**
 * Offset posisi relatif terhadap acuan slot: `HOME` bila di slot rumahnya,
 * selain itu jarak siklik (0..3) dari slot acuan pada siklus layer U.
 */
function relativePosition(
  uCycle: readonly number[],
  referenceSlot: number,
  currentSlot: number,
  homeSlot: number,
  label: string
): number {
  if (currentSlot === homeSlot) {
    return HOME
  }

  const index = uCycle.indexOf(currentSlot)
  const referenceIndex = uCycle.indexOf(referenceSlot)
  if (index < 0 || referenceIndex < 0) {
    throw new Error(
      `pairSignature/pairGroup: ${label} pasangan berada di luar layer U dan slot rumahnya`
    )
  }

  return (index - referenceIndex + uCycle.length) % uCycle.length
}

function classifyGroup(
  cornerPosition: number,
  edgePosition: number
): F2lPairGroup {
  const cornerHome = cornerPosition === HOME
  const edgeHome = edgePosition === HOME

  if (cornerHome && edgeHome) return 'both-in-place'
  if (cornerHome) return 'corner-in-place'
  if (edgeHome) return 'edge-in-place'
  return 'both-in-u-layer'
}

function formatPlacement(placement: PairPlacement): string {
  const [corner, edge] = canonicalAufPlacement(
    placement.cornerPosition,
    placement.cornerOrientation,
    placement.edgePosition,
    placement.edgeOrientation
  )

  return `${formatPosition(corner[0])}${corner[1]}|${formatPosition(edge[0])}${edge[1]}`
}

/** Representasi kanonik terhadap 4 putaran U (hanya posisi yang bergeser). */
function canonicalAufPlacement(
  cornerPosition: number,
  cornerOrientation: number,
  edgePosition: number,
  edgeOrientation: number
): [[number, number], [number, number]] {
  const rotations = f2lGeometry().uCornerSlots.length
  let best: [[number, number], [number, number]] | null = null

  for (let shift = 0; shift < rotations; shift++) {
    const candidate: [[number, number], [number, number]] = [
      [shiftPosition(cornerPosition, shift, rotations), cornerOrientation],
      [shiftPosition(edgePosition, shift, rotations), edgeOrientation],
    ]
    if (best === null || comparePlacements(candidate, best) < 0) {
      best = candidate
    }
  }

  if (best === null) {
    throw new Error('canonicalAufPlacement: tidak ada kandidat')
  }

  return best
}

function shiftPosition(
  position: number,
  shift: number,
  rotations: number
): number {
  return position === HOME ? HOME : (position + shift) % rotations
}

function comparePlacements(
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

function formatPosition(position: number): string {
  return position === HOME ? 'H' : String(position)
}

interface MutableOrbitData {
  pieces: number[]
  orientation: number[]
}

function buildSyntheticPairState(
  slot: F2lSlotGeometry,
  cornerPosition: number,
  cornerOrientation: number,
  edgePosition: number,
  edgeOrientation: number
): CubeState {
  const geometry = f2lGeometry()
  const patternData = clonePatternData(solvedState())
  const corners = patternData['CORNERS'] as MutableOrbitData
  const edges = patternData['EDGES'] as MutableOrbitData

  placePiece(
    corners,
    slot.cornerSlot,
    absoluteSlot(
      geometry.uCornerSlots,
      slot.uCornerSlot,
      cornerPosition,
      slot.cornerSlot
    ),
    cornerOrientation
  )
  placePiece(
    edges,
    slot.edgeSlot,
    absoluteSlot(
      geometry.uEdgeSlots,
      slot.uEdgeSlot,
      edgePosition,
      slot.edgeSlot
    ),
    edgeOrientation
  )

  return createCustomCubeState(patternData)
}

/** Slot absolut untuk offset posisi relatif (HOME → slot rumahnya sendiri). */
function absoluteSlot(
  uCycle: readonly number[],
  referenceSlot: number,
  position: number,
  homeSlot: number
): number {
  if (position === HOME) {
    return homeSlot
  }

  const referenceIndex = uCycle.indexOf(referenceSlot)
  return uCycle[(referenceIndex + position) % uCycle.length]
}

/** Memindahkan piece `homeSlot` ke `targetSlot` (tukar posisi) dan set orientasinya. */
function placePiece(
  orbit: MutableOrbitData,
  homeSlot: number,
  targetSlot: number,
  orientation: number
): void {
  const displaced = orbit.pieces[targetSlot]
  orbit.pieces[targetSlot] = homeSlot
  orbit.pieces[homeSlot] = displaced
  orbit.orientation[targetSlot] = orientation
}
