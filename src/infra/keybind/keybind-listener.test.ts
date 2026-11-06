// @vitest-environment happy-dom

/**
 * Test listener keybind terpusat (MILESTONES M6.2/M6.4).
 *
 * Memakai DOM (happy-dom) untuk memverifikasi bahwa hanya ada SATU listener di
 * window, `event.code` yang dipakai, `preventDefault()` diterapkan pada tombol
 * beraksi bawaan browser saja, dan input diabaikan saat fokus di input teks.
 */

import { describe, expect, it, vi } from 'vitest'
import type { KeybindAction } from '../../domain/keybind/index.js'
import {
  attachKeybindListener,
  isTextInputElement,
  toKeybindInput,
} from './keybind-listener.js'

function pressKey(code: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    code,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  window.dispatchEvent(event)
  return event
}

describe('attachKeybindListener', () => {
  it('memasang satu listener keydown (tidak tersebar) dan bisa dilepas', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const actions: KeybindAction[] = []

    const detach = attachKeybindListener({
      onAction: (action) => actions.push(action),
    })

    expect(addSpy).toHaveBeenCalledTimes(1)
    expect(addSpy.mock.calls[0][0]).toBe('keydown')

    pressKey('KeyJ')
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({ kind: 'cube-move', move: 'U' })

    detach()
    expect(removeSpy).toHaveBeenCalledTimes(1)

    pressKey('KeyJ')
    expect(actions).toHaveLength(1)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('meneruskan aksi timer untuk Space', () => {
    const actions: KeybindAction[] = []
    const detach = attachKeybindListener({
      onAction: (action) => actions.push(action),
    })

    pressKey('Space')

    expect(actions).toEqual([{ kind: 'timer-space', code: 'Space' }])
    detach()
  })

  it('preventDefault untuk Space dan panah, bukan untuk shortcut sistem', () => {
    const detach = attachKeybindListener({ onAction: () => undefined })

    expect(pressKey('Space').defaultPrevented).toBe(true)
    expect(pressKey('ArrowUp').defaultPrevented).toBe(true)
    expect(pressKey('ArrowLeft').defaultPrevented).toBe(true)

    expect(pressKey('F5').defaultPrevented).toBe(false)
    expect(pressKey('F11').defaultPrevented).toBe(false)
    expect(pressKey('KeyR', { ctrlKey: true }).defaultPrevented).toBe(false)
    expect(pressKey('KeyW', { ctrlKey: true }).defaultPrevented).toBe(false)
    expect(pressKey('KeyJ').defaultPrevented).toBe(false)

    detach()
  })

  it('tidak memanggil aksi untuk tombol tanpa fungsi atau belum terverifikasi', () => {
    const actions: KeybindAction[] = []
    const detach = attachKeybindListener({
      onAction: (action) => actions.push(action),
    })

    for (const code of [
      'Digit3',
      'Digit4',
      'Digit5',
      'Digit6',
      'Digit7',
      'Digit8',
    ]) {
      pressKey(code)
    }

    expect(actions).toEqual([])
    detach()
  })

  it('mengabaikan input saat fokus di elemen input teks', () => {
    const actions: KeybindAction[] = []
    const input = document.createElement('input')
    document.body.append(input)
    const detach = attachKeybindListener({
      onAction: (action) => actions.push(action),
      getActiveElement: () => input,
    })

    const event = pressKey('Space')

    expect(actions).toEqual([])
    expect(event.defaultPrevented).toBe(false)
    detach()
    input.remove()
  })

  it('memakai document.activeElement sungguhan saat fokus di input teks', () => {
    const actions: KeybindAction[] = []
    const input = document.createElement('input')
    document.body.append(input)
    const detach = attachKeybindListener({
      onAction: (action) => actions.push(action),
    })

    input.focus()
    pressKey('KeyJ')
    expect(actions).toEqual([])

    input.blur()
    pressKey('KeyJ')
    expect(actions).toHaveLength(1)

    detach()
    input.remove()
  })

  it('mengabaikan input saat tidak aktif (mis. fokus bukan di area latihan)', () => {
    const actions: KeybindAction[] = []
    const detach = attachKeybindListener({
      onAction: (action) => actions.push(action),
      isActive: () => false,
    })

    const event = pressKey('Space')

    expect(actions).toEqual([])
    expect(event.defaultPrevented).toBe(false)
    detach()
  })

  it('mengabaikan key repeat dan modifier sistem', () => {
    const actions: KeybindAction[] = []
    const detach = attachKeybindListener({
      onAction: (action) => actions.push(action),
    })

    pressKey('KeyJ', { repeat: true })
    pressKey('KeyJ', { ctrlKey: true })
    pressKey('KeyJ', { altKey: true })
    pressKey('KeyJ', { metaKey: true })

    expect(actions).toEqual([])
    detach()
  })
})

describe('isTextInputElement', () => {
  it('mengenali input, textarea, dan contenteditable', () => {
    expect(isTextInputElement(document.createElement('input'))).toBe(true)
    expect(isTextInputElement(document.createElement('textarea'))).toBe(true)
    expect(isTextInputElement(document.createElement('select'))).toBe(true)

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    expect(isTextInputElement(editable)).toBe(true)

    const plain = document.createElement('div')
    expect(isTextInputElement(plain)).toBe(false)
    expect(isTextInputElement(null)).toBe(false)
  })
})

describe('toKeybindInput', () => {
  it('mengambil event.code dan flag modifier', () => {
    const input = toKeybindInput(
      new KeyboardEvent('keydown', {
        code: 'KeyJ',
        ctrlKey: true,
        repeat: true,
      })
    )

    expect(input).toEqual({
      code: 'KeyJ',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      repeat: true,
      fromTextInput: false,
    })
  })

  it('mengembalikan undefined untuk event tanpa code', () => {
    expect(toKeybindInput(new Event('keydown'))).toBeUndefined()
  })
})
