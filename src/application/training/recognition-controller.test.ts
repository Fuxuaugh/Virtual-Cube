/**
 * Test Recognition Controller (MILESTONES 7C, PRD §4).
 *
 * Mencakup: alur ronde (opsi untuk case aktif), waktu respons dengan jam palsu,
 * verifikasi benar/salah, penguncian pilihan, dan transisi case.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadCases } from '../../domain/load-cases.js'
import type { TrainingCase } from '../../domain/training-case.js'
import { generateRecognitionOptions } from './distractor-generator.js'
import {
  RecognitionController,
  type RecognitionSource,
} from './recognition-controller.js'

/** PRNG sederhana dengan seed tetap supaya test deterministik. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

/** Sumber case sederhana yang bisa diganti (mensimulasikan Next Case). */
class FakeSource implements RecognitionSource {
  readonly poolCases: TrainingCase[]
  runId: number
  pool: TrainingCase[] = []
  private index = 0

  constructor(poolCases: TrainingCase[], runId = 1) {
    this.poolCases = poolCases
    this.runId = runId
    this.pool = poolCases
  }

  currentCase(): TrainingCase | null {
    return this.poolCases[this.index] ?? null
  }

  distractorPool(): readonly TrainingCase[] {
    return this.pool
  }

  caseRunId(): number {
    return this.runId
  }

  next(): void {
    this.index = (this.index + 1) % Math.max(1, this.poolCases.length)
    this.runId += 1
  }
}

let oll: TrainingCase[] = []
let f2l: TrainingCase[] = []
let clock = 0
let source: FakeSource
let controller: RecognitionController

beforeAll(async () => {
  ;[f2l, oll] = await Promise.all([loadCases('F2L'), loadCases('OLL')])
})

beforeEach(() => {
  clock = 0
  source = new FakeSource(f2l.slice(0, 6), 1)
  controller = new RecognitionController({
    source,
    random: seededRandom(5),
    now: () => clock,
  })
})

describe('RecognitionController - ronde', () => {
  it('membuat 4 opsi unik dengan jawaban benar = case aktif', () => {
    const snapshot = controller.getSnapshot()

    expect(snapshot.caseId).toBe('F2L-01')
    expect(snapshot.options).toHaveLength(4)
    expect(new Set(snapshot.options.map((option) => option.id)).size).toBe(4)
    expect(snapshot.correctId).toBe('F2L-01')
    expect(snapshot.options.find((option) => option.isCorrect)?.label).toBe(
      source.currentCase()?.name
    )
    expect(snapshot.locked).toBe(false)
    expect(snapshot.isCorrect).toBeNull()
    expect(snapshot.responseMs).toBeNull()
  })

  it('opsi bisa dibandingkan dengan generator langsung (deterministik)', () => {
    const expected = generateRecognitionOptions({
      correct: source.currentCase() as TrainingCase,
      pool: f2l.slice(0, 6),
      random: seededRandom(5),
    })

    expect(controller.getSnapshot().options).toEqual(expected)
  })

  it('sync memulai ronde baru saat nomor urut case berubah', () => {
    const before = controller.getSnapshot().caseRunId
    expect(before).toBe(1)

    source.next()
    controller.sync()

    const snapshot = controller.getSnapshot()
    expect(snapshot.caseRunId).toBe(2)
    expect(snapshot.caseId).toBe('F2L-02')
    expect(snapshot.locked).toBe(false)
    expect(snapshot.correctId).toBe('F2L-02')
  })

  it('sync tidak mengulang ronde bila case belum berganti', () => {
    controller.answer('F2L-01')
    expect(controller.getSnapshot().locked).toBe(true)

    controller.sync()

    expect(controller.getSnapshot().locked).toBe(true)
    expect(controller.getSnapshot().caseRunId).toBe(1)
  })

  it('newRound mengulang case yang sama dengan status bersih', () => {
    controller.answer(controller.getSnapshot().options[0].id)
    controller.newRound()

    const snapshot = controller.getSnapshot()
    expect(snapshot.locked).toBe(false)
    expect(snapshot.isCorrect).toBeNull()
    expect(snapshot.responseMs).toBeNull()
    expect(snapshot.attempts).toBe(1) // hitungan performa tidak direset
  })
})

