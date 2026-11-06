import { describe, expect, it } from 'vitest'

import { CASE_FILE_BY_CATEGORY, loadCases } from './load-cases.js'
import type { CaseCategory, TrainingCase } from './training-case.js'

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
    alternatives: [],
    source: 'test fixture (bukan sumber algoritma)',
    tags: ['fixture'],
    ...overrides,
  }
}

function fixtureTwo(overrides: Partial<TrainingCase> = {}): TrainingCase {
  return {
    id: 'FIXTURE-2',
    category: 'F2L',
    name: 'Fixture two (bukan case asli)',
    algorithm: "L' U' L U",
    inverseAlgorithm: "U' L' U L",
    alternatives: ['R L U2 D2'],
    source: 'test fixture (bukan sumber algoritma)',
    tags: [],
    ...overrides,
  }
}

describe('CASE_FILE_BY_CATEGORY', () => {
  it('memetakan tiap kategori ke file JSON di src/data/', () => {
    expect(CASE_FILE_BY_CATEGORY).toEqual({
      F2L: 'src/data/f2l.json',
      OLL: 'src/data/oll.json',
      PLL: 'src/data/pll.json',
    })
  })
})

describe('loadCases', () => {
  it('memuat data dari sumber array pengganti (tanpa file JSON asli)', async () => {
    const cases = await loadCases('F2L', [fixtureOne(), fixtureTwo()])

    expect(cases.map((item) => item.id)).toEqual(['FIXTURE-1', 'FIXTURE-2'])
  })

  it('memuat data dari provider, termasuk provider async', async () => {
    const cases = await loadCases('F2L', async () => [fixtureOne()])

    expect(cases).toHaveLength(1)
    expect(cases[0].algorithm).toBe("R U R' U'")
  })

  it('melempar error berisi file, id case, dan nama field bila data tidak valid', async () => {
    const error: unknown = await loadCases('F2L', [
      fixtureOne({ algorithm: 'U3' }),
    ]).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).toContain('src/data/f2l.json')
    expect(message).toContain('"FIXTURE-1"')
    expect(message).toContain('"algorithm"')
  })

  it('melempar error bila data bukan array', async () => {
    await expect(loadCases('F2L', () => ({ cases: [] }))).rejects.toThrow(
      /expected an array/
    )
  })

  it('melempar error bila isi file bukan kategori yang diminta', async () => {
    await expect(
      loadCases('PLL', [fixtureOne({ category: 'F2L' })])
    ).rejects.toThrow(/expected only "PLL" cases/)
  })

  it('melempar error bila kategori tidak dikenal', async () => {
    await expect(
      loadCases('ABC' as unknown as CaseCategory, [fixtureOne()])
    ).rejects.toThrow(/Unknown case category/)
  })

  it('membungkus kegagalan provider dengan pesan yang jelas', async () => {
    const failingProvider = (): unknown => {
      throw new Error('ENOENT: no such file')
    }

    await expect(loadCases('OLL', failingProvider)).rejects.toThrow(
      /Failed to read case data for category "OLL".*ENOENT/
    )
  })

  /**
   * File `src/data/*.json` belum ditulis (MILESTONES 3.3). Test ini sengaja
   * toleran: selama file belum ada, loader wajib melempar error yang menyebut
   * file yang dicari; setelah file ditulis, loader wajib mengembalikan data.
   */
  it('menangani file JSON bawaan: memuat bila ada, error jelas bila belum ada', async () => {
    const outcome = await loadCases('OLL').then(
      (cases) => ({ loaded: true as const, cases }),
      (error: unknown) => ({ loaded: false as const, error })
    )

    if (outcome.loaded) {
      expect(outcome.cases.length).toBeGreaterThan(0)
    } else {
      expect((outcome.error as Error).message).toContain('src/data/oll.json')
    }
  })
})
