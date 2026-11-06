/**
 * Peta keybind csTimer (MILESTONES M6.1/M6.3, PRD §2 & §10).
 *
 * Sumber tunggal: `docs/keybinds.md` (peta "Virtual Cube Key Map" csTimer, layout
 * QWERTY, diverifikasi dari UI csTimer). Tidak ada tombol yang ditulis dari
 * asumsi di sini.
 *
 * Aturan yang dipegang:
 * - Pemetaan memakai `event.code` (posisi fisik tombol, mis. `KeyJ`), bukan
 *   `event.key`, supaya tidak bergantung layout keyboard.
 * - Tombol yang di peta csTimer tidak menghasilkan gerakan (3, 4, 7, 8) dan
 *   tombol yang belum terverifikasi (5 dan 6: sama-sama tertulis `M`) TIDAK
 *   dipetakan, supaya tidak memicu pergerakan cube.
 * - Rotasi seluruh cube (`x`, `y`, `z`) tidak memulai timer; gerakan layer
 *   memulai timer (hasil tes csTimer di `docs/keybinds.md`).
 * - `Space` (inspection/solve) berasal dari PRD §3.1, bukan dari peta gerakan.
 */

import { isLayerMove, validateAlg } from '../../engine/index.js'

/** Aksi hasil pemetaan satu tombol. */
export type KeybindAction =
  | {
      readonly kind: 'cube-move'
      readonly code: string
      readonly move: string
      /** True bila gerakan ini memulai timer solve (gerakan layer, bukan rotasi). */
      readonly startsTimer: boolean
    }
  | { readonly kind: 'timer-space'; readonly code: string }

/** Satu baris peta keybind. */
export interface KeybindDefinition {
  /** `event.code` posisi fisik tombol. */
  readonly code: string
  /** Notasi gerakan cube; tidak ada = tidak menghasilkan gerakan. */
  readonly move?: string
  /** Aksi timer (Space). */
  readonly timer?: 'space'
  /** Grup baris peta dari `docs/keybinds.md`. */
  readonly row: string
  /** Catatan/status dari `docs/keybinds.md`. */
  readonly note?: string
}

/** Input minimal yang dibutuhkan pemetaan (tanpa tipe DOM). */
export interface KeybindInput {
  readonly code: string
  readonly ctrlKey?: boolean
  readonly altKey?: boolean
  readonly metaKey?: boolean
  readonly repeat?: boolean
  /** Fokus berada di elemen input teks (input/textarea/contenteditable). */
  readonly fromTextInput?: boolean
}

/**
 * Peta csTimer apa adanya dari `docs/keybinds.md`.
 * Entri tanpa `move` sengaja ada supaya statusnya terdokumentasi dan diuji.
 */
