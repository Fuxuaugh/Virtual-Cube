/**
 * Test service keybind (MILESTONES M6.1/M6.4).
 *
 * Memverifikasi penerusan aksi ke Cube Engine dan Timer, aturan timer (rotasi
 * tidak memulai timer), serta ignorasi input (modifier sistem, repeat, input
 * teks). Timer di sini berupa port palsu (implementasi nyata menyusul di M8).
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { equals, initCubeEngine, solvedState } from '../../engine/index.js'
import { createKeybindMap } from '../../domain/keybind/index.js'
import { KeybindService, type KeybindTimerPort } from './keybind-service.js'

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

describe('KeybindService', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('gerakan layer (KeyJ = U) mengubah state engine dan memulai timer', () => {
    const timer = createFakeTimer()
    const service = new KeybindService({ timer })

    const result = service.handle(solvedState(), { code: 'KeyJ' })

    expect(result.handled).toBe(true)
    expect(result.action).toMatchObject({ kind: 'cube-move', move: 'U' })
    expect(equals(result.state, solvedState())).toBe(false)
    expect(timer.layerMoves).toEqual(['U'])
    expect(timer.spaces).toBe(0)
  })

  it('rotasi seluruh cube mengubah state tetapi TIDAK memulai timer', () => {
    const timer = createFakeTimer()
    const service = new KeybindService({ timer })

    const result = service.handle(solvedState(), { code: 'KeyT' })

    expect(result.handled).toBe(true)
    expect(result.action).toMatchObject({ move: 'x', startsTimer: false })
    expect(timer.layerMoves).toEqual([])
  })

  it('Space diteruskan ke timer tanpa mengubah state', () => {
    const timer = createFakeTimer()
    const service = new KeybindService({ timer })
    const state = solvedState()

    const result = service.handle(state, { code: 'Space' })

    expect(result.handled).toBe(true)
    expect(result.action).toMatchObject({ kind: 'timer-space' })
    expect(result.state).toBe(state)
    expect(timer.spaces).toBe(1)
    expect(timer.layerMoves).toEqual([])
  })

  it('urutan gerakan diterapkan berurutan pada state engine', () => {
    const service = new KeybindService()
    let state = solvedState()

    state = service.handle(state, { code: 'KeyJ' }).state // U
    state = service.handle(state, { code: 'KeyF' }).state // U'
    state = service.handle(state, { code: 'KeyI' }).state // R
    state = service.handle(state, { code: 'KeyK' }).state // R'

    expect(equals(state, solvedState())).toBe(true)
  })

  it('mengabaikan Space vs gerakan saat fokus di input teks', () => {
    const timer = createFakeTimer()
    const service = new KeybindService({ timer })
    const state = solvedState()

    const space = service.handle(state, {
      code: 'Space',
      fromTextInput: true,
    })
    const move = service.handle(state, { code: 'KeyJ', fromTextInput: true })

    expect(space.handled).toBe(false)
    expect(move.handled).toBe(false)
    expect(timer.spaces).toBe(0)
    expect(timer.layerMoves).toEqual([])
    expect(equals(move.state, state)).toBe(true)
  })

  it('mengabaikan shortcut sistem (Ctrl/Alt/Meta), repeat, dan tombol tak dikenal', () => {
    const timer = createFakeTimer()
    const service = new KeybindService({ timer })
    const state = solvedState()

    for (const input of [
      { code: 'KeyJ', ctrlKey: true },
      { code: 'KeyJ', altKey: true },
      { code: 'KeyJ', metaKey: true },
      { code: 'KeyJ', repeat: true },
      { code: 'Digit5' },
      { code: 'Digit3' },
      { code: 'F5' },
    ]) {
      const result = service.handle(state, input)
      expect(result.handled).toBe(false)
      expect(result.action).toBeUndefined()
      expect(equals(result.state, state)).toBe(true)
    }

    expect(timer.layerMoves).toEqual([])
    expect(timer.spaces).toBe(0)
  })

  it('memakai peta custom bila diberikan', () => {
    const timer = createFakeTimer()
    const service = new KeybindService({
      timer,
      map: createKeybindMap({ KeyJ: "U'", KeyO: null }),
    })

    const custom = service.handle(solvedState(), { code: 'KeyJ' })
    expect(custom.action).toMatchObject({ move: "U'" })

    const disabled = service.handle(solvedState(), { code: 'KeyO' })
    expect(disabled.handled).toBe(false)
  })
})
