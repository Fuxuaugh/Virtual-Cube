import { describe, expect, it } from 'vitest'

import type { TrainingCase } from '../training-case.js'
import {
  filterCases,
  selectCasesById,
  selectRandomCase,
  selectRandomCases,
} from './case-selector.js'

/** Fixture buatan sendiri untuk selector; BUKAN data case sungguhan. */
function fixture(
  id: string,
  category: TrainingCase['category'],
  tags: string[],
  difficulty?: TrainingCase['difficulty']
): TrainingCase {
  return {
    id,
    category,
    name: `Fixture ${id}`,
    algorithm: "R U R' U'",
    inverseAlgorithm: "U R U' R'",
    alternatives: [],
    source: 'test fixture (bukan sumber algoritma)',
    tags,
    ...(difficulty === undefined ? {} : { difficulty }),
  }
}

const POOL: readonly TrainingCase[] = [
  fixture('T-F2L-1', 'F2L', ['Basic Inserts'], 'easy'),
  fixture('T-F2L-2', 'F2L', ['Case 1'], 'hard'),
  fixture('T-OLL-1', 'OLL', ['T2'], 'easy'),
  fixture('T-OLL-2', 'OLL', ['T2', 'L1']),
  fixture('T-PLL-1', 'PLL', ['T']),
]

/** PRNG sederhana dengan seed tetap supaya test deterministik. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function ids(cases: readonly TrainingCase[]): string[] {
  return cases.map((item) => item.id)
}

describe('filterCases', () => {
  it('tanpa filter mengembalikan salinan seluruh pool', () => {
    const result = filterCases(POOL)

    expect(ids(result)).toEqual(ids(POOL))
    expect(result).not.toBe(POOL)
  })

  it('menyaring berdasarkan kategori (tunggal atau daftar)', () => {
    expect(ids(filterCases(POOL, { category: 'OLL' }))).toEqual([
      'T-OLL-1',
      'T-OLL-2',
    ])
    expect(ids(filterCases(POOL, { category: ['F2L', 'PLL'] }))).toEqual([
      'T-F2L-1',
      'T-F2L-2',
      'T-PLL-1',
    ])
  })

  it('menyaring berdasarkan tag/grup', () => {
    expect(ids(filterCases(POOL, { tags: ['T2'] }))).toEqual([
      'T-OLL-1',
      'T-OLL-2',
    ])
    expect(ids(filterCases(POOL, { tags: ['L1'] }))).toEqual(['T-OLL-2'])
    expect(ids(filterCases(POOL, { tags: ['Tidak Ada'] }))).toEqual([])
  })

  it('menyaring berdasarkan difficulty (case tanpa difficulty tidak lolos)', () => {
    expect(ids(filterCases(POOL, { difficulty: 'easy' }))).toEqual([
      'T-F2L-1',
      'T-OLL-1',
    ])
    expect(ids(filterCases(POOL, { difficulty: ['easy', 'hard'] }))).toEqual([
      'T-F2L-1',
      'T-F2L-2',
      'T-OLL-1',
    ])
  })

  it('menggabungkan beberapa kriteria', () => {
    expect(
      ids(
        filterCases(POOL, { category: 'OLL', tags: ['T2'], difficulty: 'easy' })
      )
    ).toEqual(['T-OLL-1'])
  })
})

describe('selectCasesById', () => {
  it('memilih satu case dan mempertahankan urutan id', () => {
    expect(ids(selectCasesById(POOL, 'T-OLL-2'))).toEqual(['T-OLL-2'])
    expect(ids(selectCasesById(POOL, ['T-PLL-1', 'T-F2L-1']))).toEqual([
      'T-PLL-1',
      'T-F2L-1',
    ])
  })

  it('melempar error untuk id yang tidak ada', () => {
    expect(() => selectCasesById(POOL, 'T-TIDAK-ADA')).toThrow(/T-TIDAK-ADA/)
  })
})

describe('selectRandomCase', () => {
  it('deterministik untuk seed yang sama', () => {
    const first = selectRandomCase(POOL, { random: seededRandom(7) })
    const second = selectRandomCase(POOL, { random: seededRandom(7) })

    expect(first.id).toBe(second.id)
    expect(ids(POOL)).toContain(first.id)
  })

  it('menghormati filter dan melempar error bila pool kosong', () => {
    const picked = selectRandomCase(POOL, {
      filter: { category: 'OLL' },
      random: seededRandom(3),
    })
    expect(['T-OLL-1', 'T-OLL-2']).toContain(picked.id)

    expect(() =>
      selectRandomCase(POOL, { filter: { tags: ['Tidak Ada'] } })
    ).toThrow(/tidak ada case/)
  })
})

describe('selectRandomCases', () => {
  it('memilih sejumlah case tanpa pengulangan', () => {
    const picked = selectRandomCases(POOL, 3, { random: seededRandom(11) })

    expect(picked).toHaveLength(3)
    expect(new Set(ids(picked)).size).toBe(3)
  })

  it('menghormati filter', () => {
    const picked = selectRandomCases(POOL, 2, {
      filter: { category: 'OLL' },
      random: seededRandom(5),
    })

    expect(ids(picked).sort()).toEqual(['T-OLL-1', 'T-OLL-2'])
  })

  it('melempar error bila count melebihi kandidat atau negatif', () => {
    expect(() => selectRandomCases(POOL, 6)).toThrow(/hanya ada 5 kandidat/)
    expect(() => selectRandomCases(POOL, -1)).toThrow(/negatif/)
  })
})