export const CSTIMER_KEYBINDS: readonly KeybindDefinition[] = [
  // Baris angka
  { code: 'Digit1', move: "S'", row: 'Angka' },
  { code: 'Digit2', move: 'E', row: 'Angka' },
  {
    code: 'Digit3',
    row: 'Angka',
    note: 'peta menampilkan "<"; dites di csTimer tidak menghasilkan gerakan',
  },
  {
    code: 'Digit4',
    row: 'Angka',
    note: 'peta menampilkan ">"; dites di csTimer tidak menghasilkan gerakan',
  },
  {
    code: 'Digit5',
    row: 'Angka',
    note: 'peta menampilkan "M", tetapi belum terverifikasi (5 dan 6 sama-sama "M")',
  },
  {
    code: 'Digit6',
    row: 'Angka',
    note: 'peta menampilkan "M", tetapi belum terverifikasi (5 dan 6 sama-sama "M")',
  },
  {
    code: 'Digit7',
    row: 'Angka',
    note: 'peta menampilkan "<"; dites di csTimer tidak menghasilkan gerakan',
  },
  {
    code: 'Digit8',
    row: 'Angka',
    note: 'peta menampilkan ">"; dites di csTimer tidak menghasilkan gerakan',
  },
  { code: 'Digit9', move: "E'", row: 'Angka' },
  { code: 'Digit0', move: 'S', row: 'Angka' },

  // Baris atas
  { code: 'KeyQ', move: "z'", row: 'Atas' },
  { code: 'KeyW', move: 'B', row: 'Atas' },
  { code: 'KeyE', move: "L'", row: 'Atas' },
  { code: 'KeyR', move: "Lw'", row: 'Atas' },
  { code: 'KeyT', move: 'x', row: 'Atas' },
  { code: 'KeyY', move: 'x', row: 'Atas' },
  { code: 'KeyU', move: 'Rw', row: 'Atas' },
  { code: 'KeyI', move: 'R', row: 'Atas' },
  { code: 'KeyO', move: "B'", row: 'Atas' },
  { code: 'KeyP', move: 'z', row: 'Atas' },

  // Baris tengah
  { code: 'KeyA', move: "y'", row: 'Tengah' },
  { code: 'KeyS', move: 'D', row: 'Tengah' },
  { code: 'KeyD', move: 'L', row: 'Tengah' },
  { code: 'KeyF', move: "U'", row: 'Tengah' },
  { code: 'KeyG', move: "F'", row: 'Tengah' },
  { code: 'KeyH', move: 'F', row: 'Tengah' },
  { code: 'KeyJ', move: 'U', row: 'Tengah' },
  { code: 'KeyK', move: "R'", row: 'Tengah' },
  { code: 'KeyL', move: "D'", row: 'Tengah' },
  { code: 'Semicolon', move: 'y', row: 'Tengah' },

  // Baris bawah
  { code: 'KeyZ', move: 'Dw', row: 'Bawah' },
  { code: 'KeyX', move: "M'", row: 'Bawah' },
  { code: 'KeyC', move: "Uw'", row: 'Bawah' },
  { code: 'KeyV', move: 'Lw', row: 'Bawah' },
  { code: 'KeyB', move: "x'", row: 'Bawah' },
  { code: 'KeyN', move: "x'", row: 'Bawah' },
  { code: 'KeyM', move: "Rw'", row: 'Bawah' },
  { code: 'Comma', move: 'Uw', row: 'Bawah' },
  { code: 'Period', move: "M'", row: 'Bawah' },
  { code: 'Slash', move: "Dw'", row: 'Bawah' },

  // Timer (PRD §3.1), bukan bagian peta gerakan csTimer
  {
    code: 'Space',
    timer: 'space',
    row: 'Timer',
    note: 'PRD §3.1: Space memulai inspection/solve',
  },
]

/** Tombol yang punya aksi bawaan browser dan perlu di-preventDefault (PRD §2). */
export const BROWSER_ACTION_CODES: readonly string[] = [
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]

/**
 * Tombol yang TIDAK boleh di-preventDefault: shortcut sistem (F5, F11, F12, dsb)
 * dan tombol navigasi dasar (Tab, Escape).
 */
export const SYSTEM_KEY_CODES: readonly string[] = [
  ...Array.from({ length: 12 }, (_, index) => `F${index + 1}`),
  'Tab',
  'Escape',
]

/** Override keybind: `code` → notasi gerakan, atau `null` untuk menghapus. */
export interface KeybindOverrides {
  readonly [code: string]: string | null
}

export interface KeybindMap {
  /** Definisi efektif (preset + override), urut seperti peta. */
  readonly definitions: readonly KeybindDefinition[]
  /** Aksi untuk sebuah `event.code`, atau `undefined` bila tidak ada. */
  resolve(code: string): KeybindAction | undefined
}

/** True bila penekanan tombol harus diabaikan sepenuhnya. */
export function shouldIgnoreKeybindInput(input: KeybindInput): boolean {
  if (input.ctrlKey || input.altKey || input.metaKey) {
    return true
  }
  if (input.repeat) {
    return true
  }
  return input.fromTextInput === true
}

