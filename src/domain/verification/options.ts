/**
 * Opsi verifikasi orientasi (PRD §7).
 *
 * Secara default verifikasi memakai state yang sudah dinormalisasi
 * (`normalizeOrientation`): seluruh kubus diputar sampai keenam center kembali ke
 * slot asal, sehingga rotasi atau slice yang netto menggeser center (mis. alg
 * yang diakhiri `x'`) tidak membuat frame berbeda. Opsi `strict` mematikan
 * normalisasi tersebut.
 */

import { normalizeOrientation, type CubeState } from '../../engine/index.js'

export interface VerificationOptions {
  /** `true`: pakai state apa adanya, tanpa normalisasi orientasi. */
  strict?: boolean
}

/** State dalam frame kanonik (center di slot asal) kecuali `strict: true`. */
export function canonicalState(
  state: CubeState,
  options?: VerificationOptions
): CubeState {
  return options?.strict ? state : normalizeOrientation(state)
}
