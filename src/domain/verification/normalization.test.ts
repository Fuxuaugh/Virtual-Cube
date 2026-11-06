import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  equals,
  initCubeEngine,
  solvedState,
} from '../../engine/index.js'
import type { TrainingCase } from '../training-case.js'
import { buildCaseState } from './case-state.js'
import { f2lSolved } from './f2l-solved.js'
import { canonicalState } from './options.js'
import {
  ollSignature,
  pllSignature,
  SOLVED_OLL_SIGNATURE,
} from './signatures.js'

/** Case buatan untuk test ini; BUKAN data F2L/OLL/PLL sungguhan. */
const ROTATION_FIXTURE: TrainingCase = {
  id: 'FIXTURE-2',
  category: 'OLL',
  name: 'Fixture dua (bukan case asli)',
  algorithm: 'x',
  inverseAlgorithm: "x'",
  alternatives: [],
  source: 'test fixture (bukan sumber algoritma)',
  tags: [],
}

/** inverseAlgorithm dengan slice + rotasi netto yang menggeser center. */
const ROTATED_SETUP_FIXTURE: TrainingCase = {
  id: 'FIXTURE-3',
  category: 'F2L',
  name: 'Fixture tiga (bukan case asli)',
  algorithm: "x' R U R' U'",
  inverseAlgorithm: "U R U' R' x",
  alternatives: [],
  source: 'test fixture (bukan sumber algoritma)',
  tags: [],
}

const ROTATIONS = ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2']

describe('verifikasi dengan normalisasi orientasi', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('f2lSolved true untuk state yang seluruh kubusnya diputar tetapi layer bawahnya solved', () => {
    for (const rotation of ROTATIONS) {
      const state = applyAlg(solvedState(), rotation)
      expect(f2lSolved(state)).toBe(true)
      expect(f2lSolved(state, { strict: true })).toBe(false)
    }
  })

  it('slice yang netto bukan rotasi murni tidak dianggap solved', () => {
    for (const alg of ['M', 'M2 U M2', 'M2 x2']) {
      const state = applyAlg(solvedState(), alg)
      expect(f2lSolved(state)).toBe(false)
      expect(f2lSolved(state, { strict: true })).toBe(false)
    }
  })

  it('canonicalState mengembalikan state tanpa rotasi; strict mengembalikan apa adanya', () => {
    const base = applyAlg(solvedState(), "R U R' U'")
    const rotated = applyAlg(base, "y x'")

    expect(equals(canonicalState(rotated), base)).toBe(true)
    expect(equals(canonicalState(rotated, { strict: true }), rotated)).toBe(
      true
    )
  })

  it('ollSignature dan pllSignature tidak berubah oleh rotasi seluruh kubus', () => {
    const base = applyAlg(solvedState(), "R U R' U'")

    for (const rotation of ROTATIONS) {
      const rotated = applyAlg(base, rotation)
      expect(ollSignature(rotated)).toBe(ollSignature(base))
      expect(pllSignature(rotated)).toBe(pllSignature(base))
    }
  })

  it('strict: signature dihitung pada frame state apa adanya', () => {
    const rotated = applyAlg(solvedState(), 'x')

    expect(ollSignature(rotated)).toBe(SOLVED_OLL_SIGNATURE)
    expect(ollSignature(rotated, { strict: true })).not.toBe(
      SOLVED_OLL_SIGNATURE
    )

    expect(pllSignature(rotated)).toBe(pllSignature(solvedState()))
    expect(pllSignature(rotated, { strict: true })).not.toBe(
      pllSignature(solvedState())
    )
  })

  it('buildCaseState mengembalikan state yang sudah dinormalisasi', () => {
    // inverseAlgorithm "x'" hanya memutar seluruh kubus → state solved.
    expect(equals(buildCaseState(ROTATION_FIXTURE), solvedState())).toBe(true)

    // inverseAlgorithm "U R U' R' x" → rotasi x dinormalisasi keluar.
    const expected = applyAlg(solvedState(), "U R U' R'")
    expect(equals(buildCaseState(ROTATED_SETUP_FIXTURE), expected)).toBe(true)
    expect(f2lSolved(buildCaseState(ROTATED_SETUP_FIXTURE))).toBe(false)
  })
})
