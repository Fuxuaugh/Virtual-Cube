/**
 * Test peta keybind csTimer (MILESTONES M6.1/M6.3/M6.4).
 *
 * Sumber kebenaran: `docs/keybinds.md`. Test di sini memverifikasi pemetaan
 * `event.code` → notasi gerakan, aturan timer (rotasi tidak memulai timer),
 * tombol tanpa fungsi/ belum terverifikasi, aturan preventDefault, ignorasi
 * input teks, dan custom override.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { applyAlg, initCubeEngine, solvedState } from '../../engine/index.js'
import {
  CSTIMER_KEYBINDS,
  cstimerKeybindMap,
  createKeybindMap,
  findKeybindConflicts,
  isCubeMoveAction,
  shouldIgnoreKeybindInput,
  shouldPreventDefault,
  type KeybindMap,
} from './keybind-map.js'

/** Notasi gerakan untuk sebuah `event.code` (undefined bila bukan gerakan cube). */
function moveOf(map: KeybindMap, code: string): string | undefined {
  const action = map.resolve(code)
  return isCubeMoveAction(action) ? action.move : undefined
}

/** True bila gerakan ini memulai timer (undefined bila bukan gerakan cube). */
function startsTimerOf(code: string): boolean | undefined {
  const action = cstimerKeybindMap.resolve(code)
  return isCubeMoveAction(action) ? action.startsTimer : undefined
}

/** Peta gerakan inti dari docs/keybinds.md. */
const CORE_MOVES: ReadonlyArray<readonly [string, string]> = [
  ['KeyJ', 'U'],
  ['KeyF', "U'"],
  ['KeyI', 'R'],
  ['KeyK', "R'"],
  ['KeyH', 'F'],
  ['KeyG', "F'"],
  ['KeyS', 'D'],
  ['KeyL', "D'"],
  ['KeyD', 'L'],
  ['KeyE', "L'"],
  ['KeyW', 'B'],
  ['KeyO', "B'"],
]

describe('peta keybind csTimer', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('gerakan inti (fingertrick) sesuai docs/keybinds.md', () => {
    for (const [code, move] of CORE_MOVES) {
      const action = cstimerKeybindMap.resolve(code)

      expect(action).toEqual({
        kind: 'cube-move',
        code,
        move,
        startsTimer: true,
      })
    }
  })

  it('memetakan baris atas, angka, dan baris bawah sesuai peta', () => {
    const expected: ReadonlyArray<readonly [string, string]> = [
      ['KeyQ', "z'"],
      ['KeyR', "Lw'"],
      ['KeyT', 'x'],
      ['KeyY', 'x'],
      ['KeyU', 'Rw'],
      ['KeyP', 'z'],
      ['KeyA', "y'"],
      ['Semicolon', 'y'],
      ['KeyZ', 'Dw'],
      ['KeyX', "M'"],
      ['KeyC', "Uw'"],
      ['KeyV', 'Lw'],
      ['KeyB', "x'"],
      ['KeyM', "Rw'"],
      ['Comma', 'Uw'],
      ['Period', "M'"],
      ['Slash', "Dw'"],
      ['Digit1', "S'"],
      ['Digit2', 'E'],
      ['Digit9', "E'"],
      ['Digit0', 'S'],
    ]

    for (const [code, move] of expected) {
      expect(moveOf(cstimerKeybindMap, code)).toBe(move)
    }
  })

  it('setiap gerakan terpetakan bisa dijalankan engine pada solved state', () => {
    for (const definition of CSTIMER_KEYBINDS) {
      if (definition.move === undefined) continue

      const state = applyAlg(solvedState(), definition.move)
      expect(state).toBeDefined()
    }
  })

  it('rotasi x/y/z tidak memulai timer, gerakan layer memulai timer', () => {
    const rotations = [
      'KeyT',
      'KeyY',
      'KeyB',
      'KeyN',
      'KeyP',
      'KeyQ',
      'KeyA',
      'Semicolon',
    ]
    for (const code of rotations) {
      expect(startsTimerOf(code)).toBe(false)
    }

    const layerMoves = [
      'KeyJ',
      'KeyF',
      'KeyI',
      'KeyS',
      'KeyD',
      'KeyW',
      'Digit1',
      'KeyX',
    ]
    for (const code of layerMoves) {
      expect(startsTimerOf(code)).toBe(true)
    }
  })

  it('tombol tanpa fungsi (3, 4, 7, 8) dan belum terverifikasi (5, 6) tidak menggerakkan cube', () => {
    for (const code of [
      'Digit3',
      'Digit4',
      'Digit5',
      'Digit6',
      'Digit7',
      'Digit8',
    ]) {
      expect(cstimerKeybindMap.resolve(code)).toBeUndefined()
    }
  })

  it('tombol yang tidak ada di peta juga tidak menggerakkan cube', () => {
    for (const code of ['KeyAA', 'Numpad1', 'Backquote', 'Digit3']) {
      expect(cstimerKeybindMap.resolve(code)).toBeUndefined()
    }
  })

  it('Space adalah aksi timer, bukan gerakan cube (PRD §3.1)', () => {
    expect(cstimerKeybindMap.resolve('Space')).toEqual({
      kind: 'timer-space',
      code: 'Space',
    })
  })
})

