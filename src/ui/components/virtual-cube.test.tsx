// @vitest-environment happy-dom

/**
 * Test komponen `VirtualCube` (MILESTONES M5.1-M5.5).
 *
 * Komponen di-mount dengan DOM (happy-dom) dan player TwistyPlayer diganti
 * implementasi palsu lewat prop `createPlayer`, sehingga yang diuji adalah
 * perilaku komponen + pemanggilan adapter (opsi, setup alg, tempoScale, reset,
 * dispose) tanpa perlu GPU/WebGL.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TrainingCase } from '../../domain/training-case.js'
import {
  applyAlg,
  equals,
  initCubeEngine,
  solvedState,
  type VirtualCubePlayer,
  type VirtualCubePlayerOptions,
} from '../../engine/index.js'
import {
  VirtualCube,
  type VirtualCubeHandle,
  type VirtualCubePlayerFactory,
} from './virtual-cube.js'

const CASE_FIXTURE: TrainingCase = {
  id: 'FIXTURE-CUBE-1',
  category: 'F2L',
  name: 'Fixture virtual cube (bukan case asli)',
  algorithm: "R U R' U'",
  inverseAlgorithm: "U R U' R'",
  alternatives: [],
  source: 'test fixture (bukan sumber algoritma)',
  tags: [],
}

interface RecordedCalls {
  options: VirtualCubePlayerOptions[]
  setupAlg: string[]
  tempoScale: number[]
  addMove: string[]
  resetToSolved: number
  disposed: number
  player: VirtualCubePlayer | null
  element: HTMLElement | null
}

function createRecordingFactory(): {
  factory: VirtualCubePlayerFactory
  calls: RecordedCalls
} {
  const calls: RecordedCalls = {
    options: [],
    setupAlg: [],
    tempoScale: [],
    addMove: [],
    resetToSolved: 0,
    disposed: 0,
    player: null,
    element: null,
  }

  const factory: VirtualCubePlayerFactory = async (options) => {
    calls.options.push(options)

    const element = document.createElement('div')
    element.setAttribute('data-fake-player', 'true')
    calls.element = element

    const player: VirtualCubePlayer = {
      element,
      setSetupAlg: (alg) => {
        calls.setupAlg.push(alg)
      },
      addMove: (move) => {
        calls.addMove.push(move)
      },
      resetToSolved: () => {
        calls.resetToSolved += 1
      },
      setTempoScale: (scale) => {
        calls.tempoScale.push(scale)
      },
      readPatternKey: async () => 'fake',
      matchesState: async () => true,
      dispose: () => {
        calls.disposed += 1
      },
    }
    calls.player = player

    return player
  }

  return { factory, calls }
}

describe('VirtualCube', () => {
  let container: HTMLDivElement
  let root: Root

  beforeAll(async () => {
    await initCubeEngine()
  })

  beforeEach(() => {
    // Diperlukan React supaya `act` menangani efek secara sinkron.
    ;(
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('merender container untuk player', () => {
    const html = renderToStaticMarkup(<VirtualCube />)

    expect(html).toContain('data-testid="virtual-cube"')
    expect(html).toContain('data-player-ready="false"')
  })

  it('membuat player lewat adapter dan menempelkan elemennya ke container', async () => {
    const { factory, calls } = createRecordingFactory()
    const onPlayerChange: Array<VirtualCubePlayer | null> = []

    await act(async () => {
      root.render(
        <VirtualCube
          createPlayer={factory}
          onPlayerChange={(player) => onPlayerChange.push(player)}
        />
      )
    })

    expect(calls.options).toHaveLength(1)
    expect(calls.element).not.toBeNull()
    expect(container.querySelector('[data-fake-player="true"]')).not.toBeNull()
    expect(onPlayerChange[0]).toBe(calls.player)
  })

  it('menerapkan setup alg (dari trainingCase + AUF) dan tempoScale', async () => {
    const { factory, calls } = createRecordingFactory()

    await act(async () => {
      root.render(
        <VirtualCube
          createPlayer={factory}
          trainingCase={CASE_FIXTURE}
          auf={"U'"}
          tempoScale={0.5}
        />
      )
    })

    expect(calls.setupAlg).toEqual(["U R U' R' U'"])
    expect(calls.tempoScale).toEqual([0.5])
  })

  it('setupAlg eksplisit menang atas trainingCase', async () => {
    const { factory, calls } = createRecordingFactory()

    await act(async () => {
      root.render(
        <VirtualCube
          createPlayer={factory}
          trainingCase={CASE_FIXTURE}
          setupAlg="R U R' U'"
        />
      )
    })

    expect(calls.setupAlg).toEqual(["R U R' U'"])
  })

  it('ref imperatif: addMove, resetToCase, resetToSolved', async () => {
    const { factory, calls } = createRecordingFactory()
    const handle: { current: VirtualCubeHandle | null } = { current: null }

    await act(async () => {
      root.render(
        <VirtualCube
          ref={handle}
          createPlayer={factory}
          trainingCase={CASE_FIXTURE}
        />
      )
    })

    expect(handle.current).not.toBeNull()

    act(() => {
      handle.current?.addMove('R')
      handle.current?.addMove("U'")
    })
    expect(calls.addMove).toEqual(['R', "U'"])

    act(() => {
      handle.current?.resetToCase()
    })
    expect(calls.setupAlg.at(-1)).toBe("U R U' R'")

    act(() => {
      handle.current?.resetToSolved()
    })
    expect(calls.resetToSolved).toBe(1)
  })

  it('unmount membuang player dan memberi tahu pemanggil', async () => {
    const { factory, calls } = createRecordingFactory()
    const onPlayerChange: Array<VirtualCubePlayer | null> = []

    await act(async () => {
      root.render(
        <VirtualCube
          createPlayer={factory}
          onPlayerChange={(player) => onPlayerChange.push(player)}
        />
      )
    })

    act(() => {
      root.unmount()
    })

    expect(calls.disposed).toBe(1)
    expect(onPlayerChange.at(-1)).toBeNull()
  })

  it('mengubah setup saat trainingCase berganti', async () => {
    const { factory, calls } = createRecordingFactory()

    await act(async () => {
      root.render(
        <VirtualCube createPlayer={factory} trainingCase={CASE_FIXTURE} />
      )
    })
    expect(calls.setupAlg).toEqual(["U R U' R'"])

    await act(async () => {
      root.render(<VirtualCube createPlayer={factory} trainingCase={null} />)
    })
    expect(calls.setupAlg.at(-1)).toBe('')

    // Tampilan tetap menampilkan solved setelah reset ke case kosong.
    expect(equals(applyAlg(solvedState(), ''), solvedState())).toBe(true)
  })
})
