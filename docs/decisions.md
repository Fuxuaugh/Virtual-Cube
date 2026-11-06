# Decisions

## M0 — Spike 0.3: Engine cubing.js (terverifikasi di Console)

**Versi cubing:** 0.66.1

### 1. Memuat kpuzzle dan membuat pola solved

```ts
import { cube3x3x3 } from 'cubing/puzzles'
const kpuzzle = await cube3x3x3.kpuzzle() // async, hanya dimuat sekali
const solved = kpuzzle.defaultPattern() // pola solved (KPattern)
```

Catatan: `kpuzzle()` async, jadi adapter harus punya langkah init yang di-await sekali di awal aplikasi.

### 2. Menerapkan alg dan inverse

```ts
import { Alg } from 'cubing/alg'
const alg = new Alg("R U R' U'")
const after = solved.applyAlg(alg) // pola baru, objek lama tidak berubah (immutable)
const back = after.applyAlg(alg.invert()) // inverse
```

Terverifikasi untuk 5 alg (termasuk wide move `r`, slice `M2 E2 S2`, dan T-perm): alg + inverse selalu kembali solved.

### 3. Membandingkan state

```ts
after.isIdentical(solved) // true bila persis sama
```

Hasil: `y x` menghasilkan `false` karena orientasi cube berubah.

### 4. Cek solved tanpa memperhatikan orientasi cube

```ts
pattern.experimentalIsSolved({
  ignorePuzzleOrientation: true,
  ignoreCenterOrientation: true,
})
```

Terverifikasi: setelah `y x` hasilnya `true`. Ini memenuhi keputusan PRD §2 (solved tidak peduli rotasi x/y/z).
Peringatan: nama `experimentalIsSolved` berawalan "experimental", bisa berubah antar versi. Bungkus di adapter, jangan dipanggil langsung dari UI.

### 5. Bentuk patternData (cubing 0.66.1, terverifikasi dari tipe dan runtime)

- Tiga orbit: EDGES (12 piece, orientasi mod 2), CORNERS (8 piece, mod 3), CENTERS (6 piece, orientasi tidak dilacak).
- `pieces[slot]` = home slot dari piece yang kini ada di slot itu. `orientation[slot]` = orientasi piece tersebut.
- Layer atas diturunkan dari efek gerakan U pada solved: slot corner dan edge 0 sampai 3. Gerakan U tidak mengubah orientasi.
- Rotasi seluruh cube dan slice (M, E, S) menggeser center. Semua gerakan engine punya permutasi center berupa salah satu dari 24 rotasi cube.
- `M` menggeser center persis seperti `x'`.

### Implikasi untuk adapter

- State disimpan sebagai `KPattern` immutable; setiap gerakan menghasilkan pola baru.
- Semua pemanggilan cubing.js lewat satu modul adapter.

## Catatan Keputusan Teknis (Spike 04)

### 1. Cara Menambah Gerakan dan Membaca Pola dari Player

- **Menambah Gerakan:** Menggunakan method `player.experimentalAddMove(...)` (atau API `TwistyPlayer` yang sesuai) untuk menyisipkan gerakan ke dalam tampilan instans player secara dinamis.
- **Membaca Pola:** Menggunakan properti/method `player.experimentalKPuzzle` atau `player.alg` untuk mendapatkan keadaan (state) pola rubik yang sedang aktif.

### 2. Kebutuhan Menunggu Animasi Sebelum Membaca State

- **Status:** Tidak perlu menunggu animasi selesai.
- **Penjelasan:** State internal dari puzzle/player diperbarui secara sinkron tepat saat gerakan ditambahkan, sedangkan animasi visual berjalan secara asinkron di layar. State dapat langsung dibaca tanpa memicu _race condition_.

### 3. Hasil Uji Input Cepat (_Rapid Input_)

- **Status:** **Aman**.
- **Penjelasan:** Pengujian dengan eksekusi gerakan berturut-turut dalam waktu singkat tidak menyebabkan _state desync_ atau error pada animasi player.

