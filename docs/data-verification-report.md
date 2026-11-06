# Laporan Verifikasi Data Case (PLL & OLL)

- Sumber data: `data_source/pll.csv` (21 case), `data_source/oll.csv` (57 case) — CubeSkills Algorithms PDF (Feliks Zemdegs & Andy Klise)
- Data hasil konversi: `src/data/pll.json`, `src/data/oll.json` (dibuat oleh `npm run build:data`)
- Verifikasi: `src/data/pll-data.test.ts`, `src/data/oll-data.test.ts` (Vitest, lewat Cube Engine)
- Tanggal: 2026-11-06

Algoritma **tidak** diubah, tidak dikoreksi, dan tidak diganti di mana pun.
Semua case (`21 + 57 = 78`) lulus verifikasi; tidak ada entri di
`RECORDED_FAILURES` kedua test.

## Pose: verifikasi vs tampilan

| Pose           | Fungsi                                                                              | Dipakai untuk                              |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| Mentah         | `buildCaseStateRaw(c)` = `solved` + `inverseAlgorithm`                              | Verifikasi "algoritma menyelesaikan case"  |
| Ternormalisasi | `buildCaseState(c)` = pose mentah diputar sampai keenam center kembali ke slot asal | Tampilan dan pemeriksaan kondisi awal case |

Algoritma yang memuat rotasi seluruh kubus **tanpa pasangan** (mis. `y` tanpa `y'`)
hanya menyelesaikan cube bila dijalankan dari pose mentah, yaitu pose yang
diasumsikan algoritma itu sendiri. Karena itu verifikasi memakai pose mentah,
sedangkan tampilan memakai pose ternormalisasi agar frame aplikasi tetap punya
center di slot asal.

## PLL

| Pemeriksaan                                                                             | Hasil                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------ |
| Normalisasi + `parseAlg` (21 algoritma)                                                 | 21/21 lulus, 0 gagal                       |
| `validateCaseData`                                                                      | valid                                      |
| `loadCases('PLL')`                                                                      | berhasil, 21 case                          |
| Jumlah baris data CSV = jumlah case JSON                                                | 21 = 21                                    |
| Kondisi awal tiap case — pose ternormalisasi (F2L solved, OLL solved, PLL belum solved) | 21/21 lulus                                |
| `pllSignature` unik antar 21 case                                                       | lulus                                      |
| Algoritma menyelesaikan case — pose mentah                                              | **21/21 lulus**                            |
| Case dengan rotasi netto pada pose mentah                                               | 1 (`PLL-V`) — informasi untuk generator M4 |

### Riwayat: PLL-V (gagal, lalu terselesaikan — bukan salah data)

**Status: terselesaikan 2026-11-06.** `PLL-V` sudah dihapus dari
`RECORDED_FAILURES` dan lulus pemeriksaan tanpa ada perubahan pada data.

**Algoritma persis dari CSV (kolom `algorithm`, tidak diubah):**

```
(R' U R' U') y (R' F' R2 U') (R' U R' F) R F
```

**Algoritma tersimpan di JSON (hanya spasi yang dinormalkan):**

```
R' U R' U' y R' F' R2 U' R' U R' F R F
```

**Gejala waktu itu:** pemeriksaan "algoritma menyelesaikan case" dijalankan pada
pose **ternormalisasi**, sehingga alg dijalankan dari pose yang berbeda dari pose
yang diasumsikan. Hasil ukur saat itu: `pllSignature(after) = "0,1,2,3|0,2,3,1"`
(solved `"0,1,2,3|0,1,2,3"`), `isSolved(after) = false` (sisa 3-cycle edge layer U).

**Sebab (kerangka pose algoritma, bukan salah data):**

- Pada pose mentah, `solved` + `inverseAlgorithm` lalu `algorithm` mengembalikan
  cube ke solved **persis** — data konsisten.
