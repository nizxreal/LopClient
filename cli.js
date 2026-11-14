#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn, exec, execSync } = require('child_process');

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STATE_FILE = path.join(DATA_DIR, '.bot_state.json');
const TOKEN_FILE = path.join(DATA_DIR, '.session_token');
const LOG_FILE = path.join(DATA_DIR, 'bot.log');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server', 'server.js');
const URL_DASHBOARD = 'http://localhost:3000';

fs.mkdirSync(DATA_DIR, { recursive: true });

const TERM = {
  enterAlt: '\x1b[?1049h\x1b[?25l\x1b[2J\x1b[3J\x1b[H',
  exitAlt: '\x1b[?25h\x1b[?1049l',
  clearHome: '\x1b[2J\x1b[3J\x1b[H'
};

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[38;5;177m',     // Soft Orchid / Neon Lavender
  teal: '\x1b[38;5;135m',     // Electric Violet (#a855f7)
  purpleDeep: '\x1b[38;5;93m', // Deep Purple (#7c3aed)
  lavender: '\x1b[38;5;225m', // White-Lavender glow
  blue: '\x1b[38;5;141m',
  green: '\x1b[92m',
  yellow: '\x1b[38;5;219m',   // Pink-Violet highlight
  red: '\x1b[91m',
  white: '\x1b[97m',
  border: '\x1b[38;5;60m',    // Muted Dark Violet Border
  selBg: '\x1b[48;5;93m\x1b[97m\x1b[1m' // Selected Menu: Deep Neon Purple Bg + White Bold
};

