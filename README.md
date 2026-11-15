# ⚡ LopClient — WhatsApp Bot & Local Control Panel (Termux)

LopClient adalah engine WhatsApp Bot modern berbasis Node.js & Baileys (dikompilasi ke **V8 Bytecode `.jsc`**) yang dilengkapi **Web Dashboard Lokal**, **Menu Interaktif**, **AI Chat Terkurasi**, **Downloader All-in-One**, **Sticker Maker**, **Moderasi Grup Otomatis**, **Mini-Game & Leaderboard**, **Daily Utilities**, serta **Custom Command Builder**.

## ✨ Fitur Utama
- **Web Dashboard & Control Panel:** Kelola mode bot (`Public`/`Self`), ganti prefix, pairing code 8 digit tanpa scan QR, dan pantau RAM/Uptime dari browser HP (`http://localhost:3000`).
- **Menu Interaktif & Status Bot:** Tampilan `.menu` interaktif yang responsif, pengecekan status cepat `.ping`, serta perintah sistem `/menu`, `/cekid`, dan `/info`.
- **AI Chat & Multi-API Suite:** Integrasi berbagai model AI (ChatGPT, Gemini, Claude, DeepSeek, Perplexity), generator gambar, serta puluhan utilitas API siap pakai.
- **Social Media Downloader:** Unduh video & audio dari TikTok, Instagram, YouTube, Facebook, Spotify, dan platform lainnya.
- **Instant Sticker Maker:** Ubah foto/video menjadi stiker WhatsApp (`.s`), stiker ke gambar (`.toimg`), serta stiker teks `.brat` & `.qc`.
- **Moderasi Grup & Custom Welcome:** Pesan *Welcome* & *Leave* kustom, *Anti-Link*, *Anti-Toxic*, `.hidetag`, `.kick`, `.promote`, dan `.demote`.
- **Mini-Game & Leaderboard:** Permainan Susun Kata, tebak-tebakan, serta fun commands interaktif dengan sistem poin & peringkat otomatis (`.top`, `.rank`).
- **Daily Utilities & Custom Command:** Alat utilitas harian otomatis serta pembuat perintah kustom (seperti `.listharga`, `.payment`, `.rules`) langsung dari Web Dashboard.

## 📲 Instalasi Sekali Jalan di Termux (1 Perintah)
Buka aplikasi **Termux**, salin dan tempel perintah tunggal di bawah ini lalu tekan **Enter** (otomatis memasang Node.js, Git, FFmpeg, dependensi, dan pintasan global):
```bash
pkg update -y && pkg install -y curl && curl -fsSL https://raw.githubusercontent.com/nizxreal/LopClient/main/install.sh | sh

