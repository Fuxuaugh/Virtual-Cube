/**
 * Test untuk pose mentah (`buildCaseStateRaw`) — dipakai verifikasi "algoritma
 * menyelesaikan case", terutama untuk algoritma dengan rotasi seluruh kubus netto.
 *
 * Fixture di sini buatan sendiri; BUKAN data F2L/OLL/PLL sungguhan.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  equals,
  initCubeEngine,
  isOrbitSliceSolved,
  layerSlots,
  solvedState,
} from '../../engine/index.js'
import type { TrainingCase } from '../training-case.js'
import { buildCaseState, buildCaseStateRaw } from './case-state.js'

/** Fixture tanpa rotasi: pose mentah dan pose ternormalisasi sama. */
const FIXTURE_PLAIN: TrainingCase = {
  id: 'FIXTURE-RAW-1',
  category: 'F2L',
  name: 'Fixture mentah tanpa rotasi (bukan case asli)',
  algorithm: "R U R' U'",
  inverseAlgorithm: "U R U' R'",
  alternatives: [],
  source: 'test fixture (bukan sumber algoritma)',
  tags: [],
}

/** Fixture dengan rotasi seluruh kubus netto pada inverseAlgorithm. */
const FIXTURE_ROTATED: TrainingCase = {
  id: 'FIXTURE-RAW-2',
  category: 'PLL',
  name: 'Fixture mentah berotasi (bukan case asli)',
  algorithm: "R U R' U' x'",
  inverseAlgorithm: "x U R U' R'",
  alternatives: [],
  source: 'test fixture (bukan sumber algoritma)',
  tags: [],
}

function centersInHomeSlots(state: ReturnType<typeof solvedState>): boolean {
  return isOrbitSliceSolved(state, 'CENTERS', layerSlots().centers)
}

describe('buildCaseStateRaw', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('adalah solved + inverseAlgorithm tanpa normalisasi', () => {
    expect(
      equals(
        buildCaseStateRaw(FIXTURE_PLAIN),
        applyAlg(solvedState(), FIXTURE_PLAIN.inverseAlgorithm)
      )
    ).toBe(true)
  })

  it('algoritma mengembalikan pose mentah ke solved persis', () => {
    for (const fixture of [FIXTURE_PLAIN, FIXTURE_ROTATED]) {
      const after = applyAlg(buildCaseStateRaw(fixture), fixture.algorithm)
      expect(equals(after, solvedState())).toBe(true)
    }
  })

  it('tanpa rotasi netto: pose mentah = pose ternormalisasi', () => {
    expect(
      equals(buildCaseStateRaw(FIXTURE_PLAIN), buildCaseState(FIXTURE_PLAIN))
    ).toBe(true)
    expect(centersInHomeSlots(buildCaseStateRaw(FIXTURE_PLAIN))).toBe(true)
  })

  it('dengan rotasi netto: pose mentah berbeda dan center belum di slot asal', () => {
    const raw = buildCaseStateRaw(FIXTURE_ROTATED)
    const normalized = buildCaseState(FIXTURE_ROTATED)

    expect(centersInHomeSlots(raw)).toBe(false)
    expect(equals(raw, normalized)).toBe(false)
    expect(centersInHomeSlots(normalized)).toBe(true)

    // Yang penting untuk verifikasi: pose mentah tetap state yang sama secara
    // relatif — hanya diputar — sehingga alg menyelesaikannya persis.
    expect(
      equals(applyAlg(raw, FIXTURE_ROTATED.algorithm), solvedState())
    ).toBe(true)
  })
})
