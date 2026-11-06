/**
 * Timer Controller & Inspection State Machine (MILESTONES 8A, PRD §3.1 & §13).
 *
 * State machine: `idle` → `inspection` → `running` → `finished` / `cancelled`.
 *
 * Aturan yang dipegang:
 * - Waktu diukur dengan `performance.now()` (bisa disuntik di test); tampilan
 *   diperbarui lewat `tick()` yang dipanggil `requestAnimationFrame` dari UI.
 *   TIDAK ada `setInterval` dan tidak ada state React sebagai sumber waktu.
 * - Inspection default 15 detik, bisa diubah/dimatikan. Penalti WCA: lewat 15
 *   detik = `+2`, lewat 17 detik = `DNF` (bisa dimatikan di Settings, PRD §2).
 * - Space memulai inspection (atau langsung running bila inspection dimatikan).
 * - Turn 1 = gerakan layer valid pertama; rotasi x/y/z dan input mouse TIDAK
 *   memulai timer.
 * - Cube solved menghentikan timer dan mencatat waktu + penalti
 *   (`OK`/`PLUS_TWO`/`DNF`); Escape membatalkan (`CANCELLED`).
 */

import { isLayerMove } from '../../engine/index.js'

export type TimerStatus =
  'idle' | 'inspection' | 'running' | 'finished' | 'cancelled'

/** Hasil satu solve (PRD §2). */
export type SolveResult = 'OK' | 'PLUS_TWO' | 'DNF' | 'CANCELLED'

/** Penalti inspection WCA. */
export type InspectionPenalty = 'none' | 'plus-two' | 'dnf'

export interface TimerSettings {
  inspectionEnabled: boolean
  /** Durasi inspection (ms). */
  inspectionMs: number
  /** Ambang +2 (ms). */
  plusTwoAtMs: number
  /** Ambang DNF (ms). */
  dnfAtMs: number
  /** Penalti WCA aktif? */
  penaltiesEnabled: boolean
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  inspectionEnabled: true,
  inspectionMs: 15000,
  plusTwoAtMs: 15000,
  dnfAtMs: 17000,
  penaltiesEnabled: true,
}

/** Penalti +2 dalam ms. */
export const PLUS_TWO_MS = 2000

export interface SolveRecord {
  /** Waktu solve murni (ms). */
  readonly elapsedMs: number
  /** Waktu inspection sebelum Turn 1 (ms). */
  readonly inspectionMs: number
  /** Penalti yang dikenakan (ms). */
  readonly penaltyMs: number
  /** Waktu final untuk statistik (null untuk DNF/CANCELLED). */
  readonly finalMs: number | null
  readonly result: SolveResult
}

export interface TimerSnapshot {
  readonly status: TimerStatus
  /** Waktu berjalan saat `running` (ms); 0 pada status lain. */
  readonly elapsedMs: number
  /** Sisa waktu inspection (ms). */
  readonly inspectionRemainingMs: number
  /** Waktu inspection terpakai (ms). */
  readonly inspectionElapsedMs: number
  /** Penalti inspection saat ini. */
  readonly inspectionPenalty: InspectionPenalty
  /** Hasil solve terakhir (null bila belum ada). */
  readonly result: SolveResult | null
  /** Waktu final solve terakhir (ms; null untuk DNF/CANCELLED). */
  readonly finalMs: number | null
  readonly penaltyMs: number
  readonly inspectionEnabled: boolean
  /** Jumlah attempt yang selesai (termasuk DNF, tidak termasuk CANCELLED). */
  readonly solveCount: number
  /** Waktu final solve sukses terakhir (ms). */
  readonly lastSolveMs: number | null
  /** Berapa solve terakhir yang +2 (untuk badge). */
  readonly plusTwoCount: number
  /** Berapa solve terakhir yang DNF (untuk badge). */
  readonly dnfCount: number
}

