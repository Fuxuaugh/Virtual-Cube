/**
 * Validator data case (MILESTONES M3.1/M3.4).
 *
 * Fungsi ini memeriksa data mentah (hasil `JSON.parse`) sebelum dipakai aplikasi:
 * tipe field, id unik, kategori sah, `source` tidak kosong, sintaks algoritma
 * (lewat `parseAlg` dari engine), dan kecocokan `inverseAlgorithm` dengan
 * `invertAlg(algorithm)`.
 *
 * Modul ini murni: tanpa React, tanpa API browser, dan hanya memakai engine
 * sebagai adapter (bukan cubing.js langsung).
 */

import { invertAlg, parseAlg } from '../engine/index.js'
import {
  CASE_CATEGORIES,
  CASE_DIFFICULTIES,
  isCaseCategory,
  isCaseDifficulty,
} from './training-case.js'

export interface CaseDataValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Memvalidasi data case mentah.
 *
 * @param data Data hasil parse JSON (idealnya array of TrainingCase).
 * @returns `{ valid, errors }`; `errors` kosong bila data sah. Setiap pesan
 *   menyebut id case (atau indeks bila id tidak ada) dan nama field.
 */
export function validateCaseData(data: unknown): CaseDataValidationResult {
  const errors: string[] = []

  if (!Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        `Case data: expected an array of cases, received ${describeValue(data)}`,
      ],
    }
  }

  const idIndexes = new Map<string, number>()

  data.forEach((item, index) => {
    validateCase(item, index, idIndexes, errors)
  })

  return { valid: errors.length === 0, errors }
}

function validateCase(
  item: unknown,
  index: number,
  idIndexes: Map<string, number>,
  errors: string[]
): void {
  if (!isPlainObject(item)) {
    errors.push(
      `Case at index ${index}: expected an object, received ${describeValue(item)}`
    )
    return
  }

  const label = caseLabel(item, index)
  validateId(item, index, idIndexes, errors)
  validateNonEmptyString(item, 'name', label, errors)
  validateCategory(item['category'], label, errors)
  validateNonEmptyString(item, 'source', label, errors)
  validateAlgorithm(item, label, errors)
  validateInverseAlgorithm(item, label, errors)
  validateAlternatives(item['alternatives'], label, errors)
  validateTags(item['tags'], label, errors)
  validateDifficulty(item['difficulty'], label, errors)
  validateMetadata(item['metadata'], label, errors)
}

function validateId(
  item: Record<string, unknown>,
  index: number,
  idIndexes: Map<string, number>,
  errors: string[]
): void {
  const id = item['id']
  if (typeof id !== 'string' || id.trim() === '') {
    errors.push(
      `Case at index ${index}: field "id" must be a non-empty string, received ${describeValue(id)}`
    )
    return
  }

  const previousIndex = idIndexes.get(id)
  if (previousIndex !== undefined) {
    errors.push(
      `Case "${id}": field "id" must be unique, but it is the same as the case at index ${previousIndex}`
    )
    return
  }

  idIndexes.set(id, index)
}

function validateCategory(
  value: unknown,
  label: string,
  errors: string[]
): void {
  if (!isCaseCategory(value)) {
    errors.push(
      `${label}: field "category" must be one of ${formatList(CASE_CATEGORIES)}, received ${describeValue(value)}`
    )
  }
}

function validateNonEmptyString(
  item: Record<string, unknown>,
  field: string,
  label: string,
  errors: string[]
): void {
  const value = item[field]
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(
      `${label}: field "${field}" must be a non-empty string, received ${describeValue(value)}`
    )
  }
}

function validateAlgorithm(
  item: Record<string, unknown>,
  label: string,
  errors: string[]
): void {
  const algorithm = item['algorithm']
  if (typeof algorithm !== 'string' || algorithm.trim() === '') {
    errors.push(
      `${label}: field "algorithm" must be a non-empty string, received ${describeValue(algorithm)}`
    )
    return
  }

  try {
    parseAlg(algorithm)
  } catch (err) {
    errors.push(
      `${label}: field "algorithm" is not a valid algorithm (${errorMessage(err)}), received ${describeValue(algorithm)}`
    )
  }
}

