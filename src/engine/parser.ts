export type MoveType = 'face' | 'wide' | 'slice' | 'rotation'

export interface ParsedMove {
  /** Notasi lengkap dari gerakan (misal: "R", "U'", "M2", "x") */
  raw: string
  /** Huruf dasar gerakan (misal: "R", "Uw", "M", "x") */
  base: string
  /** Modifier gerakan ('', "'", atau "2") */
  modifier: '' | "'" | '2' | "2'"
  /** Nilai perputaran (1, -1, 2, -2) */
  amount: 1 | -1 | 2 | -2
  /** Jenis gerakan: face, wide, slice, atau rotation */
  type: MoveType
  /** True bila gerakan memutar layer (face, wide, slice), false bila rotasi seluruh kubus */
  isLayerMove: boolean
  /** True bila hanya merotasi seluruh kubus (x, y, z) */
  isRotation: boolean
  /** Posisi karakter awal pada string algoritma */
  start: number
  /** Posisi karakter akhir (eksklusif) pada string algoritma */
  end: number
}

/**
 * Mem-parse algoritma rubik menjadi daftar gerakan terstruktur.
 * Notasi yang didukung sesuai PRD §2:
 * - Face (U D L R F B)
 * - Wide (r l u d f b, Uw Dw Lw Rw Fw Bw)
 * - Slice (M E S)
 * - Rotasi (x y z)
 * - Modifier ' dan 2
 *
 * Mengurai string per token (dipisahkan whitespace) dan melempar error
 * dengan posisi karakter yang akurat bila notasi tidak valid.
 */
export function parseAlg(alg: string): ParsedMove[] {
  if (typeof alg !== 'string') {
    throw new Error('Algorithm must be a string')
  }

  const moves: ParsedMove[] = []
  const tokenRegex = /\S+/g
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(alg)) !== null) {
    const token = match[0]
    const tokenStart = match.index
    const tokenEnd = tokenStart + token.length

    // 1. Cek karakter terlarang dalam token
    for (let c = 0; c < token.length; c++) {
      const ch = token[c]
      const pos = tokenStart + c
      if (ch === '(' || ch === ')') {
        throw new Error(
          `Parse error at position ${pos}: parentheses are not allowed in algorithms`
        )
      }
      if (ch === '[' || ch === ']') {
        throw new Error(
          `Parse error at position ${pos}: brackets are not allowed in algorithms`
        )
      }
      if (
        ch === '.' ||
        ch === '/' ||
        ch === '+' ||
        ch === '-' ||
        ch === '?' ||
        ch === ':' ||
        ch === ','
      ) {
        throw new Error(
          `Parse error at position ${pos}: unexpected character "${ch}"`
        )
      }
    }

    // 2. Cek token hanya angka (misal "5")
    if (/^[0-9]+$/.test(token)) {
      throw new Error(
        `Parse error at position ${tokenStart}: unexpected number "${token}"`
      )
    }

    // 3. Cocokkan base move legal
    const baseMatch = token.match(/^(?:[UDLRFB]w|[UDLRFBudlrfbMESxyz])/)
    if (!baseMatch) {
      const wordMatch = token.match(/^[a-zA-Z]+/)
      const word = wordMatch ? wordMatch[0] : token
      throw new Error(
        `Parse error at position ${tokenStart}: unknown move family "${word}"`
      )
    }

    const base = baseMatch[0]
    const modifierStr = token.slice(base.length)

    // Bila sisa token mengandung huruf (misal "BadMove" diawali "B" lalu "adMove"),
    // maka seluruh token adalah move family tidak dikenal.
    if (/[a-zA-Z]/.test(modifierStr)) {
      const wordMatch = token.match(/^[a-zA-Z]+/)
      const word = wordMatch ? wordMatch[0] : token
      throw new Error(
        `Parse error at position ${tokenStart}: unknown move family "${word}"`
      )
    }

    // Tentukan kategori move
    let type: MoveType
    if (base.length === 2 || /^[udlrfb]$/.test(base)) {
      type = 'wide'
    } else if (/^[UDLRFB]$/.test(base)) {
      type = 'face'
    } else if (/^[MES]$/.test(base)) {
      type = 'slice'
    } else {
      type = 'rotation'
    }

    // 4. Validasi modifier
    let modifier: '' | "'" | '2' | "2'"
    let amount: 1 | -1 | 2 | -2
    const modStart = tokenStart + base.length

    if (modifierStr === '') {
      modifier = ''
      amount = 1
    } else if (modifierStr === "'") {
      modifier = "'"
      amount = -1
    } else if (modifierStr === '2') {
      modifier = '2'
      amount = 2
    } else if (modifierStr === "2'") {
      modifier = "2'"
      amount = -2
    } else if (
      modifierStr.length > 1 &&
      (modifierStr.includes("'") || modifierStr.includes('2'))
    ) {
      throw new Error(
        `Parse error at position ${modStart}: double or invalid modifier "${modifierStr}" on move "${base}"`
      )
    } else {
      throw new Error(
        `Parse error at position ${modStart}: invalid modifier "${modifierStr}" on move "${base}"`
      )
    }

    const isRotation = type === 'rotation'
    const isLayer = !isRotation

    moves.push({
      raw: token,
      base,
      modifier,
      amount,
      type,
      isLayerMove: isLayer,
      isRotation,
      start: tokenStart,
      end: tokenEnd,
    })
  }

  return moves
}

/**
 * Mem-parse satu gerakan tunggal.
 */
export function parseMove(move: string): ParsedMove {
  const moves = parseAlg(move.trim())
  if (moves.length !== 1) {
    throw new Error(
      `Expected exactly one move, got ${moves.length} in "${move}"`
    )
  }
  return moves[0]
}

/**
 * Mengubah satu gerakan menjadi kebalikannya (inverse).
 * Contoh: "R" -> "R'", "U'" -> "U", "R2" -> "R2", "x" -> "x'"
 */
export function invertMove(move: ParsedMove | string): string {
  const parsed = typeof move === 'string' ? parseMove(move) : move
  if (parsed.modifier === "'") {
    return parsed.base
  }
  if (parsed.modifier === '2' || parsed.modifier === "2'") {
    return `${parsed.base}2`
  }
  return `${parsed.base}'`
}

/**
 * Mengecek apakah gerakan memutar layer (face, wide, slice).
 * Timer solve dimulai oleh gerakan layer.
 */
export function isLayerMove(move: ParsedMove | string): boolean {
  const parsed = typeof move === 'string' ? parseMove(move) : move
  return parsed.isLayerMove
}

/**
 * Mengecek apakah gerakan hanya merotasi seluruh kubus (x, y, z).
 * Rotasi kubus tidak memulai timer solve.
 */
export function isRotationMove(move: ParsedMove | string): boolean {
  const parsed = typeof move === 'string' ? parseMove(move) : move
  return parsed.isRotation
}