/** True bila `preventDefault()` perlu dipanggil untuk input ini (PRD §2). */
export function shouldPreventDefault(input: KeybindInput): boolean {
  if (shouldIgnoreKeybindInput(input)) {
    return false
  }
  if (SYSTEM_KEY_CODES.includes(input.code)) {
    return false
  }
  return BROWSER_ACTION_CODES.includes(input.code)
}

/**
 * Membuat peta keybind dari preset csTimer, dengan override opsional.
 * Notasi gerakan pada override divalidasi lewat engine (melempar bila tidak sah).
 */
export function createKeybindMap(overrides: KeybindOverrides = {}): KeybindMap {
  for (const [code, move] of Object.entries(overrides)) {
    if (move !== null && move !== '') {
      try {
        validateAlg(move)
      } catch (error) {
        throw new Error(
          `createKeybindMap: gerakan tidak sah untuk "${code}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error }
        )
      }
    }
  }

  const definitions: KeybindDefinition[] = CSTIMER_KEYBINDS.map(
    (definition) => {
      if (!(definition.code in overrides)) {
        return definition
      }
      const move = overrides[definition.code]
      return move === null || move === ''
        ? { code: definition.code, row: definition.row, note: 'dimatikan' }
        : { ...definition, move, note: 'custom' }
    }
  )

  const extraDefinitions: KeybindDefinition[] = Object.entries(overrides)
    .filter(
      ([code, move]) =>
        move !== null &&
        move !== '' &&
        !CSTIMER_KEYBINDS.some((definition) => definition.code === code)
    )
    .map(([code, move]) => ({ code, move: move as string, row: 'Custom' }))

  const allDefinitions = [...definitions, ...extraDefinitions]
  const byCode = new Map<string, KeybindAction>()

  for (const definition of allDefinitions) {
    if (definition.move !== undefined) {
      byCode.set(definition.code, {
        kind: 'cube-move',
        code: definition.code,
        move: definition.move,
        startsTimer: isLayerMove(definition.move),
      })
    } else if (definition.timer === 'space') {
      byCode.set(definition.code, {
        kind: 'timer-space',
        code: definition.code,
      })
    }
  }

  return {
    definitions: allDefinitions,
    resolve: (code) => byCode.get(code),
  }
}

/** Type guard aksi gerakan cube. */
export function isCubeMoveAction(
  action: KeybindAction | undefined
): action is Extract<KeybindAction, { kind: 'cube-move' }> {
  return action?.kind === 'cube-move'
}

/** Type guard aksi timer (Space). */
export function isTimerAction(
  action: KeybindAction | undefined
): action is Extract<KeybindAction, { kind: 'timer-space' }> {
  return action?.kind === 'timer-space'
}
/**
 * Kode tombol pertama yang memetakan sebuah notasi gerakan, mis. `U` → `KeyJ`.
 * Dipakai untuk petunjuk UI dan test; `undefined` bila tidak ada tombolnya
 * (mis. `M` yang belum terverifikasi).
 */
export function codeForMove(map: KeybindMap, move: string): string | undefined {
  return map.definitions.find((definition) => definition.move === move)?.code
}
/** Peta default (preset csTimer tanpa override). */
export const cstimerKeybindMap: KeybindMap = createKeybindMap()

/**
 * Mencari keybind yang berkonflik dengan shortcut sistem/browser, mis. override
 * yang memakai `F5` atau `Space` untuk gerakan cube.
 */
export function findKeybindConflicts(map: KeybindMap): string[] {
  const conflicts: string[] = []

  for (const definition of map.definitions) {
    if (SYSTEM_KEY_CODES.includes(definition.code)) {
      conflicts.push(`${definition.code}: tombol sistem (jangan di-override)`)
      continue
    }
    if (
      definition.timer !== 'space' &&
      definition.move !== undefined &&
      BROWSER_ACTION_CODES.includes(definition.code)
    ) {
      conflicts.push(`${definition.code}: aksi bawaan browser`)
    }
  }

  return conflicts
}
