import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  calculateParity,
  clonePatternData,
  createCustomCubeState,
  initCubeEngine,
  solvedState,
  unwrapCubeState,
  validateState,
} from './index.js'

describe('State Validator (Task 2.6 & 2.7)', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('state awal (solved) adalah valid tanpa error', () => {
    const solved = solvedState()
    const res = validateState(solved)
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
  })

  describe('Diagnostik Paritas untuk Satu Gerakan dari Solved (Langkah 1)', () => {
    const families = [
      'U',
      'D',
      'L',
      'R',
      'F',
      'B',
      'M',
      'E',
      'S',
      'x',
      'y',
      'z',
      'r',
      'l',
      'u',
      'd',
      'f',
      'b',
    ]
    const modifiers = ['', "'", '2']

    for (const fam of families) {
      for (const mod of modifiers) {
        const move = fam + mod
        it(`gerakan "${move}": konfirmasi invariant cornerParity ^ edgeParity ^ centerParity === 0`, () => {
          const solved = solvedState()
          const state = applyAlg(solved, move)
          const pattern = unwrapCubeState(state)
          const cornerParity = calculateParity(
            pattern.patternData['CORNERS'].pieces
          )
          const edgeParity = calculateParity(
            pattern.patternData['EDGES'].pieces
          )
          const centerParity = calculateParity(
            pattern.patternData['CENTERS'].pieces
          )
          const xorSum = cornerParity ^ edgeParity ^ centerParity

          // 1. Invariant tiga paritas selalu 0 untuk semua gerakan legal
          expect(xorSum).toBe(0)

          // 2. Untuk face moves (U, D, L, R, F, B), center tidak pernah bergeser (centerParity = 0)
          if (['U', 'D', 'L', 'R', 'F', 'B'].includes(fam)) {
            expect(centerParity).toBe(0)
            expect(cornerParity).toBe(edgeParity)
          }

          // 3. Untuk gerakan slice, rotasi, dan wide (dengan perputaran 1/3), center bergeser (centerParity = 1)
          // sehingga cornerParity != edgeParity
          if (
            [
              'M',
              'E',
              'S',
              'x',
              'y',
              'z',
              'r',
              'l',
              'u',
              'd',
              'f',
              'b',
            ].includes(fam) &&
            mod !== '2'
          ) {
            expect(centerParity).toBe(1)
            expect(cornerParity).not.toBe(edgeParity)
          }

          // 4. validateState harus menganggap state legal ini valid
          const res = validateState(state)
          expect(res.valid).toBe(true)
          expect(res.errors).toEqual([])
        })
      }
    }
  })

  it('setelah 1000 gerakan acak (seed tetap), state tetap valid', () => {
    // Mulberry32 PRNG
    function createRng(seed: number) {
      let s = seed >>> 0
      return function next(): number {
        s = Math.imul(s ^ (s >>> 15), 1 | s) >>> 0
        s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s
        return ((s ^ (s >>> 14)) >>> 0) / 4294967296
      }
    }

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
    const rng = createRng(555666777)

    let state = solvedState()
    for (let i = 0; i < 1000; i++) {
      const fam = families[Math.floor(rng() * families.length)]
      const mod = modifiers[Math.floor(rng() * modifiers.length)]
      state = applyAlg(state, fam + mod)
    }

    const res = validateState(state)
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
  })

  describe('Menolak state tidak valid secara sengaja dengan pesan spesifik', () => {
    it('menolak satu corner dipelintir (twist sum % 3 !== 0)', () => {
      const solved = solvedState()
      const data = clonePatternData(solved)
      // Pelintir 1 corner searah jarum jam (orientation = 1)
      data['CORNERS'].orientation[0] = 1

      const invalidState = createCustomCubeState(data)
      const res = validateState(invalidState)

      expect(res.valid).toBe(false)
      expect(res.errors).toContain(
        'Invalid corner orientation sum: total corner twist must be a multiple of 3'
      )
      // Memastikan error lain tidak muncul secara salah
      expect(res.errors.some((e) => e.includes('edge'))).toBe(false)
      expect(res.errors.some((e) => e.includes('parity'))).toBe(false)
    })

    it('menolak satu edge dibalik (flip sum % 2 !== 0)', () => {
      const solved = solvedState()
      const data = clonePatternData(solved)
      // Balik 1 edge (orientation = 1)
      data['EDGES'].orientation[0] = 1

      const invalidState = createCustomCubeState(data)
      const res = validateState(invalidState)

      expect(res.valid).toBe(false)
      expect(res.errors).toContain(
        'Invalid edge orientation sum: total edge flip must be even'
      )
      // Memastikan error lain tidak muncul secara salah
      expect(res.errors.some((e) => e.includes('corner'))).toBe(false)
      expect(res.errors.some((e) => e.includes('parity'))).toBe(false)
    })

    it('menolak dua edge ditukar (paritas permutasi ganjil vs genap)', () => {
      const solved = solvedState()
      const data = clonePatternData(solved)
      // Tukar dua edge pertama (merubah paritas edge dari genap menjadi ganjil)
      const tmp = data['EDGES'].pieces[0]
      data['EDGES'].pieces[0] = data['EDGES'].pieces[1]
      data['EDGES'].pieces[1] = tmp

      const invalidState = createCustomCubeState(data)
      const res = validateState(invalidState)

      expect(res.valid).toBe(false)
      expect(
        res.errors.some((e) => e.includes('Permutation parity mismatch'))
      ).toBe(true)
      // Memastikan orientasi tetap tidak dipermasalahkan
      expect(res.errors.some((e) => e.includes('orientation'))).toBe(false)
    })

    it('menolak dua corner ditukar (paritas permutasi corner ganjil)', () => {
      const solved = solvedState()
      const data = clonePatternData(solved)
      // Tukar dua corner (merubah paritas corner dari genap menjadi ganjil)
      const tmp = data['CORNERS'].pieces[0]
      data['CORNERS'].pieces[0] = data['CORNERS'].pieces[1]
      data['CORNERS'].pieces[1] = tmp

      const invalidState = createCustomCubeState(data)
      const res = validateState(invalidState)

      expect(res.valid).toBe(false)
      expect(
        res.errors.some((e) => e.includes('Permutation parity mismatch'))
      ).toBe(true)
    })

    it('menolak dua edge ditukar PLUS center sudah digeser (invariant tidak terpenuhi)', () => {
      // Ambil state setelah gerakan M (center bergeser, centerParity = 1, edgeParity = 1, cornerParity = 0)
      const stateAfterM = applyAlg(solvedState(), 'M')
      const data = clonePatternData(stateAfterM)

      // Tukar 2 edge pada state yang centernya sudah bergeser
      // edgeParity berubah dari 1 menjadi 0
      // Sekarang cornerParity (0) ^ edgeParity (0) ^ centerParity (1) = 1 (ganjil / ilegal)
      const tmp = data['EDGES'].pieces[0]
      data['EDGES'].pieces[0] = data['EDGES'].pieces[1]
      data['EDGES'].pieces[1] = tmp

      const invalidState = createCustomCubeState(data)
      const res = validateState(invalidState)

      expect(res.valid).toBe(false)
      expect(
        res.errors.some((e) => e.includes('Permutation parity mismatch'))
      ).toBe(true)
    })

    it('state hasil slice (M, E, S) dan rotasi (x, y, z) adalah valid', () => {
      const sliceAndRotMoves = [
        'M',
        "M'",
        'M2',
        'E',
        "E'",
        'E2',
        'S',
        "S'",
        'S2',
        'x',
        "x'",
        'x2',
        'y',
        "y'",
        'y2',
        'z',
        "z'",
        'z2',
      ]
      for (const m of sliceAndRotMoves) {
        const s = applyAlg(solvedState(), m)
        const res = validateState(s)
        expect(res.valid).toBe(true)
        expect(res.errors).toEqual([])
      }
    })

    it('menolak permutasi tidak valid (ada elemen duplikat)', () => {
      const solved = solvedState()
      const data = clonePatternData(solved)
      // Duplikasi piece corner
      data['CORNERS'].pieces[0] = data['CORNERS'].pieces[1]

      const invalidState = createCustomCubeState(data)
      const res = validateState(invalidState)

      expect(res.valid).toBe(false)
      expect(
        res.errors.some((e) => e.includes('Invalid corner permutation'))
      ).toBe(true)
    })

    it('menolak nilai orientasi di luar jangkauan (misal corner ori = 5)', () => {
      const solved = solvedState()
      const data = clonePatternData(solved)
      data['CORNERS'].orientation[0] = 5

      const invalidState = createCustomCubeState(data)
      const res = validateState(invalidState)

      expect(res.valid).toBe(false)
      expect(
        res.errors.some((e) => e.includes('values must be 0, 1, or 2'))
      ).toBe(true)
    })
  })
})
