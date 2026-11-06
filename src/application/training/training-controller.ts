/**
 * Training Controller & Session Manager (MILESTONES 7A, PRD §3 & §4).
 *
 * Mengelola satu sesi latihan "Algorithm Practice" tanpa timer (timer menyusul
 * di M8):
 *
 * 1. memilih case (Random atau Specific) lewat `case-selector` dari M4;
 * 2. membangun state case dari generator (setup = inverse algoritma + AUF) dan
 *    menampilkannya lewat `VirtualCube`;
 * 3. meneruskan gerakan keyboard (keybind terpusat) ke Cube Engine, lalu ke
 *    tampilan lewat `CubeViewSync` (alur satu arah);
 * 4. mendeteksi solved (`isSolved`, opsional toleran AUF akhir sesuai PRD §2) dan
 *    menyediakan Next Case / Retry.
 *
 * Kelas ini tidak menyentuh DOM/React supaya bisa dites langsung.
 */

import {
  applyAlg,
  isSolved,
  type CubeState,
  type VirtualCubePlayer,
} from '../../engine/index.js'
import type { CaseCategory, TrainingCase } from '../../domain/training-case.js'
import {
  AUF_OPTIONS,
  filterCases,
  generateCase,
  selectCasesById,
  selectRandomCase,
  type Auf,
  type CaseFilter,
  type GeneratedCase,
} from '../../domain/generator/index.js'
import type { KeybindInput, KeybindMap } from '../../domain/keybind/index.js'
import type { KeybindTimerPort } from '../keybind/keybind-service.js'
import { KeybindService } from '../keybind/keybind-service.js'
import { CubeViewSync } from '../cube-view-sync.js'

export type TrainingMode = 'random' | 'specific'
export type TrainingStatus = 'idle' | 'ready' | 'solved'

/** AUF akhir yang ditoleransi saat pengecekan solved (PRD §2). */
const FINAL_AUF_OPTIONS: readonly Auf[] = AUF_OPTIONS.filter(
  (auf): auf is Exclude<Auf, ''> => auf !== ''
)

/**
 * True bila state solved; dengan `allowFinalAuf` (PRD §2) state yang solved
 * setelah satu AUF akhir juga dianggap selesai.
 */
export function isSolvedWithFinalAuf(
  state: CubeState,
  allowFinalAuf = false
): boolean {
  if (isSolved(state)) {
    return true
  }
  if (!allowFinalAuf) {
    return false
  }
  return FINAL_AUF_OPTIONS.some((auf) => isSolved(applyAlg(state, auf)))
}
export interface TrainingSnapshot {
  readonly status: TrainingStatus
  readonly category: CaseCategory
  readonly mode: TrainingMode
  readonly activeCase: TrainingCase | null
  /** Alg setup yang ditampilkan (pose algoritma). */
  readonly setupAlg: string | null
  /** AUF setup yang dipakai case aktif (dipakai viewer/playback). */
  readonly auf: Auf
  /** Nomor urut pemuatan case (naik tiap loadCase; dipakai playback/timer). */
  readonly runId: number
  /** Algoritma referensi case (untuk panel info). */
  readonly referenceAlgorithm: string | null
  readonly moveCount: number
  readonly lastMove: string | null
  readonly solvedCount: number
  /** Jumlah case pada pool kategori aktif (setelah filter). */
  readonly poolSize: number
  /** Pesan error terakhir (mis. pool kosong). */
  readonly error: string | null
}

export interface StartSessionOptions {
  category?: CaseCategory
  mode?: TrainingMode
  /** Case spesifik (mode `specific`); boleh lebih dari satu, dirotasi. */
  caseIds?: readonly string[]
  /** Filter tambahan (tag/grup, difficulty). */
  filter?: CaseFilter
  /** AUF setup; default acak (generator). */
  auf?: Auf | 'random'
  /** Sumber angka acak (test deterministik). */
  random?: () => number
}

export interface TrainingControllerOptions {
  /** Seluruh pool case (mis. hasil `loadCases`). */
  cases: readonly TrainingCase[]
  /** Port timer (M8); opsional. */
  timer?: KeybindTimerPort
  /** Peta keybind custom; default preset csTimer. */
  keybindMap?: KeybindMap
  /** Toleransi AUF akhir pada pengecekan solved (default false = strict, PRD §2). */
  allowFinalAuf?: boolean
}