export interface TimerControllerOptions {
  settings?: Partial<TimerSettings>
  /** Sumber waktu; default `performance.now()`. */
  now?: () => number
}

export function defaultNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}

export class TimerController {
  private settings: TimerSettings
  private readonly now: () => number

  private status: TimerStatus = 'idle'
  private inspectionStartedAt = 0
  private inspectionElapsed = 0
  private inspectionPenalty: InspectionPenalty = 'none'
  private startedAt = 0
  private elapsed = 0

  private result: SolveResult | null = null
  private penaltyMs = 0
  private finalMs: number | null = null
  private lastInspectionMs = 0
  private solveCount = 0
  private lastSolveMs: number | null = null
  private plusTwoCount = 0
  private dnfCount = 0

  private listeners = new Set<() => void>()
  private snapshot: TimerSnapshot

  constructor(options: TimerControllerOptions = {}) {
    this.settings = { ...DEFAULT_TIMER_SETTINGS, ...options.settings }
    this.now = options.now ?? defaultNow
    this.snapshot = this.buildSnapshot()
  }

  getSnapshot = (): TimerSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Space: mulai inspection (atau langsung running bila inspection dimatikan). */
  handleSpace(): TimerSnapshot {
    switch (this.status) {
      case 'idle':
        this.beginAttempt()
        return this.snapshot
      case 'inspection':
        // Space ditekan lagi: langsung mulai solve.
        this.startRunning()
        return this.snapshot
      case 'running':
        // Diabaikan: solve dihentikan oleh deteksi solved atau Escape.
        return this.snapshot
      case 'finished':
      case 'cancelled':
        this.beginAttempt()
        return this.snapshot
    }
  }

  /**
   * Gerakan cube. Hanya gerakan layer yang memulai timer (Turn 1); rotasi
   * seluruh cube (x/y/z) dan slice dibiarkan sesuai `isLayerMove()` engine.
   */
  handleLayerMove(move: string): TimerSnapshot {
    if (!isLayerMove(move)) {
      return this.snapshot
    }
    if (this.status === 'inspection' || this.status === 'idle') {
      this.startRunning()
    }
    return this.snapshot
  }

  /** Escape: batalkan attempt (hasil CANCELLED, tidak masuk statistik waktu). */
  handleCancel(): TimerSnapshot {
    if (this.status !== 'inspection' && this.status !== 'running') {
      return this.snapshot
    }

    // Attempt dibatalkan: tidak dihitung sebagai solve.
    this.status = 'cancelled'
    this.result = 'CANCELLED'
    this.penaltyMs = 0
    this.finalMs = null
    this.elapsed = 0
    this.emit()
    return this.snapshot
  }

  /** Cube solved: hentikan timer dan catat waktu + penalti. */
  handleSolved(): TimerSnapshot {
    if (this.status !== 'running') {
      return this.snapshot
    }

    this.elapsed = Math.max(0, this.now() - this.startedAt)
    this.status = 'finished'
    this.penaltyMs =
      this.settings.penaltiesEnabled && this.inspectionPenalty === 'plus-two'
        ? PLUS_TWO_MS
        : 0

    if (this.settings.penaltiesEnabled && this.inspectionPenalty === 'dnf') {
      this.result = 'DNF'
      this.finalMs = null
      this.dnfCount += 1
    } else {
      this.result = this.penaltyMs > 0 ? 'PLUS_TWO' : 'OK'
      this.finalMs = this.elapsed + this.penaltyMs
      this.lastSolveMs = this.finalMs
      if (this.penaltyMs > 0) {
        this.plusTwoCount += 1
      }
    }

    this.solveCount += 1
    this.emit()
    return this.snapshot
  }

