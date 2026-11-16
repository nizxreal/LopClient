const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

document.getElementById('btnMenu').addEventListener('click', () => {
  sidebar.classList.add('open');
  overlay.classList.add('show');
});

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}
overlay.addEventListener('click', closeSidebar);
document.getElementById('btnCloseSidebar')?.addEventListener('click', closeSidebar);

function switchPage(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  document.getElementById('page-dashboard').classList.toggle('hidden', page !== 'dashboard');
  document.getElementById('page-features').classList.toggle('hidden', page !== 'features');
  document.getElementById('page-group')?.classList.toggle('hidden', page !== 'group');
  document.getElementById('page-custom')?.classList.toggle('hidden', page !== 'custom');
  document.getElementById('page-settings')?.classList.toggle('hidden', page !== 'settings');
  const titles = { dashboard: 'LopClient', features: 'LopClient • Fitur', group: 'LopClient • Grup & Welcome', custom: 'LopClient • Custom Command', settings: 'LopClient • Settings' };
  document.getElementById('pageTitle').textContent = titles[page] || 'LopClient';
}

document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => {
    switchPage(el.dataset.page);
    closeSidebar();
  });
});

document.getElementById('btnGoActivateVip')?.addEventListener('click', () => {
  switchPage('dashboard');
  setTimeout(() => {
    document.getElementById('vipTokenInput')?.focus();
  }, 150);
});

// Theme
const btnTheme = document.getElementById('btnTheme');
btnTheme.addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  btnTheme.textContent = isLight ? 'Terang' : 'Gelap';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
  btnTheme.textContent = 'Terang';
}