describe('aturan konflik input', () => {
  it('mengabaikan input saat Ctrl/Alt/Meta ditekan (shortcut sistem)', () => {
    expect(shouldIgnoreKeybindInput({ code: 'KeyJ', ctrlKey: true })).toBe(true)
    expect(shouldIgnoreKeybindInput({ code: 'KeyJ', altKey: true })).toBe(true)
    expect(shouldIgnoreKeybindInput({ code: 'KeyJ', metaKey: true })).toBe(true)
    expect(shouldIgnoreKeybindInput({ code: 'KeyJ' })).toBe(false)
  })

  it('mengabaikan key repeat', () => {
    expect(shouldIgnoreKeybindInput({ code: 'KeyJ', repeat: true })).toBe(true)
  })

  it('mengabaikan input dari elemen input teks', () => {
    expect(
      shouldIgnoreKeybindInput({ code: 'KeyJ', fromTextInput: true })
    ).toBe(true)
    expect(shouldPreventDefault({ code: 'Space', fromTextInput: true })).toBe(
      false
    )
  })

  it('preventDefault untuk Space dan panah, bukan untuk tombol sistem', () => {
    expect(shouldPreventDefault({ code: 'Space' })).toBe(true)
    expect(shouldPreventDefault({ code: 'ArrowUp' })).toBe(true)
    expect(shouldPreventDefault({ code: 'ArrowDown' })).toBe(true)

    expect(shouldPreventDefault({ code: 'F5' })).toBe(false)
    expect(shouldPreventDefault({ code: 'F11' })).toBe(false)
    expect(shouldPreventDefault({ code: 'Tab' })).toBe(false)
    expect(shouldPreventDefault({ code: 'KeyR', ctrlKey: true })).toBe(false)
    expect(shouldPreventDefault({ code: 'KeyW', ctrlKey: true })).toBe(false)
  })

  it('gerakan cube biasa tidak perlu preventDefault', () => {
    for (const [code] of CORE_MOVES) {
      expect(shouldPreventDefault({ code })).toBe(false)
    }
  })
})

describe('custom keybind', () => {
  it('mengganti, menambah, dan mematikan mapping', () => {
    const map = createKeybindMap({
      KeyJ: "U'",
      KeyO: null,
      Digit5: 'M',
    })

    expect(moveOf(map, 'KeyJ')).toBe("U'")
    expect(map.resolve('KeyO')).toBeUndefined()
    expect(moveOf(map, 'Digit5')).toBe('M')
    expect(moveOf(map, 'KeyF')).toBe("U'")
  })

  it('menolak notasi gerakan yang tidak sah', () => {
    expect(() => createKeybindMap({ KeyJ: 'U3' })).toThrow(/KeyJ/)
  })

  it('mendeteksi konflik dengan tombol sistem/browser', () => {
    const clean = findKeybindConflicts(cstimerKeybindMap)
    expect(clean).toEqual([])

    const withConflicts = createKeybindMap({ F5: 'U', KeyJ: 'R' })
    expect(findKeybindConflicts(withConflicts)).toEqual([
      'F5: tombol sistem (jangan di-override)',
    ])
  })
})
