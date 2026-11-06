/**
 * Alat verifikasi case (PRD §7, MILESTONES M4.3/M4.4).
 *
 * Seluruh pemeriksaan dihitung dari state pada Cube Engine, bukan dari nama atau
 * isi algoritma case. Modul ini murni: tanpa React dan tanpa API browser, dan
 * hanya memakai adapter `src/engine/`.
 *
 * Secara default `f2lSolved`, `ollSignature`, dan `pllSignature` memakai state
 * yang sudah dinormalisasi orientasinya; opsi `{ strict: true }` memakai state
 * apa adanya.
 *
 * Dua pose state case:
 * - `buildCaseStateRaw` — pose mentah (`solved` + `inverseAlgorithm`), pose yang
 *   diasumsikan algoritma; dipakai untuk verifikasi "algoritma menyelesaikan case".
 * - `buildCaseState` — pose ternormalisasi (center di slot asal); dipakai untuk
 *   tampilan dan pemeriksaan kondisi awal case.
 */

export { buildCaseState, buildCaseStateRaw } from './case-state.js'
export { f2lSolved } from './f2l-solved.js'
export {
  enumerateOllClasses,
  type OllClassEnumeration,
} from './oll-enumeration.js'
export { canonicalState, type VerificationOptions } from './options.js'
export {
  ollSignature,
  ollSignatureFromTuples,
  pllSignature,
  SOLVED_OLL_SIGNATURE,
} from './signatures.js'
