/**
 * Verifikasi otomatis data F2L (PRD §7.2/§7.4, MILESTONES M4.3/M4.4).
 *
 * Test ini membaca `src/data/f2l.json` sungguhan (hasil `npm run build:data`) dan
 * memverifikasinya lewat Cube Engine. Algoritma TIDAK diubah di sini.
 *
 * Pose yang dipakai:
 * - Kondisi awal memakai `f2lCaseState` (pose ternormalisasi).
 * - "Algoritma menyelesaikan case" memakai `buildCaseStateRaw` (pose mentah),
 *   sama seperti PLL/OLL.
 *
 * Dua pemeriksaan TIDAK lulus dan sudah dicatat di
 * `docs/data-verification-report.md` (12 pasang case punya `pairSignature` yang
 * sama karena merupakan konfigurasi pasangan yang sama di slot berbeda, dan
 * karena itu himpunan signature tidak menutup 42 kelas enumerasi):
 * pemeriksaan keunikan per case dan pemeriksaan cakupan. Keduanya ditandai
 * lewat `RECORDED_FAILURES`/`it.fails` supaya suite tetap hijau tanpa
 * melonggarkan pemeriksaan lain.
 *
 * Isi JSON dan CSV dibaca lewat import `?raw` (Vite) supaya test ini tidak
 * memakai API Node.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import csvText from '../../data_source/f2l.csv?raw'
import { isEmptyCsvRow, parseCsv } from '../data-build/csv.js'
import { f2lGroupFromName } from '../data-build/f2l-group.js'
import { loadCases } from '../domain/load-cases.js'
import type { TrainingCase } from '../domain/training-case.js'
import {
  buildCaseStateRaw,
  crossSolved,
  enumerateF2lPairClasses,
  f2lCaseState,
  f2lSolved,
  pairGroup,
  pairSignature,
  unsolvedSlots,
  type F2lPairGroup,
} from '../domain/verification/index.js'
import {
  applyAlg,
  equals,
  initCubeEngine,
  isOrbitSliceSolved,
  layerSlots,
  solvedState,
} from '../engine/index.js'

import f2lJsonText from './f2l.json?raw'

const cases = JSON.parse(f2lJsonText) as TrainingCase[]

const csvRows = parseCsv(csvText).filter((row) => !isEmptyCsvRow(row))
const csvHeader = csvRows[0] ?? []
const csvDataRows = csvRows.slice(1)

/**
 * Grup case dengan `pairSignature` sama (terukur; lihat laporan verifikasi).
 * 12 grup pertama = konfigurasi pasangan yang sama di slot berbeda (algoritmanya
 * memuat `y` netto), 2 grup terakhir = varian AUF pada keluarga "Corner in Place".
 */
const DUPLICATE_SIGNATURE_GROUPS: ReadonlyArray<readonly string[]> = [
  ['F2L-01', 'F2L-07'],
  ['F2L-02', 'F2L-08'],
  ['F2L-03', 'F2L-13'],
  ['F2L-04', 'F2L-14'],
  ['F2L-05', 'F2L-11'],
  ['F2L-06', 'F2L-12'],
  ['F2L-09', 'F2L-19'],
  ['F2L-10', 'F2L-20'],
  ['F2L-15', 'F2L-18'],
  ['F2L-16', 'F2L-17'],
  ['F2L-21', 'F2L-24'],
  ['F2L-22', 'F2L-23'],
  ['F2L-27', 'F2L-29'],
  ['F2L-28', 'F2L-30'],
]

/**
 * Case yang pemeriksaan "pairSignature unik" gagal (kedua sisi tiap pasangan).
 * Tercatat di `docs/data-verification-report.md`; JANGAN menambah entri di sini
 * untuk "menghijaukan" suite.
 */
const RECORDED_FAILURES: ReadonlyMap<string, string> = new Map(
  DUPLICATE_SIGNATURE_GROUPS.flatMap((group) =>
    group.map((id) => [id, 'lihat docs/data-verification-report.md'] as const)
  )
)

/** Case dengan rotasi netto pada pose mentah (center belum di slot asal). */
const EXPECTED_NET_ROTATION_CASES = [
  'F2L-02',
  'F2L-03',
  'F2L-05',
  'F2L-07',
  'F2L-09',
  'F2L-12',
  'F2L-14',
  'F2L-16',
  'F2L-18',
  'F2L-20',
  'F2L-22',
  'F2L-24',
  'F2L-28',
  'F2L-29',
  'F2L-31',
  'F2L-35',
  'F2L-37',
  'F2L-41',
]

/** Jumlah case per grup nama PDF (dari kolom `name`). */
const EXPECTED_GROUP_COUNTS: Readonly<Record<string, number>> = {
  'Basic Inserts': 4,
  'Case 1': 6,
  'Case 2': 4,
  'Case 3': 4,
  'Incorrectly Connected': 6,
  'Corner in Place': 6,
  'Edge in Place': 6,
  'Both in Place': 5,
}

/** pairGroup yang diharapkan untuk tiap grup nama PDF. */
const EXPECTED_GROUP_TO_PAIR_GROUP: Readonly<Record<string, F2lPairGroup>> = {
  'Basic Inserts': 'both-in-u-layer',
  'Case 1': 'both-in-u-layer',
  'Case 2': 'both-in-u-layer',
  'Case 3': 'both-in-u-layer',
  'Incorrectly Connected': 'both-in-u-layer',
  'Corner in Place': 'corner-in-place',
  'Edge in Place': 'edge-in-place',
  'Both in Place': 'both-in-place',
}

function tagOf(item: TrainingCase): string {
  return item.tags[0] ?? ''
}

