# Klasifikasi F2L (41 entri CubeSkills)

- Sumber: `data_source/f2l.csv` (CubeSkills F2L Algorithms PDF — Feliks Zemdegs & Andy Klise)
- Data: `src/data/f2l.json` (`npm run build:data`); id `F2L-01`..`F2L-41` = urutan PDF
- Verifikasi: `src/data/f2l-data.test.ts`; temuan lengkap: `docs/data-verification-report.md`

Dokumen ini **tidak menyalin algoritma** — algoritma apa adanya ada di data. PDF ini
tidak memakai nomor case standar; yang dipakai adalah urutan PDF dan grup di kolom
`name`.

## Grup menurut PDF

Nama grup = kolom `name` tanpa nomor urut (`Basic Inserts 1` → `Basic Inserts`,
`Case 1.1` → `Case 1`). Grup disimpan di `tags` pada `f2l.json`.

| Grup                  | Jumlah | `pairGroup` terukur (semua 41 cocok) |
| --------------------- | ------ | ------------------------------------ |
| Basic Inserts         | 4      | `both-in-u-layer`                    |
| Case 1                | 6      | `both-in-u-layer`                    |
| Case 2                | 4      | `both-in-u-layer`                    |
| Case 3                | 4      | `both-in-u-layer`                    |
| Incorrectly Connected | 6      | `both-in-u-layer`                    |
| Corner in Place       | 6      | `corner-in-place`                    |
| Edge in Place         | 6      | `edge-in-place`                      |
| Both in Place         | 5      | `both-in-place`                      |
| **Total**             | **41** |                                      |

## Definisi `pairGroup`

Diukur dari state (bukan dari nama): cross solved dan tepat satu slot F2L belum
selesai, lalu dilihat posisi kedua piece pasangan.

| `pairGroup`       | Arti                                                        |
| ----------------- | ----------------------------------------------------------- |
| `both-in-u-layer` | corner dan edge pasangan sama-sama di layer U               |
| `corner-in-place` | corner pasangan di slot rumahnya (layer D), edge di layer U |
| `edge-in-place`   | edge pasangan di slot rumahnya (slice E), corner di layer U |
| `both-in-place`   | keduanya di slot rumahnya (termasuk state solved)           |

## Slot dan metode signature

Slot F2L = pasangan (corner layer D, edge slice E) satu kolom, diturunkan dari efek
gerakan di `src/engine/f2l-slots.ts` (bukan daftar indeks hafalan). Hasil turunannya:

| Slot (corner D) | Edge slice E | Corner U acuan | Edge U acuan |
| --------------- | ------------ | -------------- | ------------ |
| 4               | 8            | 0              | 0            |
| 5               | 9            | 3              | 3            |
| 6               | 11           | 2              | 2            |
| 7               | 10           | 1              | 1            |

Slot cross = 4 edge layer D (4, 5, 6, 7).

`pairSignature(state)` (hanya valid bila `crossSolved` dan tepat satu slot belum
selesai):

1. posisi corner: `H` bila di slot rumahnya, selain itu offset 0..3 pada siklus slot
   layer U dihitung dari corner U acuan slot tersebut;
2. posisi edge: `H` bila di slot rumahnya, selain itu offset 0..3 pada siklus slot
   layer U dihitung dari edge U acuan slot tersebut;
3. orientasi: twist corner 0..2 dan flip edge 0..1;
4. representasi kanonik = terkecil dari 4 kemungkinan putaran U (AUF), sehingga case
   yang beda AUF menghasilkan signature yang sama.

## Hasil enumerasi kelas

`enumerateF2lPairClasses()` membangun state sintetis dari `patternData` untuk satu slot
(cross dan slot lain solved, isi layer atas sisanya tidak penting):

- corner pasangan: 5 posisi (rumah + 4 slot U) × 3 orientasi = 15 konfigurasi;
- edge pasangan: 5 posisi (rumah + 4 slot U) × 2 orientasi = 10 konfigurasi;
- total 15 × 10 = **150 konfigurasi**.

Setelah normalisasi putaran U (4 rotasi): 96 both-in-u-layer / 4 = **24**,
24 corner-in-place / 4 = **6**, 24 edge-in-place / 4 = **6**, dan 6 both-in-place
(tidak berubah oleh AUF) = **6** → total **42 kelas** (termasuk solved).

## Temuan: 41 entri PDF ≠ 41 kelas pasangan

Hasil verifikasi (terukur, data tidak diubah):

- Hanya **27 signature unik** dari 41 case; **14 grup duplikat** (28 case terlibat):
  - 12 grup = konfigurasi pasangan yang **sama di slot berbeda** (algoritmanya memuat
    `y` netto), mis. `F2L-01` (Basic Inserts 1) dan `F2L-07` (Case 1.3);
  - 2 grup = **varian AUF** pada keluarga Corner in Place: (`F2L-27`, `F2L-29`) dan
    (`F2L-28`, `F2L-30`).
- Cakupan kelas = 27 signature + solved = **28 dari 42**; 14 kelas tidak muncul di data
  (semuanya varian flip-1 pada keluarga "both-in-u-layer" dan "corner-in-place").
- Pemeriksaan lain lulus 41/41: kondisi awal (cross solved, tepat satu slot belum
  selesai, `f2lSolved` false), algoritma menyelesaikan case dari pose mentah (persis
  solved), jumlah per grup PDF, dan konsistensi grup PDF ↔ `pairGroup`.

Artinya: entri PDF ini adalah daftar **algoritma** (dengan varian slot dan AUF), bukan
41 kelas pasangan yang berbeda. Rincian per case + algoritma persis ada di
`docs/data-verification-report.md`. Dua pemeriksaan yang gagal (keunikan signature dan
cakupan kelas) ditandai `it.fails` lewat `RECORDED_FAILURES` di
`src/data/f2l-data.test.ts`, jadi suite tetap hijau dan kegagalan tetap tercatat.
