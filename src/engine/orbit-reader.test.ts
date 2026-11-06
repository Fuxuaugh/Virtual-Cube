import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  initCubeEngine,
  isOrbitSliceSolved,
  layerSlots,
  readOrbit,
  solvedState,
} from './index.js'

describe('orbit reader', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('layerSlots: 4 corner U, 4 edge U, 4 corner bawah, 8 edge bawah, 6 center', () => {
    const slots = layerSlots()

    expect(slots.uCorners).toHaveLength(4)
    expect(slots.uEdges).toHaveLength(4)
    expect(slots.bottomCorners).toHaveLength(4)
    expect(slots.bottomEdges).toHaveLength(8)
    expect(slots.centers).toHaveLength(6)

    // Semua slot corner dan edge terpakai tepat sekali.
    expect(new Set([...slots.uCorners, ...slots.bottomCorners]).size).toBe(8)
    expect(new Set([...slots.uEdges, ...slots.bottomEdges]).size).toBe(12)

    // Layer U dan dua layer bawah tidak beririsan.
    expect(
      slots.uCorners.filter((s) => slots.bottomCorners.includes(s))
    ).toEqual([])
    expect(slots.uEdges.filter((s) => slots.bottomEdges.includes(s))).toEqual(
      []
    )
  })

  it('solved: seluruh slice solved', () => {
    const solved = solvedState()
    const slots = layerSlots()

    expect(isOrbitSliceSolved(solved, 'CORNERS', slots.uCorners)).toBe(true)
    expect(isOrbitSliceSolved(solved, 'EDGES', slots.uEdges)).toBe(true)
    expect(isOrbitSliceSolved(solved, 'CORNERS', slots.bottomCorners)).toBe(
      true
    )
    expect(isOrbitSliceSolved(solved, 'EDGES', slots.bottomEdges)).toBe(true)
    expect(isOrbitSliceSolved(solved, 'CENTERS', slots.centers)).toBe(true)
  })

  it('U: memutar layer U tanpa mengubah orientasi; dua layer bawah tetap solved', () => {
    const slots = layerSlots()
    const afterU = applyAlg(solvedState(), 'U')

    expect(isOrbitSliceSolved(afterU, 'CORNERS', slots.uCorners)).toBe(false)
    expect(isOrbitSliceSolved(afterU, 'EDGES', slots.uEdges)).toBe(false)
    expect(isOrbitSliceSolved(afterU, 'CORNERS', slots.bottomCorners)).toBe(
      true
    )
    expect(isOrbitSliceSolved(afterU, 'EDGES', slots.bottomEdges)).toBe(true)
    expect(isOrbitSliceSolved(afterU, 'CENTERS', slots.centers)).toBe(true)

    // Gerakan U punya orientationDelta 0, jadi orientasi tidak berubah.
    expect(readOrbit(afterU, 'CORNERS').orientation).toEqual(
      readOrbit(solvedState(), 'CORNERS').orientation
    )
    expect(
      readOrbit(afterU, 'EDGES').orientation.every((ori) => ori === 0)
    ).toBe(true)
  })

  it('urutan slot layer U mengikuti arah gerakan U', () => {
    const slots = layerSlots()
    const afterU = applyAlg(solvedState(), 'U')
    const corners = readOrbit(afterU, 'CORNERS').pieces
    const edges = readOrbit(afterU, 'EDGES').pieces

    for (let i = 0; i < slots.uCorners.length; i++) {
      const next = (i + 1) % slots.uCorners.length
      expect(corners[slots.uCorners[next]]).toBe(slots.uCorners[i])
      expect(edges[slots.uEdges[next]]).toBe(slots.uEdges[i])
    }
  })

  it('U tidak memindahkan piece antar layer', () => {
    const slots = layerSlots()
    const uCornerSet = new Set(slots.uCorners)
    const pieces = readOrbit(applyAlg(solvedState(), 'U'), 'CORNERS').pieces

    for (const slot of slots.uCorners) {
      expect(uCornerSet.has(pieces[slot])).toBe(true)
    }
  })

  it('R: mengubah twist corner dan mencampur dua layer bawah', () => {
    const slots = layerSlots()
    const afterR = applyAlg(solvedState(), 'R')

    expect(
      readOrbit(afterR, 'CORNERS').orientation.some((ori) => ori !== 0)
    ).toBe(true)
    expect(isOrbitSliceSolved(afterR, 'CORNERS', slots.bottomCorners)).toBe(
      false
    )
    expect(isOrbitSliceSolved(afterR, 'EDGES', slots.bottomEdges)).toBe(false)
  })

  it('readOrbit mengembalikan salinan, bukan array internal patternData', () => {
    const solved = solvedState()
    const data = readOrbit(solved, 'CORNERS')
    data.pieces[0] = 99
    data.orientation[0] = 2

    const again = readOrbit(solved, 'CORNERS')
    expect(again.pieces[0]).toBe(0)
    expect(again.orientation[0]).toBe(0)
  })

  it('rotasi seluruh kubus memindahkan center dari slot asalnya', () => {
    for (const rotation of ['x', 'y', 'z']) {
      const state = applyAlg(solvedState(), rotation)
      expect(isOrbitSliceSolved(state, 'CENTERS', layerSlots().centers)).toBe(
        false
      )
    }
  })
})
