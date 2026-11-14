# ⚡ LopClient — WhatsApp Bot & Local Control Panel (Termux)

LopClient adalah engine WhatsApp Bot modern berbasis Node.js & Baileys yang dilengkapi **Web Dashboard Lokal**, **Terminal CLI Interaktif**, **AI Chat Terkurasi**, **Downloader All-in-One**, **Sticker Maker**, **Moderasi Grup Otomatis**, **Mini-Game Leaderboard**, serta **Custom Command Builder**.

## ✨ Fitur Utama
- **Web Dashboard & CLI Panel:** Kelola mode bot (`Public`/`Self`), ganti prefix, pairing code tanpa scan QR, dan pantau RAM/Uptime dari browser HP (`http://localhost:3000`).
- **AI Chat & Tools:** Integrasi berbagai model AI (ChatGPT, Gemini, Claude, DeepSeek, Perplexity) serta pembuat gambar & alat utilitas.
- **Social Media Downloader:** Unduh video & audio dari TikTok, Instagram, YouTube, Facebook, Spotify, dan lainnya.
- **Instant Sticker Maker:** Ubah foto/video menjadi stiker WhatsApp (`.s`), stiker ke gambar (`.toimg`), serta stiker teks `.brat` & `.qc`.
- **Moderasi Grup & Custom Welcome:** Pesan *Welcome* & *Leave* kustom, *Anti-Link*, *Anti-Toxic*, `.hidetag`, `.kick`, `.promote`, dan `.demote`.
- **Mini-Game & Leaderboard:** Tebak-tebakan interaktif dengan sistem poin & peringkat otomatis (`.top`, `.rank`).
- **Custom Command Builder:** Buat perintah kustom buatan sendiri (seperti `.listharga`, `.payment`, `.rules`) langsung dari Web Dashboard.

## 📲 Instalasi Sekali Jalan di Termux (1 Perintah)
Buka aplikasi **Termux**, salin dan tempel perintah tunggal di bawah ini lalu tekan **Enter** (otomatis memasang Node.js, Git, FFmpeg, dependensi, dan pintasan global):
```bash
pkg update -y && pkg install -y curl && curl -fsSL [https://raw.githubusercontent.com/nizxreal/LopClient/main/install.sh](https://raw.githubusercontent.com/nizxreal/LopClient/main/install.sh) | sh
```

Setelah instalasi selesai, jalankan LopClient dari folder mana saja cukup dengan mengetik:
```bash
LopClient
```

## 🚀 Cara Menghubungkan WhatsApp
1. Ketik `LopClient` di Termux lalu buka browser Chrome ke `http://localhost:3000`.
2. Buat PIN keamanan login dashboard pada halaman awal.
3. Masukkan nomor WhatsApp bot (contoh: `628123456789`) lalu klik **Dapatkan Pairing Code**.
4. Buka WhatsApp di HP $\rightarrow$ **Perangkat Tertaut** $\rightarrow$ **Tautkan dengan nomor telepon saja**, lalu masukkan kode pairing.
5. Aktifkan **Acquire wakelock** pada notifikasi Termux agar bot berjalan stabil 24/7.

## 🔄 Cara Update ke Versi Terbaru
LopClient otomatis mengecek pembaruan saat dijalankan, atau kamu bisa memperbarui manual kapan saja dari folder mana saja dengan perintah:
```bash
LopClientUpdate
```
