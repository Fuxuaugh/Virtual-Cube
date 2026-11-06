# Keybind csTimer (Virtual Cube Key Map)

**Sumber:** screenshot halaman "Virtual Cube Key Map" di cstimer.net, dilihat pada 2026-11-06 (layout QWERTY).
**Status:** mapping tombol terverifikasi dari UI csTimer. Belum diverifikasi dari source code (GitHub tidak bisa diakses otomatis).

## Mapping (QWERTY)

| Baris  | Tombol → Gerakan                                                       |
| ------ | ---------------------------------------------------------------------- |
| Angka  | 1 S' · 2 E · 3 `<` · 4 `>` · 5 M · 6 M · 7 `<` · 8 `>` · 9 E' · 0 S    |
| Atas   | Q z' · W B · E L' · R Lw' · T x · Y x · U Rw · I R · O B' · P z        |
| Tengah | A y' · S D · D L · F U' · G F' · H F · J U · K R' · L D' · ; y         |
| Bawah  | Z Dw · X M' · C Uw' · V Lw · B x' · N x' · M Rw' · , Uw · . M' · / Dw' |

## Gerakan inti (fingertrick)

U=J, U'=F · R=I, R'=K · F=H, F'=G · D=S, D'=L · L=D, L'=E · B=W, B'=O

## Yang belum jelas (jangan diimplementasikan sebelum dicek)

- Tombol 3, 4, 7, 8 menampilkan simbol `<` dan `>`. Maknanya belum diketahui. Tes di csTimer apa yang terjadi.
- Tombol 5 dan 6 sama-sama tertulis `M`. Mungkin salah baca. Cek ulang.
- Apakah rotasi (x, y, z) memulai timer? Tes: Space, lalu tekan x atau y sebagai gerakan pertama.
- Apakah ada pilihan layout lain yang perlu didukung? Lihat dropdown "select layout".

## Keputusan implementasi

- Pakai `event.code` (posisi tombol fisik, mis. `KeyJ`), bukan `event.key`, agar tidak bergantung layout keyboard.

## Tombol tanpa fungsi

- 3, 4, 7, 8 (tertulis `<` / `>` di peta): dites langsung di csTimer, tidak menghasilkan gerakan. Tidak diimplementasikan.

## Masih perlu dicek

- 5 dan 6 sama-sama tertulis `M`. Tes tombol 5 dan 6, apakah keduanya menggerakkan M?
- Apakah rotasi (x, y, z) memulai timer?
- Apakah ada layout lain di dropdown "select layout" yang perlu didukung?

## Perilaku timer (dites langsung di csTimer, 2026-11-06)

- Space lalu rotasi x (tombol T): timer TIDAK mulai.
- Space lalu gerakan layer U (tombol J): timer mulai.
- Kesimpulan: rotasi seluruh cube tidak memulai timer; gerakan layer memulai timer. Rotasi y dan z belum dites, diasumsikan sama dengan x.
- Implikasi: pengguna boleh memutar cube ke orientasi yang diinginkan sebelum memulai solve, tanpa timer jalan.
