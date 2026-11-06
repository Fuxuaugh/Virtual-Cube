/**
 * Algorithm Playback (MILESTONES 7B, PRD §9).
 *
 * Mengendalikan playback algoritma referensi pada cube: play/pause otomatis,
 * step maju/mundur, reset ke setup case, dan pengaturan tempo.
 *
 * Prinsip yang dipegang:
 * - Semua gerakan dijalankan lewat `PlaybackTarget` (Training Controller), jadi
 *   alurnya tetap satu arah: engine dulu, tampilan ikut (`CubeViewSync`).
 * - Controller ini TIDAK menyentuh DOM/waktu nyata: `tick(now)` dipanggil dari
 *   luar (di UI lewat `requestAnimationFrame`, sesuai AGENTS: tanpa `setInterval`),
 *   sehingga perilakunya deterministik dan bisa dites dengan jam palsu.
 * - Urutan yang dijalankan = AUF penyelarasan (bila ada) + algoritma referensi,
 *   supaya playback benar-benar menyelesaikan case dari setup-nya.
 */

import { invertAlg, parseAlg } from '../../engine/index.js'
import type { Auf } from '../../domain/generator/index.js'

/** Target gerakan (dipenuhi `TrainingController`). */
export interface PlaybackTarget {
  /** Terapkan satu gerakan (engine → tampilan). */
  applyMove(move: string): void
  /** Kembalikan cube ke kondisi awal setup case aktif. */
  resetToSetup(): void
}

export interface AlgorithmPlaybackOptions {
  target: PlaybackTarget
  /** Algoritma referensi case (notasi seperti di data). */
  algorithm: string
  /** AUF penyelarasan; dijalankan sebelum algoritma. */
  alignmentAuf?: Auf | ''
  /** Interval antar gerakan pada tempoScale 1, dalam ms. */
  baseStepMs?: number
  /** Tempo awal. */
  tempoScale?: number
  /** Sumber waktu; default `performance.now()` bila tersedia. */
  now?: () => number
}

export interface PlaybackStep {
  /** Notasi gerakan, mis. `R'` atau `R2`. */
  readonly move: string
  readonly index: number
  /** True bila langkah ini bagian algoritma referensi (bukan AUF penyelarasan). */
  readonly fromAlgorithm: boolean
  /** Indeks pada algoritma referensi; -1 untuk AUF penyelarasan. */
  readonly algorithmIndex: number
}

export interface AlgorithmPlaybackSnapshot {
  readonly steps: readonly PlaybackStep[]
  /** Jumlah langkah yang sudah diterapkan. */
  readonly cursor: number
  readonly isPlaying: boolean
  readonly tempoScale: number
  /** Indeks langkah yang sedang aktif (terakhir diterapkan); -1 bila belum ada. */
  readonly activeStepIndex: number
  /** Indeks gerakan algoritma yang aktif; -1 bila bukan bagian algoritma. */
  readonly activeAlgorithmIndex: number
  readonly isAtStart: boolean
  readonly isComplete: boolean
  readonly alignmentAuf: Auf | ''
  /** Notasi gerakan algoritma referensi (untuk viewer). */
  readonly algorithmMoves: readonly string[]
}

/** Interval default antar gerakan pada tempo 1x. */
export const DEFAULT_BASE_STEP_MS = 500

export const PLAYBACK_TEMPOS: readonly number[] = [0.5, 1, 2, 5]

export function defaultNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}

export class AlgorithmPlaybackController {
  private readonly target: PlaybackTarget
  private readonly now: () => number
  private readonly baseStepMs: number

  private steps: PlaybackStep[] = []
  private algorithmMoves: string[] = []
  private alignmentAuf: Auf | '' = ''
  private cursor = 0
  private playing = false
  private tempoScaleValue: number
  private lastTickAt = 0

  private listeners = new Set<() => void>()
  private snapshot: AlgorithmPlaybackSnapshot

  constructor(options: AlgorithmPlaybackOptions) {
    this.target = options.target
    this.now = options.now ?? defaultNow
    this.baseStepMs = options.baseStepMs ?? DEFAULT_BASE_STEP_MS
    this.tempoScaleValue = options.tempoScale ?? 1
    this.snapshot = this.buildSnapshot()

    this.configure({
      algorithm: options.algorithm,
      alignmentAuf: options.alignmentAuf ?? '',
    })
  }

