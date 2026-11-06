/**
 * Layar latihan (MILESTONES 7A, PRD §3 & §4).
 *
 * Berisi:
 * - panel kontrol: pemilih kategori (F2L/OLL/PLL), pemilih mode (Random/Specific
 *   Case), tombol Next Case & Retry;
 * - area utama: `VirtualCube` yang menampilkan state dari Case Generator;
 * - panel info case: id, nama, tag/grup, dan algoritma referensi;
 * - listener keybind terpusat (satu `keydown` di window) yang meneruskan gerakan
 *   ke `TrainingController` → Cube Engine → tampilan.
 *
 * State logis tetap di Cube Engine; komponen ini hanya menampilkan snapshot.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import type { KeybindTimerPort } from '../../application/keybind/keybind-service.js'
import { TrainingController } from '../../application/training/training-controller.js'
import {
  cstimerKeybindMap,
  codeForMove,
  type KeybindMap,
} from '../../domain/keybind/index.js'
import { loadCases } from '../../domain/load-cases.js'
import type { Auf } from '../../domain/generator/index.js'
import type { CaseCategory, TrainingCase } from '../../domain/training-case.js'
import type { VirtualCubePlayer } from '../../engine/index.js'
import { attachKeybindListener } from '../../infra/keybind/keybind-listener.js'
import {
  VirtualCube,
  type VirtualCubePlayerFactory,
} from '../components/virtual-cube.js'

const CATEGORIES: readonly CaseCategory[] = ['F2L', 'OLL', 'PLL']

export interface TrainingScreenProps {
  /** Pool case; default dimuat lewat `loadCases()` (F2L + OLL + PLL). */
  cases?: readonly TrainingCase[]
  /** Port timer (M8); opsional. */
  timer?: KeybindTimerPort
  /** Pabrik player `VirtualCube` (di-inject di test agar tanpa WebGL). */
  createPlayer?: VirtualCubePlayerFactory
  /** Peta keybind custom. */
  keybindMap?: KeybindMap
  /** AUF setup; default acak (mengikuti generator). */
  auf?: Auf | 'random'
  className?: string
}

