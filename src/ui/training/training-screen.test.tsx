// @vitest-environment happy-dom

/**
 * Test layar latihan (MILESTONES 7A).
 *
 * Menguji integrasi UI: panel kontrol (kategori/mode/Next/Retry), info case,
 * `VirtualCube` dengan player palsu, dan alur latihan lewat keyboard sungguhan
 * (event `keydown` di window → controller → engine → tampilan → solved).
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  applyAlg,
  equals,
  initCubeEngine,
  solvedState,
  type VirtualCubePlayer,
} from '../../engine/index.js'
import { loadCases } from '../../domain/load-cases.js'
import type { TrainingCase } from '../../domain/training-case.js'
import { cstimerKeybindMap, codeForMove } from '../../domain/keybind/index.js'
import { parseAlg } from '../../engine/index.js'
import { TrainingScreen } from './training-screen.js'

let f2l: TrainingCase[] = []
let oll: TrainingCase[] = []
let pll: TrainingCase[] = []

/** Menerjemahkan algoritma ke penekanan tombol (gerakan `2` = dua tekan). */
function keyCodesForAlg(alg: string): string[] {
  const codes: string[] = []
  for (const move of parseAlg(alg)) {
    const isDouble = move.modifier === '2' || move.modifier === "2'"
    const target = !isDouble
      ? move.raw
      : move.modifier === '2'
        ? move.base
        : `${move.base}'`
    const code = codeForMove(cstimerKeybindMap, target)
    if (!code) throw new Error(`tidak ada keybind untuk "${target}"`)
    const presses = isDouble ? 2 : 1
    for (let index = 0; index < presses; index++) codes.push(code)
  }
  return codes
}

function pressCode(code: string): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })
  )
}

interface FakePlayerHandle {
  player: VirtualCubePlayer
  setups: string[]
  moves: string[]
  factoryCalls: number
}

function createFakePlayerHandle(): FakePlayerHandle {
  let state = solvedState()
  const handle: FakePlayerHandle = {
    setups: [],
    moves: [],
    factoryCalls: 0,
    player: undefined as unknown as VirtualCubePlayer,
  }

  handle.player = {
    element: document.createElement('div'),
    setSetupAlg: (alg) => {
      handle.setups.push(alg)
      state = alg === '' ? solvedState() : applyAlg(solvedState(), alg)
      handle.moves.length = 0
    },
    addMove: (move) => {
      handle.moves.push(move)
      state = applyAlg(state, move)
    },
    resetToSolved: () => {
      handle.moves.length = 0
      state = solvedState()
    },
    setTempoScale: () => undefined,
    readPatternKey: async () => 'fake',
    matchesState: async (candidate) => equals(candidate, state),
    dispose: () => undefined,
  }

  return handle
}

let container: HTMLDivElement
let root: Root

beforeAll(async () => {
  await initCubeEngine()
  ;[f2l, oll, pll] = await Promise.all([
    loadCases('F2L'),
    loadCases('OLL'),
    loadCases('PLL'),
  ])
})

