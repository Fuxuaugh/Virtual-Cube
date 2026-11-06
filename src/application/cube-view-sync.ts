/**
 * Penyambung Virtual Cube (MILESTONES M5.3/M5.4, PRD §5).
 *
 * Aturan satu arah: **input → Cube Engine → state baru → TwistyPlayer**.
 * `CubeViewSync` memegang urutan itu secara eksplisit:
 *
 * 1. gerakan diterapkan ke state engine lebih dulu (`applyAlg`);
 * 2. baru setelah itu gerakan yang sama didorong ke player untuk animasi.
 *
 * Kalau langkah 1 gagal (notasi tidak sah), langkah 2 tidak dijalankan sehingga
 * tampilan tidak pernah "mendahului" atau berbeda dari state logis.
 */

import {
  applyAlg,
  solvedState,
  type CubeState,
  type VirtualCubePlayer,
} from '../engine/index.js'

export { setupAlgFor } from '../domain/generator/index.js'

export class CubeViewSync {
  private readonly player: VirtualCubePlayer

  constructor(player: VirtualCubePlayer) {
    this.player = player
  }

  /**
   * Menerapkan satu gerakan: engine dulu, lalu tampilan.
   * @returns state engine yang baru.
   */
  applyMove(state: CubeState, move: string): CubeState {
    const next = applyAlg(state, move)
    this.player.addMove(move)
    return next
  }

  /**
   * Menerapkan rangkaian gerakan (notasi terpisah spasi) satu per satu, tetap
   * dengan urutan engine → tampilan untuk tiap gerakan (aman untuk input cepat).
   */
  applyMoves(state: CubeState, moves: string): CubeState {
    let current = state
    for (const move of moves.trim().split(/\s+/)) {
      if (move === '') {
        continue
      }
      current = this.applyMove(current, move)
    }
    return current
  }

  /** Menampilkan setup (case) tertentu pada player. */
  showSetup(setupAlg: string): void {
    this.player.setSetupAlg(setupAlg)
  }

  /** Reset ke solved pada engine dan tampilan. */
  resetToSolved(): CubeState {
    this.player.resetToSolved()
    return solvedState()
  }

  /** Mengubah kecepatan animasi tampilan. */
  setTempoScale(tempoScale: number): void {
    this.player.setTempoScale(tempoScale)
  }

  /** True bila pattern tampilan identik dengan state engine. */
  matchesView(state: CubeState): Promise<boolean> {
    return this.player.matchesState(state)
  }
}
