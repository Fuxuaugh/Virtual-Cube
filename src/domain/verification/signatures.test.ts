import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyAlg,
  clonePatternData,
  createCustomCubeState,
  initCubeEngine,
  layerSlots,
  solvedState,
  validateState,
  type CubeState,
} from '../../engine/index.js'
import { f2lSolved } from './f2l-solved.js'
import {
  ollSignature,
  pllSignature,
  SOLVED_OLL_SIGNATURE,
} from './signatures.js'

const AUFS = ['U', "U'", 'U2'] as const

/**
 * State sintetis: dua layer bawah dan OLL solved, tetapi 2 corner layer U
 * ditukar dan 2 edge layer U ditukar (permutasi ganjil + ganjil = paritas total
 * genap, jadi legal).
 *
 * Dibuat langsung dari patternData, BUKAN dari algoritma PLL yang diingat.
 */
function syntheticPllState(): CubeState {
  const patternData = clonePatternData(solvedState())
  const slots = layerSlots()

  const swap = (pieces: number[], a: number, b: number): void => {
    const tmp = pieces[a]
    pieces[a] = pieces[b]
    pieces[b] = tmp
  }

  swap(patternData['CORNERS'].pieces, slots.uCorners[0], slots.uCorners[1])
  swap(patternData['EDGES'].pieces, slots.uEdges[0], slots.uEdges[1])

  return createCustomCubeState(patternData)
}

/** 24 permutasi dari [0, 1, 2, 3]. */
function permutationsOfFour(): number[][] {
  const result: number[][] = []
  const build = (prefix: number[], rest: number[]): void => {
    if (rest.length === 0) {
      result.push(prefix)
      return
    }
    for (let i = 0; i < rest.length; i++) {
      build([...prefix, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)])
    }
  }
  build([], [0, 1, 2, 3])
  return result
}

function permutationParity(values: readonly number[]): number {
  let inversions = 0
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) {
        inversions++
      }
    }
  }
  return inversions % 2
}

/**
 * State permutasi layer atas dari pasangan permutasi siklik (corner, edge).
 * F2L dan center tidak disentuh.
 */
function pllStateFromPermutations(
  cornerPermutation: readonly number[],
  edgePermutation: readonly number[]
): CubeState {
  const patternData = clonePatternData(solvedState())
  const slots = layerSlots()

  slots.uCorners.forEach((slot, index) => {
    patternData['CORNERS'].pieces[slot] =
      slots.uCorners[cornerPermutation[index]]
  })
  slots.uEdges.forEach((slot, index) => {
    patternData['EDGES'].pieces[slot] = slots.uEdges[edgePermutation[index]]
  })

  return createCustomCubeState(patternData)
}

describe('ollSignature', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('solved: sama dengan signature solved', () => {
    expect(ollSignature(solvedState())).toBe(SOLVED_OLL_SIGNATURE)
  })

  it("U, U', U2: sama dengan signature solved", () => {
    for (const auf of AUFS) {
      expect(ollSignature(applyAlg(solvedState(), auf))).toBe(
        SOLVED_OLL_SIGNATURE
      )
    }
  })

  it('AUF di awal atau akhir tidak mengubah signature', () => {
    const bases = [
      applyAlg(solvedState(), "R U R' U'"),
      applyAlg(solvedState(), 'R'),
      applyAlg(solvedState(), 'F'),
      syntheticPllState(),
    ]

    for (const base of bases) {
      const signature = ollSignature(base)
      for (const auf of AUFS) {
        // AUF pada state case (awal) maupun pada hasil akhir sama-sama
        // memutar layer U satu langkah siklik.
        expect(ollSignature(applyAlg(base, auf))).toBe(signature)
      }
    }
  })

  it('orientasi berbeda menghasilkan signature berbeda', () => {
    const solved = ollSignature(solvedState())
    const twisted = ollSignature(applyAlg(solvedState(), 'R'))
    expect(twisted).not.toBe(solved)
  })
})

describe('pllSignature', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it("solved: sama untuk solved maupun U, U', U2", () => {
    const signature = pllSignature(solvedState())
    for (const auf of AUFS) {
      expect(pllSignature(applyAlg(solvedState(), auf))).toBe(signature)
    }
  })

  it('state sintetis: F2L dan OLL solved, permutasi layer U berbeda', () => {
    const state = syntheticPllState()

    expect(validateState(state).valid).toBe(true)
    expect(f2lSolved(state)).toBe(true)
    expect(ollSignature(state)).toBe(SOLVED_OLL_SIGNATURE)
    expect(pllSignature(state)).not.toBe(pllSignature(solvedState()))
  })

  it('state sintetis: AUF di awal atau akhir tidak mengubah signature', () => {
    const state = syntheticPllState()
    const signature = pllSignature(state)

    for (const auf of AUFS) {
      expect(pllSignature(applyAlg(state, auf))).toBe(signature)
    }
  })

  it('permutasi corner dan edge dibedakan', () => {
    const solved = pllSignature(solvedState())
    const identity = [0, 1, 2, 3]
    const transposition = [1, 0, 2, 3]

    const cornerSwap = pllSignature(
      pllStateFromPermutations(transposition, identity)
    )
    const edgeSwap = pllSignature(
      pllStateFromPermutations(identity, transposition)
    )

    expect(cornerSwap).not.toBe(solved)
    expect(edgeSwap).not.toBe(solved)
    expect(cornerSwap).not.toBe(edgeSwap)
  })

  it('normalisasi AUF sebelum dan sesudah: 288 state legal → 22 kelas (21 PLL + solved)', () => {
    const signatures = new Set<string>()
    const permutations = permutationsOfFour()
    let legalStates = 0

    for (const cornerPermutation of permutations) {
      for (const edgePermutation of permutations) {
        if (
          permutationParity(cornerPermutation) !==
          permutationParity(edgePermutation)
        ) {
          continue
        }
        legalStates++
        signatures.add(
          pllSignature(
            pllStateFromPermutations(cornerPermutation, edgePermutation)
          )
        )
      }
    }

    expect(legalStates).toBe(288)
    expect(signatures.size).toBe(22)
  })
})