beforeEach(() => {
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

/** Menunggu efek async (pemuatan case / pembuatan player) sampai kondisi terpenuhi. */
async function waitForText(
  testId: string,
  expected: string,
  tries = 25
): Promise<void> {
  for (let index = 0; index < tries; index++) {
    if (textOf(testId) === expected) return
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

function textOf(testId: string): string {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? ''
}

describe('TrainingScreen', () => {
  it('menampilkan panel kontrol, info case, dan status latihan', async () => {
    const fake = createFakePlayerHandle()
    await act(async () => {
      root.render(
        <TrainingScreen
          cases={[...f2l, ...oll, ...pll]}
          auf=""
          createPlayer={async () => {
            fake.factoryCalls += 1
            return fake.player
          }}
        />
      )
    })

    expect(textOf('status')).toBe('Ready')
    expect(textOf('pool-size')).toBe('41')
    expect(textOf('case-id')).toMatch(/^F2L-/)
    expect(textOf('case-name').length).toBeGreaterThan(0)
    expect(textOf('case-tags').length).toBeGreaterThan(0)
    expect(textOf('case-algorithm').length).toBeGreaterThan(0)
    expect(textOf('move-count')).toBe('0')
    expect(
      container.querySelector('[data-testid="virtual-cube"]')
    ).not.toBeNull()
    expect(fake.factoryCalls).toBe(1)
    expect(fake.setups.at(-1)).toBeDefined()
  })

  it('pemilih kategori mengganti pool dan case aktif', async () => {
    const fake = createFakePlayerHandle()
    await act(async () => {
      root.render(
        <TrainingScreen
          cases={[...f2l, ...oll, ...pll]}
          createPlayer={async () => fake.player}
        />
      )
    })

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="category-OLL"]')
        ?.click()
    })

    expect(textOf('pool-size')).toBe('57')
    expect(textOf('case-id')).toMatch(/^OLL-/)

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="category-PLL"]')
        ?.click()
    })

    expect(textOf('pool-size')).toBe('21')
    expect(textOf('case-id')).toMatch(/^PLL-/)
  })

  it('mode Specific memilih case tertentu dan Retry mengulanginya', async () => {
    const fake = createFakePlayerHandle()
    await act(async () => {
      root.render(
        <TrainingScreen
          cases={[...f2l, ...oll, ...pll]}
          auf=""
          createPlayer={async () => fake.player}
        />
      )
    })

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="mode-specific"]')
        ?.click()
    })

    const select = container.querySelector<HTMLSelectElement>(
      '[data-testid="case-select"]'
    )
    expect(select).not.toBeNull()
    if (!select) return

    await act(async () => {
      select.value = 'F2L-04'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(textOf('case-id')).toBe('F2L-04')

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="retry"]')
        ?.click()
    })

    expect(textOf('case-id')).toBe('F2L-04')
    expect(textOf('status')).toBe('Ready')
    expect(textOf('move-count')).toBe('0')
  })

  it('keyboard menggerakkan cube, lalu solved dan bisa Retry/Next', async () => {
    const fake = createFakePlayerHandle()
    await act(async () => {
      root.render(
        <TrainingScreen
          cases={[...f2l, ...oll, ...pll]}
          auf=""
          createPlayer={async () => fake.player}
        />
      )
    })

    // Pilih case F2L-01 supaya algoritmanya pasti bisa ditekan lewat keybind.
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="mode-specific"]')
        ?.click()
    })
    const select = container.querySelector<HTMLSelectElement>(
      '[data-testid="case-select"]'
    )
    if (!select) throw new Error('select case tidak ada')
    await act(async () => {
      select.value = 'F2L-01'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const algorithm = f2l.find((item) => item.id === 'F2L-01')?.algorithm
    if (!algorithm) throw new Error('F2L-01 tidak ditemukan')

    for (const code of keyCodesForAlg(algorithm)) {
      await act(async () => {
        pressCode(code)
      })
    }

    expect(textOf('status')).toBe('Solved!')
    expect(textOf('solved-count')).toBe('1')
    expect(textOf('move-count')).toBe(String(keyCodesForAlg(algorithm).length))
    // Tampilan ikut sinkron dengan gerakan terakhir.
    expect(await fake.player.matchesState(solvedState())).toBe(true)

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="retry"]')
        ?.click()
    })

    expect(textOf('status')).toBe('Ready')
    expect(textOf('move-count')).toBe('0')
    expect(textOf('case-id')).toBe('F2L-01')

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="next-case"]')
        ?.click()
    })

    expect(textOf('status')).toBe('Ready')
    expect(textOf('case-id').length).toBeGreaterThan(0)
  })

  it('memuat case lewat loadCases bila pool tidak diberikan', async () => {
    const fake = createFakePlayerHandle()
    await act(async () => {
      root.render(<TrainingScreen createPlayer={async () => fake.player} />)
    })
    await waitForText('pool-size', '41')

    expect(textOf('pool-size')).toBe('41')
    expect(textOf('case-id')).toMatch(/^F2L-/)
  })

  it('mengabaikan gerakan saat fokus di elemen input teks', async () => {
    const fake = createFakePlayerHandle()
    await act(async () => {
      root.render(
        <TrainingScreen
          cases={[...f2l, ...oll, ...pll]}
          auf=""
          createPlayer={async () => fake.player}
        />
      )
    })

    const input = document.createElement('input')
    document.body.append(input)
    input.focus()

    await act(async () => {
      pressCode('KeyJ')
    })

    expect(textOf('move-count')).toBe('0')
    input.remove()
  })
})
