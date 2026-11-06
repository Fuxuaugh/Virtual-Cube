/**
 * Service keybind (MILESTONES M6.1/M6.2, PRD §10).
 *
 * Menjembatani input keybind ke aksi Cube Engine dan Timer:
 * - gerakan cube diterapkan ke state engine (`applyAlg`), dan bila gerakannya
 *   gerakan layer maka timer solve diberi tahu (Turn 1) — rotasi x/y/z tidak
 *   memulai timer (hasil tes csTimer di `docs/keybinds.md`);
 * - `Space` diteruskan ke timer (inspection/solve, PRD §3.1);
 * - input diabaikan bila modifier sistem ditekan, key repeat, atau fokus di
 *   elemen input teks.
 *
 * Timer belum diimplementasikan (M8), jadi kontraknya berupa port opsional.
 */

import { applyAlg, solvedState, type CubeState } from '../../engine/index.js'
import {
  cstimerKeybindMap,
  shouldIgnoreKeybindInput,
  type KeybindAction,
  type KeybindInput,
  type KeybindMap,
} from '../../domain/keybind/index.js'

/** Port timer untuk keybind (implementasi nyata menyusul di M8). */
export interface KeybindTimerPort {
  /** Space: mulai inspection / solve (PRD §3.1). */
  handleSpace(): void
  /** Gerakan layer diterapkan: solve timer mulai di Turn 1. */
  handleLayerMove(move: string): void
}

export interface KeybindServiceOptions {
  /** Peta keybind; default preset csTimer. */
  map?: KeybindMap
  /** Port timer opsional. */
  timer?: KeybindTimerPort
}

export interface KeybindHandleResult {
  /** State engine setelah input (tidak berubah bila bukan gerakan cube). */
  readonly state: CubeState
  /** Aksi yang dikenali, atau `undefined` bila input diabaikan/tidak dipetakan. */
  readonly action?: KeybindAction
  /** True bila input dikenali dan diteruskan ke engine/timer. */
  readonly handled: boolean
}

export class KeybindService {
  private readonly map: KeybindMap
  private readonly timer?: KeybindTimerPort

  constructor(options: KeybindServiceOptions = {}) {
    this.map = options.map ?? cstimerKeybindMap
    this.timer = options.timer
  }

  /** True bila input ini harus diabaikan (modifier sistem, repeat, input teks). */
  isIgnored(input: KeybindInput): boolean {
    return shouldIgnoreKeybindInput(input)
  }

  /**
   * Memproses satu input keybind dari listener terpusat.
   * State hanya berubah untuk aksi `cube-move`.
   */
  handle(state: CubeState, input: KeybindInput): KeybindHandleResult {
    if (this.isIgnored(input)) {
      return { state, handled: false }
    }

    const action = this.map.resolve(input.code)
    if (!action) {
      return { state, handled: false }
    }

    if (action.kind === 'timer-space') {
      this.timer?.handleSpace()
      return { state, action, handled: true }
    }

    const next = applyAlg(state, action.move)
    if (action.startsTimer) {
      this.timer?.handleLayerMove(action.move)
    }

    return { state: next, action, handled: true }
  }

  /** Reset ke solved (dipakai aplikasi saat reset). */
  reset(): CubeState {
    return solvedState()
  }
}
