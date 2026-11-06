/**
 * Tampilan timer (MILESTONES 8A, PRD §3.1 & §13).
 *
 * Menampilkan status inspection (hitungan mundur + penalti WCA) dan elapsed time.
 * Sumber waktu tetap `TimerController` (`performance.now()`); komponen ini hanya
 * memanggil `tick()` lewat `requestAnimationFrame` — tanpa `setInterval` dan tanpa
 * menjadikan state React sebagai sumber waktu.
 */

import { useEffect, useSyncExternalStore } from 'react'

import {
  type InspectionPenalty,
  type TimerController,
  type TimerStatus,
} from '../../application/timer/timer-controller.js'
import { formatInspection, formatTime } from './format-time.js'

export interface TimerDisplayProps {
  timer: TimerController
  className?: string
}

const STATUS_LABEL: Readonly<Record<TimerStatus, string>> = {
  idle: 'Siap',
  inspection: 'Inspection',
  running: 'Running',
  finished: 'Selesai',
  cancelled: 'Dibatalkan',
}

const PENALTY_LABEL: Readonly<Record<InspectionPenalty, string>> = {
  none: '',
  'plus-two': '+2',
  dnf: 'DNF',
}

export function TimerDisplay({ timer, className }: TimerDisplayProps) {
  const snapshot = useSyncExternalStore(
    timer.subscribe,
    timer.getSnapshot,
    timer.getSnapshot
  )

  // Update tampilan tiap frame selama timer berjalan (rAF, bukan setInterval).
  useEffect(() => {
    if (snapshot.status !== 'inspection' && snapshot.status !== 'running') {
      return
    }

    let handle = requestAnimationFrame(function loop() {
      timer.tick()
      handle = requestAnimationFrame(loop)
    })

    return () => cancelAnimationFrame(handle)
  }, [timer, snapshot.status])

  const penalty: InspectionPenalty =
    snapshot.status === 'inspection'
      ? snapshot.inspectionPenalty
      : snapshot.result === 'PLUS_TWO'
        ? 'plus-two'
        : snapshot.result === 'DNF'
          ? 'dnf'
          : 'none'

  const timeText =
    snapshot.status === 'inspection'
      ? formatInspection(snapshot.inspectionRemainingMs)
      : snapshot.status === 'running'
        ? formatTime(snapshot.elapsedMs)
        : snapshot.status === 'finished'
          ? snapshot.finalMs === null
            ? 'DNF'
            : formatTime(snapshot.finalMs)
          : snapshot.status === 'cancelled'
            ? '—'
            : formatTime(0)

  const timeClass =
    penalty === 'dnf'
      ? 'text-red-400'
      : penalty === 'plus-two'
        ? 'text-amber-300'
        : snapshot.status === 'running'
          ? 'text-cyan-300'
          : 'text-slate-100'

  return (
    <div
      className={`rounded-xl bg-slate-800/60 px-4 py-2 ${className ?? ''}`}
      data-testid="timer-display"
      data-status={snapshot.status}
      data-penalty={penalty}
    >
      <div className="flex items-baseline gap-3">
        <span
          className={`font-mono text-2xl font-bold tabular-nums ${timeClass}`}
          data-testid="timer-time"
        >
          {timeText}
        </span>
        {penalty !== 'none' && (
          <span
            className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-300"
            data-testid="timer-penalty"
          >
            {PENALTY_LABEL[penalty]}
          </span>
        )}
        <span
          className="text-xs font-semibold uppercase tracking-wide text-slate-400"
          data-testid="timer-status"
        >
          {STATUS_LABEL[snapshot.status]}
        </span>
      </div>
      <div className="mt-1 flex gap-3 text-xs text-slate-400">
        <span>
          Solve:{' '}
          <span data-testid="timer-solve-count">{snapshot.solveCount}</span>
        </span>
        <span>
          Terakhir:{' '}
          <span data-testid="timer-last-solve" className="font-mono">
            {snapshot.lastSolveMs === null
              ? '—'
              : formatTime(snapshot.lastSolveMs)}
          </span>
        </span>
        {snapshot.plusTwoCount > 0 && <span>+2: {snapshot.plusTwoCount}</span>}
        {snapshot.dnfCount > 0 && <span>DNF: {snapshot.dnfCount}</span>}
      </div>
    </div>
  )
}
