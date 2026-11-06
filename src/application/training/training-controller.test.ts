/**
 * Test Training Controller (MILESTONES 7A, PRD §3 & §4).
 *
 * Alur yang diuji: pilih case (Random/Specific) → generator setup → eksekusi
 * gerakan lewat keybind/service → deteksi solved → Next Case / Retry, termasuk
 * sinkronisasi ke player tampilan (palsu) dan port timer.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  equals,
  initCubeEngine,
  isSolved,
  solvedState,
  type VirtualCubePlayer,
} from '../../engine/index.js'
import { loadCases } from '../../domain/load-cases.js'
import type { TrainingCase } from '../../domain/training-case.js'
import {
  cstimerKeybindMap,
  codeForMove,
  type KeybindInput,
} from '../../domain/keybind/index.js'
import { parseAlg } from '../../engine/index.js'
import type { KeybindTimerPort } from '../keybind/keybind-service.js'
import {
  isSolvedWithFinalAuf,
  TrainingController,
} from './training-controller.js'

/** PRNG sederhana dengan seed tetap supaya test deterministik. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

/**
 * Menerjemahkan notasi algoritma menjadi penekanan tombol keybind.
 * Gerakan `2` dipecah menjadi dua penekanan (csTimer tidak punya tombol khusus).
 */
function keyInputsForAlg(alg: string): KeybindInput[] {
  const inputs: KeybindInput[] = []

  for (const move of parseAlg(alg)) {
    const isDouble = move.modifier === '2' || move.modifier === "2'"
    const target = !isDouble
      ? move.raw
      : move.modifier === '2'
        ? move.base
        : `${move.base}'`
    const code = codeForMove(cstimerKeybindMap, target)
    if (!code) {
      throw new Error(`keyInputsForAlg: tidak ada keybind untuk "${target}"`)
    }
    const presses = isDouble ? 2 : 1
    for (let index = 0; index < presses; index++) {
      inputs.push({ code })
    }
  }

  return inputs
}

interface FakePlayer {
  player: VirtualCubePlayer
  moves: string[]
  setups: string[]
}

