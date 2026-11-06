# CUBE TRAINER — PRD v2.0

Platform: Web app (browser desktop modern, Chrome/Edge/Firefox; berjalan lokal, bisa di-host statis) · Target: Rubik's Cube 3×3, latihan CFOP
Status: Pre-development · Menggantikan PRD v1.1

Dokumen ini ditulis agar bisa dipakai langsung sebagai konteks untuk AI coding agent. Semua hal yang sebelumnya ambigu sudah diputuskan di bagian **Keputusan Terkunci**. Kalau ingin mengubah keputusan, ubah di sana, bukan di tengah implementasi.

---

## 1. Ringkasan Produk

Cube Trainer adalah aplikasi web offline-capable (PWA) untuk latihan F2L, OLL, dan PLL dengan virtual cube 3D. Pengguna memilih case, mengenali pola, menjalankan algoritma, diukur waktunya, dan melihat statistik per case. Virtual cube adalah pusat perhatian UI.

Non-goals versi awal: multiplayer, akun cloud, leaderboard online, Bluetooth cube, full-solve scramble timer (ini trainer case, bukan pengganti csTimer).

## 2. Keputusan Terkunci

| Topik | Keputusan |
|---|---|
| Library cube | `cubing.js` (KPuzzle/KPattern untuk state, `TwistyPlayer` untuk render) |
| Sumber state | **Satu**: state logis di Cube Engine Adapter. TwistyPlayer hanya menampilkan; tidak pernah jadi sumber kebenaran terpisah |
| Orientasi standar | Kuning di atas, hijau di depan. Layer F2L ada di bawah (putih) |
| Notasi yang didukung | Face (U D L R F B), wide (r l u d f b), slice (M E S), rotasi (x y z), modifier `'` dan `2` |
| Solved detection | Dianggap solved bila semua stiker sisi seragam, **tidak peduli rotasi seluruh cube** (x/y/z tidak boleh merusak deteksi) |
| AUF | Case OLL/PLL dibuat dengan AUF acak (U, U', U2, atau tanpa). Pengecekan "solved" untuk PLL boleh dengan AUF akhir (setting, default: strict solved) |
| Klasifikasi F2L | **41 case standar** (4 kelompok slot × variasi posisi pasangan corner-edge, dengan satu algoritma referensi per case). MVP: semua 41 ada di database, minimal 1 algoritma terverifikasi tiap case |
| OLL / PLL | 57 OLL, 21 PLL (PLL tanpa menghitung AUF sebagai case terpisah) |
| Sumber algoritma | Diambil dari sumber tepercaya komunitas (mis. SpeedSolving wiki / AlgDb), dicatat di field `source`. **Tidak boleh ditulis dari ingatan AI** |
| Verifikasi algoritma | Otomatis lewat engine (lihat §7). Algoritma yang gagal verifikasi tidak boleh masuk database |
| Inspection | Default 15 detik, bisa diubah dan bisa dimatikan. Penalti WCA: lewat 15 detik = +2, lewat 17 detik = DNF. Penalti bisa dimatikan di Settings |
| Nilai `result` sesi | `OK`, `PLUS_TWO`, `DNF`, `CANCELLED` |
| Timer | Berbasis `performance.now()`. Tampilan di-update via `requestAnimationFrame`. **Dilarang** memakai `setInterval` atau state React sebagai sumber waktu |
| Penyimpanan | **IndexedDB** (lewat Dexie) di browser. Tidak ada backend dan tidak ada server. Export/import data sebagai file JSON (unduh dan unggah) |
| Keybind | Default mengikuti csTimer, **harus diekstrak dari source resmi** (https://github.com/cs0x7f/cstimer) saat Milestone 0 dan didokumentasikan di `docs/keybinds.md` |
| Platform | **Web app murni** (React + Vite), tanpa Tauri/Rust/Electron. Target browser desktop modern dengan keyboard. Offline lewat PWA (service worker); setelah dimuat sekali, berjalan tanpa internet |
| Konflik browser | Space, panah, dan tombol lain yang punya aksi bawaan browser harus di-`preventDefault` saat fokus ada di area latihan. Jangan override shortcut sistem (Ctrl+W, Ctrl+T, F5, F11) |
| Tampilan cube | **Hanya 2 sisi terlihat: U (atas) dan F (depan)**, kamera tetap pada sudut tersebut. Tanpa tampilan 3 sisi dan tanpa back view. Rotasi tampilan dengan mouse: default nonaktif, bisa diaktifkan di Settings (kembali ke sudut default saat reset). Sudut kamera diatur lewat properti kamera TwistyPlayer (nama persisnya diverifikasi di M0) |
| Bahasa UI | Inggris (istilah cubing baku). Dokumentasi pengembangan boleh Indonesia |

## 3. Alur Utama

### 3.1 Alur Timed Practice
1. Kondisi awal: UI normal, case ditampilkan di cube.
2. Pengguna menekan Space → inspection mulai (UI normal tetap tampil; pengguna boleh memutar tampilan).
3. Pengguna melakukan gerakan cube valid pertama (Turn 1) → solve timer mulai, Focus Mode aktif dengan animasi dissolve.
4. Pengguna menyelesaikan case → solved terdeteksi → timer berhenti.
5. UI kembali, hasil ditampilkan, sesi disimpan. Pilihan: Retry / Next Case.

Aturan:
- Hanya gerakan yang benar-benar mengubah state cube yang menjalankan timer. Rotasi tampilan dengan mouse dan tombol non-gerakan tidak.
- Rotasi seluruh cube (x/y/z) tidak memulai timer **kecuali** diputuskan lain di `docs/keybinds.md` setelah cek perilaku csTimer. Tandai keputusan di dokumen itu.
- Pengguna dapat membatalkan (Esc) atau reset kapan saja; hasil `CANCELLED` tidak masuk statistik waktu.
- Bila inspection dimatikan, Space/Turn 1 langsung memulai solve timer.
- Untimed Practice: tanpa timer, tanpa Focus Mode, tanpa tersimpan di statistik waktu (tetap dihitung sebagai attempt bila diaktifkan di Settings).

### 3.2 Focus Mode
Cube tetap besar di tengah, timer di kanan-tengah (terbaca jelas, tidak mendominasi). Sidebar, panel algoritma, info case, dan kontrol tambahan menghilang dengan fade. Animasi tidak boleh menunda input maupun timer.

## 4. Mode Latihan

| Mode | Perilaku |
|---|---|
| **Algorithm Practice** | Tampilkan case (cube sudah dalam state case). Pengguna mengeksekusi. Timer + deteksi solved |
| **Recognition Practice** | Tampilkan case (hanya tampilan, cube tidak dimainkan). Pengguna memilih nama case dari 4 opsi (1 benar + 3 distraktor dari kelompok mirip). Catat waktu respons dan benar/salah |
| **Random Case** | Pilih acak dari pool (default: semua case kategori; bisa difilter) |
| **Specific Case** | Pilih satu atau beberapa case |
| **Timed / Untimed** | Lihat §3.1 |

Kategori: F2L (41), OLL (57), PLL (21). Kondisi awal wajib:
- F2L: Cross sudah selesai (default), slot yang dilatih sesuai definisi case.
- OLL: F2L selesai.
- PLL: F2L dan OLL selesai.

## 5. Virtual Cube
- Render 3D via TwistyPlayer dengan kamera tetap yang hanya menampilkan sisi U dan F (lihat Keputusan Terkunci). Rotasi tampilan dengan mouse bersifat opsional di Settings.
- Semua notasi di §2 didukung, termasuk inverse dan double.
- Animasi gerakan dengan kecepatan yang dapat diatur.
- Reset ke solved dan reset ke case aktif.
- Input keyboard: pengguna → Cube Engine → state baru → tampilan. Alur satu arah.

## 6. Cube Engine (Adapter)
Tanggung jawab: representasi corner/edge (permutasi + orientasi), eksekusi algoritma, inverse, validasi state, deteksi solved (§2), perbandingan state, dan pembungkus API cubing.js. Seluruh kode lain hanya boleh memakai adapter ini, tidak boleh memanggil cubing.js langsung (agar perubahan API library terisolasi).

## 7. Case Generator & Verifikasi

Generator membuat state dari case, bukan scramble acak.

**Metode:** `setup = inverse(algoritma_case)` diterapkan ke cube solved (atau ke cube dengan F2L/OLL solved sesuai kategori), ditambah AUF acak.

**Verifikasi otomatis setiap case (wajib lulus):**
1. Menerapkan setup lalu algoritma mengembalikan cube ke solved (memperhitungkan AUF).
2. OLL: setelah setup, F2L solved dan pola orientasi top layer sesuai definisi case; semua 57 pola unik (tidak ada dua case dengan state sama).
3. PLL: setelah setup, F2L dan OLL solved; 21 permutasi unik (memperhitungkan AUF).
4. F2L: setelah setup, Cross solved, slot target berisi pasangan pada posisi sesuai definisi, slot lain solved.
5. State lulus State Validator (permutasi dan orientasi legal, parity benar).

Ini dijalankan sebagai test otomatis untuk seluruh database dan harus hijau sebelum database dipakai.

## 8. Statistik
Per case: attempt, success, best, average, last. Global: total attempt, riwayat sesi, case terbaik, case yang perlu latihan (dihitung dari rata-rata waktu dan tingkat gagal). Filter F2L/OLL/PLL. Average: rata-rata biasa dari seluruh solve valid, DNF dihitung terpisah (bukan dimasukkan ke rata-rata).

## 9. Algorithm Library
Daftar case, algoritma utama dan alternatif, notasi, playback (play/pause/reset), kecepatan animasi, highlight gerakan aktif.

## 10. Keybind
Default = preset csTimer yang diverifikasi dari source. Preset kompatibilitas, custom keybind (P1), pengujian konflik antara timer, inspection, dan gerakan cube. Mapping tidak boleh ditulis dari asumsi.

## 11. Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | React + TypeScript (strict), Vite, Tailwind |
| Cube | cubing.js (lewat adapter) |
| Penyimpanan | IndexedDB (Dexie) |
| Offline | PWA (vite-plugin-pwa) |
| Test | Vitest (unit), Playwright (E2E) |

## 12. Arsitektur
```
src/
  domain/        cube state, algorithm, training-case, generator, validator (tanpa React, tanpa API browser)
  engine/        cubing.js adapter (satu-satunya yang import cubing.js untuk logika)
  application/   training controller, session manager, timer controller, stats manager
  infra/         indexeddb repository, settings repository, import/export JSON
  ui/            dashboard, training, virtual-cube, timer, stats, settings
  data/          oll.json, pll.json, f2l.json (+ schema)
docs/            keybinds.md, decisions.md, f2l-classification.md
```
Aturan dependensi: `ui → application → domain ← engine/infra`. `domain` tidak mengimpor `ui` atau `infra`.

## 13. Model Data
- **TrainingCase**: id, category, name, algorithm, inverseAlgorithm, alternatives[], source, difficulty, tags, metadata
- **TrainingSession**: id, mode, caseId, inspectionTime, recognitionTime?, solveTime, result, timestamp
- **UserStats**: caseId, attemptCount, successCount, bestTime, averageTime, lastTime
- **Settings**: theme, animationSpeed, inspection (enabled, duration, penalties), keybindPreset, customKeybinds, defaultTrainingMode, aufStrict

## 14. Non-Functional
Offline-first, input responsif, animasi tidak menghambat timer, state konsisten, data lokal di browser, arsitektur modular. Target awal: input-to-render < 50 ms pada hardware menengah.

## 15. Lingkup MVP

**Must:** Virtual Cube, Cube Engine, F2L 41 case, 57 OLL, 21 PLL, Case Generator + verifikasi otomatis, Timer + Inspection, Focus Mode, statistik lokal, keybind csTimer.
**Should:** Recognition Practice, Algorithm Library + Playback, History, Custom Keybind, Import/Export.
**Could:** Smart/adaptive training, advanced analytics.
**Won't:** multiplayer, cloud, leaderboard, Bluetooth cube.

## 16. Acceptance Criteria MVP
- Semua gerakan dasar berjalan benar; algoritma + inverse konsisten.
- 41 F2L, 57 OLL, 21 PLL lulus verifikasi otomatis (§7).
- Inspection berjalan; solve timer mulai tepat di Turn 1; Focus Mode aktif di Turn 1; timer berhenti saat solved.
- Rotasi seluruh cube tidak merusak deteksi solved.
- Statistik bertahan setelah aplikasi ditutup dan dibuka.
- Seluruh fitur MVP berjalan tanpa internet.
- `npm run build` menghasilkan situs statis yang berjalan di Chrome dan Edge terbaru, dan tetap berfungsi tanpa internet setelah dimuat sekali (PWA).

## 17. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Orientasi/permutasi salah | Unit test seluruh gerakan, State Validator |
| Case salah label | Verifikasi otomatis §7 untuk semua case |
| Tampilan tidak sinkron | Satu sumber state, alur satu arah |
| Timer start terlalu cepat/lambat | Test timer terpisah, `performance.now()` |
| Konflik keybind | Mapping dari source csTimer, test konflik |
| API cubing.js berubah / tidak cukup | Adapter + **Milestone 0 spike** |
| AI "mengarang" algoritma atau mapping | Sumber wajib dicatat, verifikasi otomatis |

## 18. Pertanyaan Terbuka (isi setelah spike)
- Cara terbaik membaca state dari TwistyPlayer saat pengguna bergerak (event vs menjalankan engine sendiri lalu mendorong ke player).
- Apakah rotasi x/y/z memulai timer di csTimer.
- Sumber algoritma F2L yang dipilih dan klasifikasi 41 case yang dipakai.
