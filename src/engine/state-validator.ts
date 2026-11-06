import type { CubeState } from './cube-state.js'
import { unwrapCubeState } from './cube-state.js'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Menghitung paritas (jumlah inversi mod 2) dari permutasi.
 * 0 = paritas genap, 1 = paritas ganjil.
 */
export function calculateParity(arr: number[]): number {
  let inversions = 0
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) {
        inversions++
      }
    }
  }
  return inversions % 2
}

/**
 * Memvalidasi apakah susunan elemen merupakan permutasi valid dari 0..expectedLength - 1.
 */
export function isPermutationValid(
  arr: number[],
  expectedLength: number
): boolean {
  if (!Array.isArray(arr) || arr.length !== expectedLength) {
    return false
  }
  const seen = new Set<number>()
  for (const n of arr) {
    if (!Number.isInteger(n) || n < 0 || n >= expectedLength || seen.has(n)) {
      return false
    }
    seen.add(n)
  }
  return seen.size === expectedLength
}

/**
 * Memvalidasi keadaan (state) kubus 3x3 secara matematis:
 * 1. Permutasi corner (8 sudut, 0..7) dan orientasi corner (masing-masing 0..2, total twist kelipatan 3).
 * 2. Permutasi edge (12 tepi, 0..11) dan orientasi edge (masing-masing 0..1, total flip genap).
 * 3. Permutasi center (6 pusat, 0..5).
 * 4. Invariant paritas 3x3 menyeluruh:
 *    parity(corner) XOR parity(edge) XOR parity(center) === 0.
 *    Aturan ini mencakup kubus pada orientasi apa pun, termasuk setelah slice (M/E/S),
 *    wide moves (r/l/u/d/f/b), dan rotasi kubus (x/y/z).
 */
export function validateState(state: CubeState): ValidationResult {
  const errors: string[] = []
  const pattern = unwrapCubeState(state)
  const patternData = pattern.patternData

  // 1. Validasi Corner
  const corners = patternData['CORNERS']
  let cornersPermOk = false
  if (
    !corners ||
    !Array.isArray(corners.pieces) ||
    !Array.isArray(corners.orientation)
  ) {
    errors.push('Missing or invalid CORNERS orbit data')
  } else {
    // Permutasi corner
    if (!isPermutationValid(corners.pieces, 8)) {
      errors.push(
        'Invalid corner permutation: must be a valid permutation of 8 corners (0..7)'
      )
    } else {
      cornersPermOk = true
    }

    // Orientasi corner
    if (corners.orientation.length !== 8) {
      errors.push('Invalid corner orientation: length must be 8')
    } else {
      let valuesOk = true
      let twistSum = 0
      for (const ori of corners.orientation) {
        if (!Number.isInteger(ori) || ori < 0 || ori > 2) {
          valuesOk = false
          break
        }
        twistSum += ori
      }

      if (!valuesOk) {
        errors.push('Invalid corner orientation: values must be 0, 1, or 2')
      } else if (twistSum % 3 !== 0) {
        errors.push(
          'Invalid corner orientation sum: total corner twist must be a multiple of 3'
        )
      }
    }
  }

  // 2. Validasi Edge
  const edges = patternData['EDGES']
  let edgesPermOk = false
  if (
    !edges ||
    !Array.isArray(edges.pieces) ||
    !Array.isArray(edges.orientation)
  ) {
    errors.push('Missing or invalid EDGES orbit data')
  } else {
    // Permutasi edge
    if (!isPermutationValid(edges.pieces, 12)) {
      errors.push(
        'Invalid edge permutation: must be a valid permutation of 12 edges (0..11)'
      )
    } else {
      edgesPermOk = true
    }

    // Orientasi edge
    if (edges.orientation.length !== 12) {
      errors.push('Invalid edge orientation: length must be 12')
    } else {
      let valuesOk = true
      let flipSum = 0
      for (const ori of edges.orientation) {
        if (!Number.isInteger(ori) || ori < 0 || ori > 1) {
          valuesOk = false
          break
        }
        flipSum += ori
      }

      if (!valuesOk) {
        errors.push('Invalid edge orientation: values must be 0 or 1')
      } else if (flipSum % 2 !== 0) {
        errors.push(
          'Invalid edge orientation sum: total edge flip must be even'
        )
      }
    }
  }

  // 3. Validasi Center
  const centers = patternData['CENTERS']
  let centersPermOk = false
  if (!centers || !Array.isArray(centers.pieces)) {
    errors.push('Missing or invalid CENTERS orbit data')
  } else {
    if (!isPermutationValid(centers.pieces, 6)) {
      errors.push(
        'Invalid center permutation: must be a valid permutation of 6 centers (0..5)'
      )
    } else {
      centersPermOk = true
    }
  }

  // 4. Paritas Permutasi Menyeluruh (Corner XOR Edge XOR Center = 0)
  if (
    cornersPermOk &&
    edgesPermOk &&
    centersPermOk &&
    corners &&
    edges &&
    centers
  ) {
    const cornerParity = calculateParity(corners.pieces)
    const edgeParity = calculateParity(edges.pieces)
    const centerParity = calculateParity(centers.pieces)
    const totalParity = cornerParity ^ edgeParity ^ centerParity

    if (totalParity !== 0) {
      errors.push(
        'Permutation parity mismatch: corner, edge, and center permutations must satisfy parity(corner) ^ parity(edge) ^ parity(center) = 0'
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
