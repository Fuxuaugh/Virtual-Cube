# Decisions

## M0 — Spike 0.3: Engine cubing.js (terverifikasi di Console)

**Versi cubing:** (isi dari package.json, bagian dependencies)

### 1. Memuat kpuzzle dan membuat pola solved
```ts
import { cube3x3x3 } from "cubing/puzzles";
const kpuzzle = await cube3x3x3.kpuzzle();      // async, hanya dimuat sekali
const solved = kpuzzle.defaultPattern();        // pola solved (KPattern)
```
Catatan: `kpuzzle()` async, jadi adapter harus punya langkah init yang di-await sekali di awal aplikasi.

### 2. Menerapkan alg dan inverse
```ts
import { Alg } from "cubing/alg";
const alg = new Alg("R U R' U'");
const after = solved.applyAlg(alg);              // pola baru, objek lama tidak berubah (immutable)
const back = after.applyAlg(alg.invert());       // inverse
```
Terverifikasi untuk 5 alg (termasuk wide move `r`, slice `M2 E2 S2`, dan T-perm): alg + inverse selalu kembali solved.

### 3. Membandingkan state
```ts
after.isIdentical(solved)   // true bila persis sama
```
Hasil: `y x` menghasilkan `false` karena orientasi cube berubah.

### 4. Cek solved tanpa memperhatikan orientasi cube
```ts
pattern.experimentalIsSolved({
  ignorePuzzleOrientation: true,
  ignoreCenterOrientation: true,
});
```
Terverifikasi: setelah `y x` hasilnya `true`. Ini memenuhi keputusan PRD §2 (solved tidak peduli rotasi x/y/z).
Peringatan: nama `experimentalIsSolved` berawalan "experimental", bisa berubah antar versi. Bungkus di adapter, jangan dipanggil langsung dari UI.

### 5. Bentuk patternData
`pattern.patternData` berisi tiga kunci: `EDGES`, `CORNERS`, `CENTERS`.
(TODO: buka objeknya di Console, catat isi tiap kunci, misalnya apakah ada `pieces` dan `orientation`, lalu tulis di sini. Jangan ditulis dari asumsi.)

### Implikasi untuk adapter
- State disimpan sebagai `KPattern` immutable; setiap gerakan menghasilkan pola baru.
- Semua pemanggilan cubing.js lewat satu modul adapter.

## Catatan Keputusan Teknis (Spike 04)

### 1. Cara Menambah Gerakan dan Membaca Pola dari Player
* **Menambah Gerakan:** Menggunakan method `player.experimentalAddMove(...)` (atau API `TwistyPlayer` yang sesuai) untuk menyisipkan gerakan ke dalam tampilan instans player secara dinamis.
* **Membaca Pola:** Menggunakan properti/method `player.experimentalKPuzzle` atau `player.alg` untuk mendapatkan keadaan (state) pola rubik yang sedang aktif.

### 2. Kebutuhan Menunggu Animasi Sebelum Membaca State
* **Status:** Tidak perlu menunggu animasi selesai.
* **Penjelasan:** State internal dari puzzle/player diperbarui secara sinkron tepat saat gerakan ditambahkan, sedangkan animasi visual berjalan secara asinkron di layar. State dapat langsung dibaca tanpa memicu *race condition*.

### 3. Hasil Uji Input Cepat (*Rapid Input*)
* **Status:** **Aman**.
* **Penjelasan:** Pengujian dengan eksekusi gerakan berturut-turut dalam waktu singkat tidak menyebabkan *state desync* atau error pada animasi player.

## M0 — Ringkasan hasil spike (0.1 – 0.7)

| Task | Hasil |
|---|---|
| 0.1 Vite + React + TS | Lulus. Template Vite jalan di `localhost:5173` |
| 0.2 TwistyPlayer | Lulus. Kamera `cameraLatitude: 35`, `cameraLongitude: 0` menampilkan U dan F. Drag mouse dimatikan dengan `pointerEvents = "none"`. Hint facelets: (pilihanmu: dipakai / dimatikan, alasan) |
| 0.3 Engine cubing.js | Lulus. Alg + inverse selalu kembali solved, cek solved tanpa orientasi berfungsi (detail di atas) |
| 0.4 Keyboard → engine → tampilan | Lulus 3 dari 3 tes (manual, 50 gerakan acak, input cepat). Menambah gerakan ke tampilan dengan `experimentalAddMove`, membaca pola dari player dengan `experimentalModel.currentPattern.get()` |
| 0.5 / 0.6 Keybind csTimer | Mapping terverifikasi dari UI csTimer (lihat `docs/keybinds.md`). Source code belum dibaca |
| 0.7 IndexedDB | Lulus. Dexie menyimpan data setelah refresh dan setelah browser ditutup |

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