/**
 * Adapter TwistyPlayer untuk Virtual Cube (MILESTONES M5.1/M5.3, PRD §5).
 *
 * TwistyPlayer HANYA dipakai untuk render visual. State logis cube tetap di Cube
 * Engine (`CubeState`), dan alurnya satu arah:
 *
 * ```
 * input pengguna -> Cube Engine (sumber kebenaran) -> state baru -> player (animasi)
 * ```
 *
 * Modul ini bagian dari adapter engine: hanya di sini (dan modul engine lain)
 * cubing.js boleh diimpor. Import `cubing/twisty` dilakukan **dinamis** di dalam
 * factory supaya modul ini tetap bisa diimpor di lingkungan Node/test tanpa DOM.
 * Daftar opsi yang dikunci diverifikasi dari tipe cubing 0.66.1:
 * `cameraLatitude`, `cameraLongitude`, `controlPanel`, `hintFacelets`,
 * `experimentalDragInput`, `experimentalSetupAlg`, `experimentalAddMove`,
 * `experimentalModel.currentPattern`, `tempoScale`, `alg`.
 */

import type { TwistyPlayer } from 'cubing/twisty'
import { createCustomCubeState, equals } from './cube-engine.js'
import type { CubeState } from './cube-state.js'

/**
 * Kontrak yang dipakai UI. Implementasi asli membungkus TwistyPlayer;
 * test memakai implementasi palsu dengan kontrak yang sama.
 */
export interface VirtualCubePlayer {
  /** Elemen yang ditempelkan ke DOM oleh komponen. */
  readonly element: HTMLElement
  /** Menampilkan setup (scramble) tertentu; `''` = solved. */
  setSetupAlg(setupAlg: string): void
  /** Menambahkan satu gerakan ke tampilan (animasi). */
  addMove(move: string): void
  /** Kembali ke solved (alg dan setup dikosongkan). */
  resetToSolved(): void
  /** Kecepatan animasi (TwistyPlayer `tempoScale`). */
  setTempoScale(tempoScale: number): void
  /**
   * Pattern tampilan sebagai JSON (diagnostik/test).
   * Async karena `TwistyPlayerProp.get()` mengembalikan Promise.
   */
  readPatternKey(): Promise<string>
  /** True bila pattern tampilan identik dengan state engine. */
  matchesState(state: CubeState): Promise<boolean>
  /** Melepas elemen/player. */
  dispose(): void
}

export interface VirtualCubePlayerOptions {
  /** Setup alg awal; `''` = solved. */
  setupAlg?: string
  /** Kecepatan animasi awal (TwistyPlayer `tempoScale`). */
  tempoScale?: number
}

/**
 * Opsi TwistyPlayer yang dikunci (PRD §2 & §5): kamera `35/0` (hanya sisi U dan
 * F), kontrol mouse nonaktif, tanpa control panel dan hint facelets.
 */
export const VIRTUAL_CUBE_PLAYER_OPTIONS = {
  puzzle: '3x3x3',
  visualization: '3D',
  cameraLatitude: 35,
  cameraLongitude: 0,
  controlPanel: 'none',
  hintFacelets: 'none',
  experimentalDragInput: 'none',
} as const

/**
 * Membuat player TwistyPlayer asli dengan opsi terkunci.
 * Memerlukan DOM (hanya dipanggil dari komponen di browser / test ber-DOM).
 */
export async function createVirtualCubePlayer(
  options: VirtualCubePlayerOptions = {}
): Promise<VirtualCubePlayer> {
  const { TwistyPlayer: TwistyPlayerClass } = await import('cubing/twisty')
  const player = new TwistyPlayerClass({
    ...VIRTUAL_CUBE_PLAYER_OPTIONS,
    experimentalSetupAlg: options.setupAlg ?? '',
  })

  // Kontrol mouse juga dimatikan di level elemen (temuan spike M0).
  player.style.pointerEvents = 'none'
  if (options.tempoScale !== undefined) {
    player.tempoScale = options.tempoScale
  }

  return wrapTwistyPlayer(player)
}

/** Membungkus instance TwistyPlayer menjadi kontrak `VirtualCubePlayer`. */
export function wrapTwistyPlayer(player: TwistyPlayer): VirtualCubePlayer {
  const element = player as unknown as HTMLElement
  const currentPattern = () => player.experimentalModel.currentPattern.get()

  return {
    element,
    setSetupAlg: (setupAlg) => {
      player.experimentalSetupAlg = setupAlg
    },
    addMove: (move) => {
      player.experimentalAddMove(move)
    },
    resetToSolved: () => {
      player.alg = ''
      player.experimentalSetupAlg = ''
    },
    setTempoScale: (tempoScale) => {
      player.tempoScale = tempoScale
    },
    readPatternKey: async () =>
      JSON.stringify((await currentPattern()).patternData),
    matchesState: async (state) => {
      const pattern = await currentPattern()
      return equals(state, createCustomCubeState(pattern.patternData))
    },
    dispose: () => {
      element.remove()
    },
  }
}
