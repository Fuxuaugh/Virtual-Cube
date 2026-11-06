/**
 * Panel Algorithm Viewer + Playback (MILESTONES 7B, PRD §9).
 *
 * Murni presentasional: menampilkan notasi algoritma referensi dengan penanda
 * gerakan aktif, plus kontrol play/pause, step maju/mundur, reset, dan tempo.
 * Seluruh state/aksi datang dari `AlgorithmPlaybackController`.
 */

import { PLAYBACK_TEMPOS } from '../../application/training/algorithm-playback.js'

export interface AlgorithmPlaybackPanelProps {
  /** Notasi gerakan algoritma referensi. */
  moves: readonly string[]
  /** Indeks gerakan yang sedang aktif (-1 bila belum ada). */
  activeIndex: number
  /** AUF penyelarasan yang dijalankan sebelum algoritma ('' bila tidak ada). */
  alignmentAuf: string
  isPlaying: boolean
  isComplete: boolean
  canStepBackward: boolean
  canStepForward: boolean
  tempoScale: number
  onPlay(): void
  onPause(): void
  onStepForward(): void
  onStepBackward(): void
  onReset(): void
  onTempoScaleChange(tempoScale: number): void
}

const buttonClass =
  'rounded bg-slate-700 px-2 py-1 text-sm font-semibold text-slate-100 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40'

export function AlgorithmPlaybackPanel({
  moves,
  activeIndex,
  alignmentAuf,
  isPlaying,
  isComplete,
  canStepBackward,
  canStepForward,
  tempoScale,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  onTempoScaleChange,
}: AlgorithmPlaybackPanelProps) {
  return (
    <section
      className="rounded-xl bg-slate-800/60 p-4"
      data-testid="playback-panel"
      aria-label="Algorithm playback"
    >
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Algoritma
      </h2>

      <div
        className="mb-3 flex flex-wrap items-center gap-1"
        data-testid="algorithm-viewer"
      >
        {alignmentAuf !== '' && (
          <span
            className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-sm text-amber-200"
            title="AUF penyelarasan dijalankan lebih dulu"
            data-testid="playback-auf"
          >
            {alignmentAuf}
          </span>
        )}
        {moves.length === 0 ? (
          <span className="text-sm text-slate-400">Tidak ada algoritma.</span>
        ) : (
          moves.map((move, index) => (
            <span
              key={`${move}-${index}`}
              data-testid={`playback-move-${index}`}
              data-active={index === activeIndex ? 'true' : 'false'}
              className={`rounded px-2 py-0.5 font-mono text-sm transition-colors ${
                index === activeIndex
                  ? 'bg-cyan-500 font-bold text-slate-900'
                  : 'bg-slate-700/60 text-slate-200'
              }`}
            >
              {move}
            </span>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="playback-step-backward"
          className={buttonClass}
          onClick={onStepBackward}
          disabled={!canStepBackward}
        >
          ◀ Step
        </button>
        <button
          type="button"
          data-testid="playback-play"
          className={buttonClass}
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? 'Pause' : isComplete ? 'Replay' : 'Play'}
        </button>
        <button
          type="button"
          data-testid="playback-step-forward"
          className={buttonClass}
          onClick={onStepForward}
          disabled={!canStepForward}
        >
          Step ▶
        </button>
        <button
          type="button"
          data-testid="playback-reset"
          className={buttonClass}
          onClick={onReset}
        >
          Reset
        </button>

        <label className="ml-auto flex items-center gap-1 text-sm text-slate-300">
          Tempo
          <select
            data-testid="playback-tempo"
            className="rounded bg-slate-700 px-2 py-1 text-sm"
            value={String(tempoScale)}
            onChange={(event) => onTempoScaleChange(Number(event.target.value))}
          >
            {PLAYBACK_TEMPOS.map((tempo) => (
              <option key={tempo} value={String(tempo)}>
                {tempo}x
              </option>
            ))}
            {!PLAYBACK_TEMPOS.includes(tempoScale) && (
              <option value={String(tempoScale)}>{tempoScale}x</option>
            )}
          </select>
        </label>
      </div>

      <p className="mt-2 text-xs text-slate-400" data-testid="playback-hint">
        Step maju/mundur aman dipakai saat playback dijeda; input keybind manual
        tetap jalan.
      </p>
    </section>
  )
}
