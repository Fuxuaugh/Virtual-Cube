/**
 * Test penyambung Virtual Cube (MILESTONES M5.4/M5.6, PRD §5).
 *
 * Player palsu meniru perilaku TwistyPlayer: ia menyimpan setup dan setiap
 * gerakan yang didorong (`experimentalAddMove`), lalu menghitung pattern-nya
 * dengan engine yang sama. Yang diverifikasi di sini adalah **alur satu arah dan
 * sinkronisasi**: setiap gerakan yang diterapkan ke engine sampai ke tampilan
 * tepat sekali dan dalam urutan yang sama, termasuk pada input beruntun, dan
 * tidak ada gerakan yang didorong saat engine menolak notasi.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  clonePatternData,
  equals,
  initCubeEngine,
  solvedState,
  type CubeState,
  type VirtualCubePlayer,
} from '../engine/index.js'
import { CubeViewSync } from './cube-view-sync.js'

/** PRNG sederhana dengan seed tetap supaya test deterministik. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

interface FakePlayer {
  player: VirtualCubePlayer
  moves: string[]
  setupAlg: () => string
  tempoScale: () => number
  disposed: () => boolean
}

/** Player palsu: setup + gerakan yang didorong membentuk pattern tampilan. */
function createFakePlayer(): FakePlayer {
  let pattern: CubeState = solvedState()
  let setupAlg = ''
  let tempoScale = 1
  let disposed = false
  const moves: string[] = []

  const player: VirtualCubePlayer = {
    element: { remove: () => undefined } as unknown as HTMLElement,
    setSetupAlg: (alg) => {
      setupAlg = alg
      pattern = alg === '' ? solvedState() : applyAlg(solvedState(), alg)
    },
    addMove: (move) => {
      moves.push(move)
      pattern = applyAlg(pattern, move)
    },
    resetToSolved: () => {
      moves.length = 0
      setupAlg = ''
      pattern = solvedState()
    },
    setTempoScale: (scale) => {
      tempoScale = scale
    },
    readPatternKey: async () => JSON.stringify(clonePatternData(pattern)),
    matchesState: async (state) => equals(state, pattern),
    dispose: () => {
      disposed = true
    },
  }

  return {
    player,
    moves,
    setupAlg: () => setupAlg,
    tempoScale: () => tempoScale,
    disposed: () => disposed,
  }
}

/** Gerakan acak (notasi dasar) dengan seed tetap. */
function randomMoves(count: number, seed: number): string[] {
  const random = seededRandom(seed)
  const faces = ['U', 'D', 'L', 'R', 'F', 'B']
  const suffixes = ['', "'", '2']

  return Array.from({ length: count }, () => {
    const face = faces[Math.floor(random() * faces.length)]
    const suffix = suffixes[Math.floor(random() * suffixes.length)]
    return `${face}${suffix}`
  })
}

describe('CubeViewSync', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('1000 gerakan acak: state engine selalu sama dengan tampilan', async () => {
    const fake = createFakePlayer()
    const sync = new CubeViewSync(fake.player)
    const moves = randomMoves(1000, 20261106)

    let state = solvedState()
    for (const move of moves) {
      state = sync.applyMove(state, move)
      expect(await sync.matchesView(state)).toBe(true)
    }

    expect(fake.moves).toEqual(moves)
    expect(fake.moves).toHaveLength(1000)
  })

  it('input beruntun (rapid input) tidak membuat state berbeda', async () => {
    const fake = createFakePlayer()
    const sync = new CubeViewSync(fake.player)
    const moves = randomMoves(500, 42)

    let state = solvedState()
    for (const move of moves) {
      state = sync.applyMove(state, move)
    }

    expect(await sync.matchesView(state)).toBe(true)
    expect(fake.moves).toEqual(moves)
  })

  it('gerakan tidak sah ditolak engine dan tidak didorong ke tampilan', async () => {
    const fake = createFakePlayer()
    const sync = new CubeViewSync(fake.player)
    const state = solvedState()

    expect(() => sync.applyMove(state, 'U3')).toThrow()
    expect(fake.moves).toEqual([])
    expect(await sync.matchesView(state)).toBe(true)
  })

  it('applyMoves menerapkan rangkaian dengan urutan engine lalu tampilan', async () => {
    const fake = createFakePlayer()
    const sync = new CubeViewSync(fake.player)
    const state = sync.applyMoves(solvedState(), "R U R' U'")

    expect(await sync.matchesView(state)).toBe(true)
    expect(fake.moves).toEqual(['R', 'U', "R'", "U'"])
  })

  it('showSetup menampilkan case, lalu algoritma mengembalikan solved', async () => {
    const fake = createFakePlayer()
    const sync = new CubeViewSync(fake.player)
    const setupAlg = "R U R' U'"
    const caseState = applyAlg(solvedState(), setupAlg)

    sync.showSetup(setupAlg)
    expect(fake.setupAlg()).toBe(setupAlg)
    expect(await sync.matchesView(caseState)).toBe(true)

    const solved = sync.applyMoves(caseState, "U R U' R'")
    expect(await sync.matchesView(solved)).toBe(true)
    expect(equals(solved, solvedState())).toBe(true)
  })

  it('resetToSolved mengembalikan engine dan tampilan', async () => {
    const fake = createFakePlayer()
    const sync = new CubeViewSync(fake.player)

    let state = sync.applyMoves(solvedState(), "R U R' U'")
    expect(await sync.matchesView(state)).toBe(true)

    state = sync.resetToSolved()
    expect(equals(state, solvedState())).toBe(true)
    expect(await sync.matchesView(state)).toBe(true)
    expect(fake.moves).toEqual([])
    expect(fake.setupAlg()).toBe('')
  })

  it('setTempoScale diteruskan ke player', async () => {
    const fake = createFakePlayer()
    const sync = new CubeViewSync(fake.player)

    sync.setTempoScale(0.5)
    expect(fake.tempoScale()).toBe(0.5)
  })
})
