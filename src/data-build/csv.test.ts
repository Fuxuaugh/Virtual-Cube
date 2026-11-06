import { describe, expect, it } from 'vitest'
import { isEmptyCsvRow, parseCsv } from './csv.js'

describe('parseCsv', () => {
  it('membaca header dan baris sederhana', () => {
    expect(parseCsv('id,name\nPLL-Ub,Ub\n')).toEqual([
      ['id', 'name'],
      ['PLL-Ub', 'Ub'],
    ])
  })

  it('mendukung field dengan tanda kutip ganda yang memuat koma', () => {
    expect(parseCsv('id,alg\nPLL-Ub,"R2 U, R\' U\'"\n')).toEqual([
      ['id', 'alg'],
      ['PLL-Ub', "R2 U, R' U'"],
    ])
  })

  it('mendukung escape "" untuk satu tanda kutip', () => {
    expect(parseCsv('a\n"kata ""kutip"" di sini"\n')).toEqual([
      ['a'],
      ['kata "kutip" di sini'],
    ])
  })

  it('menangani akhir baris CRLF dan baris kosong di akhir', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n\r\n')

    expect(rows).toEqual([['a', 'b'], ['1', '2'], ['']])
    expect(rows.filter((row) => isEmptyCsvRow(row))).toHaveLength(1)
  })

  it('baris terakhir tanpa newline tetap dibaca', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})
