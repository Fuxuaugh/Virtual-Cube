/**
 * Parser CSV sederhana untuk file di `data_source/`.
 *
 * Mendukung: pemisah koma, field dengan tanda kutip ganda (boleh memuat koma),
 * escape `""` untuk satu tanda kutip, dan akhir baris `\n` maupun `\r\n`.
 * Tidak ada dependensi eksternal.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let index = 0

  const endField = (): void => {
    row.push(field)
    field = ''
  }

  const endRow = (): void => {
    endField()
    rows.push(row)
    row = []
  }

  while (index < text.length) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }
        inQuotes = false
        index += 1
        continue
      }
      field += char
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      index += 1
      continue
    }

    if (char === ',') {
      endField()
      index += 1
      continue
    }

    if (char === '\r') {
      index += 1
      continue
    }

    if (char === '\n') {
      endRow()
      index += 1
      continue
    }

    field += char
    index += 1
  }

  if (field !== '' || row.length > 0) {
    endRow()
  }

  return rows
}

/** Baris yang seluruh field-nya kosong (mis. baris kosong di akhir file). */
export function isEmptyCsvRow(row: readonly string[]): boolean {
  return row.every((field) => field.trim() === '')
}
