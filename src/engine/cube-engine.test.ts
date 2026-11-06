import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  equals,
  initCubeEngine,
  invertAlg,
  isSolved,
  solvedState,
  validateAlg,
} from './index.js'

describe('CubeEngine Adapter', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('initCubeEngine is idempotent and safe to call multiple times', async () => {
    await expect(initCubeEngine()).resolves.toBeUndefined()
    await expect(initCubeEngine()).resolves.toBeUndefined()
    expect(solvedState()).toBeDefined()
  })

  describe('Move dasar X in U D L R F B', () => {
    const BASE_MOVES = ['U', 'D', 'L', 'R', 'F', 'B']

    for (const m of BASE_MOVES) {
      it(`${m}: diulang 4 kali identik dengan solved`, () => {
        const solved = solvedState()
        let s = solved
        for (let i = 0; i < 4; i++) {
          s = applyAlg(s, m)
        }
        expect(equals(s, solved)).toBe(true)
        expect(isSolved(s, { strict: true })).toBe(true)
      })

      it(`${m}: ${m} lalu ${m}' kembali ke solved`, () => {
        const solved = solvedState()
        const s = applyAlg(applyAlg(solved, m), `${m}'`)
        expect(equals(s, solved)).toBe(true)
        expect(isSolved(s, { strict: true })).toBe(true)
      })

      it(`${m}: ${m}2 ekuivalen dengan ${m} dua kali`, () => {
        const solved = solvedState()
        const sDouble = applyAlg(solved, `${m}2`)
        const sTwice = applyAlg(applyAlg(solved, m), m)
        expect(equals(sDouble, sTwice)).toBe(true)
      })
    }
  })

  describe('Pengulangan algoritma siklis (order)', () => {
    it("(R U R' U') diulang 6 kali = solved", () => {
      const solved = solvedState()
      let s = solved
      for (let i = 0; i < 6; i++) {
        s = applyAlg(s, "R U R' U'")
      }
      expect(equals(s, solved)).toBe(true)
      expect(isSolved(s, { strict: true })).toBe(true)
    })

    it("Sune (R U R' U R U2 R') diulang 6 kali = solved", () => {
      const solved = solvedState()
      let s = solved
      for (let i = 0; i < 6; i++) {
        s = applyAlg(s, "R U R' U R U2 R'")
      }
      expect(equals(s, solved)).toBe(true)
      expect(isSolved(s, { strict: true })).toBe(true)
    })

    it('T-perm diulang 2 kali = solved', () => {
      const solved = solvedState()
      const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'"
      let s = solved
      for (let i = 0; i < 2; i++) {
        s = applyAlg(s, tPerm)
      }
      expect(equals(s, solved)).toBe(true)
      expect(isSolved(s, { strict: true })).toBe(true)
    })
  })

  describe('alg + invertAlg(alg) = solved (25 fixed algorithms)', () => {
    const FIXED_ALGS = [
      // Face moves
      "R U R' U'",
      "R U R' U R U2 R'",
      "R U R' U' R' F R2 U' R' U' R U R' F'",
      "F R U R' U' F'",
      "R U2 R' U' R U' R'",
      "L' U' L U' L' U2 L",
      // Wide moves
      "r U R' U' r' F R F'",
      "l' U' L U l F' L' F",
      "f R U R' U' f'",
      "r U2 R' U' R U' r'",
      "u R U' R' u'",
      "d2 R U R' d2",
      // Slice moves
      'M2 U M2 U2 M2 U M2',
      "M' U M U2 M' U M",
      'M2 E2 S2',
      "S R U R' U' S'",
      "E R U R' U' E'",
      "M2 U' M U2 M' U' M2",
      // Rotations
      'y x',
      "z2 y'",
      "x' R U R' U' x",
      'y2 M2 U M2 U2 M2 U M2 y2',
      // Double moves
      'R2 U2 R2 U2 R2',
      'F2 D2 B2 U2 L2',
      'D2 F2 R2 B2',
    ]

    for (const alg of FIXED_ALGS) {
      it(`alg + invertAlg returns to solved for "${alg}"`, () => {
        const solved = solvedState()
        const inv = invertAlg(alg)
        const afterAlg = applyAlg(solved, alg)
        const afterInv = applyAlg(afterAlg, inv)
        expect(equals(afterInv, solved)).toBe(true)
        expect(isSolved(afterInv, { strict: true })).toBe(true)
      })
    }
  })

  describe('alg + invertAlg(alg) = solved (200 algoritma acak seed tetap)', () => {
    // Mulberry32 PRNG dengan seed deterministik
    function createRng(seed: number) {
      let s = seed >>> 0
      return function next(): number {
        s = Math.imul(s ^ (s >>> 15), 1 | s) >>> 0
        s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s
        return ((s ^ (s >>> 14)) >>> 0) / 4294967296
      }
    }

    function generateRandomAlg(rng: () => number, length: number): string {
      const families = [
        'U',
        'D',
        'L',
        'R',
        'F',
        'B',
        'u',
        'd',
        'l',
        'r',
        'f',
        'b',
        'M',
        'E',
        'S',
        'x',
        'y',
        'z',
      ]
      const modifiers = ['', "'", '2']
      const moves: string[] = []
      for (let i = 0; i < length; i++) {
        const fam = families[Math.floor(rng() * families.length)]
        const mod = modifiers[Math.floor(rng() * modifiers.length)]
        moves.push(fam + mod)
      }
      return moves.join(' ')
    }

    it('200 pseudo-random algorithms return to solved with their inverse', () => {
      const solved = solvedState()
      const rng = createRng(123456789)
      for (let i = 0; i < 200; i++) {
        const length = 8 + (i % 15)
        const alg = generateRandomAlg(rng, length)
        const inv = invertAlg(alg)
        const state = applyAlg(applyAlg(solved, alg), inv)
        expect(equals(state, solved)).toBe(true)
        expect(isSolved(state, { strict: true })).toBe(true)
      }
    })
  })

  describe('Rotasi seluruh cube (x, y, z dan kombinasi)', () => {
    const ROTATIONS = [
      'x',
      'y',
      'z',
      "x'",
      "y'",
      "z'",
      'x2',
      'y2',
      'z2',
      'x y',
      'y z',
      'z x',
      'y x',
      'z y',
      'x z',
      'x y z',
      "x' y2 z",
    ]

    for (const rot of ROTATIONS) {
      it(`rotation "${rot}": equals false, isSolved true, isSolved strict false`, () => {
        const solved = solvedState()
        const rotated = applyAlg(solved, rot)
        expect(equals(rotated, solved)).toBe(false)
        expect(isSolved(rotated)).toBe(true)
        expect(isSolved(rotated, { strict: false })).toBe(true)
        expect(isSolved(rotated, { strict: true })).toBe(false)
      })
    }
  })

  describe('Single layer move', () => {
    const LAYER_MOVES = [
      'U',
      "U'",
      'U2',
      'D',
      "D'",
      'D2',
      'L',
      "L'",
      'L2',
      'R',
      "R'",
      'R2',
      'F',
      "F'",
      'F2',
      'B',
      "B'",
      'B2',
    ]

    for (const m of LAYER_MOVES) {
      it(`single layer move "${m}": isSolved false (baik default maupun strict)`, () => {
        const solved = solvedState()
        const s = applyAlg(solved, m)
        expect(isSolved(s)).toBe(false)
        expect(isSolved(s, { strict: true })).toBe(false)
      })
    }
  })

  describe('Algoritma tidak valid melempar error', () => {
    const INVALID_ALGS = ['Q', 'R U BadMove', 'R++', 'U3', 'X2', '???', 'R 5']

    for (const bad of INVALID_ALGS) {
      it(`validateAlg melempar error pada "${bad}"`, () => {
        expect(() => validateAlg(bad)).toThrow()
      })

      it(`applyAlg melempar error pada "${bad}"`, () => {
        const solved = solvedState()
        expect(() => applyAlg(solved, bad)).toThrow()
      })

      it(`invertAlg melempar error pada "${bad}"`, () => {
        expect(() => invertAlg(bad)).toThrow()
      })
    }
  })
})