- Algoritma V memuat satu `y` tanpa `y'`, jadi netto-nya menggeser center
  (pose). `buildCaseState` memutar seluruh kubus agar center kembali ke slot asal,
  sehingga alg dijalankan dari pose yang salah dan sisa state bukan lagi rotasi
  dari solved.
- Bukan penyebab slice/wide: `H` dan `Z` (memakai `M`/`M2'`) serta `Gb` (wide
  `u`/`u'`) lulus; `E`, `Aa`, `Ab` memakai `x ... x'` yang saling membatalkan.

**Perbaikan yang dipakai (tanpa menyentuh data atau melonggarkan test):**
tambahkan `buildCaseStateRaw(c)` di `src/domain/verification/` dan jalankan
pemeriksaan "algoritma menyelesaikan case" pada pose mentah; `pllSignature` tetap
menormalisasi orientasi + AUF, jadi hasilnya harus sama dengan signature solved.

### Rotasi netto pada pose mentah — PLL

**Definisi:** sebuah case punya rotasi netto bila keenam center pada state
**mentah** (`buildCaseStateRaw`) belum berada di slot asalnya. Artinya
`inverseAlgorithm` case tersebut memuat rotasi seluruh kubus yang tidak
dibatalkan.

| Case            | Rotasi netto pada pose mentah | Catatan                                                                     |
| --------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `PLL-V`         | ya                            | alg memuat `y` tanpa `y'`                                                   |
| 20 case lainnya | tidak                         | `x ... x'` saling membatalkan, `M`/`M2'`/wide tidak menyisakan rotasi netto |

## OLL

| Pemeriksaan                                                                                      | Hasil                |
| ------------------------------------------------------------------------------------------------ | -------------------- |
| Normalisasi + `parseAlg` (57 algoritma)                                                          | 57/57 lulus, 0 gagal |
| `validateCaseData`                                                                               | valid                |
| `loadCases('OLL')`                                                                               | berhasil, 57 case    |
| Jumlah baris data CSV = jumlah case JSON                                                         | 57 = 57              |
| Kondisi awal tiap case — pose ternormalisasi (F2L solved, OLL belum solved)                      | 57/57 lulus          |
| Algoritma menyelesaikan case — pose mentah (layer atas terorientasi, F2L tetap solved)           | **57/57 lulus**      |
| `ollSignature` unik antar 57 case                                                                | lulus                |
| 57 signature + signature solved = 58 kelas `enumerateOllClasses` (tidak ada yang terlewat/ganda) | lulus, 58 = 58       |
| Case dengan rotasi netto pada pose mentah                                                        | 8 (daftar di bawah)  |

Catatan OLL: setelah algoritma dijalankan, layer atas hanya **terorientasi** —
permutasinya tidak dituntut solved, jadi pemeriksaan yang dipakai adalah
`ollSignature` = signature solved dan `f2lSolved` tetap true (bukan state solved
penuh). Sebagai informasi tambahan (terukur, tidak dijadikan syarat test): pada
pose mentah, `algorithm` + `inverseAlgorithm` saling membatalkan **persis**
(`equals(after, solvedState()) === true`) untuk 57/57 case.

### Rotasi netto pada pose mentah — OLL (8 case)

Kedelapan case ini memuat `y` atau `y'` yang tidak berpasangan, sehingga keenam
center pada pose mentah belum kembali ke slot asal:

| Case     | Algoritma persis dari CSV                         |
| -------- | ------------------------------------------------- |
| `OLL-13` | `(r U' r') (U' r U r') y' (R' U R)`               |
| `OLL-18` | `y R U2' (R2' F R F') U2' M' (U R U' r')`         |
| `OLL-25` | `y F' (r U R' U') r' F R`                         |
| `OLL-29` | `y (R U R' U') (R U' R') (F' U' F) (R U R')`      |
| `OLL-30` | `y' F U (R U2 R' U') (R U2 R' U') F'`             |
| `OLL-43` | `y R' U' F' U F R`                                |
| `OLL-52` | `(R' U' R U' R' U) y' (R' U R) B`                 |
| `OLL-55` | `y (R' F R U) (R' U' R2' F') R2 U' R' (U R U R')` |