export class TrainingController {
  private readonly cases: readonly TrainingCase[]
  private readonly timer?: KeybindTimerPort
  private readonly keybindMap?: KeybindMap
  private readonly allowFinalAuf: boolean

  private keybind: KeybindService
  private sync?: CubeViewSync

  private category: CaseCategory = 'F2L'
  private mode: TrainingMode = 'random'
  private specificIds: readonly string[] = []
  private filter?: CaseFilter
  private random: () => number = Math.random
  private auf: Auf | 'random' = 'random'

  private activeCase: TrainingCase | null = null
  private generated: GeneratedCase | null = null
  private state: CubeState | null = null
  private status: TrainingStatus = 'idle'
  private moveCount = 0
  private lastMove: string | null = null
  private solvedCount = 0
  private nextIndex = 0
  private runId = 0
  private error: string | null = null

  private listeners = new Set<() => void>()
  private snapshot: TrainingSnapshot

  constructor(options: TrainingControllerOptions) {
    this.cases = options.cases
    this.timer = options.timer
    this.keybindMap = options.keybindMap
    this.allowFinalAuf = options.allowFinalAuf ?? false
    this.keybind = this.createKeybindService()
    this.snapshot = this.buildSnapshot()
  }

  /** Snapshot untuk UI (referensinya stabil sampai ada perubahan). */
  getSnapshot = (): TrainingSnapshot => this.snapshot

  /** Berlangganan perubahan (cocok untuk `useSyncExternalStore`). */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Memasang/melepas player tampilan (datang dari komponen `VirtualCube`).
   * Saat dipasang, case aktif langsung ditampilkan.
   */
  attachPlayer(player: VirtualCubePlayer | null): void {
    this.sync = player ? new CubeViewSync(player) : undefined
    this.keybind = this.createKeybindService()

    if (player && this.generated) {
      this.sync?.showSetup(this.generated.setupAlg)
    }
  }

  /** Memulai sesi: pilih case pertama sesuai opsi. */
  startSession(options: StartSessionOptions = {}): void {
    if (options.category !== undefined) this.category = options.category
    if (options.mode !== undefined) this.mode = options.mode
    if (options.caseIds !== undefined) this.specificIds = [...options.caseIds]
    if (options.filter !== undefined) this.filter = options.filter
    if (options.auf !== undefined) this.auf = options.auf
    if (options.random !== undefined) this.random = options.random

    this.nextIndex = 0
    this.solvedCount = 0
    this.loadCase()
  }

  /** Case berikutnya (Random: acak lagi; Specific: id berikutnya, dirotasi). */
  nextCase(): void {
    this.loadCase()
  }

  /** Ulangi case aktif dengan setup baru (AUF acak baru). */
  retry(): void {
    if (!this.activeCase) {
      this.loadCase()
      return
    }
    this.loadCase(this.activeCase)
  }

  /**
   * Memproses satu input keybind: engine → tampilan → cek solved.
   * Gerakan manual diabaikan setelah case solved (menunggu Next Case/Retry).
   */
  handleKey(input: KeybindInput): TrainingSnapshot {
    if (!this.state || this.status !== 'ready') {
      return this.snapshot
    }

    const result = this.keybind.handle(this.state, input)
    if (!result.handled) {
      return this.snapshot
    }

    if (result.action?.kind === 'cube-move') {
      return this.applyCubeMove(result.action.move, this.state, result.state)
    }

    this.emit()
    return this.snapshot
  }

  /**
   * Menerapkan satu gerakan ke cube (engine → tampilan) TANPA aturan "sudah
   * solved"; dipakai playback algoritma (step maju/mundur, play otomatis).
   */
  applyMove(move: string): TrainingSnapshot {
    if (!this.state) {
      return this.snapshot
    }
    return this.applyCubeMove(move, this.state)
  }

  /**
   * Mengembalikan cube ke kondisi awal setup case aktif (case tetap sama).
   * Berbeda dari `retry()` yang membuat setup baru (AUF acak baru).
   */
  resetToSetup(): TrainingSnapshot {
    if (!this.generated) {
      return this.snapshot
    }

    this.state = this.generated.setupState
    this.status = 'ready'
    this.moveCount = 0
    this.lastMove = null

    this.sync?.resetToSolved()
    this.sync?.showSetup(this.generated.setupAlg)

    this.emit()
    return this.snapshot
  }

