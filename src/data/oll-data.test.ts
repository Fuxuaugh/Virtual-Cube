/**
 * Verifikasi otomatis data OLL (PRD §7.2, MILESTONES M4.3/M4.4).
 *
 * Test ini membaca `src/data/oll.json` sungguhan (hasil `npm run build:data`) dan
 * memverifikasinya lewat Cube Engine — bukan dengan membandingkan tulisan
 * algoritma. Algoritma TIDAK diubah di sini.
 *
 * Pose yang dipakai:
 * - Pemeriksaan kondisi awal memakai `buildCaseState` (pose ternormalisasi, sama
 *   dengan yang ditampilkan).
 * - Pemeriksaan "algoritma menyelesaikan case" memakai `buildCaseStateRaw` (pose
 *   mentah `solved` + `inverseAlgorithm`), karena algoritma yang memuat rotasi
 *   seluruh kubus tanpa pasangan hanya berlaku pada pose itu.
 *
 * Catatan OLL: setelah algoritma dijalankan, layer atas hanya terorientasi —
 * permutasinya tidak dituntut solved, jadi pemeriksaan di sini adalah
 * `ollSignature` = signature solved dan F2L tetap solved (bukan state solved penuh).
 *
 * Kalau ada pemeriksaan yang gagal, kegagalannya dicatat di
 * `docs/data-verification-report.md` dan test pemeriksaan tersebut ditandai lewat
 * `RECORDED_FAILURES` di bawah (`it.fails`) — tanpa melonggarkan pemeriksaan.
 *
 * Isi JSON dan CSV dibaca lewat import `?raw` (Vite) supaya test ini tidak
 * memakai API Node — project app hanya memuat tipe `vite/client`.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import csvText from '../../data_source/oll.csv?raw'
import { isEmptyCsvRow, parseCsv } from '../data-build/csv.js'
import { loadCases } from '../domain/load-cases.js'
import type { TrainingCase } from '../domain/training-case.js'
import {
  buildCaseState,
  buildCaseStateRaw,
  enumerateOllClasses,
  f2lSolved,
  ollSignature,
  SOLVED_OLL_SIGNATURE,
} from '../domain/verification/index.js'
import {
  applyAlg,
  initCubeEngine,
  isOrbitSliceSolved,
  layerSlots,
  solvedState,
} from '../engine/index.js'

import ollJsonText from './oll.json?raw'

const cases = JSON.parse(ollJsonText) as TrainingCase[]

const csvRows = parseCsv(csvText).filter((row) => !isEmptyCsvRow(row))
const csvHeader = csvRows[0] ?? []
const csvDataRows = csvRows.slice(1)

/**
 * Pemeriksaan "algoritma menyelesaikan case" yang sudah tercatat gagal di
 * `docs/data-verification-report.md`. JANGAN menambah entri di sini untuk
 * "menghijaukan" suite: setiap entri berarti ada kegagalan nyata yang dilaporkan,
 * dan test-nya menjadi `it.fails` (merah kalau ternyata lolos).
 *
 * Kosong: 57/57 case OLL lulus seluruh pemeriksaan (2026-11-06).
 */
const RECORDED_FAILURES: ReadonlyMap<string, string> = new Map()

/**
 * Case yang pada pose mentah keenam center-nya BELUM di slot asal, artinya
 * `inverseAlgorithm`-nya memuat rotasi seluruh kubus (netto) — terukur, bukan
 * asumsi (semuanya memuat `y` atau `y'` yang tidak berpasangan). Ini informasi
 * untuk generator M4 (lihat docs/data-verification-report.md); datanya tidak
 * diperbaiki.
 */
const EXPECTED_NET_ROTATION_CASES = [
  'OLL-13',
  'OLL-18',
  'OLL-25',
  'OLL-29',
  'OLL-30',
  'OLL-43',
  'OLL-52',
  'OLL-55',
]

/** True bila keenam center sudah di slot asalnya pada state tersebut. */
function centersInHomeSlots(state: ReturnType<typeof solvedState>): boolean {
  return isOrbitSliceSolved(state, 'CENTERS', layerSlots().centers)
}

describe('data OLL', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('berisi tepat 57 case dengan id unik dan source terisi', () => {
    expect(cases).toHaveLength(57)

    const ids = cases.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const item of cases) {
      expect(item.id).not.toBe('')
      expect(item.category).toBe('OLL')
      expect(item.source.trim()).not.toBe('')
    }
  })

  it('jumlah baris data CSV sama dengan jumlah case di JSON', () => {
    expect(csvDataRows).toHaveLength(cases.length)
  })

  it('urutan id di CSV sama dengan urutan di JSON', () => {
    const idColumn = csvHeader.indexOf('id')
    expect(idColumn).toBeGreaterThanOrEqual(0)

    expect(csvDataRows.map((row) => row[idColumn])).toEqual(
      cases.map((item) => item.id)
    )
  })

  it("loadCases('OLL') berhasil memuat data yang sama", async () => {
    const loaded = await loadCases('OLL')

    expect(loaded.map((item) => item.id)).toEqual(cases.map((item) => item.id))
  })

  it('ollSignature unik untuk semua 57 case (dan bukan signature solved)', () => {
    const signatures = cases.map((item) => ollSignature(buildCaseState(item)))

    expect(new Set(signatures).size).toBe(cases.length)
    expect(signatures).not.toContain(SOLVED_OLL_SIGNATURE)
  })

  it('57 signature + signature solved menutup semua 58 kelas enumerateOllClasses', () => {
    const enumeration = enumerateOllClasses()
    const fromCases = cases.map((item) => ollSignature(buildCaseState(item)))
    const covered = [...new Set([...fromCases, SOLVED_OLL_SIGNATURE])].sort()

    expect(enumeration.classCount).toBe(58)
    expect(covered).toHaveLength(58)
    // Kesetaraan himpunan: tidak ada kelas yang terlewat maupun ganda.
    expect(covered).toEqual([...enumeration.signatures].sort())
  })

  it('pose mentah: daftar case dengan rotasi netto (center belum di slot asal)', () => {
    const withNetRotation = cases
      .filter((item) => !centersInHomeSlots(buildCaseStateRaw(item)))
      .map((item) => item.id)

    expect(withNetRotation).toEqual(EXPECTED_NET_ROTATION_CASES)
  })

  for (const ollCase of cases) {
    it(`${ollCase.id}: kondisi awal (F2L solved, OLL belum solved)`, () => {
      const state = buildCaseState(ollCase)

      expect(f2lSolved(state)).toBe(true)
      expect(ollSignature(state)).not.toBe(SOLVED_OLL_SIGNATURE)
    })

    const recordedFailure = RECORDED_FAILURES.get(ollCase.id)
    const solveCheck = recordedFailure === undefined ? it : it.fails

    solveCheck(
      `${ollCase.id}: algoritma menyelesaikan case (pose mentah)${
        recordedFailure === undefined
          ? ''
          : ` (TERCATAT GAGAL: ${recordedFailure})`
      }`,
      () => {
        const after = applyAlg(buildCaseStateRaw(ollCase), ollCase.algorithm)

        // OLL hanya meneorientasi layer atas (permutasi tidak dituntut solved),
        // jadi yang diperiksa: orientasi layer atas solved dan F2L tetap solved.
        expect(ollSignature(after)).toBe(SOLVED_OLL_SIGNATURE)
        expect(f2lSolved(after)).toBe(true)
      }
    )
  }
})
