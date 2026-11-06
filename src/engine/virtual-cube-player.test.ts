/**
 * Test opsi adapter TwistyPlayer (MILESTONES M5.3, PRD §5).
 *
 * Mengunci kamera (hanya sisi U dan F) dan menonaktifkan kontrol mouse di satu
 * tempat, tanpa perlu DOM/WebGL.
 */

import { describe, expect, it } from 'vitest'
import { VIRTUAL_CUBE_PLAYER_OPTIONS } from './index.js'

describe('VIRTUAL_CUBE_PLAYER_OPTIONS', () => {
  it('mengunci kamera ke sudut U+F (35/0)', () => {
    expect(VIRTUAL_CUBE_PLAYER_OPTIONS.cameraLatitude).toBe(35)
    expect(VIRTUAL_CUBE_PLAYER_OPTIONS.cameraLongitude).toBe(0)
  })

  it('menonaktifkan kontrol mouse, control panel, dan hint facelets', () => {
    expect(VIRTUAL_CUBE_PLAYER_OPTIONS.controlPanel).toBe('none')
    expect(VIRTUAL_CUBE_PLAYER_OPTIONS.experimentalDragInput).toBe('none')
    expect(VIRTUAL_CUBE_PLAYER_OPTIONS.hintFacelets).toBe('none')
  })

  it('memakai puzzle 3x3x3 dengan visualisasi 3D', () => {
    expect(VIRTUAL_CUBE_PLAYER_OPTIONS.puzzle).toBe('3x3x3')
    expect(VIRTUAL_CUBE_PLAYER_OPTIONS.visualization).toBe('3D')
  })
})
