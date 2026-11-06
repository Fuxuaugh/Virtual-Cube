import { describe, expect, it } from 'vitest'
import { normalizeAlgorithm } from './normalize-algorithm.js'

/** Teks asli setelah membuang kurung, kurung siku beserta isinya, dan spasi. */
function stripped(rawAlgorithm: string): string {
  return rawAlgorithm
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '')
}

describe('normalizeAlgorithm', () => {
  it('membuang tanda kurung', () => {
    expect(normalizeAlgorithm("(R U R' U')", 'TEST-1')).toEqual({
      algorithm: "R U R' U'",
      auf: null,
    })
  })

  it('memecah notasi rapat menjadi token bergerak', () => {
    expect(normalizeAlgorithm("(RUR'U)(RUR'F')", 'TEST-2')).toEqual({
      algorithm: "R U R' U R U R' F'",
      auf: null,
    })
  })

  it('melepas akhiran AUF dalam kurung siku dan menyimpannya', () => {
    const result = normalizeAlgorithm(
      "(M2' U M2' U) (M' U2) (M2' U2 M') [U2]",
      'TEST-3'
    )

    expect(result.algorithm).toBe("M2' U M2' U M' U2 M2' U2 M'")
    expect(result.auf).toBe('U2')
  })

  it("mempertahankan rotasi, slice, wide, dan modifier 2'", () => {
    expect(normalizeAlgorithm("x (R' U R') D2 R2 x'", 'TEST-4').algorithm).toBe(
      "x R' U R' D2 R2 x'"
    )
    expect(
      normalizeAlgorithm("(F' U' F) (R2 u R' U) (R U' R u') R2'", 'TEST-5')
        .algorithm
    ).toBe("F' U' F R2 u R' U R U' R u' R2'")
  })

  it('hanya mengubah spasi: token tanpa spasi sama persis dengan teks asli', () => {
    const samples = [
      "(RUR'U)(RUR'F')(RUR'U')(R'FR2U') R' U2 (RU'R')",
      "(R' U' F')(R U R' U')(R' F R2 U')(R' U' R U)(R' U R)",
      "R2 U (R U R' U') R' U' (R' U R')",
      "x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x",
      "D' (R U R' U') D (R2 U' R U') (R' U R' U) R2 [U]",
    ]

    for (const sample of samples) {
      const { algorithm } = normalizeAlgorithm(sample, 'TEST-6')
      expect(algorithm.split(' ').join('')).toBe(stripped(sample))
    }
  })

  it('error menyebut id case untuk kurung tidak seimbang', () => {
    expect(() => normalizeAlgorithm("(R U R' U'", 'TEST-7')).toThrow(/TEST-7/)
  })

  it('error menyebut id case untuk karakter yang tidak dikenal', () => {
    expect(() => normalizeAlgorithm("R U R' U3", 'TEST-8')).toThrow(/TEST-8/)
  })

  it('error menyebut id case untuk kurung siku lebih dari satu', () => {
    expect(() => normalizeAlgorithm("R U R' U' [U] [U2]", 'TEST-9')).toThrow(
      /TEST-9/
    )
  })

  it('error menyebut id case bila hasil tidak lolos parseAlg', () => {
    expect(() => normalizeAlgorithm('R U R3', 'TEST-10')).toThrow(/TEST-10/)
  })
})