function validateInverseAlgorithm(
  item: Record<string, unknown>,
  label: string,
  errors: string[]
): void {
  const inverseAlgorithm = item['inverseAlgorithm']
  if (typeof inverseAlgorithm !== 'string' || inverseAlgorithm.trim() === '') {
    errors.push(
      `${label}: field "inverseAlgorithm" must be a non-empty string, received ${describeValue(inverseAlgorithm)}`
    )
    return
  }

  const algorithm = item['algorithm']
  if (typeof algorithm !== 'string' || algorithm.trim() === '') {
    // Kesalahan algoritma sudah dilaporkan oleh validateAlgorithm.
    return
  }

  let expected: string
  try {
    expected = invertAlg(algorithm)
  } catch {
    // Algoritma tidak sah sudah dilaporkan oleh validateAlgorithm.
    return
  }

  if (normalizeAlg(inverseAlgorithm) !== normalizeAlg(expected)) {
    errors.push(
      `${label}: field "inverseAlgorithm" must equal invertAlg(algorithm) ("${expected}"), received ${describeValue(inverseAlgorithm)}`
    )
  }
}

function validateAlternatives(
  value: unknown,
  label: string,
  errors: string[]
): void {
  if (!Array.isArray(value)) {
    errors.push(
      `${label}: field "alternatives" must be an array of algorithm strings, received ${describeValue(value)}`
    )
    return
  }

  value.forEach((alternative, index) => {
    if (typeof alternative !== 'string' || alternative.trim() === '') {
      errors.push(
        `${label}: field "alternatives[${index}]" must be a non-empty string, received ${describeValue(alternative)}`
      )
      return
    }

    try {
      parseAlg(alternative)
    } catch (err) {
      errors.push(
        `${label}: field "alternatives[${index}]" is not a valid algorithm (${errorMessage(err)}), received ${describeValue(alternative)}`
      )
    }
  })
}

function validateTags(value: unknown, label: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(
      `${label}: field "tags" must be an array of strings, received ${describeValue(value)}`
    )
    return
  }

  value.forEach((tag, index) => {
    if (typeof tag !== 'string' || tag.trim() === '') {
      errors.push(
        `${label}: field "tags[${index}]" must be a non-empty string, received ${describeValue(tag)}`
      )
    }
  })
}

function validateDifficulty(
  value: unknown,
  label: string,
  errors: string[]
): void {
  if (value === undefined) return

  if (!isCaseDifficulty(value)) {
    errors.push(
      `${label}: field "difficulty" must be one of ${formatList(CASE_DIFFICULTIES)} or omitted, received ${describeValue(value)}`
    )
  }
}

function validateMetadata(
  value: unknown,
  label: string,
  errors: string[]
): void {
  if (value === undefined) return

  if (!isPlainObject(value)) {
    errors.push(
      `${label}: field "metadata" must be an object or omitted, received ${describeValue(value)}`
    )
  }
}

function caseLabel(item: Record<string, unknown>, index: number): string {
  const id = item['id']
  return typeof id === 'string' && id.trim() !== ''
    ? `Case "${id}"`
    : `Case at index ${index}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Menyeragamkan spasi agar "R  U" dan "R U" dianggap sama. */
function normalizeAlg(alg: string): string {
  return alg.trim().replace(/\s+/g, ' ')
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function describeValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'an array'
  if (typeof value === 'string') return `a string (${JSON.stringify(value)})`
  if (typeof value === 'object') return 'an object'
  return `${typeof value} (${String(value)})`
}

function formatList(values: readonly string[]): string {
  return values.map((value) => `"${value}"`).join(', ')
}
