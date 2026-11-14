# LopClient - WhatsApp Bot & Local Control Panel (Termux)

LopClient adalah engine WhatsApp Bot modern berbasis Node.js & Baileys yang dilengkapi Web Dashboard Lokal, Terminal CLI Interaktif, AI Chat Terkurasi, Downloader All-in-One, Sticker Maker, Moderasi Grup Otomatis, Mini-Game Leaderboard, serta Custom Command Builder.

## Fitur Utama
- **Web Dashboard & CLI Panel:** Kelola mode bot (Public/Self), ganti prefix, pairing code tanpa scan QR, dan pantau RAM/Uptime dari browser HP (http://localhost:3000).
- **AI Chat & Tools:** Integrasi berbagai model AI (ChatGPT, Gemini, Claude, DeepSeek, Perplexity) serta pembuat gambar & alat utilitas.
- **Social Media Downloader:** Unduh video & audio dari TikTok, Instagram, YouTube, Facebook, Spotify, dan lainnya.
- **Instant Sticker Maker:** Ubah foto/video menjadi stiker WhatsApp (.s), stiker ke gambar (.toimg), serta stiker teks .brat & .qc.
- **Moderasi Grup & Custom Welcome:** Pesan Welcome & Leave kustom, Anti-Link, Anti-Toxic, .hidetag, .kick, .promote, dan .demote.
- **Mini-Game & Leaderboard:** Tebak-tebakan interaktif dengan sistem poin & peringkat otomatis (.top, .rank).
- **Custom Command Builder:** Buat perintah kustom buatan sendiri (seperti .listharga, .payment, .rules) langsung dari Web Dashboard.

## Cara Instalasi di Termux (Android)
1. Update paket Termux & pasang dependensi:
```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git ffmpeg -y
```
2. Clone repositori ini & masuk ke folder proyek:
```bash
git clone [https://github.com/nizxreal/LopClient.git](https://github.com/nizxreal/LopClient.git)
cd LopClient
```
3. Install seluruh package Node.js:
```bash
npm install
```
4. Pasang perintah pintasan global agar bisa dipanggil dari folder mana saja tanpa perlu `cd`:
```bash
printf "#!/data/data/com.termux/files/usr/bin/sh\nexec node \"\$HOME/LopClient/cli.js\" \"\$@\"\n" > "$PREFIX/bin/LopClient" && chmod +x "$PREFIX/bin/LopClient"
```
5. Jalankan LopClient dari folder mana saja cukup dengan mengetik:
```bash
LopClient
```

## Cara Menghubungkan WhatsApp
1. Ketik `LopClient` di Termux lalu buka browser Chrome ke `http://localhost:3000`.
2. Buat PIN keamanan login dashboard pada halaman awal.
3. Masukkan nomor WhatsApp bot (contoh: `628123456789`) lalu klik **Dapatkan Pairing Code**.
4. Buka WhatsApp di HP -> Perangkat Tertaut -> Tautkan dengan nomor telepon saja, lalu masukkan kode pairing.
5. Aktifkan Acquire wakelock pada notifikasi Termux agar bot berjalan stabil 24/7.

## Cara Update ke Versi Terbaru
Data sesi WhatsApp, token lisensi, dan pengaturan custom command tersimpan aman di folder lokal `data/` dan tidak akan tertimpa saat update.
Cukup ketik satu perintah dari folder mana saja di Termux:
```bash
LopClientUpdate
```