## M0 — Ringkasan hasil spike (0.1 – 0.7)

| Task                             | Hasil                                                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 Vite + React + TS            | Lulus. Template Vite jalan di `localhost:5173`                                                                                                                                                 |
| 0.2 TwistyPlayer                 | Lulus. Kamera `cameraLatitude: 35`, `cameraLongitude: 0` menampilkan U dan F. Drag mouse dimatikan dengan `pointerEvents = "none"`. Hint facelets: (pilihanmu: dipakai / dimatikan, alasan)    |
| 0.3 Engine cubing.js             | Lulus. Alg + inverse selalu kembali solved, cek solved tanpa orientasi berfungsi (detail di atas)                                                                                              |
| 0.4 Keyboard → engine → tampilan | Lulus 3 dari 3 tes (manual, 50 gerakan acak, input cepat). Menambah gerakan ke tampilan dengan `experimentalAddMove`, membaca pola dari player dengan `experimentalModel.currentPattern.get()` |
| 0.5 / 0.6 Keybind csTimer        | Mapping terverifikasi dari UI csTimer (lihat `docs/keybinds.md`). Source code belum dibaca                                                                                                     |
| 0.7 IndexedDB                    | Lulus. Dexie menyimpan data setelah refresh dan setelah browser ditutup                                                                                                                        |

## Jawaban pertanyaan terbuka PRD §18

1. **Membaca state dari player:** engine tetap sumber kebenaran; setiap gerakan diterapkan ke engine lebih dulu, lalu didorong ke player. (Catat: apakah perlu menunggu animasi sebelum membaca state dari player.)
2. **Rotasi x/y/z memulai timer?** Tidak (dites x di csTimer). Gerakan layer memulai timer. y dan z belum dites.
3. **Sumber algoritma F2L:** belum diputuskan (ditentukan di M3).

## Hal yang berubah dari PRD

- Platform: web app (bukan Tauri), hosting Vercel.
- Penyimpanan: IndexedDB (Dexie), bukan SQLite.
- Orientasi kubus: (putih di atas dari default cubing.js, atau kuning di atas bila kamu sempat mencoba `z2`).
- Tombol 3, 4, 7, 8 di csTimer tidak melakukan apa pun; tombol 5 belum jelas. Tidak diimplementasikan.

## Peringatan untuk adapter

- `experimentalIsSolved`, `experimentalAddMove`, dan `experimentalModel` berawalan "experimental" dan bisa berubah antar versi. Bungkus di adapter, jangan dipanggil dari UI.
- `kpuzzle()` async, jadi adapter harus punya langkah init yang di-await sekali.

## M3 — Temuan alat verifikasi

- OLL: 216 kombinasi orientasi legal layer atas, 58 kelas setelah normalisasi putaran U (57 OLL + 1 kelas solved).
  Hitungan Burnside: (216 + 2 + 12 + 2) / 4 = 58.
- PLL: 288 state permutasi legal layer atas. AUF harus dinormalisasi di KEDUA sisi (sebelum dan sesudah):
  satu sisi menghasilkan 72 kelas, dua sisi menghasilkan 22 kelas (21 PLL + 1 solved).
- f2lSolved dan signature memakai normalisasi orientasi cube secara default (algoritma dengan slice atau
  rotasi netto menggeser center). Mode strict tersedia sebagai opsi.
- invertAlg() menghasilkan bentuk R2'; invertMove() menghasilkan R2. inverseAlgorithm di data case dibuat
  oleh skrip dari invertAlg, bukan ditulis tangan.
- Validasi data case wajib lewat adapter engine (parseAlg, invertAlg). new Alg() langsung menerima U3.
- Arah dependensi: ui → application → domain → engine; infra → domain. Engine tidak mengimpor domain.
- difficulty: 'easy' | 'medium' | 'hard'. Validator data berupa TypeScript, bukan file JSON Schema.
- Masalah lingkungan: drive D: kemungkinan bukan NTFS (error "dubious ownership" Git dan ReplaceFileW EIO).
  Pindahkan proyek ke drive NTFS bila masalah file berulang.