49 case lainnya tidak punya rotasi netto (rotasi `x`/`y` di dalamnya berpasangan
atau tidak ada; `M`/`M'`/`M2'` dan wide `r`/`r'`/`f`/`f'`/`l` tidak menyisakan
rotasi netto).

## Implikasi untuk generator M4 (belum dikerjakan, data tidak diperbaiki)

1. Generator harus menentukan pose yang ditampilkan. Untuk case berotasi netto
   (1 PLL + 8 OLL), pose ternormalisasi berbeda dari pose yang diasumsikan
   algoritma, jadi menampilkan pose ternormalisasi lalu meminta pengguna
   menjalankan alg akan memberi hasil yang tidak solved.
2. Pilihan yang perlu diputuskan: (a) tampilkan pose mentah untuk case berotasi
   netto, (b) simpan rotasi pose di `metadata` lalu terapkan saat menampilkan,
   atau (c) ubah cara AUF ditambahkan agar pose algoritma tidak rusak.
3. Penambahan AUF acak (PRD §2) juga harus memperhitungkan pose: AUF adalah
   putaran layer U pada pose yang dipakai, bukan pada pose ternormalisasi.

## F2L

| Pemeriksaan                                                                                     | Hasil                              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| Normalisasi + `parseAlg` (41 algoritma)                                                         | 41/41 lulus, 0 gagal               |
| `validateCaseData`                                                                              | valid                              |
| `loadCases('F2L')`                                                                              | berhasil, 41 case                  |
| Jumlah baris data CSV = jumlah case JSON                                                        | 41 = 41                            |
| Kondisi awal (cross solved, tepat 1 slot belum selesai, F2L belum solved) - pose ternormalisasi | 41/41 lulus                        |
| Algoritma menyelesaikan case - pose mentah (persis `solved`)                                    | 41/41 lulus                        |
| Jumlah per grup PDF (4/6/4/4/6/6/6/5) dan konsistensi grup PDF <-> `pairGroup`                  | lulus                              |
| `pairSignature` unik antar 41 case                                                              | **GAGAL: hanya 27 signature unik** |
| 41 signature + solved menutup 42 kelas enumerasi                                                | **GAGAL: 28 dari 42 kelas**        |
| Case dengan rotasi netto pada pose mentah                                                       | 18 (daftar di bawah)               |

Dua pemeriksaan yang gagal ditandai `it.fails` lewat `RECORDED_FAILURES` di
`src/data/f2l-data.test.ts`. Data dan algoritma **tidak** diubah.

### Kegagalan 1 - `pairSignature` tidak unik (14 grup, 28 case)

Signature yang sama muncul untuk case berikut (algoritma persis dari kolom `algorithm`
CSV, tidak diubah):