  /** State engine saat ini (null bila belum ada case). */
  currentState(): CubeState | null {
    return this.state
  }

  /** Case hasil generator yang sedang aktif (null bila belum ada). */
  currentGenerated(): GeneratedCase | null {
    return this.generated
  }

  /** Case aktif (dipakai mode pengenalan). */
  currentCase(): TrainingCase | null {
    return this.activeCase
  }

  /** Kandidat distraktor untuk mode pengenalan (kategori aktif). */
  distractorPool(): TrainingCase[] {
    return this.poolForActiveCategory()
  }

  /** Nomor urut pemuatan case (naik tiap Next Case/Retry). */
  caseRunId(): number {
    return this.runId
  }

  /** Case pada pool kategori aktif (setelah filter). */
  poolForActiveCategory(): TrainingCase[] {
    return filterCases(this.cases, {
      category: this.category,
      tags: this.filter?.tags,
      difficulty: this.filter?.difficulty,
    })
  }

  private applyCubeMove(
    move: string,
    state: CubeState,
    applied?: CubeState
  ): TrainingSnapshot {
    const next =
      applied ??
      (this.sync ? this.sync.applyMove(state, move) : applyAlg(state, move))

    this.state = next
    this.moveCount += 1
    this.lastMove = move
    this.status = isSolvedWithFinalAuf(next, this.allowFinalAuf)
      ? 'solved'
      : 'ready'
    if (this.status === 'solved') {
      this.solvedCount += 1
      // Timer berhenti saat solved terdeteksi (PRD §3.1).
      this.timer?.handleSolved?.()
    }

    this.emit()
    return this.snapshot
  }

  private createKeybindService(): KeybindService {
    return new KeybindService({
      map: this.keybindMap,
      timer: this.timer,
      applier: this.sync,
    })
  }

  private loadCase(trainingCase?: TrainingCase): void {
    try {
      const picked = trainingCase ?? this.pickCase()
      const generated = generateCase(picked, {
        auf: this.auf,
        random: this.random,
      })

      this.activeCase = picked
      this.generated = generated
      this.state = generated.setupState
      this.status = 'ready'
      this.moveCount = 0
      this.lastMove = null
      this.runId += 1
      this.error = null

      // Tampilan: bersihkan gerakan lama, lalu tampilkan setup case baru.
      this.sync?.resetToSolved()
      this.sync?.showSetup(generated.setupAlg)
    } catch (error) {
      this.activeCase = null
      this.generated = null
      this.state = null
      this.status = 'idle'
      this.error = error instanceof Error ? error.message : String(error)
    }

    this.emit()
  }

  private pickCase(): TrainingCase {
    if (this.mode === 'specific') {
      const ids =
        this.specificIds.length > 0
          ? this.specificIds
          : this.poolForActiveCategory().map((item) => item.id)
      if (ids.length === 0) {
        throw new Error(
          `TrainingController: tidak ada case untuk kategori "${this.category}"`
        )
      }
      const id = ids[this.nextIndex % ids.length]
      this.nextIndex = (this.nextIndex + 1) % ids.length
      return selectCasesById(this.cases, id)[0]
    }

    const pool = this.poolForActiveCategory()
    if (pool.length === 0) {
      throw new Error(
        `TrainingController: pool kosong untuk kategori "${this.category}"`
      )
    }
    return selectRandomCase(pool, { random: this.random })
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) {
      listener()
    }
  }

  private buildSnapshot(): TrainingSnapshot {
    return {
      status: this.status,
      category: this.category,
      mode: this.mode,
      activeCase: this.activeCase,
      setupAlg: this.generated?.setupAlg ?? null,
      auf: this.generated?.auf ?? '',
      runId: this.runId,
      referenceAlgorithm: this.activeCase?.algorithm ?? null,
      moveCount: this.moveCount,
      lastMove: this.lastMove,
      solvedCount: this.solvedCount,
      poolSize: this.cases.filter((item) => item.category === this.category)
        .length,
      error: this.error,
    }
  }
}
