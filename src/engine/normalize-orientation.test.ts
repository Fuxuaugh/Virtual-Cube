import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  clonePatternData,
  createCustomCubeState,
  equals,
  initCubeEngine,
  isOrbitSliceSolved,
  layerSlots,
  normalizeOrientation,
  readOrbit,
  solvedState,
  wholeCubeRotationAlgs,
  type CubeState,
} from './index.js'

/** State setelah menerapkan alg ('' = identitas). */
function stateAfter(alg: string, base?: CubeState): CubeState {
  const start = base ?? solvedState()
  return alg === '' ? start : applyAlg(start, alg)
}

/** PRNG sederhana dengan seed tetap supaya test deterministik. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function centersSolved(state: CubeState): boolean {
  return isOrbitSliceSolved(state, 'CENTERS', layerSlots().centers)
}

describe('normalizeOrientation', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('menurunkan 24 orientasi seluruh kubus dari gerakan x/y/z', () => {
    const algs = wholeCubeRotationAlgs()

    expect(algs).toHaveLength(24)
    expect(new Set(algs).size).toBe(24)
    expect(algs).toContain('')

    const centerKeys = algs.map((alg) =>
      readOrbit(stateAfter(alg), 'CENTERS').pieces.join(',')
    )
    expect(new Set(centerKeys).size).toBe(24)
  })

  it('solved: tidak berubah', () => {
    expect(equals(normalizeOrientation(solvedState()), solvedState())).toBe(
      true
    )
  })

  it('setiap rotasi x/y/z dinormalisasi kembali ke solved identik', () => {
    for (const alg of wholeCubeRotationAlgs()) {
      const rotated = stateAfter(alg)
      expect(equals(normalizeOrientation(rotated), solvedState())).toBe(true)
    }
  })

  it('rotasi tidak mengubah posisi relatif piece: state terputar kembali ke state asalnya', () => {
    const base = applyAlg(solvedState(), "R U R' U'")

    for (const alg of wholeCubeRotationAlgs()) {
      const rotated = stateAfter(alg, base)
      expect(equals(normalizeOrientation(rotated), base)).toBe(true)
    }
  })

  it("x lalu x' kembali ke solved identik", () => {
    const state = applyAlg(applyAlg(solvedState(), 'x'), "x'")
    expect(equals(state, solvedState())).toBe(true)
    expect(equals(normalizeOrientation(state), solvedState())).toBe(true)
  })

  it('idempoten', () => {
    const state = applyAlg(solvedState(), "R U R' U' x2 y'")
    const once = normalizeOrientation(state)
    expect(equals(normalizeOrientation(once), once)).toBe(true)
    expect(centersSolved(once)).toBe(true)
  })

  it('M2 U M2: center sudah kembali ke slot asal, normalisasi tidak mengubah state', () => {
    const state = applyAlg(solvedState(), 'M2 U M2')

    // M pada model cubing menggeser center seperti x' (permutasi center sama),
    // jadi M2 menggeser center seperti x2 dan M2 U M2 = identitas pada center.
    expect(centersSolved(state)).toBe(true)
    expect(equals(normalizeOrientation(state), state)).toBe(true)

    // M2 U M2 bukan state solved: hanya center-nya yang tidak bergeser.
    expect(equals(state, solvedState())).toBe(false)
  })

  it('M: center bergeser seperti x; normalisasi mengembalikan center ke slot asal', () => {
    const state = applyAlg(solvedState(), 'M')

    expect(centersSolved(state)).toBe(false)
    expect(readOrbit(state, 'CENTERS').pieces).toEqual(
      readOrbit(applyAlg(solvedState(), "x'"), 'CENTERS').pieces
    )

    const normalized = normalizeOrientation(state)
    expect(centersSolved(normalized)).toBe(true)
    // Sisa state tidak ikut "solved": M memindahkan 4 edge.
    expect(equals(normalized, solvedState())).toBe(false)
  })

  it('rotasi acak (seed tetap) dinormalisasi ke state tanpa rotasi', () => {
    const random = seededRandom(20261106)
    const bases = [solvedState(), applyAlg(solvedState(), "R U R' U'")]

    for (const base of bases) {
      for (let i = 0; i < 20; i++) {
        const moves: string[] = []
        const length = 1 + Math.floor(random() * 4)
        for (let j = 0; j < length; j++) {
          const axis = ['x', 'y', 'z'][Math.floor(random() * 3)]
          const suffix = ['', "'", '2'][Math.floor(random() * 3)]
          moves.push(`${axis}${suffix}`)
        }

        const rotated = applyAlg(base, moves.join(' '))
        expect(equals(normalizeOrientation(rotated), base)).toBe(true)
      }
    }
  })

  it('center di luar 24 orientasi rotasi: state dikembalikan apa adanya', () => {
    const patternData = clonePatternData(solvedState())
    const [first, second] = patternData['CENTERS'].pieces
    patternData['CENTERS'].pieces[0] = second
    patternData['CENTERS'].pieces[1] = first

    const state = createCustomCubeState(patternData)
    expect(centersSolved(state)).toBe(false)
    expect(equals(normalizeOrientation(state), state)).toBe(true)
  })
})
