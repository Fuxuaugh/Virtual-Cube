/**
 * Case Generator & Selection (MILESTONES M4).
 *
 * Modul ini murni: tanpa React, tanpa API browser, dan hanya memakai adapter
 * `src/engine/` serta alat verifikasi `src/domain/verification/`.
 */

export {
  AUF_OPTIONS,
  findAlignmentAuf,
  generateCase,
  generateF2lCase,
  generateOllCase,
  generatePllCase,
  solveGeneratedCase,
  type Auf,
  type GeneratedCase,
  type GeneratorOptions,
} from './case-generator.js'
export {
  filterCases,
  selectCasesById,
  selectRandomCase,
  selectRandomCases,
  type CaseFilter,
  type SelectionOptions,
} from './case-selector.js'
