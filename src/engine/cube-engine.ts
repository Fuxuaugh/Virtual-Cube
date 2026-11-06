import { Alg, Move } from 'cubing/alg'
import type { KPattern } from 'cubing/kpuzzle'
import { cube3x3x3 } from 'cubing/puzzles'
import { CubeState, unwrapCubeState, wrapCubeState } from './cube-state.js'

let initPromise: Promise<void> | null = null
let cachedSolvedPattern: KPattern | null = null

const ALLOWED_FAMILIES = new Set([
  // Face moves (6)
  'U', 'D', 'L', 'R', 'F', 'B',
  // Wide moves (single letter, 6)
  'u', 'd', 'l', 'r', 'f', 'b',
  // Wide moves (WCA notation, 6)
  'Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw',
  // Slice moves (3)
  'M', 'E', 'S',
  // Rotations (3)
  'x', 'y', 'z',
])

/**
 * Validasi ketat notasi algoritma untuk 3x3 CFOP cube trainer.
 * Notasi yang didukung sesuai PRD §2:
 * - Face (U D L R F B)
 * - Wide (r l u d f b, Uw Dw Lw Rw Fw Bw)
 * - Slice (M E S)
 * - Rotasi (x y z)
 * - Modifier ' dan 2
 *
 * Melempar error bila ada move di luar notasi yang didukung, modifier tidak sah (misal U3),
 * atau karakter/token tidak valid.
 */
export function validateAndParseAlg(alg: string): Alg {
  if (typeof alg !== 'string') {
    throw new Error('Algorithm must be a string')
  }

  let parsed: Alg
  try {
    parsed = new Alg(alg)
  } catch (err) {
    throw new Error(
      `Invalid algorithm "${alg}": ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    )
  }

  const expanded = parsed.expand()
  for (const node of expanded.childAlgNodes()) {
    if (!(node instanceof Move)) {
      throw new Error(`Invalid move in algorithm "${alg}": unsupported node "${node.toString()}"`)
    }

    if (!ALLOWED_FAMILIES.has(node.family)) {
      throw new Error(`Invalid move family "${node.family}" in algorithm "${alg}"`)
    }

    const absAmount = Math.abs(node.amount)
    if (absAmount !== 1 && absAmount !== 2) {
      throw new Error(`Invalid move modifier/amount for "${node.toString()}" in algorithm "${alg}"`)
    }

    if ((node.innerLayer && node.innerLayer > 2) || (node.outerLayer && node.outerLayer > 2)) {
      throw new Error(`Invalid layer depth for 3x3 cube in move "${node.toString()}" in algorithm "${alg}"`)
    }
  }

  return parsed
}

/**
 * Memvalidasi apakah string algoritma sah menurut aturan notasi 3x3.
 * Melempar error bila tidak sah.
 */
export function validateAlg(alg: string): void {
  validateAndParseAlg(alg)
}

/**
 * Inisialisasi adapter cube engine.
 * kpuzzle() bersifat async, sehingga fungsi ini meng-cache hasilnya.
 * Aman dipanggil berkali-kali secara konkuren.
 */
export async function initCubeEngine(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const kpuzzle = await cube3x3x3.kpuzzle()
      cachedSolvedPattern = kpuzzle.defaultPattern()
    })()
  }
  return initPromise
}

/** Alias untuk initCubeEngine */
export const init = initCubeEngine

/**
 * Mengembalikan state kubus yang terselesaikan (solved).
 * Harus dipanggil setelah initCubeEngine() selesai di-await.
 */
export function solvedState(): CubeState {
  if (!cachedSolvedPattern) {
    throw new Error('CubeEngine not initialized. Await initCubeEngine() before calling solvedState().')
  }
  return wrapCubeState(cachedSolvedPattern)
}

/**
 * Menerapkan algoritma ke state kubus saat ini dan menghasilkan CubeState baru (immutable).
 * Mendukung notasi Face (U D L R F B), wide (r l u d f b), slice (M E S), rotasi (x y z), modifier ' dan 2.
 * Validasi ketat dijalankan SEBELUM menerapkan algoritma ke engine.
 * Melempar error yang jelas bila notasi algoritma tidak valid.
 */
export function applyAlg(state: CubeState, alg: string): CubeState {
  const pattern = unwrapCubeState(state)
  const parsed = validateAndParseAlg(alg)
  try {
    const nextPattern = pattern.applyAlg(parsed)
    return wrapCubeState(nextPattern)
  } catch (err) {
    throw new Error(
      `Invalid algorithm "${alg}": ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    )
  }
}

/**
 * Menghasilkan kebalikan (inverse) dari notasi algoritma yang diberikan.
 * Validasi ketat dijalankan SEBELUM melakukan inversi.
 * Melempar error yang jelas bila notasi algoritma tidak valid.
 */
export function invertAlg(alg: string): string {
  const parsed = validateAndParseAlg(alg)
  return parsed.invert().toString()
}

/**
 * Membandingkan dua state kubus apakah identik persis, termasuk orientasi cube.
 */
export function equals(a: CubeState, b: CubeState): boolean {
  const patternA = unwrapCubeState(a)
  const patternB = unwrapCubeState(b)
  return patternA.isIdentical(patternB)
}

export interface IsSolvedOptions {
  /**
   * Bila true, kubus harus berada dalam orientasi standar yang sama persis dengan solvedState().
   * Default false (solved detection tidak bergantung pada rotasi seluruh kubus x/y/z).
   */
  strict?: boolean
}

/**
 * Mengecek apakah state kubus terselesaikan.
 * Default: solved detection tidak peduli rotasi seluruh kubus (x/y/z).
 * Opsi strict: true: membandingkan orientasi juga (harus identik persis dengan solved awal).
 */
export function isSolved(state: CubeState, options?: IsSolvedOptions): boolean {
  const pattern = unwrapCubeState(state)

  if (options?.strict) {
    if (!cachedSolvedPattern) {
      throw new Error('CubeEngine not initialized. Await initCubeEngine() before calling isSolved() with strict option.')
    }
    return pattern.isIdentical(cachedSolvedPattern)
  }

  return pattern.experimentalIsSolved({
    ignorePuzzleOrientation: true,
    ignoreCenterOrientation: true,
  })
}
