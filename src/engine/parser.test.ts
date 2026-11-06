import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  equals,
  initCubeEngine,
  invertMove,
  isLayerMove,
  isRotationMove,
  parseAlg,
  parseMove,
  solvedState,
} from './index.js'

describe('Parser Notasi (Task 2.3 & 2.7)', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  describe('Kasus valid: Face, Wide, Slice, Rotasi dan Modifiers', () => {
    it('mem-parse face moves dan modifier dengan benar', () => {
      const moves = parseAlg("R U' F2 D B' L2")
      expect(moves).toHaveLength(6)

      expect(moves[0]).toMatchObject({
        raw: 'R',
        base: 'R',
        modifier: '',
        amount: 1,
        type: 'face',
        isLayerMove: true,
        isRotation: false,
        start: 0,
        end: 1,
      })

      expect(moves[1]).toMatchObject({
        raw: "U'",
        base: 'U',
        modifier: "'",
        amount: -1,
        type: 'face',
        isLayerMove: true,
        isRotation: false,
        start: 2,
        end: 4,
      })

      expect(moves[2]).toMatchObject({
        raw: 'F2',
        base: 'F',
        modifier: '2',
        amount: 2,
        type: 'face',
        isLayerMove: true,
        isRotation: false,
        start: 5,
        end: 7,
      })
    })

    it('mem-parse wide moves (huruf kecil & notasi WCA)', () => {
      const moves = parseAlg("r u' f2 Rw Lw' Dw2")
      expect(moves).toHaveLength(6)

      for (const m of moves) {
        expect(m.type).toBe('wide')
        expect(m.isLayerMove).toBe(true)
        expect(m.isRotation).toBe(false)
      }

      expect(moves[0]).toMatchObject({ raw: 'r', base: 'r', modifier: '' })
      expect(moves[1]).toMatchObject({ raw: "u'", base: 'u', modifier: "'" })
      expect(moves[2]).toMatchObject({ raw: 'f2', base: 'f', modifier: '2' })
      expect(moves[3]).toMatchObject({ raw: 'Rw', base: 'Rw', modifier: '' })
      expect(moves[4]).toMatchObject({ raw: "Lw'", base: 'Lw', modifier: "'" })
      expect(moves[5]).toMatchObject({ raw: 'Dw2', base: 'Dw', modifier: '2' })
    })

    it('mem-parse slice moves (M, E, S)', () => {
      const moves = parseAlg("M E' S2")
      expect(moves).toHaveLength(3)

      expect(moves[0]).toMatchObject({
        raw: 'M',
        base: 'M',
        modifier: '',
        type: 'slice',
        isLayerMove: true,
      })
      expect(moves[1]).toMatchObject({
        raw: "E'",
        base: 'E',
        modifier: "'",
        type: 'slice',
        isLayerMove: true,
      })
      expect(moves[2]).toMatchObject({
        raw: 'S2',
        base: 'S',
        modifier: '2',
        type: 'slice',
        isLayerMove: true,
      })
    })

    it('mem-parse cube rotation moves (x, y, z)', () => {
      const moves = parseAlg("x y' z2")
      expect(moves).toHaveLength(3)

      expect(moves[0]).toMatchObject({
        raw: 'x',
        base: 'x',
        modifier: '',
        type: 'rotation',
        isLayerMove: false,
        isRotation: true,
      })
      expect(moves[1]).toMatchObject({
        raw: "y'",
        base: 'y',
        modifier: "'",
        type: 'rotation',
        isLayerMove: false,
        isRotation: true,
      })
      expect(moves[2]).toMatchObject({
        raw: 'z2',
        base: 'z',
        modifier: '2',
        type: 'rotation',
        isLayerMove: false,
        isRotation: true,
      })
    })

    it('parseAlg menghasilkan array kosong untuk string kosong atau whitespace', () => {
      expect(parseAlg('')).toEqual([])
      expect(parseAlg('   ')).toEqual([])
    })
  })

  describe('Helper invertMove, isLayerMove, isRotationMove', () => {
    it('invertMove membalik gerakan dengan benar', () => {
      expect(invertMove('R')).toBe("R'")
      expect(invertMove("R'")).toBe('R')
      expect(invertMove('R2')).toBe('R2')
      expect(invertMove('r')).toBe("r'")
      expect(invertMove("Rw'")).toBe('Rw')
      expect(invertMove('M')).toBe("M'")
      expect(invertMove("M'")).toBe('M')
      expect(invertMove('x')).toBe("x'")
      expect(invertMove("y'")).toBe('y')
      expect(invertMove('z2')).toBe('z2')
    })

    it('invertMove yang dipanggil dua kali kembali ke notasi asal (idempotent)', () => {
      const testCases = ['R', "U'", 'F2', 'r', "Rw'", 'M', 'x', "y'", 'z2']
      for (const move of testCases) {
        expect(invertMove(invertMove(move))).toBe(move)
      }
    })

    it('isLayerMove dan isRotationMove membedakan layer vs rotasi kubus', () => {
      expect(isLayerMove('R')).toBe(true)
      expect(isLayerMove('r')).toBe(true)
      expect(isLayerMove('Rw')).toBe(true)
      expect(isLayerMove('M')).toBe(true)
      expect(isLayerMove('x')).toBe(false)
      expect(isLayerMove('y')).toBe(false)
      expect(isLayerMove('z')).toBe(false)

      expect(isRotationMove('R')).toBe(false)
      expect(isRotationMove('M')).toBe(false)
      expect(isRotationMove('x')).toBe(true)
      expect(isRotationMove('y')).toBe(true)
      expect(isRotationMove('z')).toBe(true)
    })

    it('parseMove melempar error jika diberi lebih atau kurang dari satu move', () => {
      expect(() => parseMove('')).toThrow(/Expected exactly one move/)
      expect(() => parseMove('R U')).toThrow(/Expected exactly one move/)
    })
  })

  describe('Kasus tidak valid (menolak dengan posisi karakter)', () => {
    it('menolak huruf / move family tidak dikenal beserta posisi karakternya', () => {
      expect(() => parseAlg('Q')).toThrow(/position 0.*unknown move family "Q"/)
      expect(() => parseAlg('R U BadMove')).toThrow(
        /position 4.*unknown move family "BadMove"/
      )
      expect(() => parseAlg('X2')).toThrow(
        /position 0.*unknown move family "X"/
      )
    })

    it('menolak modifier ganda beserta posisi karakternya', () => {
      expect(() => parseAlg("R'2")).toThrow(
        /position 1.*double or invalid modifier "'2"/
      )
      expect(() => parseAlg("R2'2")).toThrow(
        /position 1.*double or invalid modifier "2'2"/
      )
      expect(() => parseAlg("R''")).toThrow(
        /position 1.*double or invalid modifier "''"/
      )
      expect(() => parseAlg('R22')).toThrow(
        /position 1.*double or invalid modifier "22"/
      )
    })

    it('menolak tanda kurung yang tidak diizinkan beserta posisi karakternya', () => {
      expect(() => parseAlg('(R U R’ U’)')).toThrow(
        /position 0.*parentheses are not allowed/
      )
      expect(() => parseAlg('R (U R’)')).toThrow(
        /position 2.*parentheses are not allowed/
      )
    })

    it('menolak modifier tidak sah seperti U3 atau R5', () => {
      expect(() => parseAlg('U3')).toThrow(/position 1.*invalid modifier "3"/)
      expect(() => parseAlg('R5')).toThrow(/position 1.*invalid modifier "5"/)
    })

    it('menolak angka berdiri sendiri atau simbol asing', () => {
      expect(() => parseAlg('R 5')).toThrow(/position 2/)
      expect(() => parseAlg('R ?')).toThrow(
        /position 2.*unexpected character "\?"/
      )
    })
  })

  describe('parseAlg lalu menjalankan hasilnya identik dengan applyAlg (100 alg acak)', () => {
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
        'Rw',
        'Lw',
        'Uw',
        'Dw',
        'Fw',
        'Bw',
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

    it('eksekusi move-by-move hasil parseAlg identik dengan applyAlg langsung untuk 100 alg acak', () => {
      const rng = createRng(987654321)
      const solved = solvedState()

      for (let i = 0; i < 100; i++) {
        const length = 5 + (i % 20)
        const alg = generateRandomAlg(rng, length)

        const parsedMoves = parseAlg(alg)

        // 1. Eksekusi satu per satu dari hasil parseAlg
        let stateFromParsed = solved
        for (const m of parsedMoves) {
          stateFromParsed = applyAlg(stateFromParsed, m.raw)
        }

        // 2. Eksekusi langsung string algoritma via applyAlg
        const stateFromApplyAlg = applyAlg(solved, alg)

        // Harus identik persis
        expect(equals(stateFromParsed, stateFromApplyAlg)).toBe(true)
      }
    })
  })
})
