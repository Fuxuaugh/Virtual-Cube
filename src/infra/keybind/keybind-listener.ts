/**
 * Listener keybind terpusat (MILESTONES M6.2, PRD §2 & §10).
 *
 * SATU listener `keydown` di `window` (bukan listener tersebar di banyak
 * komponen). Tugasnya hanya menerjemahkan `KeyboardEvent` menjadi `KeybindInput`
 * lalu menyerahkannya ke pemanggil; seluruh aturan ada di domain keybind supaya
 * bisa dites tanpa DOM.
 *
 * - Memakai `event.code` (posisi fisik tombol), bukan `event.key`.
 * - `preventDefault()` hanya untuk tombol beraksi bawaan browser (Space, panah)
 *   saat aktif, dan TIDAK untuk shortcut sistem (F1-F12, Ctrl+…, Tab, Escape).
 * - Input diabaikan saat fokus ada di input/textarea/contenteditable.
 */

import {
  cstimerKeybindMap,
  shouldIgnoreKeybindInput,
  shouldPreventDefault,
  type KeybindAction,
  type KeybindInput,
  type KeybindMap,
} from '../../domain/keybind/index.js'

/** Target minimal listener (window atau elemen). */
export interface KeybindEventTarget {
  addEventListener(type: 'keydown', listener: (event: Event) => void): void
  removeEventListener(type: 'keydown', listener: (event: Event) => void): void
}

export interface KeybindListenerOptions {
  /** Dipanggil untuk tiap aksi yang dikenali. */
  onAction: (action: KeybindAction, event: Event) => void
  /** Peta keybind; default preset csTimer. */
  map?: KeybindMap
  /** True bila listener boleh menangani input (mis. fokus di area latihan). */
  isActive?: () => boolean
  /** Sumber elemen fokus; default `document.activeElement`. */
  getActiveElement?: () => Element | null
  /** Target listener; default `window` (satu handler terpusat). */
  target?: KeybindEventTarget
}

/** Melepas listener. */
export type KeybindDetach = () => void

/** True bila elemen adalah input teks (input/textarea/contenteditable). */
export function isTextInputElement(
  element: Element | null | undefined
): boolean {
  if (!element) {
    return false
  }

  const tagName = element.tagName?.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }

  const htmlElement = element as HTMLElement
  if (htmlElement.isContentEditable === true) {
    return true
  }

  const attribute = element.getAttribute?.('contenteditable')
  return (
    attribute === '' || attribute === 'true' || attribute === 'plaintext-only'
  )
}

/** Menyusun `KeybindInput` dari `KeyboardEvent`. */
export function toKeybindInput(
  event: Event,
  options?: { fromTextInput?: boolean }
): KeybindInput | undefined {
  const keyboardEvent = event as KeyboardEvent
  if (typeof keyboardEvent.code !== 'string' || keyboardEvent.code === '') {
    return undefined
  }

  return {
    code: keyboardEvent.code,
    ctrlKey: keyboardEvent.ctrlKey === true,
    altKey: keyboardEvent.altKey === true,
    metaKey: keyboardEvent.metaKey === true,
    repeat: keyboardEvent.repeat === true,
    fromTextInput: options?.fromTextInput === true,
  }
}

/**
 * Memasang satu listener keydown terpusat.
 * @returns fungsi untuk melepas listener.
 */
export function attachKeybindListener(
  options: KeybindListenerOptions
): KeybindDetach {
  const map = options.map ?? cstimerKeybindMap
  const isActive = options.isActive ?? (() => true)
  const target: KeybindEventTarget =
    options.target ?? (window as unknown as KeybindEventTarget)
  const getActiveElement =
    options.getActiveElement ??
    (() => (typeof document === 'undefined' ? null : document.activeElement))

  const handler = (event: Event): void => {
    if (!isActive()) {
      return
    }

    const input = toKeybindInput(event, {
      fromTextInput: isTextInputElement(getActiveElement()),
    })
    if (!input) {
      return
    }

    if (shouldPreventDefault(input)) {
      event.preventDefault()
    }

    if (shouldIgnoreKeybindInput(input)) {
      return
    }

    const action = map.resolve(input.code)
    if (!action) {
      return
    }

    options.onAction(action, event)
  }

  target.addEventListener('keydown', handler)
  return () => {
    target.removeEventListener('keydown', handler)
  }
}