  /** Mengganti algoritma/AUF (dipakai saat case berganti) dan reset tampilan. */
  configure(input: { algorithm: string; alignmentAuf?: Auf | '' }): void {
    this.algorithmMoves = parseAlg(input.algorithm).map((move) => move.raw)
    this.alignmentAuf = input.alignmentAuf ?? ''

    const alignmentSteps: PlaybackStep[] = this.alignmentAuf
      ? this.alignmentAuf
          .trim()
          .split(/\s+/)
          .map((move, index) => ({
            move,
            index,
            fromAlgorithm: false,
            algorithmIndex: -1,
          }))
      : []

    const algorithmSteps: PlaybackStep[] = this.algorithmMoves.map(
      (move, index) => ({
        move,
        index: alignmentSteps.length + index,
        fromAlgorithm: true,
        algorithmIndex: index,
      })
    )

    this.steps = [...alignmentSteps, ...algorithmSteps]
    this.cursor = 0
    this.playing = false
    this.lastTickAt = this.now()
    this.emit()
  }

  getSnapshot = (): AlgorithmPlaybackSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Mulai playback; bila sudah di ujung, mulai ulang dari setup. */
  play(): void {
    if (this.steps.length === 0) {
      return
    }
    if (this.cursor >= this.steps.length) {
      this.target.resetToSetup()
      this.cursor = 0
    }
    this.playing = true
    this.lastTickAt = this.now()
    this.emit()
  }

  pause(): void {
    if (!this.playing) {
      return
    }
    this.playing = false
    this.emit()
  }

  toggle(): void {
    if (this.playing) {
      this.pause()
    } else {
      this.play()
    }
  }

  /** Satu gerakan maju (selalu menjeda playback). */
  stepForward(): void {
    this.pause()
    if (this.cursor >= this.steps.length) {
      return
    }
    const step = this.steps[this.cursor]
    this.target.applyMove(step.move)
    this.cursor += 1
    this.emit()
  }

  /** Satu gerakan mundur: menerapkan kebalikan gerakan terakhir. */
  stepBackward(): void {
    this.pause()
    if (this.cursor <= 0) {
      return
    }
    this.cursor -= 1
    this.target.applyMove(invertAlg(this.steps[this.cursor].move))
    this.emit()
  }

  /** Reset ke kondisi awal setup case dan hentikan playback. */
  reset(): void {
    this.playing = false
    this.cursor = 0
    this.target.resetToSetup()
    this.lastTickAt = this.now()
    this.emit()
  }

  setTempoScale(tempoScale: number): void {
    if (!Number.isFinite(tempoScale) || tempoScale <= 0) {
      throw new Error(
        `AlgorithmPlaybackController: tempoScale tidak sah (${tempoScale})`
      )
    }
    this.tempoScaleValue = tempoScale
    this.emit()
  }

  /** Dipanggil tiap frame (UI memakai requestAnimationFrame). */
  tick(now?: number): void {
    if (!this.playing) {
      return
    }

    const time = now ?? this.now()
    const stepMs = this.baseStepMs / this.tempoScaleValue
    if (time - this.lastTickAt < stepMs) {
      return
    }

    this.lastTickAt = time

    if (this.cursor < this.steps.length) {
      this.target.applyMove(this.steps[this.cursor].move)
      this.cursor += 1
    }

    if (this.cursor >= this.steps.length) {
      // Selesai: berhenti otomatis di ujung (cube sudah solved).
      this.playing = false
    }

    this.emit()
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) {
      listener()
    }
  }

  private buildSnapshot(): AlgorithmPlaybackSnapshot {
    const activeStepIndex = this.cursor - 1
    const activeStep =
      activeStepIndex >= 0 ? this.steps[activeStepIndex] : undefined

    return {
      steps: this.steps,
      cursor: this.cursor,
      isPlaying: this.playing,
      tempoScale: this.tempoScaleValue,
      activeStepIndex,
      activeAlgorithmIndex: activeStep?.algorithmIndex ?? -1,
      isAtStart: this.cursor === 0,
      isComplete: this.cursor >= this.steps.length && this.steps.length > 0,
      alignmentAuf: this.alignmentAuf,
      algorithmMoves: this.algorithmMoves,
    }
  }
}
