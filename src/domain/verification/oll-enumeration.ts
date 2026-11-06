/**
 * Enumerasi kelas OLL (MILESTONES M4.4, PRD §7.2).
 *
 * Kelas OLL = pola orientasi layer atas yang berbeda setelah dinormalisasi
 * terhadap putaran U. Pola dibentuk dari twist 4 corner layer U (0..2) dan flip
 * 4 edge layer U (0..1) dengan syarat legalitas cube 3x3x3:
 *
 * - total twist corner ≡ 0 (mod 3) → 3^4 / 3 = 27 tuple corner legal
 * - total flip edge genap → 2^4 / 2 = 8 tuple edge legal
 * - kombinasi legal = 27 × 8 = 216
 *
 * Jumlah kelas dihitung dengan mengenumerasi seluruh kombinasi legal lalu
 * mengelompokkannya lewat `ollSignatureFromTuples` (normalisasi putaran U).
 */

import { ollSignatureFromTuples } from './signatures.js'

export interface OllClassEnumeration {
  /** Jumlah kombinasi orientasi legal sebelum normalisasi (216). */
  legalCombinationCount: number
  /** Jumlah kelas setelah normalisasi terhadap putaran U (58). */
  classCount: number
  /** Signature tiap kelas, urut menaik dan unik. */
  signatures: string[]
  /** Signature kelas solved (`SOLVED_OLL_SIGNATURE`). */
  solvedSignature: string
}

/** Semua tuple panjang `length` dengan tiap nilai 0..maxValue-1. */
function allTuples(length: number, maxValue: number): number[][] {
  let tuples: number[][] = [[]]

  for (let i = 0; i < length; i++) {
    const extended: number[][] = []
    for (const tuple of tuples) {
      for (let value = 0; value < maxValue; value++) {
        extended.push([...tuple, value])
      }
    }
    tuples = extended
  }

  return tuples
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/** Mengenumerasi seluruh kelas OLL dari kombinasi orientasi layer atas yang legal. */
export function enumerateOllClasses(): OllClassEnumeration {
  const legal: string[] = []

  for (const cornerTwist of allTuples(4, 3)) {
    if (sum(cornerTwist) % 3 !== 0) {
      continue
    }

    for (const edgeFlip of allTuples(4, 2)) {
      if (sum(edgeFlip) % 2 !== 0) {
        continue
      }
      legal.push(ollSignatureFromTuples(cornerTwist, edgeFlip))
    }
  }

  const signatures = [...new Set(legal)].sort()

  return {
    legalCombinationCount: legal.length,
    classCount: signatures.length,
    signatures,
    solvedSignature: ollSignatureFromTuples([0, 0, 0, 0], [0, 0, 0, 0]),
  }
}
