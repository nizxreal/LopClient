#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const LOCK_FILE = path.join(DATA_DIR, '.sys_lock');

console.log('\n\x1b[38;5;135m\x1b[1m⚡ LOPCLIENT AUTO-UPDATER\x1b[0m');
console.log('\x1b[2mMemperbarui engine ke versi terbaru tanpa menghapus data WA & config...\x1b[0m\n');

try {
  // 1. Matikan server yang sedang berjalan
  try { execSync('pkill -9 -f "server/server.js" 2>/dev/null || true'); } catch {}

  // 2. Pastikan folder data/ terlindungi lalu tarik versi terbaru dari GitHub
  execSync('git fetch --all', { cwd: ROOT_DIR, stdio: 'inherit' });
  execSync('git reset --hard origin/main', { cwd: ROOT_DIR, stdio: 'inherit' });

  // 3. Install dependensi jika ada package baru
  console.log('\n\x1b[36m[•] Memeriksa dependensi Node.js...\x1b[0m');
  execSync('npm install --no-audit --no-fund', { cwd: ROOT_DIR, stdio: 'inherit' });

  // 4. Hapus segel lock lama & perbarui shortcut global LopClient & LopClientUpdate
  if (fs.existsSync(LOCK_FILE)) {
    try { fs.unlinkSync(LOCK_FILE); } catch {}
  }

  const binDir = process.env.PREFIX ? path.join(process.env.PREFIX, 'bin') : null;
  if (binDir && fs.existsSync(binDir)) {
    fs.writeFileSync(
      path.join(binDir, 'LopClient'),
      '#!/data/data/com.termux/files/usr/bin/sh\nexec node "$HOME/LopClient/cli.js" "$@"\n'
    );
    fs.writeFileSync(
      path.join(binDir, 'LopClientUpdate'),
      '#!/data/data/com.termux/files/usr/bin/sh\nexec node "$HOME/LopClient/updater.js" "$@"\n'
    );
    execSync(`chmod +x "${path.join(binDir, 'LopClient')}" "${path.join(binDir, 'LopClientUpdate')}"`);
  }

  console.log('\n\x1b[92m\x1b[1m✅ Update selesai! Menjalankan ulang LopClient...\x1b[0m\n');
  const child = spawn(process.execPath, [path.join(ROOT_DIR, 'cli.js')], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  child.on('exit', (code) => process.exit(code || 0));
} catch (err) {
  console.error('\n\x1b[91m❌ Gagal melakukan update:\x1b[0m', err.message);
  process.exit(1);
}
