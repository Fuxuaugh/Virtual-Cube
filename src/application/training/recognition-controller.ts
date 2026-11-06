/**
 * Recognition Controller (MILESTONES 7C, PRD §4).
 *
 * Mode pengenalan: case ditampilkan (cube statis, nama & algoritma disembunyikan),
 * pengguna memilih nama case dari 4 opsi, lalu dicatat benar/salah dan waktu
 * respons (dari case tampil sampai opsi ditekan).
 *
 * Controller ini murni: tidak menyentuh DOM/React. Waktu diambil dari `now()`
 * yang bisa disuntik sehingga test deterministik.
 */

import type { TrainingCase } from '../../domain/training-case.js'
import {
  DEFAULT_OPTION_COUNT,
  generateRecognitionOptions,
  type RecognitionOption,
} from './distractor-generator.js'

/** Sumber case yang dipakai mode pengenalan (dipenuhi `TrainingController`). */
export interface RecognitionSource {
  /** Case aktif yang harus dikenali. */
  currentCase(): TrainingCase | null
  /** Kandidat distraktor (pool kategori aktif). */
  distractorPool(): readonly TrainingCase[]
  /** Nomor urut case; berubah saat case berganti. */
  caseRunId(): number
}

export interface RecognitionSnapshot {
  /** Nomor urut case saat ronde ini dibuat (null bila belum ada ronde). */
  readonly caseRunId: number | null
  readonly caseId: string | null
  readonly options: readonly RecognitionOption[]
  /** Opsi yang dipilih pengguna (null bila belum menjawab). */
  readonly selectedId: string | null
  /** Benar/salah; null bila belum menjawab. */
  readonly isCorrect: boolean | null
  /** Pilihan terkunci setelah dijawab. */
  readonly locked: boolean
  /** Waktu respons (ms) untuk jawaban terakhir. */
  readonly responseMs: number | null
  readonly attempts: number
  readonly correctCount: number
  readonly lastResponseMs: number | null
  /** Id jawaban benar (untuk highlight setelah dijawab). */
  readonly correctId: string | null
}

export interface RecognitionControllerOptions {
  source: RecognitionSource
  optionCount?: number
  random?: () => number
  /** Sumber waktu; default `performance.now()`. */
  now?: () => number
}

export function defaultNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}

export class RecognitionController {
  private readonly source: RecognitionSource
  private readonly optionCount: number
  private readonly random: () => number
  private readonly now: () => number

  private caseRunId: number | null = null
  private activeCase: TrainingCase | null = null
  private options: RecognitionOption[] = []
  private correctId: string | null = null
  private selectedId: string | null = null
  private correct: boolean | null = null
  private responseMs: number | null = null
  private lastResponseMs: number | null = null
  private shownAt = 0
  private attempts = 0
  private correctCount = 0

  private listeners = new Set<() => void>()
  private snapshot: RecognitionSnapshot

  constructor(options: RecognitionControllerOptions) {
    this.source = options.source
    this.optionCount = options.optionCount ?? DEFAULT_OPTION_COUNT
    this.random = options.random ?? Math.random
    this.now = options.now ?? defaultNow
    this.snapshot = this.buildSnapshot()
    this.sync()
  }

  getSnapshot = (): RecognitionSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Menyesuaikan diri dengan case aktif: bila nomor urut case berubah (atau belum
   * ada ronde), ronde baru dimulai. Aman dipanggil berkali-kali.
   */
  sync(): RecognitionSnapshot {
    const runId = this.source.caseRunId()
    const current = this.source.currentCase()

    if (current === null) {
      return this.snapshot
    }

    if (
      this.caseRunId === null ||
      this.caseRunId !== runId ||
      this.activeCase?.id !== current.id
    ) {
      return this.newRound()
    }

    return this.snapshot
  }

  /** Memulai ronde baru untuk case aktif (opsi baru + waktu mulai baru). */
  newRound(): RecognitionSnapshot {
    const current = this.source.currentCase()
    if (!current) {
      return this.snapshot
    }

    this.caseRunId = this.source.caseRunId()
    this.activeCase = current
    this.options = generateRecognitionOptions({
      correct: current,
      pool: this.source.distractorPool(),
      optionCount: this.optionCount,
      random: this.random,
    })
    this.correctId = this.options.find((option) => option.isCorrect)?.id ?? null
    this.selectedId = null
    this.correct = null
    this.responseMs = null
    this.shownAt = this.now()

    this.emit()
    return this.snapshot
  }

  /**
   * Menjawab ronde aktif. Pilihan dikunci setelah ditekan; jawaban berikutnya
   * diabaikan sampai ronde baru.
   */
  answer(optionId: string): RecognitionSnapshot {
    if (this.selectedId !== null || this.activeCase === null) {
      return this.snapshot
    }

    const option = this.options.find((item) => item.id === optionId)
    if (!option) {
      return this.snapshot
    }

    this.selectedId = optionId
    this.correct = option.isCorrect
    this.responseMs = Math.max(0, this.now() - this.shownAt)
    this.lastResponseMs = this.responseMs
    this.attempts += 1
    if (option.isCorrect) {
      this.correctCount += 1
    }

    this.emit()
    return this.snapshot
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) {
      listener()
    }
  }

  private buildSnapshot(): RecognitionSnapshot {
    return {
      caseRunId: this.caseRunId,
      caseId: this.activeCase?.id ?? null,
      options: this.options,
      selectedId: this.selectedId,
      isCorrect: this.correct,
      locked: this.selectedId !== null,
      responseMs: this.responseMs,
      attempts: this.attempts,
      correctCount: this.correctCount,
      lastResponseMs: this.lastResponseMs,
      correctId: this.correctId,
    }
  }
}
