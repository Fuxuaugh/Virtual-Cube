/**
 * Focus Mode (MILESTONES 8B, PRD §3.2).
 *
 * Focus Mode aktif otomatis saat timer berpindah ke status `running` (Turn 1)
 * dan berhenti saat solve selesai (`finished`), dibatalkan (`cancelled`), atau
 * direset (`idle`). Saat `inspection` UI masih normal (PRD §3.1: pengguna boleh
 * melihat case dan memutar tampilan).
 *
 * Modul ini murni supaya aturan transisinya bisa dites tanpa DOM; kelas/animasi
 * CSS-nya ada di `src/ui/training/`.
 */

import type { TimerStatus } from './timer-controller.js'

/** Status timer yang mengaktifkan Focus Mode. */
export const FOCUS_TIMER_STATUS: TimerStatus = 'running'

export function isFocusModeActive(status: TimerStatus): boolean {
  return status === FOCUS_TIMER_STATUS
}
