/**
 * Panel Recognition Practice (MILESTONES 7C, PRD §4).
 *
 * Murni presentasional: 4 tombol pilihan nama case, umpan balik langsung
 * (hijau benar / merah salah + highlight jawaban yang benar), waktu respons,
 * dan tombol Next Case. Nama & algoritma case tidak ditampilkan di sini.
 */

import type { RecognitionOption } from '../../application/training/distractor-generator.js'

export interface RecognitionPanelProps {
  options: readonly RecognitionOption[]
  selectedId: string | null
  correctId: string | null
  locked: boolean
  isCorrect: boolean | null
  responseMs: number | null
  attempts: number
  correctCount: number
  onAnswer(optionId: string): void
  onNext(): void
}

function stateOf(
  option: RecognitionOption,
  selectedId: string | null,
  correctId: string | null,
  locked: boolean
): 'idle' | 'correct' | 'wrong' | 'muted' {
  if (!locked) {
    return 'idle'
  }
  if (option.id === correctId) {
    return 'correct'
  }
  if (option.id === selectedId) {
    return 'wrong'
  }
  return 'muted'
}

const stateClass: Readonly<Record<string, string>> = {
  idle: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
  correct: 'bg-emerald-500 font-bold text-slate-900',
  wrong: 'bg-red-500 font-bold text-slate-100',
  muted: 'bg-slate-700/40 text-slate-400',
}

function formatResponseMs(responseMs: number): string {
  return responseMs >= 1000
    ? `${(responseMs / 1000).toFixed(2)} s`
    : `${Math.round(responseMs)} ms`
}

export function RecognitionPanel({
  options,
  selectedId,
  correctId,
  locked,
  isCorrect,
  responseMs,
  attempts,
  correctCount,
  onAnswer,
  onNext,
}: RecognitionPanelProps) {
  const correctLabel = options.find((option) => option.isCorrect)?.label ?? '—'

  return (
    <section
      className="rounded-xl bg-slate-800/60 p-4"
      data-testid="recognition-panel"
      aria-label="Recognition practice"
    >
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Kenali case ini
      </h2>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            data-testid={`recognition-option-${index}`}
            data-state={stateOf(option, selectedId, correctId, locked)}
            className={`rounded px-3 py-2 text-sm font-semibold transition-colors ${
              stateClass[stateOf(option, selectedId, correctId, locked)]
            }`}
            onClick={() => onAnswer(option.id)}
            disabled={locked}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-3 text-sm" role="status">
        {locked ? (
          <p
            data-testid="recognition-feedback"
            data-correct={isCorrect === true ? 'true' : 'false'}
            className={
              isCorrect === true
                ? 'font-semibold text-emerald-400'
                : 'font-semibold text-red-400'
            }
          >
            {isCorrect === true
              ? `Benar! (${correctLabel})`
              : `Salah — jawaban: ${correctLabel}`}
          </p>
        ) : (
          <p className="text-slate-400" data-testid="recognition-feedback">
            Pilih nama case yang benar.
          </p>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
        <span>
          Respons:{' '}
          <span data-testid="recognition-response" className="font-mono">
            {responseMs === null ? '—' : formatResponseMs(responseMs)}
          </span>
        </span>
        <span>
          Benar: <span data-testid="recognition-correct">{correctCount}</span>
          <span className="text-slate-500">
            {' '}
            / <span data-testid="recognition-attempts">{attempts}</span>
          </span>
        </span>
      </div>

      <button
        type="button"
        data-testid="recognition-next"
        className="rounded bg-cyan-600 px-3 py-1 text-sm font-semibold text-slate-900 hover:bg-cyan-500"
        onClick={onNext}
      >
        Next Case
      </button>

      <p className="mt-2 text-xs text-slate-400">
        Cube statis: gerakan keyboard dinonaktifkan di mode pengenalan.
      </p>
    </section>
  )
}