  /**
   * Memperbarui waktu berjalan (dipanggil dari requestAnimationFrame di UI).
   * Tidak melakukan apa pun bila timer tidak sedang berjalan.
   */
  tick(now?: number): TimerSnapshot {
    const time = now ?? this.now()

    if (this.status === 'inspection') {
      const next = Math.max(0, time - this.inspectionStartedAt)
      if (next === this.inspectionElapsed) {
        return this.snapshot
      }
      this.inspectionElapsed = next
      this.inspectionPenalty = this.computeInspectionPenalty(next)
    } else if (this.status === 'running') {
      const next = Math.max(0, time - this.startedAt)
      if (next === this.elapsed) {
        return this.snapshot
      }
      this.elapsed = next
    } else {
      return this.snapshot
    }

    this.emit()
    return this.snapshot
  }

  /** Kembali ke `idle` (dipakai Retry/reset). */
  reset(): TimerSnapshot {
    this.status = 'idle'
    this.elapsed = 0
    this.inspectionElapsed = 0
    this.inspectionPenalty = 'none'
    this.result = null
    this.penaltyMs = 0
    this.finalMs = null
    this.emit()
    return this.snapshot
  }

  /** Mengubah pengaturan timer (inspection on/off, durasi, penalti). */
  configure(settings: Partial<TimerSettings>): TimerSnapshot {
    this.settings = { ...this.settings, ...settings }
    this.emit()
    return this.snapshot
  }

  currentSettings(): TimerSettings {
    return { ...this.settings }
  }

  /** Catatan solve terakhir (dipakai statistik M9). */
  lastRecord(): SolveRecord | null {
    if (this.result === null) {
      return null
    }
    return {
      elapsedMs: this.status === 'finished' ? this.elapsed : 0,
      inspectionMs: this.lastInspectionMs,
      penaltyMs: this.penaltyMs,
      finalMs: this.finalMs,
      result: this.result,
    }
  }

  private beginAttempt(): void {
    this.result = null
    this.penaltyMs = 0
    this.finalMs = null
    this.elapsed = 0
    this.inspectionElapsed = 0
    this.inspectionPenalty = 'none'

    if (this.settings.inspectionEnabled) {
      this.status = 'inspection'
      this.inspectionStartedAt = this.now()
    } else {
      this.startRunning()
      return
    }

    this.emit()
  }

  private startRunning(): void {
    if (this.status === 'inspection') {
      this.lastInspectionMs = Math.max(0, this.now() - this.inspectionStartedAt)
      this.inspectionPenalty = this.computeInspectionPenalty(
        this.lastInspectionMs
      )
    } else {
      this.lastInspectionMs = 0
      this.inspectionPenalty = 'none'
    }

    this.status = 'running'
    this.startedAt = this.now()
    this.elapsed = 0
    this.emit()
  }

  private computeInspectionPenalty(elapsedMs: number): InspectionPenalty {
    if (!this.settings.penaltiesEnabled) {
      return 'none'
    }
    if (elapsedMs > this.settings.dnfAtMs) {
      return 'dnf'
    }
    if (elapsedMs > this.settings.plusTwoAtMs) {
      return 'plus-two'
    }
    return 'none'
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) {
      listener()
    }
  }

  private buildSnapshot(): TimerSnapshot {
    const inspectionElapsedMs =
      this.status === 'inspection' ? this.inspectionElapsed : 0

    return {
      status: this.status,
      elapsedMs: this.status === 'running' ? this.elapsed : 0,
      inspectionRemainingMs:
        this.status === 'inspection'
          ? Math.max(0, this.settings.inspectionMs - inspectionElapsedMs)
          : 0,
      inspectionElapsedMs,
      inspectionPenalty: this.inspectionPenalty,
      result: this.result,
      finalMs: this.finalMs,
      penaltyMs: this.penaltyMs,
      inspectionEnabled: this.settings.inspectionEnabled,
      solveCount: this.solveCount,
      lastSolveMs: this.lastSolveMs,
      plusTwoCount: this.plusTwoCount,
      dnfCount: this.dnfCount,
    }
  }
}
