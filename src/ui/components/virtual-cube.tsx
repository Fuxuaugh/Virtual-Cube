/**
 * Komponen `VirtualCube` (MILESTONES M5.1-M5.5, PRD §5).
 *
 * Prinsip satu sumber state: komponen ini **hanya render**. State logis cube
 * hidup di Cube Engine; setiap gerakan diterapkan ke engine lebih dulu, lalu
 * didorong ke player (lihat `CubeViewSync` di `src/application/`). Komponen tidak
 * pernah membaca state dari TwistyPlayer untuk dijadikan kebenaran.
 *
 * Kamera terkunci `cameraLatitude: 35`, `cameraLongitude: 0` (hanya sisi U dan F)
 * dan kontrol mouse nonaktif; keduanya diatur adapter engine
 * (`VIRTUAL_CUBE_PLAYER_OPTIONS`), bukan di sini.
 */

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react'

import { setupAlgFor } from '../../application/cube-view-sync.js'
import type { Auf } from '../../domain/generator/index.js'
import type { TrainingCase } from '../../domain/training-case.js'
import {
  createVirtualCubePlayer,
  type VirtualCubePlayer,
  type VirtualCubePlayerOptions,
} from '../../engine/index.js'

/** Pabrik player; diganti implementasi palsu di test. */
export type VirtualCubePlayerFactory = (
  options: VirtualCubePlayerOptions
) => Promise<VirtualCubePlayer>

export interface VirtualCubeProps {
  /** Case aktif dari generator; `null`/tidak diisi = solved. */
  trainingCase?: TrainingCase | null
  /** AUF yang dipakai generator, supaya tampilan sama dengan setup state. */
  auf?: Auf
  /** Setup alg eksplisit; menang atas `trainingCase`/`auf`. */
  setupAlg?: string
  /** Kecepatan animasi (TwistyPlayer `tempoScale`). */
  tempoScale?: number
  /** Pabrik player (dependency injection untuk test). */
  createPlayer?: VirtualCubePlayerFactory
  /** Dipanggil saat player siap, dan `null` saat dibuang. */
  onPlayerChange?: (player: VirtualCubePlayer | null) => void
  className?: string
  /** Ref imperatif untuk mendorong gerakan/reset. */
  ref?: Ref<VirtualCubeHandle>
}

export interface VirtualCubeHandle {
  /** Dorong satu gerakan ke tampilan (panggil SETELAH engine menerapkannya). */
  addMove(move: string): void
  /** Tampilkan setup (case) tertentu. */
  setSetupAlg(setupAlg: string): void
  /** Reset tampilan ke solved. */
  resetToSolved(): void
  /** Reset tampilan ke case aktif. */
  resetToCase(): void
  readonly player: VirtualCubePlayer | null
}

export function VirtualCube({
  trainingCase,
  auf = '',
  setupAlg,
  tempoScale = 1,
  createPlayer,
  onPlayerChange,
  className,
  ref,
}: VirtualCubeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<VirtualCubePlayer | null>(null)
  const [ready, setReady] = useState(false)

  const activeSetupAlg = setupAlg ?? setupAlgFor(trainingCase ?? null, auf)

  useEffect(() => {
    let disposed = false
    const factory = createPlayer ?? createVirtualCubePlayer

    void factory({}).then((player) => {
      if (disposed) {
        player.dispose()
        return
      }
      playerRef.current = player
      containerRef.current?.append(player.element)
      setReady(true)
      onPlayerChange?.(player)
    })

    return () => {
      disposed = true
      playerRef.current?.dispose()
      playerRef.current = null
      setReady(false)
      onPlayerChange?.(null)
    }
  }, [createPlayer, onPlayerChange])

  useEffect(() => {
    if (ready) {
      playerRef.current?.setSetupAlg(activeSetupAlg)
    }
  }, [activeSetupAlg, ready])

  useEffect(() => {
    if (ready) {
      playerRef.current?.setTempoScale(tempoScale)
    }
  }, [ready, tempoScale])

  useImperativeHandle(
    ref,
    () => ({
      addMove: (move) => {
        playerRef.current?.addMove(move)
      },
      setSetupAlg: (alg) => {
        playerRef.current?.setSetupAlg(alg)
      },
      resetToSolved: () => {
        playerRef.current?.resetToSolved()
      },
      resetToCase: () => {
        playerRef.current?.setSetupAlg(activeSetupAlg)
      },
      get player() {
        return playerRef.current
      },
    }),
    [activeSetupAlg]
  )

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid="virtual-cube"
      data-player-ready={ready ? 'true' : 'false'}
    />
  )
}
