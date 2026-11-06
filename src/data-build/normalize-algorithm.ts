/**
 * Normalisasi penulisan algoritma dari `data_source/*.csv` (M4 data pipeline).
 *
 * Fungsi murni (tanpa I/O) supaya bisa dites:
 * 1. Buang tanda kurung `(` `)`.
 * 2. Lepas akhiran penyesuaian U dalam kurung siku (`[U]`, `[U']`, `[U2]`) dan
 *    simpan isinya terpisah (untuk `metadata.auf`).
 * 3. Pecah notasi rapat `(RUR'U)(RUR'F')` menjadi token bergerak ber-spasi
 *    (`R U R' U R U R' F'`) — hanya soal spasi, gerakan tidak diubah.
 * 4. Rotasi (x/y/z), slice (M/E/S), wide (u/Uw), dan modifier `2'` dipertahankan.
 *
 * Safeguard: gabungan token tanpa spasi harus sama persis dengan teks asli
 * setelah membuang kurung, kurung siku beserta isinya, dan spasi. Bila tidak
 * sama, fungsi melempar error yang menyebut id case. Fungsi ini TIDAK pernah
 * memperbaiki atau mengganti gerakan.
 */

import { parseAlg } from '../engine/index.js'

export interface NormalizedAlgorithm {
  /** Algoritma bertoken spasi, tanpa tanda kurung dan tanpa akhiran AUF. */
  algorithm: string
  /** Isi akhiran penyesuaian U, mis. `"U'"`; `null` bila tidak ada. */
  auf: string | null
}

/** Huruf yang sah sebagai awal token gerakan. */
const MOVE_STARTS = 'UDLRFBudlrfbMESxyz'

/** Pola akhiran dalam kurung siku, mis. `[U']`. */
const AUF_PATTERN = /\[([^\]]*)\]/g

const NON_AUF_BRACKETS = /[[\]]/

/**
 * Menormalisasi satu algoritma mentah dari CSV.
 *
 * @throws Error bila kurung siku/kurung tidak lengkap, ada karakter yang tidak
 *   dikenal, safeguard gagal, atau hasilnya tidak lolos `parseAlg`. Pesan selalu
 *   menyebut id case; algoritma diperlakukan apa adanya (tidak diperbaiki).
 */
export function normalizeAlgorithm(
  rawAlgorithm: string,
  caseId: string
): NormalizedAlgorithm {
  const aufs = [...rawAlgorithm.matchAll(AUF_PATTERN)].map((match) =>
    match[1].trim()
  )
  if (aufs.length > 1) {
    throw new Error(
      `[${caseId}] lebih dari satu akhiran "[...]" pada algoritma: ${JSON.stringify(rawAlgorithm)}`
    )
  }

  const withoutAuf = rawAlgorithm.replace(AUF_PATTERN, '')
  if (NON_AUF_BRACKETS.test(withoutAuf)) {
    throw new Error(
      `[${caseId}] kurung siku tidak lengkap pada algoritma: ${JSON.stringify(rawAlgorithm)}`
    )
  }

  const openParens = countMatches(withoutAuf, '(')
  const closeParens = countMatches(withoutAuf, ')')
  if (openParens !== closeParens) {
    throw new Error(
      `[${caseId}] kurung tidak seimbang (${openParens} buka, ${closeParens} tutup) pada algoritma: ${JSON.stringify(rawAlgorithm)}`
    )
  }

  const withoutParens = withoutAuf.replace(/[()]/g, '')
  const tokens = tokenize(withoutParens, caseId, rawAlgorithm)

  const algorithm = tokens.join(' ')
  const compact = tokens.join('')
  const expected = withoutParens.replace(/\s+/g, '')

  if (compact !== expected) {
    throw new Error(
      `[${caseId}] safeguard gagal: hasil normalisasi ${JSON.stringify(compact)} != teks asli tanpa kurung/spasi ${JSON.stringify(expected)} (algoritma asli: ${JSON.stringify(rawAlgorithm)})`
    )
  }

  try {
    parseAlg(algorithm)
  } catch (error) {
    throw new Error(
      `[${caseId}] hasil normalisasi tidak lolos parseAlg: ${error instanceof Error ? error.message : String(error)} (algoritma asli: ${JSON.stringify(rawAlgorithm)})`,
      { cause: error }
    )
  }

  return {
    algorithm,
    auf: aufs.length === 1 ? aufs[0] : null,
  }
}

/** Memecah notasi rapat menjadi token bergerak tanpa mengubah karakternya. */
function tokenize(
  text: string,
  caseId: string,
  rawAlgorithm: string
): string[] {
  const tokens: string[] = []
  let index = 0

  while (index < text.length) {
    const char = text[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (!MOVE_STARTS.includes(char)) {
      throw new Error(
        `[${caseId}] karakter tidak dikenal ${JSON.stringify(char)} pada posisi ${index} (algoritma asli: ${JSON.stringify(rawAlgorithm)})`
      )
    }

    let end = index + 1
    if (char !== 'w' && text[end] === 'w') {
      end += 1
    }

    if (text[end] === "'") {
      end += 1
    } else if (text[end] === '2') {
      end += 1
      if (text[end] === "'") {
        end += 1
      }
    }

    tokens.push(text.slice(index, end))
    index = end
  }

  return tokens
}

function countMatches(text: string, char: string): number {
  let count = 0
  for (const current of text) {
    if (current === char) {
      count += 1
    }
  }
  return count
}
