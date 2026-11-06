import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  equals,
  initCubeEngine,
  solvedState,
  validateState,
} from '../../engine/index.js'
import type { TrainingCase } from '../training-case.js'
import { buildCaseState } from './case-state.js'
import { f2lSolved } from './f2l-solved.js'

/** Case buatan untuk test ini; BUKAN data F2L/OLL/PLL sungguhan. */
const FIXTURE: TrainingCase = {
  id: 'FIXTURE-1',
  category: 'F2L',
  name: 'Fixture satu (bukan case asli)',
  algorithm: "R U R' U'",
  inverseAlgorithm: "U R U' R'",
  alternatives: [],
  source: 'test fixture (bukan sumber algoritma)',
  tags: [],
}

describe('buildCaseState', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('menerapkan inverseAlgorithm ke solved, bukan algorithm', () => {
    const fromInverse = applyAlg(solvedState(), FIXTURE.inverseAlgorithm)
    const fromAlgorithm = applyAlg(solvedState(), FIXTURE.algorithm)
    const built = buildCaseState(FIXTURE)

    expect(equals(built, fromInverse)).toBe(true)
    expect(equals(built, fromAlgorithm)).toBe(false)
  })

  it('algoritma case mengembalikan state case ke solved', () => {
    const state = buildCaseState(FIXTURE)
    expect(equals(applyAlg(state, FIXTURE.algorithm), solvedState())).toBe(true)
  })

  it('menghasilkan state yang legal menurut State Validator', () => {
    expect(validateState(buildCaseState(FIXTURE)).valid).toBe(true)
  })

  it('state FIXTURE-1 bukan F2L solved', () => {
    expect(f2lSolved(buildCaseState(FIXTURE))).toBe(false)
  })
})