## M4 — Pose verifikasi vs pose tampilan

- Verifikasi "algoritma menyelesaikan case" memakai pose MENTAH (`buildCaseStateRaw` = `solved` + `inverseAlgorithm`),
  karena algoritma dengan rotasi seluruh kubus netto hanya berlaku pada pose yang diasumsikan algoritma itu.
- Tampilan dan pemeriksaan kondisi awal case memakai pose TERNORMALISASI (`buildCaseState`), supaya frame aplikasi
  selalu punya keenam center di slot asal.
- Algoritma dengan rotasi netto (terukur: `PLL-V`, satu `y` tanpa `y'`) perlu penanganan di generator M4: generator
  harus tahu pose mana yang ditampilkan dan bagaimana AUF ditambahkan tanpa merusak pose algoritma.
  Daftar terukurnya ada di `docs/data-verification-report.md`; datanya tidak diperbaiki.
- Skrip konversi digeneralisasi per kategori: `npm run build:data` = PLL lalu OLL (`build:data:pll`/`build:data:oll` untuk satu kategori).
  Verifikasi PLL + OLL: 78/78 case lulus; case berotasi netto pada pose mentah = 1 PLL + 8 OLL (lihat `docs/data-verification-report.md`).

## M4 — Case Generator

- `setupState` = `solved` + `inverseAlgorithm` (pose algoritma) + AUF acak. AUF ditambahkan pada layer U
  **pose mentah** supaya kondisi awal case tidak rusak (AUF hanya memutar layer atas: orientasi OLL dan
  permutasi PLL tetap sesuai case modulo AUF).
- `alignmentAuf` = kebalikan AUF; solver memakainya sebelum menjalankan algoritma, dan setelah itu cube
  kembali solved **persis** (PRD §7.1 "memperhitungkan AUF"). Verifikasi test mencari AUF ini sendiri dari
  4 kemungkinan, tidak mempercayai nilai dari generator.
- `displayState` = setup state ternormalisasi (center di slot asal) hanya untuk tampilan. Algoritma case
  TIDAK boleh dijalankan dari `displayState` karena pose-nya berbeda (lihat M4 — Pose di atas).
- Verifikasi generator: 119/119 case lulus (setup + algoritma = solved, State Validator, kondisi awal per
  kategori); state generator OLL 57 unik dan PLL 21 unik (memperhitungkan AUF). F2L tidak diuji keunikan
  karena data PDF memuat varian slot/AUF (lihat `docs/f2l-classification.md`).

## M5 — Virtual Cube

- Kamera dan kontrol dikunci di adapter engine (`VIRTUAL_CUBE_PLAYER_OPTIONS`): `cameraLatitude: 35`,
  `cameraLongitude: 0` (hanya sisi U dan F), `controlPanel: 'none'`, `hintFacelets: 'none'`,
  `experimentalDragInput: 'none'`, plus `style.pointerEvents = 'none'` (temuan spike M0). UI tidak
  mengatur opsi ini sendiri.
- Alur satu arah dipegang `CubeViewSync` (`src/application/`): gerakan diterapkan ke engine dulu
  (`applyAlg`), baru didorong ke TwistyPlayer (`experimentalAddMove`). Bila notasi ditolak engine,
  tampilan tidak didorong sama sekali (tidak ada desync dari input tidak sah).
- Membaca pattern player bersifat async (`experimentalModel.currentPattern.get()` mengembalikan
  Promise), jadi `matchesState`/`readPatternKey` di adapter juga async.
- Test komponen memakai happy-dom (devDependency) + `react-dom/client` + `React.act`; player asli
  di-inject lewat prop `createPlayer` supaya test tidak butuh WebGL/GPU.
- MILESTONES M5 (5.1-5.6) ditandai selesai.
