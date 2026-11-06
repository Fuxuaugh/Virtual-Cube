/**
 * Verifikasi otomatis Case Generator (PRD §7, MILESTONES M4.3).
 *
 * Parametrik untuk seluruh 119 case (41 F2L + 57 OLL + 21 PLL) yang dibaca dari
 * `src/data/*.json` sungguhan. Data dasar TIDAK diubah.
 *
 * Yang diuji per case:
 * 1. setup + algoritma mengembalikan cube ke solved, memperhitungkan AUF
 *    (AUF penyelarasan dicari dari 4 kemungkinan, bukan dari generator);
 * 2. state setup lulus State Validator (permutasi, orientasi, parity);
 * 3. kondisi awal sesuai kategori (F2L/OLL/PLL, PRD §7.2-§7.4).
 *
 * Ditambah pemeriksaan agregat: keunikan state OLL (57) dan PLL (21), pengaruh
 * keempat opsi AUF terhadap signature, determinisme sumber acak, dan pemuatan
 * lewat `loadCases()`.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import f2lJsonText from '../../data/f2l.json?raw'
import ollJsonText from '../../data/oll.json?raw'
import pllJsonText from '../../data/pll.json?raw'
import {
  applyAlg,
  equals,
  initCubeEngine,
  isSolved,
  solvedState,
  validateState,
} from '../../engine/index.js'
import { loadCases } from '../load-cases.js'
import type { CaseCategory, TrainingCase } from '../training-case.js'
import {
  crossSolved,
  f2lSolved,
  ollSignature,
  pairSignature,
  pllSignature,
  SOLVED_OLL_SIGNATURE,
  unsolvedSlots,
} from '../verification/index.js'
import {
  AUF_OPTIONS,
  findAlignmentAuf,
  generateCase,
  generateF2lCase,
  generateOllCase,
  generatePllCase,
  solveGeneratedCase,
  type Auf,
  type GeneratedCase,
} from './case-generator.js'

const casesByCategory: Readonly<Record<CaseCategory, TrainingCase[]>> = {
  F2L: JSON.parse(f2lJsonText) as TrainingCase[],
  OLL: JSON.parse(ollJsonText) as TrainingCase[],
  PLL: JSON.parse(pllJsonText) as TrainingCase[],
}

const ALL_CASES: readonly TrainingCase[] = [
  ...casesByCategory.F2L,
  ...casesByCategory.OLL,
  ...casesByCategory.PLL,
]

/** PRNG sederhana dengan seed tetap supaya test deterministik. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

/** Signature case sesuai kategorinya (dipakai pemeriksaan agregat). */
function signatureOf(generated: GeneratedCase): string {
  switch (generated.trainingCase.category) {
    case 'F2L':
      return pairSignature(generated.setupState)
    case 'OLL':
      return ollSignature(generated.setupState)
    case 'PLL':
      return pllSignature(generated.setupState)
  }
}

