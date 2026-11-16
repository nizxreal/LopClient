#!/usr/bin/env node
require('bytenode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { spawn, exec, execSync } = require('child_process');

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STATE_FILE = path.join(DATA_DIR, '.bot_state.json');
const TOKEN_FILE = path.join(DATA_DIR, '.session_token');
const LOG_FILE = path.join(DATA_DIR, 'bot.log');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server', 'server.js');
const UPDATER_ENTRY = path.join(ROOT_DIR, 'updater.js');
const URL_DASHBOARD = 'http://localhost:3000';

fs.mkdirSync(DATA_DIR, { recursive: true });

const APP_VERSION = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    return pkg.version ? `v${pkg.version.replace(/^v/, '')}` : 'v1.0.0';
  } catch {
    return 'v1.0.0';
  }
})();

const TERM = {
  enterAlt: '\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H',
  exitAlt: '\x1b[?25h\x1b[?1049l',
  clearHome: '\x1b[2J\x1b[H',
  repaintHome: '\x1b[H\x1b[J',
  showCursor: '\x1b[?25h',
  hideCursor: '\x1b[?25l'
};

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[38;5;177m',
  teal: '\x1b[38;5;135m',
  purpleDeep: '\x1b[38;5;93m',
  lavender: '\x1b[38;5;225m',
  blue: '\x1b[38;5;141m',
  green: '\x1b[92m',
  yellow: '\x1b[38;5;219m',
  red: '\x1b[91m',
  white: '\x1b[97m',
  border: '\x1b[38;5;60m',
  selBg: '\x1b[48;5;93m\x1b[97m\x1b[1m'
};

function gradientText(text) {
  const stops = [
    [255, 255, 255],
    [233, 213, 255],
    [192, 132, 252],
    [168, 85, 247],
    [124, 58, 237],
  ];
  const chars = [...text];
  const len = Math.max(1, chars.length - 1);
  return chars.map((ch, i) => {
    if (ch === ' ') return ch;
    const pos = (i / len) * (stops.length - 1);
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const c1 = stops[idx];
    const c2 = stops[Math.min(stops.length - 1, idx + 1)];
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
    return `\x1b[1m\x1b[38;2;${r};${g};${b}m${ch}`;
  }).join('') + C.reset;
}

const BANNER_LINE_1 = gradientText('╦  ╔═╗╔═╗  ╔═╗╦  ╦╔═╗╔╗╔╔╦╗');
const BANNER_LINE_2 = gradientText('║  ║ ║╠═╝  ║  ║  ║║╣ ║║║ ║ ');
const BANNER_LINE_3 = gradientText('╩═╝╚═╝╩    ╚═╝╩═╝╩╚═╝╝╚╝ ╩ ');

let statusNotice = '';
let noticeTimer = null;

function setNotice(msg) {
  statusNotice = msg;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { statusNotice = ''; }, 4500);
}

