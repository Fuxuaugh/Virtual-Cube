# CUBE TRAINER — Milestones v2.0

Berdasarkan: PRD v2.0 · Prioritas: P0 wajib MVP · P1 penting · P2 lanjutan · P3 opsional

## Cara Memakai (vibe coding)
- Satu **sesi AI = satu sub-milestone** (mis. 3A). Berikan PRD.md, CLAUDE.md, dan hanya bagian milestone terkait.
- Jangan lanjut sebelum **Exit Criteria** terpenuhi dan test hijau.
- Commit setiap task selesai. Tag git di setiap akhir milestone (`m1-done`, dst).
- Jika spike (M0) menunjukkan asumsi PRD salah, **perbarui PRD dulu**, baru lanjut.

## Urutan
M0 Spike → M1 Foundation → M2 Cube Engine → M3 Case Database → M4 Case Generator → M5 Virtual Cube → M6 Keybind → M7 Training → M8 Timer & Focus → M9 Stats → M10 UI Polish → M11 QA & Release

---

## M0 — Prototype Spike (BARU, wajib pertama)
Tujuan: membuktikan asumsi teknis terbesar sebelum membangun apa pun. Kode spike boleh dibuang.

- [ ] P0 — 0.1 React + TS + Vite menjalankan halaman kosong di browser (`npm run dev`).
- [ ] P0 — 0.2 Render `TwistyPlayer` di halaman web dengan kamera tetap yang hanya menampilkan sisi U dan F (cari properti sudut kamera yang tepat, nonaktifkan kontrol mouse). Catat nilai sudut di `docs/decisions.md`.
- [ ] P0 — 0.3 Terapkan algoritma lewat cubing.js (KPuzzle/KPattern) dan baca state hasilnya.
- [ ] P0 — 0.4 Tangkap input keyboard → jalankan gerakan di engine → dorong ke player, state keduanya identik.
- [ ] P0 — 0.5 Ekstrak mapping keybind virtual cube + timer dari source csTimer, tulis ke `docs/keybinds.md` (sertakan link file/baris sumber).
- [ ] P0 — 0.6 Catat apakah rotasi x/y/z memulai timer di csTimer.
- [ ] P0 — 0.7 Buktikan IndexedDB (Dexie): tulis dan baca satu data setelah refresh halaman dan setelah browser ditutup.
- [ ] P0 — 0.8 Tulis `docs/decisions.md`: hasil spike, jawaban untuk PRD §18.

Exit: semua poin terjawab dan terdokumentasi; PRD diperbarui bila perlu.

---

## M1 — Project Foundation
- [ ] P0 — 1.1 Git repo, struktur folder sesuai PRD §12, `CLAUDE.md`.
- [ ] P0 — 1.2 React + TS strict + Vite + Tailwind + `vite-plugin-pwa`.
- [ ] P1 — 1.3 Vitest, ESLint, Prettier, skrip `npm test`, `npm run lint`.
- [ ] P1 — 1.4 CI sederhana (lint + test) bila memakai GitHub.

Exit: `npm run dev` membuka aplikasi kosong di browser; `npm test` dan `npm run lint` lulus.

---