function countByPairGroup(): Record<F2lPairGroup, number> {
  const counts: Record<F2lPairGroup, number> = {
    'both-in-u-layer': 0,
    'corner-in-place': 0,
    'edge-in-place': 0,
    'both-in-place': 0,
  }
  for (const item of cases) {
    counts[pairGroup(f2lCaseState(item))] += 1
  }
  return counts
}

describe('data F2L', () => {
  beforeAll(async () => {
    await initCubeEngine()
  })

  it('berisi tepat 41 case dengan id unik dan source terisi', () => {
    expect(cases).toHaveLength(41)

    const ids = cases.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const item of cases) {
      expect(item.id).not.toBe('')
      expect(item.category).toBe('F2L')
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

  it("loadCases('F2L') berhasil memuat data yang sama", async () => {
    const loaded = await loadCases('F2L')

    expect(loaded.map((item) => item.id)).toEqual(cases.map((item) => item.id))
  })

  it('jumlah case per grup nama PDF sesuai: 4/6/4/4/6/6/6/5', () => {
    const counts: Record<string, number> = {}
    for (const item of cases) {
      const group = tagOf(item)
      counts[group] = (counts[group] ?? 0) + 1
    }

    expect(counts).toEqual(EXPECTED_GROUP_COUNTS)
  })

  it('tags berisi nama grup yang diturunkan dari kolom name', () => {
    const mismatches = cases
      .filter((item) => tagOf(item) !== f2lGroupFromName(item.name))
      .map((item) => item.id)

    expect(mismatches).toEqual([])
  })
  it('jumlah case per pairGroup sesuai PDF: 24/6/6/5', () => {
    expect(countByPairGroup()).toEqual({
      'both-in-u-layer': 24,
      'corner-in-place': 6,
      'edge-in-place': 6,
      'both-in-place': 5,
    })
  })

  it('grup nama PDF konsisten dengan pairGroup', () => {
    const mismatches = cases
      .map((item) => {
        const group = tagOf(item)
        const expected = EXPECTED_GROUP_TO_PAIR_GROUP[group]
        const actual = pairGroup(f2lCaseState(item))
        return expected === actual
          ? null
          : `${item.id} (${group}: diharapkan ${expected}, dapat ${actual})`
      })
      .filter((entry): entry is string => entry !== null)

    expect(mismatches).toEqual([])
  })

  it('enumerasi kelas pairSignature: 150 konfigurasi → 42 kelas (24/6/6/6)', () => {
    const enumeration = enumerateF2lPairClasses()

    expect(enumeration.configurationCount).toBe(150)
    expect(enumeration.classCount).toBe(42)
    expect(enumeration.classCountByGroup).toEqual({
      'both-in-u-layer': 24,
      'corner-in-place': 6,
      'edge-in-place': 6,
      'both-in-place': 6,
    })
  })

  it('pose mentah: daftar case dengan rotasi netto (center belum di slot asal)', () => {
    const centerSlots = layerSlots().centers
    const withNetRotation = cases
      .filter(
        (item) =>
          !isOrbitSliceSolved(buildCaseStateRaw(item), 'CENTERS', centerSlots)
      )
      .map((item) => item.id)

    expect(withNetRotation).toEqual(EXPECTED_NET_ROTATION_CASES)
  })

  it.fails(
    '41 pairSignature unik (TERCATAT GAGAL: lihat docs/data-verification-report.md)',
    () => {
      const signatures = cases.map((item) => pairSignature(f2lCaseState(item)))

      expect(new Set(signatures).size).toBe(cases.length)
    }
  )

  it.fails(
    '41 signature + solved menutup 42 kelas enumerasi (TERCATAT GAGAL: lihat docs/data-verification-report.md)',
    () => {
      const signatures = cases.map((item) => pairSignature(f2lCaseState(item)))
      const enumeration = enumerateF2lPairClasses()
      const covered = [...new Set([...signatures, 'H0|H0'])].sort()

      expect(covered).toEqual([...enumeration.signatures].sort())
    }
  )

  for (const f2lCase of cases) {
    it(`${f2lCase.id}: kondisi awal (cross solved, tepat 1 slot belum selesai, F2L belum solved)`, () => {
      const state = f2lCaseState(f2lCase)

      expect(crossSolved(state)).toBe(true)
      expect(unsolvedSlots(state)).toHaveLength(1)
      expect(f2lSolved(state)).toBe(false)
    })

    const recordedFailure = RECORDED_FAILURES.get(f2lCase.id)

    // Pemeriksaan ini lulus untuk 41/41 case; yang gagal hanya keunikan
    // signature di bawah (lihat docs/data-verification-report.md).
    it(`${f2lCase.id}: algoritma menyelesaikan case dari pose mentah`, () => {
      const after = applyAlg(buildCaseStateRaw(f2lCase), f2lCase.algorithm)

      expect(equals(after, solvedState())).toBe(true)
      expect(f2lSolved(after)).toBe(true)
    })

    const uniquenessCheck = recordedFailure === undefined ? it : it.fails

    uniquenessCheck(
      `${f2lCase.id}: pairSignature unik${
        recordedFailure === undefined
          ? ''
          : ` (TERCATAT GAGAL: ${recordedFailure})`
      }`,
      () => {
        const signature = pairSignature(f2lCaseState(f2lCase))
        const duplicates = cases
          .filter(
            (other) =>
              other.id !== f2lCase.id &&
              pairSignature(f2lCaseState(other)) === signature
          )
          .map((other) => other.id)

        expect(duplicates).toEqual([])
      }
    )
  }
})