function gradientText(text) {
  const stops = [
    [255, 255, 255], // White ("Lop")
    [233, 213, 255], // Lavender
    [192, 132, 252], // Light Violet
    [168, 85, 247],  // Neon Purple ("Client")
    [124, 58, 237],  // Deep Violet
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

let statusNotice = '';

function setNotice(msg) {
  statusNotice = msg;
  setTimeout(() => { statusNotice = ''; }, 4000);
}

// Helper layout & ANSI-safe padding
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function getScreenSize() {
  return {
    cols: process.stdout.columns || 48,
    rows: process.stdout.rows || 24
  };
}

function padCenter(str, width) {
  const len = stripAnsi(str).length;
  if (len >= width) return str;
  const left = Math.floor((width - len) / 2);
  const right = width - len - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

function padRight(str, width) {
  const len = stripAnsi(str).length;
  if (len >= width) return str;
  return str + ' '.repeat(width - len);
}

function makeBox(lines, boxWidth = 44, borderColor = C.border) {
  const { cols } = getScreenSize();
  const margin = ' '.repeat(Math.max(0, Math.floor((cols - boxWidth) / 2)));
  const inner = boxWidth - 2;
  const out = [];

  out.push(`${margin}${borderColor}╭${'─'.repeat(inner)}╮${C.reset}`);
  for (const line of lines) {
    out.push(`${margin}${borderColor}│${C.reset}${padRight(line, inner)}${borderColor}│${C.reset}`);
  }
  out.push(`${margin}${borderColor}╰${'─'.repeat(inner)}╯${C.reset}`);
  return out.join('\n');
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

function openBrowser(url) {
  exec(`termux-open-url "${url}"`, (err) => {
    if (err) exec(`xdg-open "${url}"`, () => {});
  });
}

// Loading Screen presisi di tengah (Vertikal & Horizontal)
async function showLoadingScreen() {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const steps = [
    'Memuat modul inti...',
    'Menjalankan server bot...',
    'Menyiapkan antarmuka...'
  ];

  const totalTicks = 16;
  for (let i = 0; i <= totalTicks; i++) {
    const { cols, rows } = getScreenSize();
    const pct = Math.round((i / totalTicks) * 100);
    const barLen = 22;
    const filled = Math.round((i / totalTicks) * barLen);
    const bar = `${gradientText('━'.repeat(filled))}${C.border}${'─'.repeat(barLen - filled)}${C.reset}`;
    const frame = frames[i % frames.length];
    const step = steps[Math.min(steps.length - 1, Math.floor((i / (totalTicks + 1)) * steps.length))];

    const block = [
      `${gradientText('╦  ╔═╗╔═╗  ╔═╗╦  ╦╔═╗╔╗╔╔╦╗')}`,
      `${gradientText('║  ║ ║╠═╝  ║  ║  ║║╣ ║║║ ║ ')}`,
      `${gradientText('╩═╝╚═╝╩    ╚═╝╩═╝╩╚═╝╝╚╝ ╩ ')}`,
      '',
      `${bar} ${C.white}${C.bold}${String(pct).padStart(3, ' ')}%${C.reset}`,
      `${C.cyan}${frame}${C.reset} ${C.dim}${step}${C.reset}`
    ];

    const topPad = Math.max(1, Math.floor((rows - block.length) / 2));
    let out = TERM.clearHome + '\n'.repeat(topPad);
    for (const line of block) {
      out += padCenter(line, cols) + '\n';
    }

    process.stdout.write(out);
    await new Promise(r => setTimeout(r, 75));
  }
}

function renderBanner(state) {
  const { cols } = getScreenSize();
  const W = Math.min(44, Math.max(38, cols - 2));
  const inner = W - 2;

  const alive = state && isPidAlive(state.pid);
  const statusText = alive
    ? `${C.green}● ONLINE${C.reset} ${C.dim}(PID ${state.pid})${C.reset}`
    : `${C.red}○ OFFLINE${C.reset}`;

  let out = TERM.clearHome + '\n';

  // Header Logo (Centered)
  const logoLines = [
    `${gradientText('╦  ╔═╗╔═╗  ╔═╗╦  ╦╔═╗╔╗╔╔╦╗')}`,
    `${gradientText('║  ║ ║╠═╝  ║  ║  ║║╣ ║║║ ║ ')}`,
    `${gradientText('╩═╝╚═╝╩    ╚═╝╩═╝╩╚═╝╝╚╝ ╩ ')}`,
    `${C.dim}WA Bot & Local Control (Termux)${C.reset}`
  ];
  for (const l of logoLines) {
    out += padCenter(l, cols) + '\n';
  }
  out += '\n';

  // Card 1: Informasi Sistem & Token
  const infoCard = makeBox([
    ` ${C.dim}Status  :${C.reset} ${statusText}`,
    ` ${C.dim}Runtime :${C.reset} ${C.white}${alive ? formatRuntime(state.startedAt) : '-'}${C.reset}`,
    ` ${C.dim}Lisensi :${C.reset} ${getTokenInfo()}`,
    ` ${C.dim}Web UI  :${C.reset} ${C.cyan}${URL_DASHBOARD}${C.reset}`
  ], W, C.teal);
  out += infoCard + '\n';

  // Card 2: Tips Singkat
  const tipsCard = makeBox([
    ` ${C.yellow}⚡ Tips:${C.reset} ${C.dim}Aktifkan "Acquire wakelock"${C.reset}`,
    ` ${C.dim}di notifikasi Termux agar bot 24/7.${C.reset}`
  ], W, C.border);
  out += tipsCard + '\n';

  if (statusNotice) {
    out += padCenter(`${C.green}${C.bold}${statusNotice}${C.reset}`, cols) + '\n';
  }

  process.stdout.write(out);
  return W;
}

function runInteractiveMenu(title, items, onSelect) {
  let selectedIndex = 0;

  function draw() {
    const state = readState();
    const W = renderBanner(state);
    const inner = W - 2;

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

    process.stdout.write(makeBox(menuLines, W, C.border) + '\n');
  }

  draw();

  const autoTimer = setInterval(draw, 2000);

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();

  function onResize() { draw(); }
  process.stdout.on('resize', onResize);

  function cleanup() {
    clearInterval(autoTimer);
    process.stdout.removeListener('resize', onResize);
    process.stdin.removeListener('keypress', handleKey);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  }

  function handleKey(str, key) {
    if (key && key.ctrl && key.name === 'c') {
      cleanup();
      process.stdout.write(TERM.exitAlt);
      process.exit(0);
    }

    if (str === 'r' || str === 'R') {
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

function showLiveLogs(onBack) {
  const state = readState();
  const alive = state && isPidAlive(state.pid);
  process.stdout.write(TERM.clearHome);
  process.stdout.write(`${C.cyan}${C.bold} === LIVE LOG SERVER (Tekan Q / Esc / Enter untuk kembali) ===${C.reset}\n`);
  process.stdout.write(`${C.dim} File Log: ${LOG_FILE} | Status: ${alive ? "ONLINE (PID " + state.pid + ")" : "OFFLINE"}${C.reset}\n\n`);

  let lastSize = 0;
  if (fs.existsSync(LOG_FILE)) {
    const content = fs.readFileSync(LOG_FILE, "utf8");
    if (content.trim()) {
      const lines = content.split("\n").slice(-22).join("\n");
      process.stdout.write(lines + "\n");
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
      const fd = fs.openSync(LOG_FILE, "r");
      const buf = Buffer.alloc(stat.size - lastSize);
      fs.readSync(fd, buf, 0, buf.length, lastSize);
      fs.closeSync(fd);
      process.stdout.write(buf.toString("utf8"));
      lastSize = stat.size;
    }
  }, 500);

  setTimeout(() => {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    const onExitKey = (chunk) => {
      const keyStr = chunk.toString();
      if (keyStr === "\u0003") {
        clearInterval(watcher);
        process.stdout.write(TERM.exitAlt);
        process.exit(0);
      }
      clearInterval(watcher);
      process.stdin.removeListener("data", onExitKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      onBack();
    };
    process.stdin.on("data", onExitKey);
  }, 250);
}

function openSettingsMenu() {
  runInteractiveMenu('SETTINGS & KONTROL', [
    { label: 'Lihat Live Log Bot', action: () => showLiveLogs(openSettingsMenu) },
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
  ], (chosen) => chosen.action());
}

function openMainMenu() {
  runInteractiveMenu('MENU UTAMA', [
    {
      label: 'Buka Website (Localhost)',
      action: () => {
        openBrowser(URL_DASHBOARD);
        openMainMenu();
      }
    },
    { label: 'Refresh Status', action: () => openMainMenu() },
    { label: 'Settings', action: () => openSettingsMenu() },
    {
      label: 'Matikan Bot (Termasuk Exit)',
      action: () => {
        stopBackgroundServer();
        process.stdout.write(TERM.exitAlt + TERM.clearHome);
        console.log(`\n${C.red}${C.bold}  [✓] Server LopClient dimatikan.${C.reset}`);
        console.log(`${C.dim}  Sampai jumpa kembali!${C.reset}\n`);
        process.exit(0);
      }
    }
  ], (chosen) => chosen.action());
}

(async () => {
  process.stdout.write(TERM.enterAlt);
  startBackgroundServer();
  await showLoadingScreen();
  openMainMenu();
})();