describe('RecognitionController - waktu respons dan validasi jawaban', () => {
  it('mencatat waktu respons sejak case tampil sampai opsi ditekan', () => {
    clock = 0
    controller.newRound()

    clock = 1250
    controller.answer('F2L-01')

    const snapshot = controller.getSnapshot()
    expect(snapshot.responseMs).toBe(1250)
    expect(snapshot.lastResponseMs).toBe(1250)
    expect(snapshot.isCorrect).toBe(true)
    expect(snapshot.locked).toBe(true)
    expect(snapshot.attempts).toBe(1)
    expect(snapshot.correctCount).toBe(1)
  })

  it('jawaban salah tercatat tanpa menambah correctCount', () => {
    clock = 400
    const wrong = controller
      .getSnapshot()
      .options.find((option) => !option.isCorrect)
    if (!wrong) throw new Error('tidak ada distraktor')

    controller.answer(wrong.id)

    const snapshot = controller.getSnapshot()
    expect(snapshot.isCorrect).toBe(false)
    expect(snapshot.selectedId).toBe(wrong.id)
    expect(snapshot.responseMs).toBe(400)
    expect(snapshot.correctCount).toBe(0)
    expect(snapshot.attempts).toBe(1)
    // Jawaban benar tetap diketahui untuk highlight.
    expect(snapshot.correctId).toBe('F2L-01')
  })

  it('pilihan terkunci setelah ditekan (jawaban kedua diabaikan)', () => {
    const options = controller.getSnapshot().options
    const wrong = options.find((option) => !option.isCorrect)
    if (!wrong) throw new Error('tidak ada distraktor')

    clock = 100
    controller.answer(wrong.id)
    clock = 900
    controller.answer('F2L-01')

    const snapshot = controller.getSnapshot()
    expect(snapshot.selectedId).toBe(wrong.id)
    expect(snapshot.isCorrect).toBe(false)
    expect(snapshot.responseMs).toBe(100)
    expect(snapshot.attempts).toBe(1)
    expect(snapshot.correctCount).toBe(0)
  })

  it('mengabaikan opsi yang bukan bagian dari ronde', () => {
    controller.answer('TIDAK-ADA')

    const snapshot = controller.getSnapshot()
    expect(snapshot.locked).toBe(false)
    expect(snapshot.attempts).toBe(0)
  })

  it('melacak performa lintas ronde (attempts, correctCount, respons terakhir)', () => {
    clock = 0
    controller.newRound()
    clock = 300
    controller.answer('F2L-01') // benar

    source.next()
    controller.sync()
    const wrong = controller
      .getSnapshot()
      .options.find((option) => !option.isCorrect)
    if (!wrong) throw new Error('tidak ada distraktor')
    clock = 800
    controller.answer(wrong.id) // salah

    const snapshot = controller.getSnapshot()
    expect(snapshot.attempts).toBe(2)
    expect(snapshot.correctCount).toBe(1)
    // Ronde kedua tampil pada clock 300, dijawab pada clock 800.
    expect(snapshot.lastResponseMs).toBe(500)
  })

  it('subscriber diberi tahu saat ronde baru dan saat menjawab', () => {
    let notifications = 0
    const unsubscribe = controller.subscribe(() => {
      notifications += 1
    })

    controller.newRound()
    expect(notifications).toBe(1)

    controller.answer(controller.getSnapshot().options[0].id)
    expect(notifications).toBe(2)

    unsubscribe()
    controller.newRound()
    expect(notifications).toBe(2)
  })
})

describe('RecognitionController - integrasi dengan TrainingController', () => {
  it('memakai case aktif dan pool kategori dari TrainingController', async () => {
    const { initCubeEngine } = await import('../../engine/index.js')
    const { TrainingController } = await import('./training-controller.js')
    await initCubeEngine()

    const training = new TrainingController({ cases: [...f2l, ...oll] })
    training.startSession({
      category: 'OLL',
      mode: 'specific',
      caseIds: ['OLL-33', 'OLL-45'],
      auf: '',
    })

    const recognition = new RecognitionController({
      source: training,
      random: seededRandom(2),
      now: () => clock,
    })

    expect(recognition.getSnapshot().caseId).toBe('OLL-33')
    expect(
      recognition
        .getSnapshot()
        .options.every((option) => oll.some((item) => item.id === option.id))
    ).toBe(true)

    training.nextCase()
    recognition.sync()

    expect(recognition.getSnapshot().caseId).toBe('OLL-45')
    expect(recognition.getSnapshot().correctId).toBe('OLL-45')
  })
})
