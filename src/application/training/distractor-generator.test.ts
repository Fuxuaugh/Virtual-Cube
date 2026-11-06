/**
 * Test generator opsi & distraktor (MILESTONES 7C).
 * Memakai data case sungguhan dari `src/data/`.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { loadCases } from '../../domain/load-cases.js'
import type { TrainingCase } from '../../domain/training-case.js'
import {
  DEFAULT_OPTION_COUNT,
  generateRecognitionOptions,
  shuffle,
  similarCasePool,
} from './distractor-generator.js'

let f2l: TrainingCase[] = []
let oll: TrainingCase[] = []
let pll: TrainingCase[] = []

/** PRNG sederhana dengan seed tetap supaya test deterministik. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function byId(cases: readonly TrainingCase[], id: string): TrainingCase {
  const found = cases.find((item) => item.id === id)
  if (!found) throw new Error(`case ${id} tidak ada`)
  return found
}

beforeAll(async () => {
  ;[f2l, oll, pll] = await Promise.all([
    loadCases('F2L'),
    loadCases('OLL'),
    loadCases('PLL'),
  ])
})

describe('similarCasePool', () => {
  it('F2L: memakai grup tag yang sama bila anggotanya cukup', () => {
    const correct = byId(f2l, 'F2L-25') // grup "Corner in Place"
    const pool = similarCasePool(correct, f2l)

    expect(pool.length).toBeGreaterThanOrEqual(DEFAULT_OPTION_COUNT - 1)
    expect(pool.every((item) => item.tags.includes('Corner in Place'))).toBe(
      true
    )
    expect(pool.some((item) => item.id === correct.id)).toBe(false)
  })

  it('OLL/PLL tanpa tag: memakai seluruh kategori yang sama', () => {
    const ollPool = similarCasePool(byId(oll, 'OLL-33'), oll)
    expect(ollPool).toHaveLength(56)
    expect(ollPool.every((item) => item.category === 'OLL')).toBe(true)

    const pllPool = similarCasePool(byId(pll, 'PLL-T'), pll)
    expect(pllPool).toHaveLength(20)
    expect(pllPool.every((item) => item.category === 'PLL')).toBe(true)
  })
})

describe('generateRecognitionOptions', () => {
  it('selalu 4 opsi unik dengan tepat 1 jawaban benar (F2L/OLL/PLL)', () => {
    const samples: Array<readonly [TrainingCase, readonly TrainingCase[]]> = [
      [byId(f2l, 'F2L-01'), f2l],
      [byId(f2l, 'F2L-30'), f2l],
      [byId(oll, 'OLL-33'), oll],
      [byId(pll, 'PLL-V'), pll],
    ]

    for (const [correct, pool] of samples) {
      for (let seed = 1; seed <= 12; seed++) {
        const options = generateRecognitionOptions({
          correct,
          pool,
          random: seededRandom(seed),
        })

        expect(options).toHaveLength(DEFAULT_OPTION_COUNT)
        expect(new Set(options.map((option) => option.id)).size).toBe(
          DEFAULT_OPTION_COUNT
        )
        expect(new Set(options.map((option) => option.label)).size).toBe(
          DEFAULT_OPTION_COUNT
        )
        expect(
          options
            .filter((option) => option.isCorrect)
            .map((option) => option.id)
        ).toEqual([correct.id])
      }
    }
  })

  it('distraktor diambil dari kelompok yang sama (F2L) dan urutannya diacak', () => {
    const correct = byId(f2l, 'F2L-26') // grup "Corner in Place"
    const positions = new Set<number>()

    for (let seed = 1; seed <= 10; seed++) {
      const options = generateRecognitionOptions({
        correct,
        pool: f2l,
        random: seededRandom(seed),
      })

      for (const option of options) {
        if (option.isCorrect) continue
        const source = byId(f2l, option.id)
        expect(source.tags).toContain(correct.tags[0])
      }

      positions.add(options.findIndex((option) => option.isCorrect))
    }

    // Jawaban benar tidak selalu di posisi yang sama.
    expect(positions.size).toBeGreaterThan(1)
  })

  it('melempar error bila kandidat distraktor kurang', () => {
    const correct = byId(pll, 'PLL-T')
    const tinyPool = [correct, byId(pll, 'PLL-Ua')]

    expect(() =>
      generateRecognitionOptions({ correct, pool: tinyPool })
    ).toThrow(/kandidat distraktor kurang/)
  })

  it('menghormati optionCount lain', () => {
    const options = generateRecognitionOptions({
      correct: byId(oll, 'OLL-01'),
      pool: oll,
      optionCount: 3,
      random: seededRandom(3),
    })

    expect(options).toHaveLength(3)
    expect(options.filter((option) => option.isCorrect)).toHaveLength(1)
  })
})

describe('shuffle', () => {
  it('mempertahankan elemen dan memakai sumber acak', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input, seededRandom(9))

    expect([...result].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
})
