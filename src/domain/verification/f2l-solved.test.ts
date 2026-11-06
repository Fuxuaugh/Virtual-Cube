import { beforeAll, describe, expect, it } from 'vitest'
import { applyAlg, initCubeEngine, solvedState } from '../../engine/index.js'
import { f2lSolved } from './f2l-solved.js'

describe('f2lSolved', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('solved: true', () => {
    expect(f2lSolved(solvedState())).toBe(true)
  })

  it("U, U', U2 di awal: tetap true", () => {
    for (const auf of ['U', "U'", 'U2']) {
      expect(f2lSolved(applyAlg(solvedState(), auf))).toBe(true)
    }
  })

  it('state hasil "R U R\' U\'": false', () => {
    expect(f2lSolved(applyAlg(solvedState(), "R U R' U'"))).toBe(false)
  })

  it('D dan M (dua layer bawah ikut berputar): false', () => {
    expect(f2lSolved(applyAlg(solvedState(), 'D'))).toBe(false)
    expect(f2lSolved(applyAlg(solvedState(), 'D2'))).toBe(false)
    expect(f2lSolved(applyAlg(solvedState(), 'M'))).toBe(false)
  })

  it('D diulang 4 kali kembali true', () => {
    const state = applyAlg(solvedState(), 'D D D D')
    expect(f2lSolved(state)).toBe(true)
  })

  it('rotasi seluruh kubus: default true (dinormalisasi), strict false', () => {
    for (const rotation of ['x', 'y', 'z']) {
      const state = applyAlg(solvedState(), rotation)
      expect(f2lSolved(state)).toBe(true)
      expect(f2lSolved(state, { strict: true })).toBe(false)
    }
  })
})
