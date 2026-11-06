import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  f2lGeometry,
  findPieceSlot,
  initCubeEngine,
  layerSlots,
  moveAffectedSlots,
  readOrbit,
  solvedState,
} from './index.js'

describe('f2lGeometry', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('menemukan 4 slot F2L: corner layer D + edge slice E + acuan U', () => {
    const geometry = f2lGeometry()
    const layers = layerSlots()

    expect(geometry.slots).toHaveLength(4)
    expect(geometry.crossEdgeSlots).toHaveLength(4)
    expect(geometry.uCornerSlots).toHaveLength(4)
    expect(geometry.uEdgeSlots).toHaveLength(4)

    for (const slot of geometry.slots) {
      expect(layers.bottomCorners).toContain(slot.cornerSlot)
      expect(layers.uCorners).toContain(slot.uCornerSlot)
      expect(layers.uEdges).toContain(slot.uEdgeSlot)
      // edge slice E = edge yang bukan layer U dan bukan cross.
      expect(layers.uEdges).not.toContain(slot.edgeSlot)
      expect(geometry.crossEdgeSlots).not.toContain(slot.edgeSlot)
    }

    // Pemetaan satu-satu.
    expect(new Set(geometry.slots.map((s) => s.cornerSlot)).size).toBe(4)
    expect(new Set(geometry.slots.map((s) => s.edgeSlot)).size).toBe(4)
    expect(new Set(geometry.slots.map((s) => s.uCornerSlot)).size).toBe(4)
    expect(new Set(geometry.slots.map((s) => s.uEdgeSlot)).size).toBe(4)
  })

  it('urutan slot mengikuti siklus U', () => {
    const geometry = f2lGeometry()

    expect(geometry.slots.map((slot) => slot.uCornerSlot)).toEqual([
      ...geometry.uCornerSlots,
    ])
  })

  it('pasangan corner-edge satu kolom: digerakkan oleh himpunan face sisi yang sama', () => {
    const geometry = f2lGeometry()
    const sideMoves = ['L', 'R', 'F', 'B'] as const

    for (const slot of geometry.slots) {
      const movedBy = (move: (typeof sideMoves)[number]): boolean[] => [
        moveAffectedSlots(move, 'CORNERS').includes(slot.cornerSlot),
        moveAffectedSlots(move, 'EDGES').includes(slot.edgeSlot),
        moveAffectedSlots(move, 'CORNERS').includes(slot.uCornerSlot),
      ]

      for (const move of sideMoves) {
        const [corner, edge, uCorner] = movedBy(move)
        // Corner D, edge E, dan corner U acuan selalu seirama.
        expect(corner).toBe(edge)
        expect(corner).toBe(uCorner)
      }
    }
  })

  it('dihitung sekali (cache) dan stabil', () => {
    expect(f2lGeometry()).toBe(f2lGeometry())
  })

  it('crossEdgeSlots adalah 4 edge layer D', () => {
    const geometry = f2lGeometry()
    const dEdges = moveAffectedSlots('D', 'EDGES')

    expect([...geometry.crossEdgeSlots].sort()).toEqual([...dEdges].sort())
    expect(geometry.crossEdgeSlots).toHaveLength(4)
  })

  it('findPieceSlot: solved mengembalikan home slot-nya', () => {
    const solved = solvedState()

    for (const slot of f2lGeometry().slots) {
      expect(findPieceSlot(solved, 'CORNERS', slot.cornerSlot)).toBe(
        slot.cornerSlot
      )
      expect(findPieceSlot(solved, 'EDGES', slot.edgeSlot)).toBe(slot.edgeSlot)
    }
  })

  it('findPieceSlot: gerakan D memindahkan corner/edge layer D saja', () => {
    const geometry = f2lGeometry()
    const layers = layerSlots()
    const afterD = applyAlg(solvedState(), 'D')

    for (const cornerSlot of layers.bottomCorners) {
      expect(layers.bottomCorners).toContain(
        findPieceSlot(afterD, 'CORNERS', cornerSlot)
      )
    }
    for (const edgeSlot of geometry.crossEdgeSlots) {
      expect(geometry.crossEdgeSlots).toContain(
        findPieceSlot(afterD, 'EDGES', edgeSlot)
      )
    }
    // Edge slice E tidak tersentuh D.
    for (const slot of geometry.slots) {
      expect(findPieceSlot(afterD, 'EDGES', slot.edgeSlot)).toBe(slot.edgeSlot)
    }
  })

  it('readOrbit tetap bisa dipakai untuk memeriksa pasangan', () => {
    const geometry = f2lGeometry()
    const slot = geometry.slots[0]
    const solved = solvedState()
    const corners = readOrbit(solved, 'CORNERS')
    const edges = readOrbit(solved, 'EDGES')

    expect(corners.pieces[slot.cornerSlot]).toBe(slot.cornerSlot)
    expect(corners.orientation[slot.cornerSlot]).toBe(0)
    expect(edges.pieces[slot.edgeSlot]).toBe(slot.edgeSlot)
    expect(edges.orientation[slot.edgeSlot]).toBe(0)
  })
})
