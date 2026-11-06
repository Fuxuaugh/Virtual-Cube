import { beforeAll, describe, expect, it } from 'vitest'
import { applyAlg, initCubeEngine, solvedState } from '../../engine/index.js'
import { enumerateOllClasses } from './oll-enumeration.js'
import { ollSignature, SOLVED_OLL_SIGNATURE } from './signatures.js'

/**
 * Perhitungan yang diharapkan:
 *
 * - Corner: 3^4 = 81 tuple twist; hanya yang totalnya ≡ 0 (mod 3) yang legal → 27.
 * - Edge: 2^4 = 16 tuple flip; hanya yang totalnya genap yang legal → 8.
 * - Kombinasi legal sebelum normalisasi: 27 × 8 = 216.
 * - Kelas setelah dinormalisasi putaran U (Burnside, grup C4 atas 216 kombinasi):
 *   (216 + 2 + 12 + 2) / 4 = 58
 *   - identitas: 216
 *   - U dan U': tuple yang tetap = corner (t,t,t,t) dengan 4t ≡ 0 (mod 3) → 1,
 *     edge (f,f,f,f) → 2, jadi 2 masing-masing
 *   - U2: corner (t0,t1,t0,t1) dengan t0+t1 ≡ 0 (mod 3) → 3, edge bebas → 4,
 *     jadi 12
 *   58 = 57 case OLL + 1 OLL skip (solved).
 */
describe('enumerateOllClasses', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('216 kombinasi legal sebelum normalisasi (27 twist corner × 8 flip edge)', () => {
    expect(enumerateOllClasses().legalCombinationCount).toBe(216)
  })

  it('58 kelas setelah normalisasi terhadap putaran U', () => {
    expect(enumerateOllClasses().classCount).toBe(58)
  })

  it('setiap kelas punya signature unik', () => {
    const { signatures, classCount } = enumerateOllClasses()

    expect(signatures.length).toBe(classCount)
    expect(new Set(signatures).size).toBe(signatures.length)
  })

  it('signature solved termasuk salah satu kelas', () => {
    const { signatures, solvedSignature } = enumerateOllClasses()

    expect(solvedSignature).toBe(SOLVED_OLL_SIGNATURE)
    expect(signatures).toContain(SOLVED_OLL_SIGNATURE)
    expect(ollSignature(solvedState())).toBe(SOLVED_OLL_SIGNATURE)
  })

  it('signature state nyata (solved + AUF) termasuk daftar kelas', () => {
    const { signatures } = enumerateOllClasses()

    expect(signatures).toContain(ollSignature(solvedState()))
    for (const auf of ['U', "U'", 'U2']) {
      expect(signatures).toContain(ollSignature(applyAlg(solvedState(), auf)))
    }
  })
})