describe('Case Generator', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('data 119 case dimuat lewat loadCases() tanpa mengubah data', async () => {
    const f2l = await loadCases('F2L')
    const oll = await loadCases('OLL')
    const pll = await loadCases('PLL')

    expect(f2l).toHaveLength(41)
    expect(oll).toHaveLength(57)
    expect(pll).toHaveLength(21)
    expect(f2l.length + oll.length + pll.length).toBe(119)

    expect(oll.map((item) => item.id)).toEqual(
      casesByCategory.OLL.map((item) => item.id)
    )
  })

  it('keempat opsi AUF tidak mengubah signature case', () => {
    for (const trainingCase of ALL_CASES) {
      const baseline = signatureOf(generateCase(trainingCase, { auf: '' }))

      for (const auf of AUF_OPTIONS) {
        const generated = generateCase(trainingCase, { auf })
        expect(generated.auf).toBe(auf)
        expect(signatureOf(generated)).toBe(baseline)
        expect(validateState(generated.setupState).valid).toBe(true)
      }
    }
  })

  it('AUF benar-benar diterapkan pada setup state (kecuali opsi kosong)', () => {
    for (const trainingCase of ALL_CASES) {
      const withAuf = generateCase(trainingCase, { auf: 'U' })
      const withoutAuf = generateCase(trainingCase, { auf: '' })

      expect(equals(withAuf.setupState, withoutAuf.setupState)).toBe(false)
      expect(withAuf.alignmentAuf).toBe("U'")
      expect(withoutAuf.alignmentAuf).toBe('')
    }
  })

  it('OLL: 57 state generator unik (memperhitungkan AUF)', () => {
    const signatures = casesByCategory.OLL.map((item, index) =>
      ollSignature(
        generateCase(item, {
          auf: 'random',
          random: seededRandom(1000 + index),
        }).setupState
      )
    )

    expect(signatures).toHaveLength(57)
    expect(new Set(signatures).size).toBe(57)
    expect(signatures).not.toContain(SOLVED_OLL_SIGNATURE)
  })

  it('PLL: 21 state generator unik (memperhitungkan AUF)', () => {
    const signatures = casesByCategory.PLL.map((item, index) =>
      pllSignature(
        generateCase(item, {
          auf: 'random',
          random: seededRandom(2000 + index),
        }).setupState
      )
    )

    expect(signatures).toHaveLength(21)
    expect(new Set(signatures).size).toBe(21)
    expect(signatures).not.toContain(pllSignature(solvedState()))
  })

  it('sumber acak dengan seed sama menghasilkan setup yang sama', () => {
    const first = generateCase(casesByCategory.OLL[0], {
      auf: 'random',
      random: seededRandom(42),
    })
    const second = generateCase(casesByCategory.OLL[0], {
      auf: 'random',
      random: seededRandom(42),
    })

    expect(first.auf).toBe(second.auf)
    expect(equals(first.setupState, second.setupState)).toBe(true)
  })

  it('generator per kategori menolak case kategori lain', () => {
    const ollCase = casesByCategory.OLL[0]
    const f2lCase = casesByCategory.F2L[0]

    expect(() => generateF2lCase(ollCase)).toThrow(/F2L/)
    expect(() => generateOllCase(f2lCase)).toThrow(/OLL/)
    expect(() => generatePllCase(f2lCase)).toThrow(/PLL/)
  })

  for (const [index, trainingCase] of ALL_CASES.entries()) {
    const category = trainingCase.category

    it(`${trainingCase.id} (${category}): setup + algoritma kembali solved (memperhitungkan AUF)`, () => {
      const generated = generateCase(trainingCase, {
        auf: 'random',
        random: seededRandom(7000 + index),
      })

      // AUF penyelarasan dicari sendiri dari 4 kemungkinan (tidak dipercaya
      // begitu saja dari generator).
      const alignment = findAlignmentAuf(generated)
      expect(alignment).toBeDefined()
      expect(alignment).toBe(generated.alignmentAuf)

      expect(equals(solveGeneratedCase(generated), solvedState())).toBe(true)
      expect(isSolved(solveGeneratedCase(generated))).toBe(true)

      if (category === 'OLL') {
        expect(ollSignature(solveGeneratedCase(generated))).toBe(
          SOLVED_OLL_SIGNATURE
        )
      }
      if (category === 'PLL') {
        expect(pllSignature(solveGeneratedCase(generated))).toBe(
          pllSignature(solvedState())
        )
      }
      if (category === 'F2L') {
        expect(f2lSolved(solveGeneratedCase(generated))).toBe(true)
      }
    })

    it(`${trainingCase.id} (${category}): state setup legal menurut State Validator`, () => {
      const generated = generateCase(trainingCase, { auf: 'U2' })

      expect(validateState(generated.setupState).valid).toBe(true)
      expect(validateState(generated.displayState).valid).toBe(true)
    })

    it(`${trainingCase.id} (${category}): kondisi awal sesuai kategori`, () => {
      const generated = generateCase(trainingCase, { auf: 'U' })

      if (category === 'F2L') {
        expect(crossSolved(generated.setupState)).toBe(true)
        expect(unsolvedSlots(generated.setupState)).toHaveLength(1)
        expect(f2lSolved(generated.setupState)).toBe(false)
        return
      }

      expect(f2lSolved(generated.setupState)).toBe(true)

      if (category === 'OLL') {
        expect(ollSignature(generated.setupState)).not.toBe(
          SOLVED_OLL_SIGNATURE
        )
        return
      }

      expect(ollSignature(generated.setupState)).toBe(SOLVED_OLL_SIGNATURE)
      expect(pllSignature(generated.setupState)).not.toBe(
        pllSignature(solvedState())
      )
    })
  }
})

describe('Case Generator - pencarian AUF penyelarasan', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('setiap AUF punya penyelarasan yang membuat cube solved', () => {
    for (const auf of AUF_OPTIONS) {
      const generated = generateCase(casesByCategory.PLL[0], { auf })
      const solution = applyAlg(
        generated.setupState,
        `${generated.alignmentAuf} ${generated.trainingCase.algorithm}`.trim()
      )

      expect(equals(solution, solvedState())).toBe(true)
    }
  })

  it('alignmentAuf adalah kebalikan AUF yang dipakai', () => {
    const expected: Readonly<Record<Auf, Auf>> = {
      '': '',
      U: "U'",
      "U'": 'U',
      U2: 'U2',
    }

    for (const auf of AUF_OPTIONS) {
      expect(generateCase(casesByCategory.OLL[0], { auf }).alignmentAuf).toBe(
        expected[auf]
      )
    }
  })
})
