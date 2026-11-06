/**
 * Test Algorithm Playback (MILESTONES 7B, PRD §9).
 *
 * Menguji play/pause, step maju/mundur, reset, tempo, dan sinkronisasi dengan
 * Cube Engine + tampilan. Waktu disuntikkan (`now` + `tick`) sehingga tidak ada
 * ketergantungan pada waktu nyata.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  applyAlg,
  equals,
  initCubeEngine,
  isSolved,
  solvedState,
  type VirtualCubePlayer,
} from '../../engine/index.js'
import { loadCases } from '../../domain/load-cases.js'
import { cstimerKeybindMap, codeForMove } from '../../domain/keybind/index.js'
import { TrainingController } from './training-controller.js'
import {
  AlgorithmPlaybackController,
  DEFAULT_BASE_STEP_MS,
  PLAYBACK_TEMPOS,
} from './algorithm-playback.js'
import type { TrainingCase } from '../../domain/training-case.js'

let pool: TrainingCase[] = []

interface FakePlayer {
  player: VirtualCubePlayer
  moves: string[]
}

function createFakePlayer(): FakePlayer {
  let state = solvedState()
  const moves: string[] = []

  const player: VirtualCubePlayer = {
    element: { remove: () => undefined } as unknown as HTMLElement,
    setSetupAlg: (alg) => {
      state = alg === '' ? solvedState() : applyAlg(solvedState(), alg)
      moves.length = 0
    },
    addMove: (move) => {
      moves.push(move)
      state = applyAlg(state, move)
    },
    resetToSolved: () => {
      moves.length = 0
      state = solvedState()
    },
    setTempoScale: () => undefined,
    readPatternKey: async () => 'fake',
    matchesState: async (candidate) => equals(candidate, state),
    dispose: () => undefined,
  }

  return { player, moves }
}

let fake: FakePlayer
let controller: TrainingController
let clock: number

beforeAll(async () => {
  await initCubeEngine()
  pool = await loadCases('F2L')
})

beforeEach(() => {
  fake = createFakePlayer()
  controller = new TrainingController({ cases: pool })
  controller.attachPlayer(fake.player)
  controller.startSession({
    category: 'F2L',
    mode: 'specific',
    caseIds: ['F2L-01'],
    auf: '',
  })
  clock = 0
})

function createPlayback(
  overrides: Partial<
    ConstructorParameters<typeof AlgorithmPlaybackController>[0]
  > = {}
): AlgorithmPlaybackController {
  const generated = controller.currentGenerated()
  if (!generated) throw new Error('case tidak dimuat')

  return new AlgorithmPlaybackController({
    target: controller,
    algorithm: generated.trainingCase.algorithm,
    alignmentAuf: generated.auf,
    baseStepMs: 100,
    now: () => clock,
    ...overrides,
  })
}

describe('AlgorithmPlaybackController - langkah', () => {
  it('menyusun langkah dari AUF penyelarasan + algoritma referensi', () => {
    const playback = createPlayback({ alignmentAuf: "U'" })

    const snapshot = playback.getSnapshot()
    expect(snapshot.algorithmMoves).toEqual(['U', 'R', "U'", "R'"])
    expect(snapshot.steps.map((step) => step.move)).toEqual([
      "U'",
      'U',
      'R',
      "U'",
      "R'",
    ])
    expect(snapshot.steps[0]).toMatchObject({
      fromAlgorithm: false,
      algorithmIndex: -1,
    })
    expect(snapshot.steps[1]).toMatchObject({
      fromAlgorithm: true,
      algorithmIndex: 0,
    })
    expect(snapshot.isAtStart).toBe(true)
    expect(snapshot.isComplete).toBe(false)
    expect(snapshot.activeAlgorithmIndex).toBe(-1)
  })

  it('stepForward menerapkan satu gerakan ke engine dan maju satu langkah', () => {
    const playback = createPlayback()
    const before = controller.currentState() ?? solvedState()

    playback.stepForward()

    const snapshot = playback.getSnapshot()
    expect(snapshot.cursor).toBe(1)
    expect(snapshot.activeAlgorithmIndex).toBe(0)
    expect(snapshot.activeStepIndex).toBe(0)
    expect(equals(controller.currentState() ?? before, before)).toBe(false)
    expect(controller.getSnapshot().moveCount).toBe(1)
  })

  it('stepBackward mengembalikan state ke posisi sebelumnya', () => {
    const playback = createPlayback()
    const start = controller.currentState() ?? solvedState()

    playback.stepForward()
    playback.stepForward()
    expect(playback.getSnapshot().cursor).toBe(2)

    playback.stepBackward()
    expect(playback.getSnapshot().cursor).toBe(1)

    playback.stepBackward()
    const snapshot = playback.getSnapshot()
    expect(snapshot.cursor).toBe(0)
    expect(snapshot.isAtStart).toBe(true)
    expect(equals(controller.currentState() ?? solvedState(), start)).toBe(true)
  })

  it('stepForward di ujung / stepBackward di awal tidak mengubah apa pun', () => {
    const playback = createPlayback()

    playback.stepBackward()
    expect(playback.getSnapshot().cursor).toBe(0)
    expect(controller.getSnapshot().moveCount).toBe(0)

    for (let index = 0; index < 4; index++) playback.stepForward()
    expect(playback.getSnapshot().isComplete).toBe(true)

    playback.stepForward()
    expect(playback.getSnapshot().cursor).toBe(4)
    expect(controller.getSnapshot().moveCount).toBe(4)
  })

  it('reset mengembalikan cube ke setup case dan status training ke ready', () => {
    const playback = createPlayback()
    const setup = controller.currentState() ?? solvedState()

    playback.stepForward()
    playback.stepForward()
    playback.reset()

    const snapshot = playback.getSnapshot()
    expect(snapshot.cursor).toBe(0)
    expect(snapshot.isPlaying).toBe(false)
    expect(controller.getSnapshot().moveCount).toBe(0)
    expect(controller.getSnapshot().status).toBe('ready')
    expect(equals(controller.currentState() ?? solvedState(), setup)).toBe(true)
  })
})

describe('AlgorithmPlaybackController - play otomatis dan tempo', () => {
  it('play berjalan tiap langkah sesuai interval dan berhenti otomatis di ujung', async () => {
    const playback = createPlayback()
    playback.play()
    expect(playback.getSnapshot().isPlaying).toBe(true)

    // Belum waktunya: belum ada langkah.
    playback.tick((clock += 50))
    expect(playback.getSnapshot().cursor).toBe(0)

    // Empat langkah algoritma, tiap 100 ms.
    for (let index = 0; index < 4; index++) {
      playback.tick((clock += 100))
      expect(
        await fake.player.matchesState(
          controller.currentState() ?? solvedState()
        )
      ).toBe(true)
    }

    const snapshot = playback.getSnapshot()
    expect(snapshot.cursor).toBe(4)
    expect(snapshot.isComplete).toBe(true)
    expect(snapshot.isPlaying).toBe(false)
    expect(isSolved(controller.currentState() ?? solvedState())).toBe(true)
    expect(controller.getSnapshot().status).toBe('solved')
  })

  it('pause menghentikan langkah otomatis', () => {
    const playback = createPlayback()
    playback.play()
    playback.tick((clock += 100))
    expect(playback.getSnapshot().cursor).toBe(1)

    playback.pause()
    playback.tick((clock += 1000))
    playback.tick((clock += 1000))

    expect(playback.getSnapshot().cursor).toBe(1)
    expect(playback.getSnapshot().isPlaying).toBe(false)
  })

  it('tempoScale mempercepat langkah (2x dan 5x)', () => {
    const fast = createPlayback({ tempoScale: 5 })
    fast.play()
    fast.tick((clock += 20))
    expect(fast.getSnapshot().cursor).toBe(1)

    clock = 0
    const normal = createPlayback()
    normal.play()
    normal.tick((clock += 20))
    expect(normal.getSnapshot().cursor).toBe(0)
    normal.tick((clock += DEFAULT_BASE_STEP_MS / 1 - 20))
    expect(normal.getSnapshot().cursor).toBe(1)
  })

  it('setTempoScale memvalidasi nilai dan PLAYBACK_TEMPOS memuat 1x/2x/5x', () => {
    const playback = createPlayback()

    playback.setTempoScale(2)
    expect(playback.getSnapshot().tempoScale).toBe(2)

    expect(() => playback.setTempoScale(0)).toThrow(/tempoScale/)
    expect(() => playback.setTempoScale(Number.NaN)).toThrow(/tempoScale/)
    expect(PLAYBACK_TEMPOS).toContain(1)
    expect(PLAYBACK_TEMPOS).toContain(2)
    expect(PLAYBACK_TEMPOS).toContain(5)
  })

  it('play setelah selesai memulai ulang dari setup case', () => {
    const playback = createPlayback()
    const setup = controller.currentState() ?? solvedState()

    for (let index = 0; index < 4; index++) playback.stepForward()
    expect(playback.getSnapshot().isComplete).toBe(true)

    playback.play()

    const snapshot = playback.getSnapshot()
    expect(snapshot.cursor).toBe(0)
    expect(snapshot.isPlaying).toBe(true)
    expect(equals(controller.currentState() ?? solvedState(), setup)).toBe(true)
  })

  it('tick diabaikan saat tidak sedang play', () => {
    const playback = createPlayback()

    playback.tick((clock += 1000))

    expect(playback.getSnapshot().cursor).toBe(0)
    expect(controller.getSnapshot().moveCount).toBe(0)
  })
})

describe('AlgorithmPlaybackController - sinkronisasi dengan input manual', () => {
  it('keybind manual tetap sinkron setelah playback dipause', async () => {
    const playback = createPlayback()
    playback.play()
    playback.tick((clock += 100))
    playback.pause()

    const uCode = codeForMove(cstimerKeybindMap, 'U')
    if (!uCode) throw new Error('keybind U tidak ada')

    controller.handleKey({ code: uCode })

    expect(
      await fake.player.matchesState(controller.currentState() ?? solvedState())
    ).toBe(true)

    // Playback tidak ikut maju saat tick berikutnya.
    playback.tick((clock += 1000))
    expect(playback.getSnapshot().cursor).toBe(1)
  })

  it('gerakan playback dan gerakan manual memakai alur engine → tampilan', async () => {
    const playback = createPlayback()

    for (let index = 0; index < 3; index++) {
      playback.stepForward()
      expect(
        await fake.player.matchesState(
          controller.currentState() ?? solvedState()
        )
      ).toBe(true)
    }

    // Semua gerakan playback tercatat di player (termasuk yang terakhir).
    expect(fake.moves).toHaveLength(3)
    expect(fake.moves).toEqual(['U', 'R', "U'"])
  })
})