function stripAnsi(str) {
  return String(str || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function visualWidth(str) {
  const clean = stripAnsi(str);
  let w = 0;
  for (const ch of clean) {
    const cp = ch.codePointAt(0);
    if (
      cp === 0x26A1 || // ⚡
      (cp >= 0x1F300 && cp <= 0x1FAFF) ||
      (cp >= 0x2600 && cp <= 0x27BF && cp !== 0x25CF && cp !== 0x25CB && cp !== 0x25B8 && cp !== 0x25B2 && cp !== 0x25BC && cp !== 0x2713 && cp !== 0x2714 && cp !== 0x2716)
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

function getScreenSize() {
  return {
    cols: process.stdout.columns || 48,
    rows: process.stdout.rows || 32
  };
}

function padCenter(str, width) {
  const len = visualWidth(str);
  if (len >= width) return str;
  const left = Math.floor((width - len) / 2);
  const right = width - len - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

function padRight(str, width) {
  const len = visualWidth(str);
  if (len >= width) return str;
  return str + ' '.repeat(width - len);
}

function buildBoxLines(lines, boxWidth = 44, borderColor = C.border) {
  const { cols } = getScreenSize();
  const margin = ' '.repeat(Math.max(0, Math.floor((cols - boxWidth) / 2)));
  const inner = boxWidth - 2;
  const out = [];

  out.push(`${margin}${borderColor}╭${'─'.repeat(inner)}╮${C.reset}`);
  for (const line of lines) {
    out.push(`${margin}${borderColor}│${C.reset}${padRight(line, inner)}${borderColor}│${C.reset}`);
  }
  out.push(`${margin}${borderColor}╰${'─'.repeat(inner)}╯${C.reset}`);
  return out;
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return null; }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isPidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function startBackgroundServer() {
  const current = readState();
  if (current && isPidAlive(current.pid)) return current;

  const out = fs.openSync(LOG_FILE, 'a');
  const err = fs.openSync(LOG_FILE, 'a');

  const child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: ROOT_DIR,
    detached: true,
    stdio: ['ignore', out, err]
  });

  child.unref();
  const state = { pid: child.pid, startedAt: Date.now() };
  writeState(state);
  return state;
}

function stopBackgroundServer() {
  const current = readState();
  if (current && current.pid) {
    try { process.kill(current.pid, 'SIGKILL'); } catch {}
  }
  try { execSync('pkill -9 -f "server/server.js" 2>/dev/null || true'); } catch {}
  if (fs.existsSync(STATE_FILE)) {
    try { fs.unlinkSync(STATE_FILE); } catch {}
  }
}

function formatRuntime(startedAt) {
  if (!startedAt) return '-';
  const diff = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}j ${m}m ${s}d`;
}

function getProcessRamFast(pid) {
  if (!pid) return '-';
  try {
    const statusText = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = statusText.match(/VmRSS:\s+(\d+)\s+kB/i);
    if (match) {
      return `${(Number(match[1]) / 1024).toFixed(1)} MB`;
    }
  } catch {}
  return '-';
}

function getPairedPhoneNumber() {
  const credsCandidates = [
    path.join(DATA_DIR, 'auth', 'creds.json'),
    path.resolve(ROOT_DIR, '../data/auth/creds.json')
  ];
  for (const credsPath of credsCandidates) {
    if (fs.existsSync(credsPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        const rawId = creds?.me?.id || '';
        const phone = rawId.split('@')[0].split(':')[0];
        if (phone) return phone;
      } catch {}
    }
  }
  return null;
}

function getWaAccountStatus() {
  const phone = getPairedPhoneNumber();
  if (phone) {
    return `${C.green}● Terhubung${C.reset} ${C.dim}(+${phone})${C.reset}`;
  }
  return `${C.yellow}○ Belum Pairing${C.reset}`;
}

function getTokenInfo() {
  if (!fs.existsSync(TOKEN_FILE)) {
    return `${C.yellow}Belum Login${C.reset}`;
  }
  const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  const parts = token.split('.');
  if (parts.length !== 3) return `${C.red}Token Invalid${C.reset}`;

  const [licenseId, expStr] = parts;
  const expUnix = Number(expStr);
  const nowUnix = Math.floor(Date.now() / 1000);
  const sisaDetik = expUnix - nowUnix;

  if (sisaDetik <= 0) return `${C.red}EXPIRED${C.reset}`;

  const hari = Math.floor(sisaDetik / 86400);
  const jam = Math.floor((sisaDetik % 86400) / 3600);
  return `${C.green}${hari}h ${jam}j${C.reset} ${C.dim}(${licenseId})${C.reset}`;
}

let cachedSnapshot = null;

function refreshSystemSnapshot() {
  const state = readState();
  const alive = Boolean(state && isPidAlive(state.pid));
  cachedSnapshot = {
    ver: APP_VERSION,
    alive,
    pid: alive ? state.pid : null,
    startedAt: alive ? state.startedAt : null,
    ram: alive ? getProcessRamFast(state.pid) : '-',
    waStatus: getWaAccountStatus(),
    tokenInfo: getTokenInfo()
  };
  return cachedSnapshot;
}

function openBrowser(url) {
  exec(`termux-open-url "${url}"`, (err) => {
    if (err) exec(`xdg-open "${url}"`, () => {});
  });
}

function initKeypressOnce() {
  if (!process.stdin._lopKeypressReady) {
    readline.emitKeypressEvents(process.stdin, { escapeCodeTimeout: 25 });
    process.stdin._lopKeypressReady = true;
  }
}

function releaseStdin() {
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  } catch {}
}

function promptLine(questionText) {
  return new Promise((resolve) => {
    releaseStdin();
    process.stdout.write(TERM.showCursor);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(questionText, (answer) => {
      rl.close();
      process.stdout.write(TERM.hideCursor);
      resolve(String(answer || '').trim());
    });
  });
}

function waitAnyKey(callback) {
  initKeypressOnce();
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  const handler = (str, key) => {
    if (key && key.ctrl && key.name === 'c') {
      releaseStdin();
      process.stdout.write(TERM.exitAlt);
      process.exit(0);
    }
    process.stdin.removeListener('keypress', handler);
    releaseStdin();
    callback();
  };
  setTimeout(() => process.stdin.on('keypress', handler), 120);
}

async function showLoadingScreen(label = 'Menyiapkan antarmuka...') {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const totalTicks = 10;
  for (let i = 0; i <= totalTicks; i++) {
    const { cols, rows } = getScreenSize();
    const pct = Math.round((i / totalTicks) * 100);
    const barLen = 22;
    const filled = Math.round((i / totalTicks) * barLen);
    const bar = `${gradientText('━'.repeat(filled))}${C.border}${'─'.repeat(barLen - filled)}${C.reset}`;
    const frame = frames[i % frames.length];

    const block = [
      BANNER_LINE_1,
      BANNER_LINE_2,
      BANNER_LINE_3,
      `${C.dim}Engine ${APP_VERSION}${C.reset}`,
      '',
      `${bar} ${C.white}${C.bold}${String(pct).padStart(3, ' ')}%${C.reset}`,
      `${C.cyan}${frame}${C.reset} ${C.dim}${label}${C.reset}`
    ];

    const topPad = Math.max(1, Math.floor((rows - block.length) / 2));
    let out = TERM.repaintHome + '\n'.repeat(topPad);
    for (const line of block) {
      out += padCenter(line, cols) + '\n';
    }

    process.stdout.write(out);
    await new Promise(r => setTimeout(r, 50));
  }
}

function composeFrameLines(snap, title, items, selectedIndex) {
  const { cols } = getScreenSize();
  const W = Math.min(44, Math.max(38, cols - 2));
  const inner = W - 2;

  const statusText = snap.alive
    ? `${C.green}● ONLINE${C.reset} ${C.dim}(PID ${snap.pid})${C.reset}`
    : `${C.red}○ OFFLINE${C.reset}`;
  const runtimeAndRam = snap.alive
    ? `${C.white}${formatRuntime(snap.startedAt)}${C.reset} ${C.dim}• RAM ${snap.ram}${C.reset}`
    : `${C.dim}-${C.reset}`;

  const lines = [
    padCenter(BANNER_LINE_1, cols),
    padCenter(BANNER_LINE_2, cols),
    padCenter(BANNER_LINE_3, cols),
    padCenter(`${C.dim}WA Bot & Local Control • ${C.cyan}${snap.ver}${C.reset}`, cols),
    '',
    ...buildBoxLines([
      ` ${C.dim}Server  :${C.reset} ${statusText}`,
      ` ${C.dim}WhatsApp:${C.reset} ${snap.waStatus}`,
      ` ${C.dim}Runtime :${C.reset} ${runtimeAndRam}`,
      ` ${C.dim}Lisensi :${C.reset} ${snap.tokenInfo}`,
      ` ${C.dim}Web UI  :${C.reset} ${C.cyan}${URL_DASHBOARD}${C.reset}`
    ], W, C.teal),
    ...buildBoxLines([
      ` ${C.yellow}⚡ Tips:${C.reset} ${C.dim}Aktifkan "Acquire wakelock" di${C.reset}`,
      ` ${C.dim}notifikasi Termux agar bot aktif 24/7.${C.reset}`
    ], W, C.border)
  ];

  if (statusNotice) {
    lines.push(padCenter(`${C.green}${C.bold}${statusNotice}${C.reset}`, cols));
  }

  const menuLines = [
    padCenter(`${C.cyan}${C.bold}${title}${C.reset}`, inner),
    padCenter(`${C.dim}▲/▼ Navigasi • Enter Pilih • R Refresh${C.reset}`, inner),
    `${C.border}${'─'.repeat(inner)}${C.reset}`
  ];

  items.forEach((item, idx) => {
    const num = `${idx + 1}.`;
    if (idx === selectedIndex) {
      const label = padRight(` ▸ ${num} ${item.label}`, inner);
      menuLines.push(`${C.selBg}${label}${C.reset}`);
    } else {
      menuLines.push(`   ${C.dim}${num}${C.reset} ${C.white}${item.label}${C.reset}`);
    }
  });

  lines.push(...buildBoxLines(menuLines, W, C.border));
  return lines;
}

function runInteractiveMenu(title, items, onSelect, onBackKey = null) {
  let selectedIndex = 0;
  refreshSystemSnapshot();

  function draw() {
    const { rows } = getScreenSize();
    const snap = cachedSnapshot || refreshSystemSnapshot();
    const frameLines = composeFrameLines(snap, title, items, selectedIndex);

    const topPad = Math.max(0, Math.floor((rows - frameLines.length) / 2));
    const output = TERM.repaintHome + '\n'.repeat(topPad) + frameLines.join('\n') + '\n';
    process.stdout.write(output);
  }

  draw();

  const autoTimer = setInterval(() => {
    refreshSystemSnapshot();
    draw();
  }, 2500);

  initKeypressOnce();
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();

  function onResize() { draw(); }
  process.stdout.on('resize', onResize);

  function cleanup() {
    clearInterval(autoTimer);
    process.stdout.removeListener('resize', onResize);
    process.stdin.removeListener('keypress', handleKey);
    releaseStdin();
  }

  function handleKey(str, key) {
    if (key && key.ctrl && key.name === 'c') {
      cleanup();
      process.stdout.write(TERM.exitAlt);
      process.exit(0);
    }

    if (onBackKey && key && (key.name === 'escape' || key.name === 'backspace')) {
      cleanup();
      onBackKey();
      return;
    }

    if (str === 'r' || str === 'R') {
      refreshSystemSnapshot();
      draw();
    } else if (key && key.name === 'up') {
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      draw();
    } else if (key && key.name === 'down') {
      selectedIndex = (selectedIndex + 1) % items.length;
      draw();
    } else if (key && (key.name === 'return' || key.name === 'enter')) {
      cleanup();
      onSelect(items[selectedIndex]);
    } else if (str >= '1' && str <= String(items.length)) {
      const idx = Number(str) - 1;
      cleanup();
      onSelect(items[idx]);
    }
  }

  process.stdin.on('keypress', handleKey);
}

// ==========================================
// FITUR PAIRING WHATSAPP LANGSUNG DI CLI
// ==========================================
function normalizePhoneInput(raw) {
  let digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('08')) {
    digits = '62' + digits.slice(1);
  }
  return digits;
}

async function waitForLocalServerReady(maxWaitMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const r = await fetch('http://127.0.0.1:3000/api/cli/status');
      if (r.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

async function runCliPairingFlow() {
  const pairedPhone = getPairedPhoneNumber();
  if (pairedPhone) {
    setNotice(`✓ Sudah terpair dengan nomor +${pairedPhone}`);
    return openMainMenu();
  }

  const { cols, rows } = getScreenSize();
  const W = Math.min(44, Math.max(38, cols - 2));
  const inner = W - 2;

  const promptLines = [
    padCenter(BANNER_LINE_1, cols),
    padCenter(BANNER_LINE_2, cols),
    padCenter(BANNER_LINE_3, cols),
    padCenter(`${C.cyan}${C.bold}PAIRING WHATSAPP VIA CLI${C.reset}`, cols),
    '',
    ...buildBoxLines([
      ` ${C.white}Masukkan nomor WA yang akan dijadikan bot.${C.reset}`,
      ` ${C.dim}Contoh: 6285878041275 atau 085878041275${C.reset}`,
      ` ${C.dim}(Kosongkan & Enter untuk batal)${C.reset}`
    ], W, C.teal)
  ];

  const topPad = Math.max(1, Math.floor((rows - promptLines.length - 3) / 2));
  process.stdout.write(TERM.repaintHome + '\n'.repeat(topPad) + promptLines.join('\n') + '\n\n');

  const margin = ' '.repeat(Math.max(0, Math.floor((cols - W) / 2)));
  const rawInput = await promptLine(`${margin}${C.cyan}▸ Nomor WA:${C.reset} `);
  if (!rawInput) {
    return openMainMenu();
  }

  const phoneNumber = normalizePhoneInput(rawInput);
  if (phoneNumber.length < 9 || phoneNumber.length > 15) {
    setNotice('⚠ Nomor WhatsApp tidak valid!');
    return openMainMenu();
  }

  await showLoadingScreen('Meminta kode pairing ke WhatsApp...');

  // Pastikan server latar belakang aktif dan siap menerima request pairing
  startBackgroundServer();
  const ready = await waitForLocalServerReady(5000);
  if (!ready) {
    setNotice('⚠ Server lokal belum siap, coba beberapa detik lagi.');
    return openMainMenu();
  }

  let pairingCode = '';
  try {
    const resp = await fetch('http://127.0.0.1:3000/api/cli/pairing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    const data = await resp.json();
    if (data.alreadyPaired && data.phoneNumber) {
      setNotice(`✓ Sudah terpair dengan nomor +${data.phoneNumber}`);
      return openMainMenu();
    }
    if (!resp.ok || !data.success || !data.pairingCode) {
      throw new Error(data.error || 'Gagal mendapatkan kode pairing');
    }
    pairingCode = String(data.pairingCode).trim();
  } catch (e) {
    setNotice(`⚠ Pairing gagal: ${e.message.slice(0, 32)}`);
    return openMainMenu();
  }

  const formattedCode = pairingCode.length === 8
    ? `${pairingCode.slice(0, 4)} - ${pairingCode.slice(4)}`
    : pairingCode;

  let done = false;
  let pollTimer = null;

  function renderCodeScreen(statusHint) {
    const sz = getScreenSize();
    const boxW = Math.min(44, Math.max(38, sz.cols - 2));
    const inW = boxW - 2;

    const screenLines = [
      padCenter(BANNER_LINE_1, sz.cols),
      padCenter(BANNER_LINE_2, sz.cols),
      padCenter(BANNER_LINE_3, sz.cols),
      padCenter(`${C.cyan}${C.bold}KODE PAIRING WHATSAPP${C.reset}`, sz.cols),
      '',
      ...buildBoxLines([
        padCenter(`${C.dim}Target: +${phoneNumber}${C.reset}`, inW),
        '',
        padCenter(`${C.selBg}   ${formattedCode}   ${C.reset}`, inW),
        '',
        padCenter(statusHint, inW)
      ], boxW, C.teal),
      ...buildBoxLines([
        ` ${C.white}1. Buka WhatsApp > Perangkat Tertaut${C.reset}`,
        ` ${C.white}2. Pilih "Tautkan dengan nomor telepon"${C.reset}`,
        ` ${C.white}3. Masukkan 8 digit kode di atas${C.reset}`,
        `${C.border}${'─'.repeat(inW)}${C.reset}`,
        padCenter(`${C.dim}Tekan Esc / Enter untuk kembali${C.reset}`, inW)
      ], boxW, C.border)
    ];

    const padT = Math.max(0, Math.floor((sz.rows - screenLines.length) / 2));
    process.stdout.write(TERM.repaintHome + '\n'.repeat(padT) + screenLines.join('\n') + '\n');
  }

  renderCodeScreen(`${C.yellow}⏳ Menunggu konfirmasi dari HP...${C.reset}`);

  function finishPairing(msg) {
    if (done) return;
    done = true;
    if (pollTimer) clearInterval(pollTimer);
    process.stdin.removeListener('keypress', onKey);
    releaseStdin();
    if (msg) setNotice(msg);
    refreshSystemSnapshot();
    openMainMenu();
  }

  function onKey(str, key) {
    if (key && key.ctrl && key.name === 'c') {
      if (pollTimer) clearInterval(pollTimer);
      releaseStdin();
      process.stdout.write(TERM.exitAlt);
      process.exit(0);
    }
    if (key && (key.name === 'escape' || key.name === 'return' || key.name === 'enter' || key.name === 'backspace')) {
      finishPairing('');
    }
  }

  initKeypressOnce();
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('keypress', onKey);

  pollTimer = setInterval(async () => {
    if (done) return;
    try {
      const r = await fetch('http://127.0.0.1:3000/api/cli/status');
      const d = await r.json();
      if (d?.status === 'connected' || d?.status === 'open') {
        finishPairing(`✓ WhatsApp (+${phoneNumber}) berhasil tertaut!`);
      }
    } catch {}
  }, 2000);
}

// ==========================================
// FITUR BACKUP & RESTORE DATA BOT
// ==========================================
function getBackupDirs() {
  const dirs = [];
  const sdcardDl = '/sdcard/Download';
  try {
    if (fs.existsSync(sdcardDl)) {
      fs.accessSync(sdcardDl, fs.constants.W_OK);
      dirs.push(sdcardDl);
    }
  } catch {}
  dirs.push(os.homedir());
  return dirs;
}

function runBackupData() {
  const dirs = getBackupDirs();
  const targetDir = dirs[0];
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');
  const fileName = `lopclient-backup-${stamp}.tar.gz`;
  const destPath = path.join(targetDir, fileName);

  try {
    execSync(
      `tar --exclude='bot.log' --exclude='.bot_state.json' -czf "${destPath}" -C "${DATA_DIR}" .`,
      { stdio: 'ignore' }
    );
    const sizeKb = (fs.statSync(destPath).size / 1024).toFixed(1);
    const shortDir = targetDir.startsWith('/sdcard') ? '/sdcard/Download' : '~';
    setNotice(`✓ Backup sukses: ${shortDir}/${fileName} (${sizeKb} KB)`);
  } catch (e) {
    setNotice(`⚠ Gagal backup: ${e.message.slice(0, 28)}`);
  }
  openBackupMenu();
}

function findLatestBackupFile() {
  let candidates = [];
  for (const dir of getBackupDirs()) {
    try {
      const files = fs.readdirSync(dir)
        .filter((f) => f.startsWith('lopclient-backup-') && f.endsWith('.tar.gz'))
        .map((f) => {
          const full = path.join(dir, f);
          return { name: f, full, mtime: fs.statSync(full).mtimeMs };
        });
      candidates = candidates.concat(files);
    } catch {}
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0] || null;
}

function runRestoreLatestBackup() {
  const latest = findLatestBackupFile();
  if (!latest) {
    setNotice('⚠ Tidak ada file lopclient-backup-*.tar.gz ditemukan.');
    return openBackupMenu();
  }

  try {
    stopBackgroundServer();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    execSync(`tar -xzf "${latest.full}" -C "${DATA_DIR}"`, { stdio: 'ignore' });
    startBackgroundServer();
    setNotice(`✓ Restore sukses dari ${latest.name}!`);
  } catch (e) {
    startBackgroundServer();
    setNotice(`⚠ Gagal restore: ${e.message.slice(0, 28)}`);
  }
  openBackupMenu();
}

function openBackupMenu() {
  const latest = findLatestBackupFile();
  const backupInfo = latest ? latest.name : 'Belum ada file backup';

  runInteractiveMenu(
    'BACKUP & RESTORE DATA',
    [
      { label: 'Backup Sesi & Konfigurasi Sekarang', action: () => runBackupData() },
      { label: `Restore Backup (${backupInfo.slice(0, 20)})`, action: () => runRestoreLatestBackup() },
      { label: 'Kembali ke Settings', action: () => openSettingsMenu() }
    ],
    (chosen) => chosen.action(),
    () => openSettingsMenu()
  );
}

// ==========================================
// FITUR DIAGNOSTIK SISTEM (DOCTOR)
// ==========================================
function checkCmdExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkHttpReachable(url) {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    fetch(url, { method: 'HEAD', signal: controller.signal })
      .then(() => { clearTimeout(timer); resolve(true); })
      .catch(() => { clearTimeout(timer); resolve(false); });
  });
}

function getFreeDiskInfo() {
  try {
    const out = execSync(`df -h "${ROOT_DIR}" | tail -n 1`).toString().trim().split(/\s+/);
    if (out.length >= 4) return `${out[3]} bebas`;
  } catch {}
  return '-';
}

async function showSystemDoctor() {
  await showLoadingScreen('Memeriksa kesehatan sistem...');

  const hasFfmpeg = checkCmdExists('ffmpeg');
  const hasGit = checkCmdExists('git');
  const hasWakeLock = checkCmdExists('termux-wake-lock');
  const [ghOk, fbOk] = await Promise.all([
    checkHttpReachable('https://api.github.com'),
    checkHttpReachable('https://lopclient-default-rtdb.asia-southeast1.firebasedatabase.app/.json')
  ]);

  const diskFree = getFreeDiskInfo();
  const hasAuth = fs.existsSync(path.join(DATA_DIR, 'auth', 'creds.json'));
  const badge = (ok, yes = 'OK', no = 'TIDAK ADA') =>
    ok ? `${C.green}✓ ${yes}${C.reset}` : `${C.red}✖ ${no}${C.reset}`;

  const { cols, rows } = getScreenSize();
  const W = Math.min(44, Math.max(38, cols - 2));
  const inner = W - 2;

  const lines = [
    padCenter(BANNER_LINE_1, cols),
    padCenter(BANNER_LINE_2, cols),
    padCenter(BANNER_LINE_3, cols),
    padCenter(`${C.cyan}${C.bold}DIAGNOSTIK SISTEM (DOCTOR)${C.reset}`, cols),
    '',
    ...buildBoxLines([
      ` ${C.dim}Node.js   :${C.reset} ${C.white}${process.version}${C.reset} ${C.dim}(${process.arch})${C.reset}`,
      ` ${C.dim}FFmpeg    :${C.reset} ${badge(hasFfmpeg, 'Terpasang', 'Belum Instal')}`,
      ` ${C.dim}Git CLI   :${C.reset} ${badge(hasGit, 'Terpasang', 'Belum Instal')}`,
      ` ${C.dim}Termux API:${C.reset} ${badge(hasWakeLock, 'Siap', 'Opsional')}`,
      ` ${C.dim}GitHub    :${C.reset} ${badge(ghOk, 'Terhubung', 'Offline')}`,
      ` ${C.dim}Firebase  :${C.reset} ${badge(fbOk, 'Terhubung', 'Offline')}`,
      ` ${C.dim}Sesi WA   :${C.reset} ${badge(hasAuth, 'Tersimpan', 'Belum Pair')}`,
      ` ${C.dim}Storage   :${C.reset} ${C.cyan}${diskFree}${C.reset}`
    ], W, C.teal),
    ...buildBoxLines([
      padCenter(`${C.dim}Tekan tombol apa saja untuk kembali${C.reset}`, inner)
    ], W, C.border)
  ];

  const topPad = Math.max(0, Math.floor((rows - lines.length) / 2));
  process.stdout.write(TERM.repaintHome + '\n'.repeat(topPad) + lines.join('\n') + '\n');

  waitAnyKey(() => openSettingsMenu());
}

function showLiveLogs(onBack) {
  const state = readState();
  const alive = state && isPidAlive(state.pid);
  process.stdout.write(TERM.clearHome);
  process.stdout.write(`${C.cyan}${C.bold} === LIVE LOG SERVER (Tekan Q / Esc / Enter untuk kembali) ===${C.reset}\n`);
  process.stdout.write(`${C.dim} File Log: ${LOG_FILE} | Status: ${alive ? 'ONLINE (PID ' + state.pid + ')' : 'OFFLINE'}${C.reset}\n\n`);

  let lastSize = 0;
  if (fs.existsSync(LOG_FILE)) {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    if (content.trim()) {
      const lines = content.split('\n').slice(-22).join('\n');
      process.stdout.write(lines + '\n');
    } else {
      process.stdout.write(`${C.yellow} (Belum ada log tercatat. Jalankan command di WA untuk melihat aktivitas.)${C.reset}\n`);
    }
    lastSize = fs.statSync(LOG_FILE).size;
  } else {
    process.stdout.write(`${C.yellow} (File bot.log belum dibuat. Coba Restart Server Bot terlebih dahulu.)${C.reset}\n`);
  }

  const watcher = setInterval(() => {
    if (!fs.existsSync(LOG_FILE)) return;
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > lastSize) {
      const fd = fs.openSync(LOG_FILE, 'r');
      const buf = Buffer.alloc(stat.size - lastSize);
      fs.readSync(fd, buf, 0, buf.length, lastSize);
      fs.closeSync(fd);
      process.stdout.write(buf.toString('utf8'));
      lastSize = stat.size;
    }
  }, 500);

  setTimeout(() => {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    const onExitKey = (chunk) => {
      const keyStr = chunk.toString();
      if (keyStr === '\u0003') {
        clearInterval(watcher);
        releaseStdin();
        process.stdout.write(TERM.exitAlt);
        process.exit(0);
      }
      clearInterval(watcher);
      process.stdin.removeListener('data', onExitKey);
      releaseStdin();
      onBack();
    };
    process.stdin.on('data', onExitKey);
  }, 200);
}

function triggerManualUpdate() {
  releaseStdin();
  process.stdout.write(TERM.exitAlt + TERM.clearHome);
  if (!fs.existsSync(UPDATER_ENTRY)) {
    console.log(`\n${C.red}❌ File updater.js tidak ditemukan.${C.reset}\n`);
    process.exit(1);
  }
  const child = spawn(process.execPath, [UPDATER_ENTRY], {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
  child.on('exit', (code) => process.exit(code || 0));
}

function openSettingsMenu() {
  runInteractiveMenu('SETTINGS & KONTROL', [
    { label: 'Lihat Live Log Bot', action: () => showLiveLogs(openSettingsMenu) },
    { label: 'Diagnostik Sistem (Doctor)', action: () => showSystemDoctor() },
    { label: 'Backup & Restore Data', action: () => openBackupMenu() },
    {
      label: 'Restart Server Bot',
      action: () => {
        stopBackgroundServer();
        startBackgroundServer();
        setNotice('✓ Server berhasil di-restart!');
        openSettingsMenu();
      }
    },
    {
      label: 'Cek Update Sekarang',
      action: () => triggerManualUpdate()
    },
    {
      label: 'Reset Sesi WA (Pairing Ulang)',
      action: () => {
        stopBackgroundServer();
        const authPaths = [
          path.join(DATA_DIR, 'auth'),
          path.resolve(ROOT_DIR, '../data/auth')
        ];
        for (const p of authPaths) {
          if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
        }
        startBackgroundServer();
        setNotice('✓ Sesi WA di-reset! Silakan Pair ulang.');
        openSettingsMenu();
      }
    },
    {
      label: 'Bersihkan Log / Cache',
      action: () => {
        try {
          if (fs.existsSync(LOG_FILE)) fs.truncateSync(LOG_FILE, 0);
        } catch {}
        setNotice('✓ File log & cache berhasil dibersihkan!');
        openSettingsMenu();
      }
    },
    { label: 'Kembali ke Menu Utama', action: () => openMainMenu() }
  ], (chosen) => chosen.action(), () => openMainMenu());
}

function openMainMenu() {
  runInteractiveMenu('MENU UTAMA', [
    {
      label: 'Pair WhatsApp (8-Digit Code)',
      action: () => runCliPairingFlow()
    },
    {
      label: 'Buka Website (Localhost)',
      action: () => {
        openBrowser(URL_DASHBOARD);
        setNotice('✓ Membuka browser ke localhost:3000...');
        openMainMenu();
      }
    },
    { label: 'Refresh Status', action: () => openMainMenu() },
    { label: 'Settings & Kontrol', action: () => openSettingsMenu() },
    {
      label: 'Shutdown Bot (Kill & Exit)',
      action: () => {
        stopBackgroundServer();
        releaseStdin();
        process.stdout.write(TERM.exitAlt + TERM.clearHome);
        console.log(`\n${C.red}${C.bold}  [✓] Server LopClient dimatikan (Killed).${C.reset}`);
        console.log(`${C.dim}  Sampai jumpa kembali!${C.reset}\n`);
        process.exit(0);
      }
    }
  ], (chosen) => chosen.action());
}

(async () => {
  try {
    const { runStartupAutoUpdate } = require('./core/system-guard.jsc');
    await runStartupAutoUpdate(ROOT_DIR);
  } catch {}
  process.stdout.write(TERM.enterAlt);
  startBackgroundServer();
  await showLoadingScreen('Menyiapkan antarmuka...');
  openMainMenu();
})();
