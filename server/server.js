(() => {
  const _fs = require("fs");
  const _path = require("path");
  const pidFile = _path.join(__dirname, "../data/server.pid");
  try {
    if (_fs.existsSync(pidFile)) {
      const oldPid = parseInt(_fs.readFileSync(pidFile, "utf8").trim(), 10);
      if (oldPid && oldPid !== process.pid) {
        try { process.kill(oldPid, "SIGKILL"); } catch {}
      }
    }
    _fs.mkdirSync(_path.dirname(pidFile), { recursive: true });
    _fs.writeFileSync(pidFile, String(process.pid));
  } catch {}
})();

require('bytenode');
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_CACHE_PATH = path.join(__dirname, '../data/.session_token');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'ganti-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 },
}));

const { readConfig, writeConfig } = require('../core/config.jsc');
const { verifyAndBindDevice } = require('../core/auth-token.jsc');

function hashPin(pin) {
  return crypto.createHash('sha256').update(`LOPCLIENT_PIN:${String(pin).trim()}`).digest('hex');
}

// Cek apakah user baru pertama kali buka (belum buat PIN)
app.get('/api/pin/status', (req, res) => {
  const cfg = readConfig();
  res.json({ hasPin: Boolean(cfg.pinHash) });
});

// Buat PIN baru (khusus pengguna baru) atau Login dengan PIN
app.post('/api/login', (req, res) => {
  const pin = String(req.body?.pin || '').trim();
  if (!/^\d{4,8}$/.test(pin)) {
    return res.status(400).json({ success: false, error: 'PIN harus berupa 4 sampai 8 digit angka' });
  }

  const cfg = readConfig();
  if (!cfg.pinHash) {
    writeConfig({ pinHash: hashPin(pin) });
    req.session.authenticated = true;
    return res.json({ success: true, created: true });
  }

  if (hashPin(pin) === cfg.pinHash) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, error: 'PIN salah, silakan coba lagi' });
});

// Aktivasi atau perpanjang Token VIP dari dalam dashboard
app.post('/api/activate-vip', async (req, res) => {
  const cfg = readConfig();
  if (!cfg.pinHash || req.session?.authenticated !== true) {
    return res.status(401).json({ success: false, error: 'Sesi tidak valid' });
  }

  const token = String(req.body?.token || '').trim();
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token VIP wajib diisi' });
  }

  const result = await verifyAndBindDevice(token);
  if (result.valid) {
    try {
      fs.mkdirSync(path.dirname(TOKEN_CACHE_PATH), { recursive: true });
      fs.writeFileSync(TOKEN_CACHE_PATH, token);
    } catch {}
    return res.json({ success: true, licenseId: result.licenseId });
  }

  return res.status(400).json({ success: false, error: result.reason || 'Token VIP tidak valid' });
});

// Logout sesi dashboard (TIDAK menghapus status VIP maupun PIN)
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.use(require('./middleware/auth'));
app.use(require('./routes/pairing.jsc'));
app.use(require('./routes/dashboard.jsc'));

const { startBaileysConnection } = require('../core/baileys-handler.jsc');
const authCredsPath = path.join(__dirname, '../data/auth/creds.json');
if (fs.existsSync(authCredsPath)) {
  console.log('[server] Sesi WA lama ditemukan, mencoba resume otomatis...');
  startBaileysConnection(null).catch(e => console.error('[server] Gagal resume sesi:', e.message));
}

app.use(require('./routes/plugins'));

app.get('/', (req, res) => {
  const pubDir = path.join(__dirname, '../public');
  const target = ['index.html', 'dashboard.html', 'pairing.html'].find(f => fs.existsSync(path.join(pubDir, f)));
  if (target) return res.sendFile(path.join(pubDir, target));
  res.status(404).send('Halaman dashboard tidak ditemukan di folder public/');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan, buka http://localhost:${PORT} di browser HP`);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
