/**
 * Verifikasi otomatis data PLL (PRD §7.3, MILESTONES M4.3).
 *
 * Test ini membaca `src/data/pll.json` sungguhan (hasil `npm run build:data`) dan
 * memverifikasinya lewat Cube Engine — bukan dengan membandingkan tulisan
 * algoritma. Algoritma TIDAK diubah di sini.
 *
 * Pose yang dipakai:
 * - Pemeriksaan kondisi awal (F2L solved, OLL solved, PLL belum solved) memakai
 *   `buildCaseState` (pose ternormalisasi, sama dengan yang ditampilkan).
 * - Pemeriksaan "algoritma menyelesaikan case" memakai `buildCaseStateRaw` (pose
 *   mentah `solved` + `inverseAlgorithm`), karena algoritma yang memuat rotasi
 *   seluruh kubus tanpa pasangan hanya berlaku pada pose itu. Hasilnya lalu
 *   dinormalisasi oleh `pllSignature` (orientasi + AUF).
 *
 * Kalau ada pemeriksaan yang gagal, kegagalannya dicatat di
 * `docs/data-verification-report.md` dan test pemeriksaan tersebut ditandai lewat
 * `RECORDED_FAILURES` di bawah (`it.fails`) — tanpa melonggarkan pemeriksaan.
 *
 * Isi JSON dan CSV dibaca lewat import `?raw` (Vite) supaya test ini tidak
 * memakai API Node — project app hanya memuat tipe `vite/client`.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import csvText from '../../data_source/pll.csv?raw'
import { isEmptyCsvRow, parseCsv } from '../data-build/csv.js'
import { loadCases } from '../domain/load-cases.js'
import type { TrainingCase } from '../domain/training-case.js'
import {
  buildCaseState,
  buildCaseStateRaw,
  f2lSolved,
  ollSignature,
  pllSignature,
  SOLVED_OLL_SIGNATURE,
} from '../domain/verification/index.js'
import {
  applyAlg,
  equals,
  initCubeEngine,
  isOrbitSliceSolved,
  isSolved,
  layerSlots,
  solvedState,
} from '../engine/index.js'
import pllJsonText from './pll.json?raw'

const cases = JSON.parse(pllJsonText) as TrainingCase[]

const csvRows = parseCsv(csvText).filter((row) => !isEmptyCsvRow(row))
const csvHeader = csvRows[0] ?? []
const csvDataRows = csvRows.slice(1)

/**
 * Pemeriksaan "algoritma menyelesaikan case" yang sudah tercatat gagal di
 * `docs/data-verification-report.md`. JANGAN menambah entri di sini untuk
 * "menghijaukan" suite: setiap entri berarti ada kegagalan nyata yang dilaporkan,
 * dan test-nya menjadi `it.fails` (merah kalau ternyata lolos).
 *
 * Kosong sejak 2026-11-06: PLL-V lulus setelah verifikasi memakai pose mentah.
 */
const RECORDED_FAILURES: ReadonlyMap<string, string> = new Map()

/**
 * Case yang pada pose mentah keenam center-nya BELUM di slot asal, artinya
 * `inverseAlgorithm`-nya memuat rotasi seluruh kubus (netto) — terukur, bukan
 * asumsi. Ini informasi untuk generator M4 (lihat docs/data-verification-report.md);
 * datanya tidak diperbaiki.
 */
const EXPECTED_NET_ROTATION_CASES = ['PLL-V']

/** True bila keenam center sudah di slot asalnya pada state tersebut. */
function centersInHomeSlots(state: ReturnType<typeof solvedState>): boolean {
  return isOrbitSliceSolved(state, 'CENTERS', layerSlots().centers)
}

describe('data PLL', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('berisi tepat 21 case dengan id unik dan source terisi', () => {
    expect(cases).toHaveLength(21)

    const ids = cases.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const item of cases) {
      expect(item.id).not.toBe('')
      expect(item.category).toBe('PLL')
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

  it("loadCases('PLL') berhasil memuat data yang sama", async () => {
    const loaded = await loadCases('PLL')

    expect(loaded.map((item) => item.id)).toEqual(cases.map((item) => item.id))
  })

  it('pllSignature unik untuk semua 21 case', () => {
    const signatures = cases.map((item) => pllSignature(buildCaseState(item)))

    expect(new Set(signatures).size).toBe(cases.length)
    expect(signatures).not.toContain(pllSignature(solvedState()))
  })

  it('pose mentah: daftar case dengan rotasi netto (center belum di slot asal)', () => {
    const withNetRotation = cases
      .filter((item) => !centersInHomeSlots(buildCaseStateRaw(item)))
      .map((item) => item.id)

    expect(withNetRotation).toEqual(EXPECTED_NET_ROTATION_CASES)
  })

  for (const pllCase of cases) {
    it(`${pllCase.id}: kondisi awal (F2L solved, OLL solved, PLL belum solved)`, () => {
      const state = buildCaseState(pllCase)

      expect(f2lSolved(state)).toBe(true)
      expect(ollSignature(state)).toBe(SOLVED_OLL_SIGNATURE)
      expect(pllSignature(state)).not.toBe(pllSignature(solvedState()))
    })

    const recordedFailure = RECORDED_FAILURES.get(pllCase.id)
    const solveCheck = recordedFailure === undefined ? it : it.fails

    solveCheck(
      `${pllCase.id}: algoritma menyelesaikan case (pose mentah)${
        recordedFailure === undefined
          ? ''
          : ` (TERCATAT GAGAL: ${recordedFailure})`
      }`,
      () => {
        const after = applyAlg(buildCaseStateRaw(pllCase), pllCase.algorithm)

        // Algoritma dijalankan pada pose yang diasumsikan alg: hasilnya harus
        // persis solved, dan signature-nya (orientasi + AUF dinormalisasi)
        // harus sama dengan signature solved.
        expect(equals(after, solvedState())).toBe(true)
        expect(pllSignature(after)).toBe(pllSignature(solvedState()))
        expect(isSolved(after)).toBe(true)
      }
    )
  }
})
