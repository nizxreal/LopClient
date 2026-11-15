<div align="center">

# 🤖 LopClient
**WhatsApp Bot Engine & Web Dashboard Ringan untuk Termux**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Termux%20%7C%20Linux-000000?style=flat-square&logo=linux&logoColor=white)](https://termux.dev/)
[![Core](https://img.shields.io/badge/Engine-Baileys%20%2B%20V8%20Bytecode-0088CC?style=flat-square)](#)

*Pasang sekali jalan, kontrol penuh lewat browser HP, dan tautkan WhatsApp dengan Pairing Code tanpa scan QR.*

</div>

---

## ⚡ Kenapa LopClient?

- 🌐 **Web Dashboard (`localhost:3000/dashboard`)** — Tautkan WA via **Pairing Code 8 digit**, ganti mode **Public / Self**, ubah prefix, dan pantau RAM Termux secara *real-time*.
- 🛠️ **Custom Command Builder** — Buat perintah sendiri (`.listharga`, `.payment`, `.rules`, dll.) langsung dari browser tanpa edit kode.
- 🛡️ **Moderasi Grup & Hiburan Lengkap** — *Welcome/Leave*, *Anti-Link*, *Anti-Toxic*, `.hidetag`, `.kick`, stiker otomatis, *brat*, downloader, AI, hingga mini-game & leaderboard (`.top`, `.rank`).
- 📊 **Sistem Dual-Menu & Monitor Server** — `.menu` untuk daftar fitur interaktif, `/menu` untuk status lisensi *engine*, dan `.ping` untuk cek latensi, suhu/CPU, serta RAM perangkat.
- 🔒 **Core Terproteksi & Auto-Recovery** — Modul inti dikompilasi ke **V8 Bytecode (`.jsc`)** dengan pembersihan sesi `401` otomatis agar koneksi tetap stabil.

---

## 📲 Instalasi 1 Perintah (Termux)

Tempel perintah tunggal ini di **Termux** lalu tekan **Enter** (otomatis memasang Node.js, Git, FFmpeg, dependensi, dan pintasan global):

```bash
pkg update -y && pkg install -y nodejs git ffmpeg && rm -rf ~/LopClient && git clone https://github.com/nizxreal/LopClient.git ~/LopClient && bash ~/LopClient/install.sh
```

### ▶️ Menjalankan Bot
Cukup **1x instalasi** di atas. Selanjutnya, dari folder mana saja kamu cukup ketik:

```bash
LopClient
```

---

## 🚀 Cara Menghubungkan WhatsApp

1. Ketik `LopClient` di Termux hingga server aktif di `http://localhost:3000`.
2. Buka **Chrome** di HP lalu akses **`http://localhost:3000/dashboard`**.
3. Masukkan nomor WA bot dengan kode negara tanpa `+` (contoh: `6281234567890`) lalu klik **Hubungkan**.
4. Salin **kode pairing 8 digit** yang muncul, lalu masukkan di **WhatsApp > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan nomor telepon saja**.

---

## 📋 Perintah Utama

| Perintah | Keterangan |
| :--- | :--- |
| `.menu` | Menampilkan daftar kategori fitur interaktif |
| `/menu` | Mengecek versi *engine* dan status lisensi bot |
| `.ping` | Cek latensi, spesifikasi perangkat, CPU, dan RAM Termux |
| `/cekid` | Cek ID pengguna, grup, atau saluran (*newsletter*) |
| `/info` | Detail paket lisensi dan kontak pengembang |

---

## 🔄 Update & Reset Sesi

- **Update ke versi terbaru** (sesi & pengaturan tetap aman):
  ```bash
  cd ~/LopClient && git pull origin main && npm install
  ```
- **Reset sesi WhatsApp** (ganti nomor bot):
  ```bash
  rm -rf ~/LopClient/data/auth_info
  ```