// Logout Web
document.getElementById('btnLogout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

function formatUptime(sec) {
  if (!sec || sec <= 0) return '0m 0d';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m ${s}d`;
}

function formatLicenseTime(sec) {
  if (!sec || sec <= 0) return 'Expired';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return `${d} hari ${h} jam`;
}

// Pairing Action
const btnPair = document.getElementById('btnPair');
const phoneInput = document.getElementById('phoneInput');
const codeDisplay = document.getElementById('codeDisplay');

btnPair.addEventListener('click', async () => {
  const phoneNumber = phoneInput.value.trim();
  if (!phoneNumber) return alert('Nomor WhatsApp wajib diisi');
  btnPair.disabled = true;
  btnPair.textContent = 'Memproses...';
  try {
    const res = await fetch('/api/pairing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await res.json();
    if (data.success && data.pairingCode) {
      codeDisplay.textContent = data.pairingCode;
      codeDisplay.style.display = 'block';
      refreshDashboard();
    } else {
      alert(data.error || 'Gagal mendapatkan pairing code');
    }
  } catch {
    alert('Gagal terhubung ke server');
  } finally {
    btnPair.disabled = false;
    btnPair.textContent = 'Dapatkan Pairing Code';
  }
});

// Unpair Action
document.getElementById('btnUnpair').addEventListener('click', async () => {
  if (!confirm('Putuskan koneksi WhatsApp dan hapus sesi saat ini?')) return;
  try {
    await fetch('/api/unpair', { method: 'POST' });
    codeDisplay.style.display = 'none';
    refreshDashboard();
  } catch {
    alert('Gagal memutus koneksi');
  }
});

// Aktivasi Token VIP
const btnActivateVip = document.getElementById('btnActivateVip');
const vipTokenInput = document.getElementById('vipTokenInput');
const vipActivateMsg = document.getElementById('vipActivateMsg');

btnActivateVip?.addEventListener('click', async () => {
  const token = vipTokenInput.value.trim();
  if (!token) return;
  btnActivateVip.disabled = true;
  btnActivateVip.textContent = 'Memeriksa...';
  try {
    const res = await fetch('/api/activate-vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (data.success) {
      vipTokenInput.value = '';
      vipActivateMsg.style.color = 'var(--online)';
      vipActivateMsg.textContent = '✓ VIP berhasil diaktifkan!';
      refreshDashboard();
    } else {
      vipActivateMsg.style.color = 'var(--danger)';
      vipActivateMsg.textContent = data.error || 'Token tidak valid';
    }
  } catch {
    vipActivateMsg.textContent = 'Gagal terhubung ke server';
  } finally {
    btnActivateVip.disabled = false;
    btnActivateVip.textContent = 'Aktifkan';
  }
});

let lastFeatures = null;
let lastIsVip = false;

async function updateConfig(payload) {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      renderConfig(data.config);
      if (lastFeatures) renderFeatures(lastFeatures, data.config, lastIsVip);
    }
  } catch {}
}

document.querySelectorAll('#modeGroup .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => updateConfig({ mode: btn.dataset.val }));
});

document.querySelectorAll('#prefixGroup .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => updateConfig({ prefix: btn.dataset.val }));
});

document.getElementById('toggleAutoRead').addEventListener('change', (e) => {
  updateConfig({ autoRead: e.target.checked });
});

function renderFeatures(features, cfg, isVip) {
  lastFeatures = features;
  lastIsVip = Boolean(isVip);

  const pfx = cfg.prefix || '';
  const uHint = document.getElementById('userMenuHint'); if (uHint) uHint.textContent = `${pfx}menu`;
  document.getElementById('funMenuBadge').textContent = `${pfx}menu`;

  const promoBanner = document.getElementById('featuresVipBanner');
  if (promoBanner) {
    promoBanner.classList.toggle('hidden', lastIsVip);
  }

  // 1. Utilitas Bawaan (/menu)
  const lockedContainer = document.getElementById('lockedUtilsList');
  lockedContainer.innerHTML = (features.lockedUtils || []).map(u => {
    const isVipFeature = u.tier === 'vip';
    let badgeHtml = `<span class="badge-online">Free</span>`;
    if (isVipFeature) {
      badgeHtml = lastIsVip
        ? `<span class="badge-vip unlocked">VIP ✓</span>`
        : `<span class="badge-vip">VIP 🔒</span>`;
    }
    return `
      <div class="control-row">
        <div class="control-info">
          <span class="cmd-pill">/${u.name}</span>
          <span>${u.desc}</span>
        </div>
        ${badgeHtml}
      </div>
    `;
  }).join('');

  // 2. Fun Commands (.menu)
  window._lastDashCfg = cfg;
  renderCategorizedCommands();
}

function renderConfig(cfg) {
  document.querySelectorAll('#modeGroup .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === cfg.mode);
  });
  document.querySelectorAll('#prefixGroup .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === cfg.prefix);
  });
  document.getElementById('toggleAutoRead').checked = Boolean(cfg.autoRead);

  const sBotInp = document.getElementById('settingsBotNameInput');
  if (sBotInp && !sBotInp.dataset.edited && cfg.botName) {
    sBotInp.value = cfg.botName;
  }
  if (cfg.queueSettings) {
    const tqe = document.getElementById('toggleQueueEnabled');
    const tqs = document.getElementById('toggleQueueSkipOwner');
    const qdi = document.getElementById('queueDelayInput');
    const qmi = document.getElementById('queueMaxInput');
    if (tqe) tqe.checked = Boolean(cfg.queueSettings.enabled);
    if (tqs) tqs.checked = cfg.queueSettings.skipOwner !== false;
    if (qdi && !qdi.dataset.edited) qdi.value = cfg.queueSettings.delayMs ?? 1500;
    if (qmi && !qmi.dataset.edited) qmi.value = cfg.queueSettings.maxQueueSize ?? 25;
  }
  if (typeof renderBlacklistSection === 'function') {
    renderBlacklistSection(cfg);
  }

}

async function refreshDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    const { bot, tier, stats, config, features } = await res.json();

    const statusPill = document.getElementById('statusPill');
    const botStatusText = document.getElementById('botStatusText');
    const pairingCard = document.getElementById('pairingCard');
    const connectedCard = document.getElementById('connectedCard');

    if (bot.status === 'connected') {
      statusPill.textContent = '● Connected';
      statusPill.classList.add('online');
      botStatusText.textContent = 'Status: Terhubung';
      pairingCard.classList.add('hidden');
      connectedCard.classList.remove('hidden');

      document.getElementById('botName').textContent = bot.name || 'WhatsApp Bot';
      document.getElementById('botPhone').textContent = bot.phone ? `+${bot.phone}` : 'Nomor terhubung';
    } else {
      statusPill.textContent = bot.status === 'pairing' ? '● Pairing...' : '● Disconnected';
      statusPill.classList.remove('online');
      botStatusText.textContent = 'Status: Terputus';
      pairingCard.classList.remove('hidden');
      connectedCard.classList.add('hidden');
    }

    const licLabel = document.getElementById('licenseIdLabel');
    const licTime = document.getElementById('licenseRemaining');
    const tierBadge = document.getElementById('tierBadge');
    const tierDesc = document.getElementById('tierDesc');
    const isVip = Boolean(tier && tier.isVip);

    if (isVip) {
      tierBadge.textContent = `VIP • ${tier.licenseId}`;
      tierBadge.style.background = 'var(--online-soft)';
      tierBadge.style.color = 'var(--online)';
      tierBadge.style.borderColor = 'var(--online-border)';
      tierDesc.textContent = `Status VIP Aktif (Sisa masa aktif: ${formatLicenseTime(tier.remainingSeconds)}).`;
      licLabel.textContent = `Lisensi VIP • ${tier.licenseId}`;
      licTime.textContent = formatLicenseTime(tier.remainingSeconds);
    } else {
      tierBadge.textContent = 'FREE';
      tierBadge.style.background = '';
      tierBadge.style.color = '';
      tierBadge.style.borderColor = '';
      tierDesc.textContent = 'Anda menggunakan paket Gratis. Aktifkan Token VIP untuk membuka fitur eksklusif.';
      licLabel.textContent = 'Paket Saat Ini';
      licTime.textContent = 'FREE';
    }

    document.getElementById('statCommands').textContent = stats.totalCommands;
    document.getElementById('statChats').textContent = stats.activeChats;
    document.getElementById('statUptime').textContent = bot.status === 'connected' ? formatUptime(bot.uptimeSeconds) : '0m 0d';
    document.getElementById('statRam').textContent = `${stats.ramUsedMb} MB`;
    document.getElementById('statRamSub').textContent = `dari ${stats.ramTotalMb} MB`;
    renderConfig(config);
    currentIsVip = Boolean(isVip);
    currentBotPrefix = config.prefix || ".";
    if (config.groupSettings) syncGroupSettingsUI(config.groupSettings);
    if (Array.isArray(config.customCommands)) {
      currentCustomCommands = config.customCommands;
      renderCustomCommandsUI();
    }
    if (features) renderFeatures(features, config, isVip);
  } catch {}
}

refreshDashboard();
setInterval(refreshDashboard, 3000);


// Grup & Welcome Custom Settings
let groupFormInitialized = false;
function syncGroupSettingsUI(gs) {
  if (!gs || groupFormInitialized) return;
  groupFormInitialized = true;
  const elWelcome = document.getElementById('toggleWelcome');
  const elWelcomeTxt = document.getElementById('welcomeTextInput');
  const elLeave = document.getElementById('toggleLeave');
  const elLeaveTxt = document.getElementById('leaveTextInput');
  const elAntiLink = document.getElementById('toggleAntiLink');
  const elAntiToxic = document.getElementById('toggleAntiToxic');

  if (elWelcome) elWelcome.checked = Boolean(gs.welcomeEnabled);
  if (elWelcomeTxt) elWelcomeTxt.value = gs.welcomeText || '';
  if (elLeave) elLeave.checked = Boolean(gs.leaveEnabled);
  if (elLeaveTxt) elLeaveTxt.value = gs.leaveText || '';
  if (elAntiLink) elAntiLink.checked = Boolean(gs.antiLinkEnabled);
  if (elAntiToxic) elAntiToxic.checked = Boolean(gs.antiToxicEnabled);
}

document.getElementById('btnSaveGroupSettings')?.addEventListener('click', async () => {
  const msgEl = document.getElementById('groupSaveMsg');
  const payload = {
    groupSettings: {
      welcomeEnabled: document.getElementById('toggleWelcome')?.checked ?? true,
      welcomeText: document.getElementById('welcomeTextInput')?.value || '',
      leaveEnabled: document.getElementById('toggleLeave')?.checked ?? true,
      leaveText: document.getElementById('leaveTextInput')?.value || '',
      antiLinkEnabled: document.getElementById('toggleAntiLink')?.checked ?? false,
      antiToxicEnabled: document.getElementById('toggleAntiToxic')?.checked ?? false,
    }
  };
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok && msgEl) {
      msgEl.textContent = '✔ Pengaturan Grup & Welcome berhasil disimpan!';
      setTimeout(() => { msgEl.textContent = ''; }, 3000);
    }
  } catch {}
});




// Custom Command Builder
let currentCustomCommands = [];
let currentIsVip = false;
let currentBotPrefix = ".";
let editingCustomIndex = -1;


function renderCustomCommandsUI() {
  const maxLimit = currentIsVip ? 4 : 2;
  const badge = document.getElementById("customQuotaBadge");
  const pfxPreview = document.getElementById("customPrefixPreview");
  const listEl = document.getElementById("customCommandsList");

  if (badge) badge.textContent = currentCustomCommands.length + " / " + maxLimit + " (" + (currentIsVip ? "VIP" : "FREE") + ")";
  if (pfxPreview) pfxPreview.textContent = currentBotPrefix + "listharga";
  if (!listEl) return;

  if (currentCustomCommands.length === 0) {
    listEl.innerHTML = "<p class=\"pairing-desc\" style=\"margin:0;\">Belum ada custom command yang dibuat.</p>";
    return;
  }

  listEl.innerHTML = currentCustomCommands.map((cmd, idx) =>
    "<div class=\"control-row\" style=\"align-items:flex-start; gap:10px;\">" +
      "<div class=\"control-info\">" +
        "<strong>" + currentBotPrefix + cmd.name + "</strong>" +
        "<span>" + (cmd.desc || "Custom Command") + "</span>" +
      "</div>" +
      "<div style=\"display:flex; gap:6px;\">" +
        "<button type=\"button\" class=\"seg-btn\" onclick=\"editCustomCmd(" + idx + ")\">Edit</button>" +
        "<button type=\"button\" class=\"seg-btn\" style=\"color:#ef4444;\" onclick=\"deleteCustomCmd(" + idx + ")\">Hapus</button>" +
      "</div>" +
    "</div>"
  ).join("");
}

window.editCustomCmd = function(idx) {
  const item = currentCustomCommands[idx];
  if (!item) return;
  editingCustomIndex = idx;
  document.getElementById("customFormTitle").textContent = "Edit Command: " + currentBotPrefix + item.name;
  document.getElementById("customCmdName").value = item.name;
  document.getElementById("customCmdDesc").value = item.desc || "";
  document.getElementById("customCmdCode").value = item.code || "";
  document.getElementById("btnCancelEditCustom")?.classList.remove("hidden");
  document.getElementById("customCmdName")?.focus();
};

document.getElementById("btnCancelEditCustom")?.addEventListener("click", () => {
  editingCustomIndex = -1;
  document.getElementById("customFormTitle").textContent = "Tambah Custom Command Baru";
  document.getElementById("customCmdName").value = "";
  document.getElementById("customCmdDesc").value = "";
  document.getElementById("customCmdCode").value = "";
  document.getElementById("btnCancelEditCustom")?.classList.add("hidden");
});

window.deleteCustomCmd = async function(idx) {
  const nextList = currentCustomCommands.filter((_, i) => i !== idx);
  const res = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customCommands: nextList }),
  });
  if (res.ok) {
    const data = await res.json();
    currentCustomCommands = data.config?.customCommands || nextList;
    renderCustomCommandsUI();
  }
};

document.getElementById("btnSaveCustomCmd")?.addEventListener("click", async () => {
  const msgEl = document.getElementById("customCmdMsg");
  const maxLimit = currentIsVip ? 4 : 2;
  const rawName = document.getElementById("customCmdName")?.value || "";
  const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  const desc = document.getElementById("customCmdDesc")?.value.trim() || "Custom Command";
  const codeVal = document.getElementById("customCmdCode")?.value.trim() || "";

  if (!cleanName || !codeVal) {
    if (msgEl) {
      msgEl.style.color = "#ef4444";
      msgEl.textContent = "⚠️ Nama command dan kode JavaScript wajib diisi!";
    }
    return;
  }

  if (editingCustomIndex === -1 && currentCustomCommands.length >= maxLimit) {
    if (msgEl) {
      msgEl.style.color = "#ef4444";
      msgEl.textContent = "🔒 Kuota penuh! Paket " + (currentIsVip ? "VIP" : "FREE") + " maksimal " + maxLimit + " custom command.";
    }
    return;
  }

  const nextList = [...currentCustomCommands];
  if (editingCustomIndex >= 0) {
    nextList[editingCustomIndex] = { name: cleanName, desc, code: codeVal, enabled: true };
  } else {
    const existIdx = nextList.findIndex((c) => c.name === cleanName);
    if (existIdx >= 0) nextList[existIdx] = { name: cleanName, desc, code: codeVal, enabled: true };
    else nextList.push({ name: cleanName, desc, code: codeVal, enabled: true });
  }

  const res = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customCommands: nextList }),
  });

  if (res.ok) {
    const data = await res.json();
    currentCustomCommands = Array.isArray(data.config?.customCommands) ? data.config.customCommands : nextList;
    editingCustomIndex = -1;
    document.getElementById("customFormTitle").textContent = "Tambah Custom Command Baru";
    document.getElementById("customCmdName").value = "";
    document.getElementById("customCmdDesc").value = "";
    document.getElementById("customCmdCode").value = "";
    document.getElementById("btnCancelEditCustom")?.classList.add("hidden");
    renderCustomCommandsUI();
    if (msgEl) {
      msgEl.style.color = "#22c55e";
      msgEl.textContent = "✔ Custom command " + currentBotPrefix + cleanName + " tersimpan di bawah!";
      setTimeout(() => { msgEl.textContent = ""; }, 4000);
    }
  } else if (msgEl) {
    msgEl.style.color = "#ef4444";
    msgEl.textContent = "❌ Gagal menyimpan custom command (HTTP " + res.status + ")";
  }
});

renderCustomCommandsUI();


function renderCategorizedCommands() {
  const cfg = window._lastDashCfg || {};
  const pfx = cfg.prefix || "";
  const query = (document.getElementById("featureSearchInput")?.value || "").toLowerCase().trim();
  const catFilter = document.getElementById("featureCatFilter")?.value || "all";

  const allCmds = (lastFeatures?.funCommands || []).filter(f => {
    const cat = (f.category || "fun").toLowerCase();
    if (catFilter !== "all" && cat !== catFilter) return false;
    if (query && !f.name.toLowerCase().includes(query) && !(f.desc || "").toLowerCase().includes(query)) return false;
    return true;
  });

  const coreCmds = allCmds.filter(f => !["fun", "anime"].includes((f.category || "anime").toLowerCase()));
  const funOnlyCmds = allCmds.filter(f => ["fun", "anime"].includes((f.category || "anime").toLowerCase()));

  const coreBadge = document.getElementById("coreCountBadge");
  const funBadge = document.getElementById("funCountBadge");
  if (coreBadge) coreBadge.textContent = coreCmds.length + " fitur";
  if (funBadge) funBadge.textContent = funOnlyCmds.length + " fitur";

  const buildRow = (f, showCat) => {
    const isVipFeature = f.tier === "vip";
    const isLocked = isVipFeature && !lastIsVip;
    const isChecked = !isLocked && cfg.funFeatures?.[f.name] !== false;
    const vipTag = isVipFeature
      ? `<span class="badge-vip ${lastIsVip ? "unlocked" : ""}" style="margin-left:6px;">${lastIsVip ? "VIP ✓" : "VIP 🔒"}</span>`
      : "";
    const catTag = showCat
      ? `<span style="font-size:10px; padding:2px 6px; border-radius:6px; background:var(--accent-soft); border:1px solid var(--accent-border); color:var(--text); margin-left:6px; text-transform:uppercase;">${f.category || "tools"}</span>`
      : "";

    return `
      <div class="control-row">
        <div class="control-info">
          <div><span class="cmd-pill">${pfx}${f.name}</span>${catTag}${vipTag}</div>
          <span>${f.desc}</span>
        </div>
        <label class="switch ${isLocked ? "locked" : ""}" title="${isLocked ? "Aktifkan Token VIP untuk membuka" : ""}">
          <input type="checkbox" data-fun="${f.name}" ${isChecked ? "checked" : ""} ${isLocked ? "disabled" : ""}>
          <span class="slider"></span>
        </label>
      </div>
    `;
  };

  const bindSwitches = (container) => {
    if (!container) return;
    container.querySelectorAll("input[data-fun]:not(:disabled)").forEach(inp => {
      inp.addEventListener("change", (e) => {
        const fname = e.target.dataset.fun;
        if (!window._lastDashCfg.funFeatures) window._lastDashCfg.funFeatures = {};
        window._lastDashCfg.funFeatures[fname] = e.target.checked;
        updateConfig({ funFeatures: { [fname]: e.target.checked } });
      });
    });
  };

  const coreContainer = document.getElementById("coreCommandsList");
  const funContainer = document.getElementById("funCommandsList");

  if (coreContainer) {
    coreContainer.innerHTML = coreCmds.length
      ? coreCmds.map(f => buildRow(f, true)).join("")
      : `<p class="pairing-desc" style="margin:0;">Tidak ada fitur utama yang cocok dengan filter.</p>`;
    bindSwitches(coreContainer);
  }

  if (funContainer) {
    funContainer.innerHTML = funOnlyCmds.length
      ? funOnlyCmds.map(f => buildRow(f, false)).join("")
      : `<p class="pairing-desc" style="margin:0;">Tidak ada fitur fun yang cocok dengan filter.</p>`;
    bindSwitches(funContainer);
  }
}

document.getElementById("featureSearchInput")?.addEventListener("input", renderCategorizedCommands);
document.getElementById("featureCatFilter")?.addEventListener("change", renderCategorizedCommands);


// Settings Page Handlers
document.getElementById('settingsBotNameInput')?.addEventListener('input', (e) => { e.target.dataset.edited = '1'; });
document.getElementById('queueDelayInput')?.addEventListener('input', (e) => { e.target.dataset.edited = '1'; });
document.getElementById('queueMaxInput')?.addEventListener('input', (e) => { e.target.dataset.edited = '1'; });

document.getElementById('btnSaveSettingsBotName')?.addEventListener('click', async () => {
  const inp = document.getElementById('settingsBotNameInput');
  const val = (inp?.value || '').trim();
  if (!val) return;
  await updateConfig({ botName: val });
  if (inp) delete inp.dataset.edited;
  const msg = document.getElementById('settingsBotNameMsg');
  if (msg) {
    msg.textContent = `✓ Nama bot "${val}" berhasil diperbarui.`;
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }
});

document.querySelectorAll('.queue-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = document.getElementById('queueDelayInput');
    if (inp) {
      inp.value = btn.dataset.ms;
      inp.dataset.edited = '1';
    }
  });
});

document.getElementById('btnSaveQueueSettings')?.addEventListener('click', async () => {
  const qdi = document.getElementById('queueDelayInput');
  const qmi = document.getElementById('queueMaxInput');
  const payload = {
    queueSettings: {
      enabled: document.getElementById('toggleQueueEnabled')?.checked,
      skipOwner: document.getElementById('toggleQueueSkipOwner')?.checked,
      delayMs: Number(qdi?.value ?? 1500),
      maxQueueSize: Number(qmi?.value ?? 25),
    }
  };
  await updateConfig(payload);
  if (qdi) delete qdi.dataset.edited;
  if (qmi) delete qmi.dataset.edited;
  const msg = document.getElementById('queueSaveMsg');
  if (msg) {
    msg.textContent = `✓ Pengaturan delay (${payload.queueSettings.delayMs} ms) & antrean tersimpan.`;
    setTimeout(() => { msg.textContent = ''; }, 3500);
  }
});


// Blacklist Grup & User Handlers
let cachedJoinedGroups = [];

function showBlacklistMsg(text) {
  const el = document.getElementById('blacklistSaveMsg');
  if (!el) return;
  el.textContent = text;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function escapeHtmlSafe(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function populateBlacklistGroupSelect(cfg) {
  const sel = document.getElementById('blacklistGroupSelect');
  if (!sel) return;
  const blIds = new Set((cfg?.blacklistedGroups || []).map((g) => g.id));
  const available = cachedJoinedGroups.filter((g) => !blIds.has(g.id));

  if (!cachedJoinedGroups.length) {
    sel.innerHTML = '<option value="">-- Bot belum terhubung / tidak ada grup --</option>';
    return;
  }
  if (!available.length) {
    sel.innerHTML = '<option value="">-- Semua grup sudah masuk blacklist --</option>';
    return;
  }
  sel.innerHTML = '<option value="">-- Pilih grup yang ingin di-blacklist --</option>' +
    available.map((g) => `<option value="${escapeHtmlSafe(g.id)}" data-name="${escapeHtmlSafe(g.name)}">${escapeHtmlSafe(g.name)} (${g.participantsCount} member)</option>`).join('');
}

async function loadJoinedGroupsForBlacklist(showToast = false) {
  try {
    const res = await fetch('/api/groups');
    const data = await res.json();
    if (data.success && Array.isArray(data.groups)) {
      cachedJoinedGroups = data.groups;
      populateBlacklistGroupSelect(window._lastDashCfg || {});
      if (showToast) showBlacklistMsg(`✓ Daftar grup diperbarui (${cachedJoinedGroups.length} grup ditemukan).`);
    }
  } catch {}
}

function renderBlacklistSection(cfg) {
  window._lastDashCfg = cfg;
  const blGroups = Array.isArray(cfg.blacklistedGroups) ? cfg.blacklistedGroups : [];
  const blUsers = Array.isArray(cfg.blacklistedUsers) ? cfg.blacklistedUsers : [];

  const badge = document.getElementById('blacklistCountBadge');
  if (badge) badge.textContent = `${blGroups.length + blUsers.length} Diblokir`;

  populateBlacklistGroupSelect(cfg);

  const gList = document.getElementById('blacklistedGroupsList');
  if (gList) {
    if (!blGroups.length) {
      gList.innerHTML = '<div style="font-size:12px; color:var(--muted); padding:6px 2px;">Belum ada grup yang di-blacklist.</div>';
    } else {
      gList.innerHTML = blGroups.map((g) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 12px; border-radius:10px; border:1px solid var(--border); background:var(--surface);">
          <div style="min-width:0;">
            <div style="font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtmlSafe(g.name)}</div>
            <div style="font-size:11px; color:var(--muted);">${escapeHtmlSafe(g.id)}</div>
          </div>
          <button type="button" class="btn-danger-outline btn-remove-bl-group" data-id="${escapeHtmlSafe(g.id)}" style="margin:0; padding:5px 10px; font-size:11px; flex-shrink:0;">Hapus</button>
        </div>
      `).join('');

      gList.querySelectorAll('.btn-remove-bl-group').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const next = (window._lastDashCfg?.blacklistedGroups || []).filter((item) => item.id !== id);
          await updateConfig({ blacklistedGroups: next });
          showBlacklistMsg('✓ Grup dihapus dari blacklist.');
        });
      });
    }
  }

  const uList = document.getElementById('blacklistedUsersList');
  if (uList) {
    if (!blUsers.length) {
      uList.innerHTML = '<div style="font-size:12px; color:var(--muted); padding:6px 2px;">Belum ada nomor user yang di-blacklist.</div>';
    } else {
      uList.innerHTML = blUsers.map((num) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 12px; border-radius:10px; border:1px solid var(--border); background:var(--surface);">
          <div style="font-size:13px; font-weight:600; color:var(--text);">+${escapeHtmlSafe(num)}</div>
          <button type="button" class="btn-danger-outline btn-remove-bl-user" data-num="${escapeHtmlSafe(num)}" style="margin:0; padding:5px 10px; font-size:11px; flex-shrink:0;">Hapus</button>
        </div>
      `).join('');

      uList.querySelectorAll('.btn-remove-bl-user').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const num = btn.dataset.num;
          const next = (window._lastDashCfg?.blacklistedUsers || []).filter((item) => item !== num);
          await updateConfig({ blacklistedUsers: next });
          showBlacklistMsg(`✓ Nomor +${num} dihapus dari blacklist.`);
        });
      });
    }
  }
}

document.getElementById('btnRefreshBlacklistGroups')?.addEventListener('click', () => {
  loadJoinedGroupsForBlacklist(true);
});

document.querySelector('.nav-item[data-page="settings"]')?.addEventListener('click', () => {
  loadJoinedGroupsForBlacklist(false);
});

document.getElementById('btnAddBlacklistGroup')?.addEventListener('click', async () => {
  const sel = document.getElementById('blacklistGroupSelect');
  const id = (sel?.value || '').trim();
  if (!id) return;
  const opt = sel.options[sel.selectedIndex];
  const name = opt?.dataset?.name || id;
  const current = Array.isArray(window._lastDashCfg?.blacklistedGroups) ? window._lastDashCfg.blacklistedGroups : [];
  if (current.some((g) => g.id === id)) return;
  await updateConfig({ blacklistedGroups: [...current, { id, name }] });
  showBlacklistMsg(`✓ Grup "${name}" berhasil di-blacklist.`);
});

document.getElementById('btnAddBlacklistUser')?.addEventListener('click', async () => {
  const inp = document.getElementById('blacklistUserInput');
  let num = String(inp?.value || '').replace(/\D/g, '');
  if (num.startsWith('08')) num = '62' + num.slice(1);
  if (num.length < 8 || num.length > 16) {
    showBlacklistMsg('⚠️ Masukkan nomor HP yang valid (contoh: 6281234567890).');
    return;
  }
  const current = Array.isArray(window._lastDashCfg?.blacklistedUsers) ? window._lastDashCfg.blacklistedUsers : [];
  if (current.includes(num)) {
    showBlacklistMsg('ℹ️ Nomor tersebut sudah ada di dalam blacklist.');
    return;
  }
  await updateConfig({ blacklistedUsers: [...current, num] });
  if (inp) inp.value = '';
  showBlacklistMsg(`✓ Nomor +${num} berhasil di-blacklist.`);
});

loadJoinedGroupsForBlacklist(false);


// Risk Disclaimer Popup Handler
(function initRiskDisclaimerModal() {
  const STORAGE_KEY = 'lopclient_hide_risk_modal_v1';
  const modal = document.getElementById('riskDisclaimerModal');
  const chkHide = document.getElementById('chkHideRiskModal');
  const btnAccept = document.getElementById('btnAcceptRiskModal');
  if (!modal || !btnAccept) return;

  const isHidden = localStorage.getItem(STORAGE_KEY) === '1';
  if (isHidden) {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  } else {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  btnAccept.addEventListener('click', () => {
    if (chkHide && chkHide.checked) {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    modal.style.display = 'none';
    modal.classList.add('hidden');
  });
})();
