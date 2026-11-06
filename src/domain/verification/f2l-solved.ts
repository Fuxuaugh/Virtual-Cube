/**
 * Verifikasi F2L (PRD §7.2/§7.4, MILESTONES M4.3).
 *
 * Semua pemeriksaan dihitung dari state engine (bukan dari nama/isi algoritma),
 * sehingga alat ini tidak bergantung pada algoritma case mana pun.
 */

import {
  isOrbitSliceSolved,
  layerSlots,
  type CubeState,
} from '../../engine/index.js'
import { canonicalState, type VerificationOptions } from './options.js'

/**
 * True bila dua layer bawah (cross + 4 slot F2L) terpecahkan dan keenam center
 * berada di slot asalnya; orientasi (dan permutasi) layer atas U diabaikan.
 *
 * Default: state dinormalisasi lebih dulu (`normalizeOrientation`), sehingga
 * state yang seluruh kubusnya diputar — termasuk karena slice atau rotasi yang
 * netto menggeser center — tetap dihitung solved. Opsi `{ strict: true }` memakai
 * state apa adanya, jadi center harus sudah di slot asalnya (perilaku lama).
 */
export function f2lSolved(
  state: CubeState,
  options?: VerificationOptions
): boolean {
  const slots = layerSlots()
  const canonical = canonicalState(state, options)

  return (
    isOrbitSliceSolved(canonical, 'CORNERS', slots.bottomCorners) &&
    isOrbitSliceSolved(canonical, 'EDGES', slots.bottomEdges) &&
    isOrbitSliceSolved(canonical, 'CENTERS', slots.centers)
  )
}
