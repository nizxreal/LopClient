# 🤖 LopClient

## 📋 Panduan Instalasi (Step-by-Step)

### Step 1 — Unduh Termux (F-Droid)
Unduh dan pasang aplikasi **Termux** versi resmi melalui F-Droid *(hindari versi Google Play Store karena sudah usang)*:
* 🔗 **Link Unduhan:** [https://f-droid.org/en/packages/com.termux/](https://f-droid.org/en/packages/com.termux/)

---

### Step 2 — Instalasi Otomatis (1 Perintah)
Buka aplikasi Termux, tempel perintah berikut, lalu tekan **Enter** untuk memasang Node.js, Git, FFmpeg, dependensi bot, dan pintasan global secara otomatis:

```bash
pkg update -y && pkg install -y nodejs git ffmpeg && rm -rf ~/LopClient && git clone https://github.com/nizxreal/LopClient.git ~/LopClient && bash ~/LopClient/install.sh
```

> 💡 **Catatan:** Jika muncul error `Failed to fetch` atau `Network is unreachable` saat proses `pkg install`, jalankan perintah `termux-change-repo` terlebih dahulu untuk mengganti server mirror Termux.

---

### Step 3 — Menjalankan Bot
Instalasi di atas cukup dilakukan **1 kali**. Selanjutnya, dari folder mana saja di Termux kamu cukup ketik:

```bash
LopClient
```

---

### Step 4 — Menghubungkan WhatsApp
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

---

<!-- AUTO_CHANGELOG_START -->
## 📋 Riwayat Pembaruan Terbaru (v1.0.30)
> Diperbarui otomatis setiap 10 perubahan • Total perubahan: **30x** (2026-11-18)

- feat(rvo): tambahkan paksa media-retry request sebelum fallback blokir WA (2026-11-18)
- fix(rvo): tangkap messages.update & validasi directPath view-once (2026-11-18)
- feat(rvo): simpan cache mediaKey pesan masuk di baileys-handler agar view-once selalu terbuka (2026-11-18)
- fix(rvo,iqc): perbaiki ekstraksi view-once Baileys v7 & hapus fallback SVG polos pada iqc (2026-11-18)
- feat(plugins): upgrade rvo & tambah fitur populer bratvid, smeme, attp/ttp & hd (2026-11-18)
- feat(maker): rotasi lintas penyedia API untuk qc, fakecall & fakelobby (2026-11-18)
- feat(maker): multi-API endpoint & font Roboto TTF untuk qc, tqc, iqc, wq, fakecall & fakelobby (2026-11-18)
- fix(maker): render semua SVG plugin maker via renderSvgToPng (@resvg/resvg-js) (2026-11-18)
- fix(maker): gunakan @resvg/resvg-js untuk render SVG ke PNG pada qc, tqc, iqc, wq, fakecall & fakelobby (2026-11-18)
- fix(maker): gunakan @resvg/resvg-js untuk render SVG ke PNG pada qc, tqc, iqc, wq, fakecall & fakelobby (2026-11-18)
<!-- AUTO_CHANGELOG_END -->
