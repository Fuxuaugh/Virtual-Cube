/**
 * Keybind domain (MILESTONES M6): pemetaan `event.code` → aksi cube/timer.
 * Murni: tanpa React dan tanpa API browser (tidak menyentuh `window`/`document`).
 */

export {
  BROWSER_ACTION_CODES,
  CSTIMER_KEYBINDS,
  cstimerKeybindMap,
  createKeybindMap,
  codeForMove,
  findKeybindConflicts,
  isCubeMoveAction,
  isTimerAction,
  shouldIgnoreKeybindInput,
  shouldPreventDefault,
  SYSTEM_KEY_CODES,
  type KeybindAction,
  type KeybindDefinition,
  type KeybindInput,
  type KeybindMap,
  type KeybindOverrides,
} from './keybind-map.js'
