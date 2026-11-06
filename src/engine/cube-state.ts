import type { KPattern } from 'cubing/kpuzzle'

const patternMap = new WeakMap<CubeState, KPattern>()

declare const CubeStateBrand: unique symbol

/**
 * CubeState adalah tipe opaque dan immutable yang membungkus KPattern dari cubing.js.
 * Tidak ada kode di luar src/engine/ yang dapat mengakses state internalnya.
 */
export class CubeState {
  // Brand untuk memastikan type safety nominal tanpa runtime overhead
  declare readonly [CubeStateBrand]: void

  /** @internal */
  constructor(pattern: KPattern) {
    patternMap.set(this, pattern)
  }
}

/** @internal */
export function wrapCubeState(pattern: KPattern): CubeState {
  return new CubeState(pattern)
}

/** @internal */
export function unwrapCubeState(state: CubeState): KPattern {
  const pattern = patternMap.get(state)
  if (!pattern) {
    throw new Error('Invalid CubeState instance')
  }
  return pattern
}