| Signature | Case              | Algoritma persis dari CSV                                           |
| --------- | ----------------- | ------------------------------------------------------------------- |
| `02\|30`  | `F2L-01`,`F2L-07` | `U (R U' R')` / `U' (R U2' R' U) y' (R' U' R)`                      |
| `01\|00`  | `F2L-02`,`F2L-08` | `y' U' (R' U R)` / `R' U2' R2 U R2' U R`                            |
| `02\|10`  | `F2L-03`,`F2L-13` | `y' (R' U' R)` / `U' (R U2' R') U2 (R U' R')`                       |
| `01\|20`  | `F2L-04`,`F2L-14` | `(R U R')` / `y' U (R' U2 R) U2' (R' U R)`                          |
| `02\|20`  | `F2L-05`,`F2L-11` | `U' (R U' R' U) y' (R' U' R)` / `(U' R U R') U2 (R U' R')`          |
| `01\|10`  | `F2L-06`,`F2L-12` | `U' (R U R' U) (R U R')` / `y' (U R' U' R) U2' (R' U R)`            |
| `02\|00`  | `F2L-09`,`F2L-19` | `y' U (R' U R U') (R' U' R)` / `y' (R' U R) U2' y (R U R')`         |
| `01\|30`  | `F2L-10`,`F2L-20` | `U' (R U' R' U) (R U R')` / `(R U' R' U2) y' (R' U' R)`             |
| `00\|20`  | `F2L-15`,`F2L-18` | `U (R U2 R') U (R U' R')` / `y' U2 (R' U' R) U' (R' U' R)`          |
| `00\|10`  | `F2L-16`,`F2L-17` | `y' U' (R' U2 R) U' (R' U R)` / `U2 (R U R' U) (R U' R')`           |
| `00\|30`  | `F2L-21`,`F2L-24` | `(R U2 R') U' (R U R')` / `y' U' (R' U R U) (R' U R U') (R' U R)`   |
| `00\|00`  | `F2L-22`,`F2L-23` | `y' (R' U2 R) U (R' U' R)` / `U (R U' R' U') (R U' R' U) (R U' R')` |
| `H1\|00`  | `F2L-27`,`F2L-29` | `(R U' R' U) (R U' R')` / `y' (R' U' R U) (R' U' R)`                |
| `H2\|00`  | `F2L-28`,`F2L-30` | `y' (R' U R U') (R' U R)` / `(R U R' U') (R U R')`                  |

Sebab (terukur):

- 12 grup pertama: konfigurasi pasangan **identik** (corner di atas slotnya, twist sama,
  edge pada posisi relatif sama, flip 0). State satu case adalah citra rotasi `y^3` dari
  state yang lain **untuk kedua piece pasangan**; seluruh state tidak bisa dipetakan satu
  ke yang lain oleh satu rotasi (diuji `y`,`y2`,`y'`,`x`,`x'`,`x2`,`z`,`z'`,`z2`: tidak ada
  yang membuat keduanya identik), jadi yang berbeda adalah piece layer atas lainnya.
  Karena `pairSignature` (sesuai tugas) hanya membaca pasangan dan dinormalisasi terhadap
  AUF, keduanya menghasilkan signature sama. Algoritma case kedua umumnya memuat `y'`.
- 2 grup terakhir (`H1|00`, `H2|00`): keluarga Corner in Place yang berbeda hanya oleh
  **AUF** (posisi edge di layer U), dan menurut definisi "case yang beda AUF sama" maka
  signature-nya sama.

### Kegagalan 2 - cakupan kelas 28 dari 42

Enumerasi menghasilkan 42 kelas (24 `both-in-u-layer` + 6 `corner-in-place` +
6 `edge-in-place` + 6 `both-in-place`). Data menutup 27 signature + signature solved =
**28 kelas**; 14 kelas tidak muncul di data:

- 12 kelas `both-in-u-layer` dengan flip edge 1 (data hanya memuat flip 0 untuk keluarga ini);
- 2 kelas `corner-in-place` dengan flip edge 1.

### Rotasi netto pada pose mentah (18 case)

`F2L-02`, `F2L-03`, `F2L-05`, `F2L-07`, `F2L-09`, `F2L-12`, `F2L-14`, `F2L-16`, `F2L-18`,
`F2L-20`, `F2L-22`, `F2L-24`, `F2L-28`, `F2L-29`, `F2L-31`, `F2L-35`, `F2L-37`, `F2L-41`.

Semuanya memuat `y`/`y'`/`d` netto (tidak berpasangan). Algoritma yang belum muncul di
tabel duplikat di atas:

| Case     | Algoritma persis dari CSV               |
| -------- | --------------------------------------- |
| `F2L-31` | `(R U' R' U) y' (R' U R)`               |
| `F2L-35` | `(U' R U R') U y' (R' U' R)`            |
| `F2L-37` | `(R U' R') d (R' U2 R) U2' (R' U R)`    |
| `F2L-41` | `(R U R' U') (R U' R') U2 y' (R' U' R)` |