function createFakePlayer(): FakePlayer {
  let state = solvedState()
  const moves: string[] = []
  const setups: string[] = []

  const player: VirtualCubePlayer = {
    element: { remove: () => undefined } as unknown as HTMLElement,
    setSetupAlg: (alg) => {
      setups.push(alg)
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

  return { player, moves, setups }
}

interface RecordedTimer extends KeybindTimerPort {
  spaces: number
  layerMoves: string[]
}

function createFakeTimer(): RecordedTimer {
  return {
    spaces: 0,
    layerMoves: [],
    handleSpace() {
      this.spaces += 1
    },
    handleLayerMove(move: string) {
      this.layerMoves.push(move)
    },
  }
}

let pool: TrainingCase[] = []

beforeAll(async () => {
  await initCubeEngine()
  const [f2l, oll, pll] = await Promise.all([
    loadCases('F2L'),
    loadCases('OLL'),
    loadCases('PLL'),
  ])
  pool = [...f2l, ...oll, ...pll]
})

describe('TrainingController - memilih case', () => {
  it('Random Case: memilih case kategori aktif dan menampilkan setup-nya', () => {
    const controller = new TrainingController({
      cases: pool,
      allowFinalAuf: false,
    })

    controller.startSession({
      category: 'F2L',
      mode: 'random',
      random: seededRandom(1),
    })

    const snapshot = controller.getSnapshot()
    expect(snapshot.status).toBe('ready')
    expect(snapshot.category).toBe('F2L')
    expect(snapshot.mode).toBe('random')
    expect(snapshot.poolSize).toBe(41)
    expect(snapshot.activeCase?.category).toBe('F2L')
    expect(snapshot.setupAlg).not.toBeNull()

    // State engine = solved + setupAlg (pose algoritma) — konsisten dengan generator.
    expect(
      equals(
        controller.currentState() ?? solvedState(),
        applyAlg(solvedState(), snapshot.setupAlg ?? '')
      )
    ).toBe(true)
  })

  it('Specific Case: memakai case yang diminta dan merotasi lewat Next Case', () => {
    const controller = new TrainingController({ cases: pool })
    controller.startSession({
      category: 'OLL',
      mode: 'specific',
      caseIds: ['OLL-33', 'OLL-45'],
      auf: 'U',
    })

    expect(controller.getSnapshot().activeCase?.id).toBe('OLL-33')
    expect(controller.getSnapshot().setupAlg).toBe(
      `${pool.find((item) => item.id === 'OLL-33')?.inverseAlgorithm} U`
    )

    controller.nextCase()
    expect(controller.getSnapshot().activeCase?.id).toBe('OLL-45')

    controller.nextCase()
    expect(controller.getSnapshot().activeCase?.id).toBe('OLL-33')
  })

  it('Retry memakai ulang case yang sama dengan setup baru', () => {
    const controller = new TrainingController({ cases: pool })
    controller.startSession({
      category: 'F2L',
      mode: 'specific',
      caseIds: ['F2L-01'],
      random: seededRandom(7),
    })

    controller.handleKey({ code: 'KeyJ' }) // U
    expect(controller.getSnapshot().moveCount).toBe(1)

    controller.retry()

    const snapshot = controller.getSnapshot()
    expect(snapshot.activeCase?.id).toBe('F2L-01')
    expect(snapshot.moveCount).toBe(0)
    expect(snapshot.status).toBe('ready')
    expect(
      equals(
        controller.currentState() ?? solvedState(),
        applyAlg(solvedState(), snapshot.setupAlg ?? '')
      )
    ).toBe(true)
  })

  it('filter tag dipakai saat memilih case', () => {
    const controller = new TrainingController({ cases: pool })
    controller.startSession({
      category: 'F2L',
      mode: 'random',
      filter: { tags: ['Corner in Place'] },
      random: seededRandom(3),
    })

    expect(controller.getSnapshot().activeCase?.tags).toContain(
      'Corner in Place'
    )
  })

  it('pool kosong menghasilkan pesan error, bukan lemparan', () => {
    const controller = new TrainingController({ cases: pool })
    controller.startSession({
      category: 'PLL',
      filter: { tags: ['Tidak Ada'] },
    })

    expect(controller.getSnapshot().status).toBe('idle')
    expect(controller.getSnapshot().error).toMatch(/pool kosong/)
  })
})

describe('TrainingController - eksekusi dan deteksi solved', () => {
  it('eksekusi algoritma lewat keybind menyelesaikan case (F2L)', () => {
    const controller = new TrainingController({ cases: pool })
    controller.startSession({
      category: 'F2L',
      mode: 'specific',
      caseIds: ['F2L-01'],
      auf: '',
    })

    const generated = controller.currentGenerated()
    expect(generated).not.toBeNull()
    if (!generated) return

    for (const input of keyInputsForAlg(generated.trainingCase.algorithm)) {
      controller.handleKey(input)
    }

    const snapshot = controller.getSnapshot()
    expect(snapshot.status).toBe('solved')
    expect(snapshot.solvedCount).toBe(1)
    expect(isSolved(controller.currentState() ?? solvedState())).toBe(true)
    expect(snapshot.moveCount).toBe(4)
  })

  it('eksekusi algoritma dengan AUF penyelarasan menyelesaikan case (OLL & PLL)', () => {
    for (const [category, caseId] of [
      ['OLL', 'OLL-33'],
      ['PLL', 'PLL-T'],
    ] as const) {
      const controller = new TrainingController({ cases: pool })
      controller.startSession({
        category,
        mode: 'specific',
        caseIds: [caseId],
        random: seededRandom(11),
      })

      const generated = controller.currentGenerated()
      if (!generated) throw new Error('case tidak dimuat')

      const inputs = [
        ...keyInputsForAlg(generated.alignmentAuf),
        ...keyInputsForAlg(generated.trainingCase.algorithm),
      ]
      for (const input of inputs) {
        controller.handleKey(input)
      }

      expect(controller.getSnapshot().status).toBe('solved')
      expect(controller.getSnapshot().activeCase?.id).toBe(caseId)
    }
  })

  it('gerakan salah tidak menandai solved, Next Case mengganti case', () => {
    const controller = new TrainingController({ cases: pool })
    controller.startSession({
      category: 'F2L',
      mode: 'random',
      random: seededRandom(5),
    })
    expect(controller.getSnapshot().activeCase?.id).toBeDefined()

    controller.handleKey({ code: 'KeyJ' })
    controller.handleKey({ code: 'KeyT' }) // rotasi x

    expect(controller.getSnapshot().status).toBe('ready')
    expect(controller.getSnapshot().solvedCount).toBe(0)
    expect(controller.getSnapshot().moveCount).toBe(2)

    controller.nextCase()
    expect(controller.getSnapshot().activeCase?.id).toBeDefined()
    expect(controller.getSnapshot().moveCount).toBe(0)
    expect(controller.getSnapshot().status).toBe('ready')
  })

  it('gerakan tidak dihitung setelah solved sampai case berikutnya', () => {
    const controller = new TrainingController({ cases: pool })
    controller.startSession({
      category: 'F2L',
      mode: 'specific',
      caseIds: ['F2L-04'],
      auf: '',
    })

    const generated = controller.currentGenerated()
    if (!generated) throw new Error('case tidak dimuat')

    for (const input of keyInputsForAlg(generated.trainingCase.algorithm)) {
      controller.handleKey(input)
    }
    expect(controller.getSnapshot().status).toBe('solved')

    const moveCountAfterSolve = controller.getSnapshot().moveCount
    controller.handleKey({ code: 'KeyJ' })
    expect(controller.getSnapshot().moveCount).toBe(moveCountAfterSolve)
  })

  it('toleransi AUF akhir mengikuti opsi allowFinalAuf (PRD §2)', () => {
    const afterFinalAuf = applyAlg(solvedState(), 'U')

    expect(isSolved(afterFinalAuf)).toBe(false)
    expect(isSolvedWithFinalAuf(afterFinalAuf, false)).toBe(false)
    expect(isSolvedWithFinalAuf(afterFinalAuf, true)).toBe(true)
    expect(isSolvedWithFinalAuf(solvedState(), false)).toBe(true)
  })

  it('input dari elemen input teks diabaikan', () => {
    const controller = new TrainingController({ cases: pool })
    controller.startSession({
      category: 'F2L',
      mode: 'specific',
      caseIds: ['F2L-01'],
    })

    controller.handleKey({ code: 'KeyJ', fromTextInput: true })

    expect(controller.getSnapshot().moveCount).toBe(0)
    expect(controller.getSnapshot().status).toBe('ready')
  })
})

describe('TrainingController - integrasi tampilan dan timer', () => {
  it('player selalu sinkron dengan state engine (setup dan tiap gerakan)', async () => {
    const fake = createFakePlayer()
    const controller = new TrainingController({ cases: pool })
    controller.attachPlayer(fake.player)

    controller.startSession({
      category: 'F2L',
      mode: 'specific',
      caseIds: ['F2L-01'],
      auf: '',
    })

    const generated = controller.currentGenerated()
    if (!generated) throw new Error('case tidak dimuat')

    expect(fake.setups.at(-1)).toBe(generated.setupAlg)
    expect(
      await fake.player.matchesState(controller.currentState() ?? solvedState())
    ).toBe(true)

    for (const input of keyInputsForAlg(generated.trainingCase.algorithm)) {
      controller.handleKey(input)
      expect(
        await fake.player.matchesState(
          controller.currentState() ?? solvedState()
        )
      ).toBe(true)
    }

    expect(fake.moves).toEqual(['U', 'R', "U'", "R'"])
    expect(controller.getSnapshot().status).toBe('solved')
  })

  it('Space diteruskan ke timer dan gerakan layer memicu handleLayerMove', () => {
    const timer = createFakeTimer()
    const controller = new TrainingController({ cases: pool, timer })
    controller.startSession({
      category: 'F2L',
      mode: 'specific',
      caseIds: ['F2L-01'],
      auf: '',
    })

    controller.handleKey({ code: 'Space' })
    expect(timer.spaces).toBe(1)

    controller.handleKey({ code: 'KeyJ' }) // U (gerakan layer)
    expect(timer.layerMoves).toEqual(['U'])

    controller.handleKey({ code: 'KeyT' }) // rotasi x
    expect(timer.layerMoves).toEqual(['U'])
    expect(timer.spaces).toBe(1)
  })

  it('attachPlayer(null) memutus tampilan tanpa mengubah state', () => {
    const fake = createFakePlayer()
    const controller = new TrainingController({ cases: pool })
    controller.attachPlayer(fake.player)
    controller.startSession({ category: 'F2L', auf: '' })

    const state = controller.currentState()
    controller.attachPlayer(null)

    expect(controller.currentState()).toBe(state)
  })

  it('subscriber dipanggil saat sesi dan gerakan berubah', () => {
    const controller = new TrainingController({ cases: pool })
    let notifications = 0
    const unsubscribe = controller.subscribe(() => {
      notifications += 1
    })

    controller.startSession({ category: 'F2L', auf: '' })
    expect(notifications).toBe(1)

    controller.handleKey({ code: 'KeyJ' })
    expect(notifications).toBe(2)

    unsubscribe()
    controller.handleKey({ code: 'KeyF' })
    expect(notifications).toBe(2)
  })
})
