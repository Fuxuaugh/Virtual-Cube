/**
 * Test Timer Controller (MILESTONES 8A, PRD §3.1).
 *
 * State machine diuji dengan jam palsu yang disuntik (`now`), plus satu test
 * yang memakai `vi.useFakeTimers()` untuk memastikan jalur default
 * `performance.now()` juga benar. Tidak ada `setInterval` di mana pun.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_TIMER_SETTINGS,
  PLUS_TWO_MS,
  TimerController,
} from './timer-controller.js'

let clock = 0

function createTimer(
  settings: Parameters<typeof TimerController.prototype.configure>[0] = {},
  overrides: { now?: () => number } = {}
): TimerController {
  return new TimerController({
    settings,
    now: overrides.now ?? (() => clock),
  })
}

beforeEach(() => {
  clock = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TimerController - transisi dasar', () => {
  it('mulai dari idle dan Space memulai inspection', () => {
    const timer = createTimer()

    expect(timer.getSnapshot().status).toBe('idle')
    expect(timer.getSnapshot().inspectionEnabled).toBe(true)

    timer.handleSpace()

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('inspection')
    expect(snapshot.inspectionRemainingMs).toBe(
      DEFAULT_TIMER_SETTINGS.inspectionMs
    )
    expect(snapshot.inspectionPenalty).toBe('none')
  })

  it('inspection dimatikan: Space langsung running', () => {
    const timer = createTimer({ inspectionEnabled: false })

    timer.handleSpace()

    expect(timer.getSnapshot().status).toBe('running')
    expect(timer.getSnapshot().elapsedMs).toBe(0)
  })

  it('Turn 1 (gerakan layer) memulai running dari inspection', () => {
    const timer = createTimer()
    timer.handleSpace()
    clock = 3000

    timer.handleLayerMove('R')

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('running')
    expect(snapshot.inspectionElapsedMs).toBe(0)
  })

  it('Turn 1 saat idle (tanpa inspection) memulai running', () => {
    const timer = createTimer({ inspectionEnabled: false })

    timer.handleLayerMove('U')

    expect(timer.getSnapshot().status).toBe('running')
  })

  it('rotasi x/y/z tidak memulai Turn 1 (tetap inspection)', () => {
    const timer = createTimer()
    timer.handleSpace()
    clock = 1000

    for (const move of ['x', "y'", 'z2']) {
      timer.handleLayerMove(move)
      timer.tick(clock)
      expect(timer.getSnapshot().status).toBe('inspection')
    }
  })

  it('gerakan layer (termasuk wide dan slice) memulai Turn 1 dari inspection', () => {
    for (const move of ['R', "U'", 'F2', 'Rw', 'M']) {
      clock = 0
      const timer = createTimer()
      timer.handleSpace()
      clock = 500

      timer.handleLayerMove(move)

      expect(timer.getSnapshot().status).toBe('running')
    }
  })

  it('rotasi seluruh cube tidak memulai timer saat idle', () => {
    const timer = createTimer()

    for (const move of ['x', 'y', "z'"]) {
      timer.handleLayerMove(move)
    }

    expect(timer.getSnapshot().status).toBe('idle')
  })

  it('Space saat running diabaikan', () => {
    const timer = createTimer()
    timer.handleSpace()
    timer.handleLayerMove('R')
    clock = 500
    timer.tick(clock)

    timer.handleSpace()

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('running')
    expect(snapshot.elapsedMs).toBe(500)
  })

  it('Space saat finished memulai attempt baru (inspection)', () => {
    const timer = createTimer()
    timer.handleSpace()
    timer.handleLayerMove('R')
    clock = 5000
    timer.handleSolved()
    expect(timer.getSnapshot().status).toBe('finished')

    timer.handleSpace()

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('inspection')
    expect(snapshot.finalMs).toBeNull()
    expect(snapshot.result).toBeNull()
  })
})

describe('TimerController - solved, waktu, dan statistik', () => {
  it('solved menghentikan timer dan mencatat waktu (OK)', () => {
    const timer = createTimer()
    timer.handleSpace()
    timer.handleLayerMove('R')

    clock = 12340
    timer.handleSolved()

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('finished')
    expect(snapshot.result).toBe('OK')
    expect(snapshot.finalMs).toBe(12340)
    expect(snapshot.penaltyMs).toBe(0)
    expect(snapshot.solveCount).toBe(1)
    expect(snapshot.lastSolveMs).toBe(12340)
    expect(timer.lastRecord()).toMatchObject({
      elapsedMs: 12340,
      result: 'OK',
      finalMs: 12340,
    })
  })

  it('elapsed time dihitung dari tick (rAF), bukan setInterval', () => {
    const timer = createTimer()
    timer.handleSpace()
    timer.handleLayerMove('R')

    clock = 250
    timer.tick(clock)
    expect(timer.getSnapshot().elapsedMs).toBe(250)

    clock = 1000
    timer.tick(clock)
    expect(timer.getSnapshot().elapsedMs).toBe(1000)

    // tick tanpa perubahan status tidak mengubah apa pun saat idle.
    timer.handleSolved()
    clock = 9999
    timer.tick(clock)
    expect(timer.getSnapshot().elapsedMs).toBe(0)
  })

  it('solve beruntun menambah solveCount dan lastSolveMs', () => {
    const timer = createTimer()

    timer.handleSpace()
    timer.handleLayerMove('R')
    clock = 1000
    timer.handleSolved()

    timer.handleSpace()
    timer.handleLayerMove('U')
    clock = 2500
    timer.handleSolved()

    const snapshot = timer.getSnapshot()
    expect(snapshot.solveCount).toBe(2)
    expect(snapshot.lastSolveMs).toBe(1500)
  })

  it('solved saat tidak running diabaikan', () => {
    const timer = createTimer()

    timer.handleSolved()

    expect(timer.getSnapshot().status).toBe('idle')
    expect(timer.getSnapshot().solveCount).toBe(0)
  })
})

describe('TimerController - penalti inspection WCA', () => {
  it('inspection lewat 15 detik: +2 (PLUS_TWO) dan final time +2 detik', () => {
    const timer = createTimer()
    timer.handleSpace()

    clock = 16000
    timer.handleLayerMove('R')
    expect(timer.getSnapshot().inspectionPenalty).toBe('plus-two')

    clock = 16000 + 5000
    timer.handleSolved()

    const snapshot = timer.getSnapshot()
    expect(snapshot.result).toBe('PLUS_TWO')
    expect(snapshot.penaltyMs).toBe(PLUS_TWO_MS)
    expect(snapshot.finalMs).toBe(5000 + PLUS_TWO_MS)
    expect(snapshot.plusTwoCount).toBe(1)
    expect(timer.lastRecord()).toMatchObject({
      elapsedMs: 5000,
      penaltyMs: 2000,
      finalMs: 7000,
      result: 'PLUS_TWO',
      inspectionMs: 16000,
    })
  })

  it('inspection lewat 17 detik: DNF (tidak masuk statistik waktu)', () => {
    const timer = createTimer()
    timer.handleSpace()

    clock = 18000
    timer.handleLayerMove('R')
    expect(timer.getSnapshot().inspectionPenalty).toBe('dnf')

    clock = 18000 + 3000
    timer.handleSolved()

    const snapshot = timer.getSnapshot()
    expect(snapshot.result).toBe('DNF')
    expect(snapshot.finalMs).toBeNull()
    expect(snapshot.lastSolveMs).toBeNull()
    expect(snapshot.dnfCount).toBe(1)
    expect(snapshot.solveCount).toBe(1)
  })

  it('penalti bisa dimatikan (penaltiesEnabled: false)', () => {
    const timer = createTimer({ penaltiesEnabled: false })
    timer.handleSpace()

    clock = 20000
    timer.handleLayerMove('R')
    expect(timer.getSnapshot().inspectionPenalty).toBe('none')

    clock = 20000 + 1000
    timer.handleSolved()

    const snapshot = timer.getSnapshot()
    expect(snapshot.result).toBe('OK')
    expect(snapshot.finalMs).toBe(1000)
  })

  it('display penalti mengikuti tick saat inspection berjalan', () => {
    const timer = createTimer()
    timer.handleSpace()

    clock = 10000
    timer.tick(clock)
    expect(timer.getSnapshot().inspectionPenalty).toBe('none')
    expect(timer.getSnapshot().inspectionRemainingMs).toBe(5000)

    clock = 15500
    timer.tick(clock)
    expect(timer.getSnapshot().inspectionPenalty).toBe('plus-two')
    expect(timer.getSnapshot().inspectionRemainingMs).toBe(0)

    clock = 17500
    timer.tick(clock)
    expect(timer.getSnapshot().inspectionPenalty).toBe('dnf')
  })

  it('durasi inspection bisa diubah', () => {
    const timer = createTimer({ inspectionMs: 5000 })
    timer.handleSpace()

    expect(timer.getSnapshot().inspectionRemainingMs).toBe(5000)

    clock = 2500
    timer.tick(clock)
    expect(timer.getSnapshot().inspectionRemainingMs).toBe(2500)
  })

  it('configure mengubah pengaturan inspection dan penalti', () => {
    const timer = createTimer()
    timer.configure({ inspectionEnabled: false, inspectionMs: 3000 })

    expect(timer.getSnapshot().inspectionEnabled).toBe(false)
    expect(timer.currentSettings().inspectionMs).toBe(3000)

    timer.handleSpace()
    expect(timer.getSnapshot().status).toBe('running')
  })
})

describe('TimerController - pembatalan dan reset', () => {
  it('Escape saat inspection membatalkan attempt (CANCELLED)', () => {
    const timer = createTimer()
    timer.handleSpace()

    timer.handleCancel()

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('cancelled')
    expect(snapshot.result).toBe('CANCELLED')
    expect(snapshot.solveCount).toBe(0)
    expect(timer.lastRecord()).toMatchObject({ result: 'CANCELLED' })
  })

  it('Escape saat running membatalkan tanpa masuk statistik waktu', () => {
    const timer = createTimer()
    timer.handleSpace()
    timer.handleLayerMove('R')
    clock = 4000
    timer.tick(clock)

    timer.handleCancel()

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('cancelled')
    expect(snapshot.solveCount).toBe(0)
    expect(snapshot.lastSolveMs).toBeNull()
    expect(snapshot.finalMs).toBeNull()
  })

  it('Escape saat idle/finished tidak mengubah status', () => {
    const timer = createTimer()

    timer.handleCancel()
    expect(timer.getSnapshot().status).toBe('idle')

    timer.handleSpace()
    timer.handleLayerMove('R')
    timer.handleSolved()
    timer.handleCancel()
    expect(timer.getSnapshot().status).toBe('finished')
  })

  it('reset mengembalikan ke idle', () => {
    const timer = createTimer()
    timer.handleSpace()
    timer.handleLayerMove('R')
    clock = 1200
    timer.handleSolved()

    timer.reset()

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('idle')
    expect(snapshot.result).toBeNull()
    expect(snapshot.finalMs).toBeNull()
    // Statistik kumulatif tidak direset oleh reset().
    expect(snapshot.solveCount).toBe(1)
  })

  it('subscriber dipanggil pada transisi dan tick', () => {
    const timer = createTimer()
    let notifications = 0
    const unsubscribe = timer.subscribe(() => {
      notifications += 1
    })

    timer.handleSpace()
    expect(notifications).toBe(1)

    timer.handleLayerMove('R')
    expect(notifications).toBe(2)

    clock = 100
    timer.tick(clock)
    expect(notifications).toBe(3)

    unsubscribe()
    timer.handleSolved()
    expect(notifications).toBe(3)
  })
})

describe('TimerController - jam palsu dan sumber waktu default', () => {
  it('memakai performance.now() default dengan vi.useFakeTimers()', () => {
    vi.useFakeTimers()
    const timer = new TimerController()

    timer.handleSpace()
    vi.advanceTimersByTime(4000)
    timer.tick()

    expect(timer.getSnapshot().inspectionElapsedMs).toBeGreaterThanOrEqual(4000)

    timer.handleLayerMove('R')
    vi.advanceTimersByTime(2500)
    timer.handleSolved()

    const snapshot = timer.getSnapshot()
    expect(snapshot.status).toBe('finished')
    expect(snapshot.finalMs).toBeGreaterThanOrEqual(2500)
    expect(snapshot.elapsedMs).toBe(0)
  })
})
