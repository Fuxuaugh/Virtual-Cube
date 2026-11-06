# Cube Trainer — Aturan untuk AI Agent

Aplikasi web latihan CFOP (F2L/OLL/PLL). Baca `PRD.md` dan bagian milestone yang sedang dikerjakan sebelum menulis kode.

## Stack

React + TypeScript (strict) · Vite · Tailwind · cubing.js · IndexedDB (Dexie) · PWA · Vitest · Playwright

## Perintah

- `npm run dev` — jalankan aplikasi di browser
- `npm test` — unit test (Vitest)
- `npm run lint` — lint + format check
- `npm run build` — build produksi (situs statis)

Platform target: web, browser desktop modern. Tanpa backend.

## Aturan Wajib

1. **Satu sumber state.** State cube hanya hidup di Cube Engine. TwistyPlayer hanya menampilkan. Alur: input → engine → tampilan.
2. **Hanya `src/engine/` yang boleh mengimpor cubing.js untuk logika.** Kode lain memakai adapter.
3. **`src/domain/` murni**: tanpa import React atau API browser (IndexedDB, DOM).
4. **Jangan mengarang data.** Algoritma OLL/PLL/F2L harus dari sumber yang dicatat di field `source`. Mapping keybind harus dari `docs/keybinds.md` (diekstrak dari source csTimer). Jika data tidak ada, berhenti dan tanyakan, jangan menebak.
5. **Timer** memakai `performance.now()` dan `requestAnimationFrame`. Tidak boleh `setInterval` atau waktu dari state React.
6. **Solved detection tidak bergantung rotasi cube** (x/y/z).
7. **Test dulu untuk logika inti** (engine, generator, timer). Jangan lanjut ke tugas berikutnya jika test merah.
8. **Satu sesi, satu sub-milestone.** Jangan mengerjakan milestone lain atau menambah fitur di luar PRD.
9. **Jangan mengubah test agar lulus.** Jika test gagal, perbaiki kode atau data; jika test yang salah, jelaskan alasannya.
10. Commit kecil dan sering dengan pesan jelas. Ubah `PRD.md`/`docs/decisions.md` bila keputusan berubah.

## Definition of Done (per task)

- Kode + test ditulis, `npm test` dan `npm run lint` lulus.
- Tidak ada `any` baru tanpa alasan, tidak ada `console.log` sisa.
- Checklist milestone diperbarui.
- Ringkasan singkat: apa yang berubah, apa yang belum.

## Struktur

```
src/domain  src/engine  src/application  src/infra  src/ui  src/data
docs/keybinds.md  docs/decisions.md  docs/f2l-classification.md
```