## M2 — Cube Engine
- [ ] P0 — 2.1 Adapter cubing.js (satu-satunya pintu masuk ke library).
- [ ] P0 — 2.2 Definisi CubeState, solved state, perbandingan state.
- [ ] P0 — 2.3 Parser dan eksekusi notasi lengkap (face, wide, slice, rotasi, `'`, `2`).
- [ ] P0 — 2.4 Inverse algorithm.
- [ ] P0 — 2.5 Solved detection tidak bergantung rotasi cube.
- [ ] P0 — 2.6 State Validator (permutasi, orientasi, parity).
- [ ] P0 — 2.7 Unit test: setiap gerakan dasar (X, X', X2) dan `alg + inverse(alg) = solved` untuk set algoritma acak.

Exit: semua test hijau; algoritma + inverse selalu kembali ke solved.

---

## M3 — Case Database
- [ ] P0 — 3.1 Schema `TrainingCase` + JSON schema validasi data.
- [ ] P0 — 3.2 Tulis `docs/f2l-classification.md`: definisi 41 case dan sumbernya.
- [ ] P0 — 3.3 Data 21 PLL, 57 OLL, 41 F2L dengan `source` untuk tiap algoritma (dari sumber tepercaya, bukan dari ingatan AI).
- [ ] P0 — 3.4 Loader + validasi schema saat startup/test.
- [ ] P1 — 3.5 Algoritma alternatif, metadata, tingkat kesulitan.

Exit: semua data lolos schema; jumlah tepat 21/57/41; tidak ada id duplikat.

---

## M4 — Case Generator
- [ ] P0 — 4.1 Generator OLL, PLL, F2L (`inverse(alg)` + AUF acak, kondisi layer sebelumnya benar).
- [ ] P0 — 4.2 Random dan Specific Case Selection.
- [ ] P0 — 4.3 **Verifikasi otomatis PRD §7** untuk seluruh database (test parametrik per case).
- [ ] P0 — 4.4 Uji keunikan state: tidak ada dua OLL/PLL yang menghasilkan pola sama.
- [ ] P1 — 4.5 Filter case (kelompok, kesulitan, tag).

Exit: semua 119 case lulus verifikasi otomatis. Case yang gagal diperbaiki datanya, bukan testnya.

---

## M5 — Virtual Cube
- [ ] P0 — 5.1 Komponen `VirtualCube` (TwistyPlayer) yang menerima state dari engine.
- [ ] P0 — 5.2 Tampilkan solved dan case hasil generator.
- [ ] P0 — 5.3 Kamera tetap U+F (rotasi mouse opsional lewat Settings); input gerakan → engine → tampilan (satu arah).
- [ ] P0 — 5.4 Animasi sinkron; input beruntun cepat tidak membuat state berbeda.
- [ ] P1 — 5.5 Reset cube, kecepatan animasi.
- [ ] P1 — 5.6 Test konsistensi: urutan 1000 gerakan acak, state engine = state tampilan.

Exit: cube dapat ditampilkan, diputar, dan digerakkan tanpa perbedaan state.

---

## M6 — Keybind
- [ ] P0 — 6.1 Implementasi mapping dari `docs/keybinds.md` (cube move, timer, inspection).
- [ ] P0 — 6.2 Layer input terpusat (satu handler, bukan listener tersebar).
- [ ] P1 — 6.3 Preset csTimer, custom keybind, UI pengaturan.
- [ ] P1 — 6.4 Test konflik input (Space vs gerakan, fokus input teks).

Exit: kontrol utama sesuai mapping csTimer yang terverifikasi.

---

## M7 — Training System (pecah jadi 3 sesi)
**7A Inti**
- [ ] P0 — Training Controller, Session Manager.
- [ ] P0 — Random Case dan Specific Case untuk F2L/OLL/PLL.
- [ ] P0 — Algorithm Practice (tanpa timer dulu): tampil case → eksekusi → deteksi solved.

**7B Pendukung**
- [ ] P1 — Algorithm Viewer + playback (play/pause/reset, highlight gerakan).
- [ ] P1 — Retry dan Next Case.

**7C Recognition**
- [ ] P1 — Recognition Practice (4 opsi, distraktor dari kelompok mirip, catat waktu respons dan benar/salah).

Exit: pengguna memilih case dan menyelesaikannya lewat mode yang sesuai.

---

## M8 — Timer & Focus Mode (pecah jadi 2 sesi)
**8A Timer**
- [ ] P0 — Timer Controller (state machine: Idle → Inspection → Running → Finished/Cancelled).
- [ ] P0 — `performance.now()` + rAF untuk tampilan.
- [ ] P0 — Space memulai inspection; Turn 1 valid memulai solve; solved menghentikan.
- [ ] P0 — Input non-gerakan tidak memulai timer.
- [ ] P1 — Penalti +2/DNF, pengaturan inspection, reset/retry, Esc batal.
- [ ] P0 — Test state machine timer dengan fake clock.

**8B Focus Mode**
- [ ] P0 — Layout Focus Mode (cube tengah besar, timer kanan-tengah).
- [ ] P0 — Sembunyikan sidebar, panel algoritma, kontrol; dissolve otomatis di Turn 1; UI kembali setelah solve.
- [ ] P1 — Transisi halus yang tidak menghambat input.

Exit: Space → Inspection → Turn 1 → Focus Mode → Solve → Result berjalan benar.

---

## M9 — Statistics & Persistence
- [ ] P0 — Schema IndexedDB (Dexie): TrainingSession, UserStats, Settings, versi skema.
- [ ] P0 — Simpan hasil, muat riwayat, hitung best/average/last/success per case.
- [ ] P1 — Statistik per kategori, case terbaik dan case yang perlu latihan.
- [ ] P1 — History page, export, import (dengan validasi file).

Exit: data bertahan setelah aplikasi ditutup dan dibuka lagi.

---

## M10 — UI/UX Polish
- [ ] P1 — Dashboard, sidebar, training selection, case selection, Algorithm Library, Statistics, History, Settings.
- [ ] P1 — Dark theme (aksen cyan/biru), loading state, error handling, layout responsif.
- [ ] P2 — Light theme.

Exit: semua halaman konsisten dan mudah dipakai.

---

## M11 — QA & Release
- [ ] P0 — Regresi: seluruh 41 F2L, 57 OLL, 21 PLL; keybind, timer, Focus Mode, persistensi, mode offline.
- [ ] P1 — E2E Playwright untuk alur utama, performance test (input latency).
- [ ] P1 — Bug fixing, production build, uji PWA offline (matikan jaringan lalu muat ulang), deploy opsional ke hosting statis (GitHub Pages/Netlify/Vercel), dokumentasi pengguna.

Exit: MVP stabil, `npm run build` berhasil, dan berjalan offline di Chrome dan Edge.

---

## Prioritas Pengembangan
1. Kebenaran state cube
2. Kebenaran generator case
3. Ketepatan timer
4. Konsistensi input
5. Pengalaman visual

Jangan membangun UI besar sebelum M2 dan M4 hijau.
