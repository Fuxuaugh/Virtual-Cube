/**
 * Test aturan Focus Mode (MILESTONES 8B, PRD §3.2).
 */

import { describe, expect, it } from 'vitest'
import { isFocusModeActive } from './focus-mode.js'

describe('isFocusModeActive', () => {
  it('aktif hanya saat timer Running (Turn 1)', () => {
    expect(isFocusModeActive('running')).toBe(true)
  })

  it('tidak aktif saat idle, inspection, finished, atau cancelled', () => {
    for (const status of [
      'idle',
      'inspection',
      'finished',
      'cancelled',
    ] as const) {
      expect(isFocusModeActive(status)).toBe(false)
    }
  })
})
