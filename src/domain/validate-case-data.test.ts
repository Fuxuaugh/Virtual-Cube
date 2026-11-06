import { describe, expect, it } from 'vitest'

import type { TrainingCase } from './training-case.js'
import { validateCaseData } from './validate-case-data.js'

/**
 * Dua case buatan untuk test ini. SENGAJA bukan data F2L/OLL/PLL sungguhan:
 * id-nya "FIXTURE-*", namanya menyebut fixture, dan algoritmanya pendek.
 * Jangan dipakai sebagai data aplikasi.
 */
function fixtureOne(overrides: Partial<TrainingCase> = {}): TrainingCase {
  return {
    id: 'FIXTURE-1',
    category: 'F2L',
    name: 'Fixture one (bukan case asli)',
    algorithm: "R U R' U'",
    inverseAlgorithm: "U R U' R'",
    alternatives: ['R L U2 D2'],
    source: 'test fixture (bukan sumber algoritma)',
    tags: ['fixture'],
    ...overrides,
  }
}

function fixtureTwo(overrides: Partial<TrainingCase> = {}): TrainingCase {
  return {
    id: 'FIXTURE-2',
    category: 'OLL',
    name: 'Fixture two (bukan case asli)',
    algorithm: "L' U' L U",
    inverseAlgorithm: "U' L' U L",
    alternatives: [],
    source: 'test fixture (bukan sumber algoritma)',
    difficulty: 'easy',
    tags: [],
    ...overrides,
  }
}

describe('validateCaseData', () => {
  it('menerima dua case fixture yang valid', () => {
    const result = validateCaseData([fixtureOne(), fixtureTwo()])

    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('menerima data hasil JSON.parse (bukan objek class)', () => {
    const parsed: unknown = JSON.parse(
      JSON.stringify([fixtureOne(), fixtureTwo()])
    )

    expect(validateCaseData(parsed)).toEqual({ valid: true, errors: [] })
  })

  it('menerima inverse yang hanya berbeda spasi', () => {
    const result = validateCaseData([
      fixtureOne({ inverseAlgorithm: "  U   R U'  R' " }),
    ])

    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('menolak data yang bukan array', () => {
    const result = validateCaseData({ cases: [fixtureOne()] })

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('array')
  })

  it('menolak item yang bukan objek dan menyebut indeksnya', () => {
    const result = validateCaseData([fixtureOne(), 'FIXTURE-2'])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('index 1')
  })

  it('menolak id duplikat dan menyebut id tersebut', () => {
    const result = validateCaseData([
      fixtureOne(),
      fixtureOne({ name: 'Fixture duplikat' }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"FIXTURE-1"')
    expect(result.errors[0]).toContain('"id"')
    expect(result.errors[0]).toContain('unique')
  })

  it('menolak source kosong (termasuk hanya spasi)', () => {
    for (const source of ['', '   ']) {
      const result = validateCaseData([fixtureOne({ source })])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('"FIXTURE-1"')
      expect(result.errors[0]).toContain('"source"')
    }
  })

  it('menolak algoritma tidak valid "U3"', () => {
    const result = validateCaseData([fixtureOne({ algorithm: 'U3' })])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"FIXTURE-1"')
    expect(result.errors[0]).toContain('"algorithm"')
    expect(result.errors[0]).toContain('U3')
  })

  it('menolak inverseAlgorithm yang tidak cocok dengan invertAlg(algorithm)', () => {
    const result = validateCaseData([
      fixtureOne({ inverseAlgorithm: "R U R' U'" }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"FIXTURE-1"')
    expect(result.errors[0]).toContain('"inverseAlgorithm"')
    expect(result.errors[0]).toContain("U R U' R'")
  })

  it('menolak category yang tidak dikenal', () => {
    const result = validateCaseData([
      fixtureOne({ category: 'ABC' as unknown as TrainingCase['category'] }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"FIXTURE-1"')
    expect(result.errors[0]).toContain('"category"')
    expect(result.errors[0]).toContain('"F2L"')
  })

  it('menolak field wajib yang hilang', () => {
    const withoutName = { ...fixtureOne() } as Record<string, unknown>
    delete withoutName['name']

    const result = validateCaseData([withoutName])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"FIXTURE-1"')
    expect(result.errors[0]).toContain('"name"')
  })

  it('menolak alternatives yang bukan array', () => {
    const result = validateCaseData([
      fixtureOne({
        alternatives: "R U R' U'" as unknown as TrainingCase['alternatives'],
      }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"alternatives"')
  })

  it('menolak alternatif dengan algoritma tidak valid', () => {
    const result = validateCaseData([
      fixtureOne({ alternatives: ["R U R' U'", 'U3'] }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"FIXTURE-1"')
    expect(result.errors[0]).toContain('"alternatives[1]"')
  })

  it('menolak tags yang bukan array string', () => {
    const result = validateCaseData([
      fixtureOne({ tags: 'fixture' as unknown as TrainingCase['tags'] }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"tags"')
  })

  it('menolak difficulty yang tidak dikenal', () => {
    const result = validateCaseData([
      fixtureTwo({
        difficulty: 'impossible' as unknown as TrainingCase['difficulty'],
      }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"FIXTURE-2"')
    expect(result.errors[0]).toContain('"difficulty"')
  })

  it('menolak metadata yang bukan objek', () => {
    const result = validateCaseData([
      fixtureOne({
        metadata: [] as unknown as NonNullable<TrainingCase['metadata']>,
      }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('"FIXTURE-1"')
    expect(result.errors[0]).toContain('"metadata"')
  })

  it('mengumpulkan beberapa error sekaligus untuk satu case', () => {
    const result = validateCaseData([
      fixtureOne({
        source: '',
        algorithm: 'U3',
        category: 'ABC' as unknown as TrainingCase['category'],
      }),
    ])

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(3)
    for (const message of result.errors) {
      expect(message).toContain('"FIXTURE-1"')
    }
  })

  it('menerima difficulty dan metadata yang sah', () => {
    const result = validateCaseData([
      fixtureOne({ difficulty: 'hard', metadata: { group: 'fixture' } }),
    ])

    expect(result).toEqual({ valid: true, errors: [] })
  })
})
