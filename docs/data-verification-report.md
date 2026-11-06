# Laporan Verifikasi Data PLL

- Sumber data: `data_source/pll.csv` (CubeSkills PLL Algorithms PDF — Feliks Zemdegs & Andy Klise)
- Data hasil konversi: `src/data/pll.json` (dibuat oleh `npm run build:data`)
- Verifikasi: `src/data/pll-data.test.ts` (Vitest, lewat Cube Engine)
- Tanggal: 2026-11-06

## Ringkasan

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

Algoritma **tidak** diubah, tidak dikoreksi, dan tidak diganti di mana pun.

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

## Riwayat: PLL-V (gagal, lalu terselesaikan — bukan salah data)

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

## Rotasi netto pada pose mentah (informasi untuk generator M4)

**Definisi:** sebuah case punya rotasi netto bila keenam center pada state
**mentah** (`buildCaseStateRaw`) belum berada di slot asalnya. Artinya
`inverseAlgorithm` case tersebut memuat rotasi seluruh kubus yang tidak
dibatalkan.

**Hasil terukur (21 case):**

| Case            | Rotasi netto pada pose mentah | Catatan                                                                     |
| --------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `PLL-V`         | ya                            | alg memuat `y` tanpa `y'`                                                   |
| 20 case lainnya | tidak                         | `x ... x'` saling membatalkan, `M`/`M2'`/wide tidak menyisakan rotasi netto |

**Implikasi (belum dikerjakan, data tidak diperbaiki):**

1. Generator M4 harus menentukan pose yang ditampilkan. Untuk `PLL-V`, pose
   ternormalisasi berbeda dari pose yang diasumsikan algoritma, jadi menampilkan
   pose ternormalisasi lalu meminta pengguna menjalankan alg akan memberi hasil
   yang tidak solved.
2. Pilihan yang perlu diputuskan: (a) tampilkan pose mentah untuk case berotasi
   netto, (b) simpan rotasi pose di `metadata` lalu terapkan saat menampilkan,
   atau (c) ubah cara AUF ditambahkan agar pose algoritma tidak rusak.
3. Penambahan AUF acak (PRD §2) juga harus memperhitungkan pose: AUF adalah
   putaran layer U pada pose yang dipakai, bukan pada pose ternormalisasi.