export function TrainingScreen({
  cases,
  timer,
  createPlayer,
  keybindMap,
  auf,
  className,
}: TrainingScreenProps) {
  const [loadedPool, setLoadedPool] = useState<readonly TrainingCase[] | null>(
    null
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const pool = cases ?? loadedPool

  useEffect(() => {
    if (cases) {
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const loaded = (
          await Promise.all([
            loadCases('F2L'),
            loadCases('OLL'),
            loadCases('PLL'),
          ])
        ).flat()
        if (!cancelled) {
          setLoadedPool(loaded)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [cases])

  if (loadError) {
    return (
      <div className="p-6 text-red-400" role="alert">
        Gagal memuat data case: {loadError}
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="p-6 text-slate-300" data-testid="training-loading">
        Memuat data case…
      </div>
    )
  }

  return (
    <TrainingSession
      pool={pool}
      timer={timer}
      createPlayer={createPlayer}
      keybindMap={keybindMap}
      auf={auf}
      className={className}
    />
  )
}

interface TrainingSessionProps {
  pool: readonly TrainingCase[]
  timer?: KeybindTimerPort
  createPlayer?: VirtualCubePlayerFactory
  keybindMap?: KeybindMap
  auf?: Auf | 'random'
  className?: string
}

function TrainingSession({
  pool,
  timer,
  createPlayer,
  keybindMap,
  auf,
  className,
}: TrainingSessionProps) {
  const [controller] = useState(() => {
    const created = new TrainingController({ cases: pool, timer, keybindMap })
    created.startSession({
      category: 'F2L',
      mode: 'random',
      auf: auf ?? 'random',
    })
    return created
  })

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  )

  // Listener keybind terpusat untuk halaman latihan.
  useEffect(
    () =>
      attachKeybindListener({
        map: keybindMap ?? cstimerKeybindMap,
        onAction: (_action, _event, input) => controller.handleKey(input),
      }),
    [controller, keybindMap]
  )

  const handlePlayerChange = useCallback(
    (player: VirtualCubePlayer | null) => {
      controller.attachPlayer(player)
    },
    [controller]
  )

  const poolCases = controller.poolForActiveCategory()
  const activeCase = snapshot.activeCase

  return (
    <div
      className={`flex min-h-screen flex-col gap-4 bg-slate-900 p-6 text-slate-100 ${className ?? ''}`}
      data-testid="training-screen"
    >
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="mr-2 text-xl font-bold tracking-tight text-cyan-400">
          Cube Trainer
        </h1>

        <div
          className="flex gap-1 rounded-lg bg-slate-800 p-1"
          role="group"
          aria-label="Kategori"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              data-testid={`category-${category}`}
              aria-pressed={snapshot.category === category}
              onClick={() => controller.startSession({ category })}
              className={`rounded px-3 py-1 text-sm font-semibold ${
                snapshot.category === category
                  ? 'bg-cyan-500 text-slate-900'
                  : 'text-slate-200 hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div
          className="flex gap-1 rounded-lg bg-slate-800 p-1"
          role="group"
          aria-label="Mode"
        >
          <button
            type="button"
            data-testid="mode-random"
            aria-pressed={snapshot.mode === 'random'}
            onClick={() => controller.startSession({ mode: 'random' })}
            className={`rounded px-3 py-1 text-sm font-semibold ${
              snapshot.mode === 'random'
                ? 'bg-cyan-500 text-slate-900'
                : 'text-slate-200 hover:bg-slate-700'
            }`}
          >
            Random
          </button>
          <button
            type="button"
            data-testid="mode-specific"
            aria-pressed={snapshot.mode === 'specific'}
            onClick={() =>
              controller.startSession({
                mode: 'specific',
                caseIds: poolCases.length > 0 ? [poolCases[0].id] : [],
              })
            }
            className={`rounded px-3 py-1 text-sm font-semibold ${
              snapshot.mode === 'specific'
                ? 'bg-cyan-500 text-slate-900'
                : 'text-slate-200 hover:bg-slate-700'
            }`}
          >
            Specific Case
          </button>
        </div>

        {snapshot.mode === 'specific' && (
          <select
            data-testid="case-select"
            aria-label="Pilih case"
            value={activeCase?.id ?? ''}
            onChange={(event) =>
              controller.startSession({
                mode: 'specific',
                caseIds: [event.target.value],
              })
            }
            className="rounded bg-slate-800 px-2 py-1 text-sm"
          >
            {poolCases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} — {item.name}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            data-testid="retry"
            onClick={() => controller.retry()}
            className="rounded bg-slate-700 px-3 py-1 text-sm font-semibold hover:bg-slate-600"
          >
            Retry
          </button>
          <button
            type="button"
            data-testid="next-case"
            onClick={() => controller.nextCase()}
            className="rounded bg-cyan-600 px-3 py-1 text-sm font-semibold text-slate-900 hover:bg-cyan-500"
          >
            Next Case
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 lg:flex-row">
        <section className="flex flex-1 items-center justify-center rounded-xl bg-slate-950/60 p-4">
          <VirtualCube
            className="h-[420px] w-full max-w-md"
            setupAlg={snapshot.setupAlg ?? ''}
            createPlayer={createPlayer}
            onPlayerChange={handlePlayerChange}
          />
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-80">
          <section className="rounded-xl bg-slate-800/60 p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Info Case
            </h2>
            {snapshot.error ? (
              <p className="text-sm text-red-400" data-testid="case-error">
                {snapshot.error}
              </p>
            ) : activeCase ? (
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-20 text-slate-400">ID</dt>
                  <dd data-testid="case-id" className="font-mono">
                    {activeCase.id}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 text-slate-400">Nama</dt>
                  <dd data-testid="case-name">{activeCase.name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 text-slate-400">Tag</dt>
                  <dd data-testid="case-tags">
                    {activeCase.tags.length > 0
                      ? activeCase.tags.join(', ')
                      : '—'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 text-slate-400">Algoritma</dt>
                  <dd
                    data-testid="case-algorithm"
                    className="font-mono break-all"
                  >
                    {activeCase.algorithm}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 text-slate-400">Kunci</dt>
                  <dd className="font-mono">
                    {codeForMove(cstimerKeybindMap, 'U')} = U,{' '}
                    {codeForMove(cstimerKeybindMap, 'R')} = R (csTimer)
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-400">Tidak ada case aktif.</p>
            )}
          </section>

          <section className="rounded-xl bg-slate-800/60 p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Status
            </h2>
            <p className="text-sm">
              <span className="text-slate-400">Kondisi: </span>
              <span
                data-testid="status"
                className={
                  snapshot.status === 'solved'
                    ? 'font-semibold text-emerald-400'
                    : 'font-semibold text-amber-300'
                }
              >
                {snapshot.status === 'solved' ? 'Solved!' : 'Ready'}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-slate-400">Gerakan: </span>
              <span data-testid="move-count">{snapshot.moveCount}</span>
            </p>
            <p className="text-sm">
              <span className="text-slate-400">Selesai: </span>
              <span data-testid="solved-count">{snapshot.solvedCount}</span>
            </p>
            <p className="text-sm">
              <span className="text-slate-400">Pool: </span>
              <span data-testid="pool-size">{snapshot.poolSize}</span> case
            </p>
            {snapshot.status === 'solved' && (
              <p className="mt-2 text-xs text-emerald-300">
                Case selesai — pilih Next Case atau Retry.
              </p>
            )}
          </section>
        </aside>
      </main>
    </div>
  )
}
