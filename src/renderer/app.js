/* =========================================================================
 * 拾光 · 关注清理 — renderer
 * ========================================================================= */
'use strict';

const api = window.shAPI;

/* ------------------------------ Icons ---------------------------------- */
const ICONS = {
  logo: '<path d="M12 3c1.8 2 2.7 4 2.7 6.1 0 2.4-1.2 4.2-2.7 5.8-1.5-1.6-2.7-3.4-2.7-5.8C9.3 7 10.2 5 12 3Z" fill="currentColor" stroke="none"/><path d="M12 10.5c3.9 0 6.8 2.8 6.8 6.8 0 .7-.1 1.4-.3 2-.8-2.1-2.4-3.5-4.4-4.1M12 10.5c-3.9 0-6.8 2.8-6.8 6.8 0 .7.1 1.4.3 2 .8-2.1 2.4-3.5 4.4-4.1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  overview: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="M12 9V7M12 17v-2M9 12H7M17 12h-2"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  star: '<path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9L12 2.6Z"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  refresh: '<path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
  alert: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  sort: '<path d="m8 9 4-4 4 4M16 15l-4 4-4-4"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M19 16.5 19.8 19l2.2.8-2.2.8-.8 2.4-.8-2.4-2.2-.8 2.2-.8.8-2.5Z"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/>',
  video: '<rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 10 6-3v10l-6-3"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  broom: '<path d="m19 3-8 8"/><path d="M4 21c0-4 2.5-7 6-7l3 3c0 3.5-3 6-7 6l-2-2Z"/><path d="m9 15 6-6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
  coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h2a3 3 0 0 1 0 6h-2"/><path d="M7 3v2M11 3v2M15 3v2"/>'
};

function icon(name, extraClass) {
  const body = ICONS[name] || '';
  return `<svg class="${extraClass || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/* ------------------------------ Utilities ------------------------------ */
const DAY = 86400000;
const PLATFORM_META = {
  bili: { label: '哔哩哔哩', short: 'B站', cls: 'bili', color: '#fb7299', profile: 'https://space.bilibili.com/' },
  douyin: { label: '抖音', short: '抖音', cls: 'douyin', color: '#17181a', profile: 'https://www.douyin.com/user/' }
};
const RISK_COLORS = { high: '#d95f5f', medium: '#d59a3c', low: '#2fa77c', unknown: '#9aa69f' };
const MAX_CLEANUP_PER_RUN = 2000;
const VIEW_META = {
  overview: { label: '概览', icon: 'overview' },
  accounts: { label: '关注列表', icon: 'users' },
  rules: { label: '筛选变量', icon: 'filter' },
  history: { label: '清理记录', icon: 'history' },
  settings: { label: '设置', icon: 'settings' }
};

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function attr(value) { return esc(value); }
function safeImage(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^data:image\//i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:\/\//i, 'https://');
  return '';
}
function hashHue(text) {
  let hash = 0;
  const str = String(text || '');
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash % 360;
}
function fmtNum(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  return String(Math.round(n));
}
function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
}
function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return fmtDate(value) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function ago(value) {
  if (!value) return '—';
  const ts = typeof value === 'number' ? value : new Date(value).getTime();
  if (!Number.isFinite(ts)) return '—';
  const diff = Date.now() - ts;
  if (diff < 0) return '刚刚';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return mins + ' 分钟前';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' 小时前';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + ' 天前';
  const months = Math.floor(days / 30);
  if (months < 12) return months + ' 个月前';
  return Math.floor(months / 12) + ' 年前';
}
function followDuration(days) {
  if (days == null) return '—';
  if (days < 30) return days + ' 天';
  if (days < 365) return Math.floor(days / 30) + ' 个月';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return years + ' 年' + (months ? ' ' + months + ' 个月' : '');
}
function daysSince(ts) {
  if (!ts) return null;
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / DAY));
}
function initialOf(name) { return String(name || '?').trim().slice(0, 1) || '?'; }
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function cloneRules(rules) { return deepClone(rules); }
function setPath(obj, path, value) {
  const parts = path.split('.');
  let target = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!target[parts[i]] || typeof target[parts[i]] !== 'object') target[parts[i]] = {};
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = value;
}
function getPath(obj, path) {
  return path.split('.').reduce(function (acc, key) { return acc == null ? undefined : acc[key]; }, obj);
}
function csvCell(value) {
  const str = value == null ? '' : String(value);
  return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}
function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}
function profileURL(platform, account) {
  if (platform === 'bili') return 'https://space.bilibili.com/' + (account.mid || account.id);
  return 'https://www.douyin.com/user/' + encodeURIComponent(account.secUid || account.id);
}
function avatarHTML(account, extraClass) {
  const name = account && account.name ? account.name : '?';
  const cls = extraClass || '';
  const src = safeImage(account && account.avatar);
  if (!src) {
    return `<span class="avatar avatar-empty ${attr(cls)}">${icon('user')}</span>`;
  }
  return `<span class="avatar-wrap${cls.includes('rounded') ? ' rounded' : ''}"><span class="avatar-fallback" style="--hue:${hashHue(name)}">${esc(initialOf(name))}</span><img class="avatar ${attr(cls)}" data-avatar src="${attr(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
}
function platformLogo(platform, cls) {
  if (platform === 'bili') return `<span class="platform-logo bili ${cls || ''}">B</span>`;
  return `<span class="platform-logo douyin ${cls || ''}">抖</span>`;
}
function riskMeta(risk) { return window.SH.Rules.RISK_META[risk] || window.SH.Rules.RISK_META.unknown; }
function statusLabel(status) { return (window.SH.Rules.STATUS_META[status] || { label: status || '未确认' }).label; }
function riskColor(risk) { return RISK_COLORS[risk] || RISK_COLORS.unknown; }

/* ------------------------------ State ---------------------------------- */
function defaultFilters() {
  return {
    q: '',
    risk: 'all',
    match: 'all',
    whitelist: 'all',
    works: 'all',
    profile: 'all',
    category: 'all',
    suggestedOnly: false,
    sort: 'risk_desc'
  };
}

const state = {
  boot: null,
  platform: localStorage.getItem('sh.platform') === 'douyin' ? 'douyin' : 'bili',
  view: (location.hash || '').replace('#', '') || 'overview',
  data: { bili: null, douyin: null },
  demo: false,
  demoData: { bili: null, douyin: null },
  demoHistory: { bili: null, douyin: null },
  demoCleanup: null,
  demoCleanupTimer: null,
  demoPaused: false,
  selection: new Set(),
  filters: defaultFilters(),
  page: 1,
  pageSize: 50,
  _pageSizeCustom: false,
  visualFilters: new Set(),
  listConditionsOpen: true,
  _listConditionCache: null,
  ruleDraft: null,
  ruleDraftPlatform: null,
  settingsDraft: null,
  historyTab: 'cleanup',
  modal: null,
  toastTimer: null,
  loading: true,
  loadError: '',
  scanRenderTimer: null,
  lastScanPercent: {},
  _accountRev: 0,
  _decoratedCache: null,
  _rulesLiveTimer: null
};

if (!VIEW_META[state.view]) state.view = 'overview';

const bridge = {
  async call(method) {
    const args = Array.prototype.slice.call(arguments, 1);
    const result = await api.call.apply(null, [method].concat(args));
    if (!result || !result.ok) {
      const err = new Error((result && result.error && result.error.message) || '操作失败');
      err.code = result && result.error && result.error.code;
      throw err;
    }
    return result.data;
  }
};

/* --------------------------- Payload helpers --------------------------- */
function activePayload() {
  if (!state.platform) return null;
  return state.demo ? state.demoData[state.platform] : state.data[state.platform];
}
function activeHistory() {
  if (state.demo) return state.demoHistory[state.platform] || { cleanups: [], scans: [] };
  return (state.boot && state.boot.history) || { cleanups: [], scans: [] };
}
function isConnected() {
  const p = activePayload();
  return !!(p && p.account);
}
function accountList() {
  const p = activePayload();
  return p && Array.isArray(p.accounts) ? p.accounts : [];
}
function whitelistViewActive() {
  return !!(state.visualFilters && state.visualFilters.has('other_whitelist'));
}

function allFollowingAccounts() {
  return accountList().filter(function (a) { return a.following !== false; });
}

function followingAccounts() {
  const list = allFollowingAccounts();
  return whitelistViewActive() ? list : list.filter(function (a) { return !a.whitelist; });
}

function pruneWhitelistSelection() {
  if (whitelistViewActive() || !state.selection || !state.selection.size) return;
  const hidden = new Set(allFollowingAccounts().filter(function (a) { return a.whitelist; }).map(function (a) { return String(a.id); }));
  state.selection.forEach(function (id) { if (hidden.has(String(id))) state.selection.delete(id); });
}
function activeRules() {
  const p = activePayload();
  return (p && p.rules) || (state.boot && state.boot.rules[state.platform]) || window.SH.Rules.defaultRules(state.platform);
}
function evaluateWithRules(rules) {
  const now = Date.now();
  return followingAccounts().map(function (account) {
    const evaluation = window.SH.Rules.evaluate(account, rules, now);
    return Object.assign({}, account, {
      _eval: evaluation,
      riskScore: evaluation.score,
      risk: evaluation.risk,
      reasons: evaluation.reasons,
      match: evaluation.match,
      suggested: evaluation.suggested,
      confidence: evaluation.confidence
    });
  });
}
function invalidateAccountCache() {
  state._accountRev = (state._accountRev || 0) + 1;
  state._decoratedCache = null;
  state._listConditionCache = null;
}

function decoratedAccounts() {
  const payload = activePayload();
  if (!payload) return [];
  const rules = activeRules();
  const key = [
    state.platform,
    state.demo ? 'demo' : 'real',
    whitelistViewActive() ? 'with-white' : 'no-white',
    state._accountRev || 0,
    rules.updatedAt || 0,
    payload.accounts ? payload.accounts.length : 0
  ].join('|');
  if (state._decoratedCache && state._decoratedCache.key === key) return state._decoratedCache.value;
  const value = evaluateWithRules(rules);
  state._decoratedCache = { key: key, value: value };
  return value;
}
function currentScan() {
  const p = activePayload();
  return (p && p.scan) || { status: 'idle', phase: 'idle' };
}
function scanForPlatform(platform) {
  if (state.demo) return (state.demoData[platform] && state.demoData[platform].scan) || { status: 'idle' };
  const p = state.data[platform];
  if (p && p.scan) return p.scan;
  return (state.boot && state.boot.scans && state.boot.scans[platform]) || { status: 'idle' };
}
function currentCleanup() {
  if (state.demo && state.demoCleanup) return state.demoCleanup;
  const p = activePayload();
  return (p && p.cleanup) || { status: 'idle' };
}
function scanPercent(scan) {
  if (!scan) return 0;
  if (scan.status === 'completed') return 100;
  if (scan.phase === 'done') return 100;
  const total = Number(scan.total) || 0;
  if (scan.phase === 'list') {
    if (!total) return scan.scanned ? Math.min(45, scan.scanned * 2) : 3;
    return Math.min(54, Math.round((scan.scanned / total) * 54));
  }
  if (scan.phase === 'enrich') {
    const et = Number(scan.enrichTotal) || 0;
    if (!et) return 58;
    return Math.min(99, 55 + Math.round((Number(scan.enriched) || 0) / et * 44));
  }
  return scan.status === 'paused' ? 0 : 0;
}
function scanPhaseLabel(scan) {
  if (!scan) return '待扫描';
  if (scan.status === 'completed') return '扫描完成';
  if (scan.status === 'paused') return scan.riskPaused ? '等待安全验证' : '已暂停';
  if (scan.status === 'stopped') return '已停止';
  if (scan.status === 'error') return '扫描出错';
  if (scan.phase === 'list') return '正在读取关注列表';
  if (scan.phase === 'enrich') return '正在核验账号变量';
  return '准备扫描';
}
function totalFollowing() { return followingAccounts().length; }
function highRiskCount() {
  return decoratedAccounts().filter(function (a) { return a.risk === 'high'; }).length;
}

/* ----------------------------- Rendering ------------------------------- */
const root = document.getElementById('app');
const contentEl = document.getElementById('content');

function renderSidebar() {
  const p = activePayload();
  const total = totalFollowing();
  const conn = p && p.account;
  const scan = currentScan();
  const active = (name) => state.view === name ? ' active' : '';
  const nav = ['overview', 'accounts', 'rules', 'history', 'settings'].map(function (key) {
    const meta = VIEW_META[key];
    const count = key === 'accounts' && total ? total : '';
    const dot = key === 'accounts' && (scan.status === 'scanning' || scan.status === 'paused') ? '<span class="nav-dot"></span>' : '';
    return `<button class="nav-item${active(key)}" data-act="nav" data-view="${key}">
      ${icon(meta.icon)}<span>${meta.label}</span>${count ? `<span class="nav-count">${total}</span>` : dot}
    </button>`;
  }).join('');

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="brand">
      <div class="brand-mark">${icon('logo')}</div>
      <div class="brand-text">
        <div class="brand-title">拾光<span>·</span>关注清理</div>
        <div class="brand-sub">FOLLOW CLEANER <span class="version-pill">v${esc((state.boot && state.boot.version) || '1.4.0')}</span></div>
      </div>
    </div>
    <div class="platform-switch">
      <button class="platform-btn ${state.platform === 'bili' ? 'active' : ''}" data-act="switch-platform" data-platform="bili">
        <span class="platform-logo bili">B</span>哔哩哔哩
        ${(state.data.bili && state.data.bili.account) || (state.demoData.bili && state.demoData.bili.account) ? '<span class="dot"></span>' : ''}
      </button>
      <button class="platform-btn ${state.platform === 'douyin' ? 'active' : ''}" data-act="switch-platform" data-platform="douyin">
        <span class="platform-logo douyin">抖</span>抖音
        ${(state.data.douyin && state.data.douyin.account) || (state.demoData.douyin && state.demoData.douyin.account) ? '<span class="dot"></span>' : ''}
      </button>
    </div>
    <div class="nav">
      <div class="nav-label">WORKSPACE</div>
      ${nav}
    </div>
    <div class="sidebar-foot">
      ${conn ? `<button class="side-account" data-act="nav" data-view="settings">
        ${avatarHTML(conn)}
        <div class="grow" style="min-width:0">
          <div class="side-account-name">${esc(conn.name || '已连接账号')}</div>
          <div class="side-account-sub">${state.demo ? '演示账号' : '已连接 · 本地会话'}</div>
        </div>
        <span class="status-dot"></span>
      </button>` : ''}
      <div class="privacy-card">
        <strong>${icon('lock')}本地优先</strong>
        登录状态保存在本机浏览器会话中，关注数据与分析结果仅写入本地文件。
      </div>
    </div>`;
}

function renderTopbar() {
  const p = activePayload();
  const conn = p && p.account;
  const scan = currentScan();
  const scanning = scan.status === 'scanning';
  const paused = scan.status === 'paused';
  const pct = scanPercent(scan);
  const meta = VIEW_META[state.view];
  let sub = '';
  if (state.demo) sub = '演示模式 · 所有操作均为本地模拟';
  else if (!conn) sub = '连接账号后开始扫描与整理';
  else if (viewSubtitle()) sub = viewSubtitle();
  else sub = '关注列表管理';

  const scanLabel = !conn ? '连接账号' : scanning ? `扫描中 ${pct}%` : paused ? '继续扫描' : '扫描关注列表';
  const scanIcon = scanning ? 'pause' : 'scan';
  const top = document.getElementById('topbar');
  top.innerHTML = `
    <div class="page-heading">
      <div class="page-kicker">${PLATFORM_META[state.platform].short}<span class="sep">/</span>${state.demo ? 'DEMO' : 'LOCAL'}</div>
      <div class="page-title">${esc(meta.label)}</div>
      <div class="page-sub">${esc(sub)}</div>
    </div>
    <div class="top-actions">
      ${state.demo ? '<span class="demo-chip">演示数据</span>' : (conn ? '<span class="conn-chip"><span class="dot"></span>已连接</span>' : '<span class="conn-chip off"><span class="dot"></span>未连接</span>')}
      ${conn ? `<button class="top-account" data-act="nav" data-view="settings">
        ${avatarHTML(conn)}
        <div style="text-align:left">
          <div class="top-account-name">${esc(conn.name || '账号')}</div>
          <div class="top-account-sub">${esc(conn.uniqueId || PLATFORM_META[state.platform].short)}</div>
        </div>
      </button>` : ''}
      ${(conn || state.demo) ? `<button class="btn ${scanning || paused ? 'btn-soft' : 'btn-primary'}" data-act="scan">
        ${scanning ? '<span class="spinner" style="width:13px;height:13px;border-width:1.5px"></span>' : icon(scanIcon)}
        <span data-scan-label>${scanLabel}</span>
      </button>` : ''}
    </div>`;
}

function viewSubtitle() {
  const total = totalFollowing();
  const scan = currentScan();
  if (state.view === 'overview') return scan.status === 'scanning' ? '正在更新本地关注数据' : (total ? `共 ${total} 个关注账号` : '还没有扫描数据');
  if (state.view === 'accounts') return total ? `共 ${total} 个关注账号 · ${decoratedAccounts().filter(function (a) { return a.suggested; }).length} 个建议清理` : '等待扫描关注列表';
  if (state.view === 'rules') return '统一管理筛选变量 · AND/OR 组合 · 评分排序';
  if (state.view === 'history') return '扫描快照与每一次清理的本地记录';
  if (state.view === 'settings') return '连接、扫描与清理安全设置';
  return '';
}

function renderContent(preserveScroll) {
  const scroll = contentEl.scrollTop;
  const activeEl = document.activeElement;
  const focusId = activeEl && activeEl.id ? activeEl.id : '';
  const focusStart = activeEl && typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
  const focusEnd = activeEl && typeof activeEl.selectionEnd === 'number' ? activeEl.selectionEnd : null;
  let html = '';
  if (state.loading) {
    html = `<div class="page"><div class="loading-page"><span class="spinner lg"></span><div class="loading-title">正在加载本地数据</div><div class="loading-sub">你的数据只保存在这台电脑上</div></div></div>`;
  } else if (state.loadError) {
    html = `<div class="page"><div class="empty-state" style="padding-top:120px"><div class="empty-art">${icon('alert')}</div><h3>加载失败</h3><p>${esc(state.loadError)}</p><button class="btn btn-primary" data-act="reload">重新加载</button></div></div>`;
  } else {
    if (state.view === 'overview') html = renderOverview();
    else if (state.view === 'accounts') html = renderAccounts();
    else if (state.view === 'rules') html = renderRules();
    else if (state.view === 'history') html = renderHistory();
    else if (state.view === 'settings') html = renderSettings();
    else html = renderOverview();
  }
  contentEl.innerHTML = html;
  if (preserveScroll) contentEl.scrollTop = scroll;
  if (focusId) {
    const next = document.getElementById(focusId);
    if (next && typeof next.focus === 'function') {
      next.focus();
      if (focusStart != null && typeof next.setSelectionRange === 'function') {
        try { next.setSelectionRange(focusStart, focusEnd == null ? focusStart : focusEnd); } catch (e) { /* ignore */ }
      }
    }
  }
  bindImageFallbacks();
}

function bindImageFallbacks() {
  document.querySelectorAll('img[data-avatar]').forEach(function (img) {
    if (img.dataset.bound) return;
    img.dataset.bound = '1';
    img.addEventListener('error', function () {
      const wrap = img.closest('.avatar-wrap');
      if (wrap) wrap.classList.add('img-failed');
    });
  });
}

function render() {
  renderSidebar();
  renderTopbar();
  renderContent(true);
  if (state.modal) renderModal();
}

function navigate(view) {
  if (!VIEW_META[view]) view = 'overview';
  state.view = view;
  state.page = 1;
  history.replaceState(null, '', '#' + view);
  render();
  contentEl.scrollTop = 0;
}
function switchPlatform(platform) {
  if (!['bili', 'douyin'].includes(platform) || state.platform === platform) return;
  state.platform = platform;
  localStorage.setItem('sh.platform', platform);
  state.selection.clear();
  state.filters = defaultFilters();
  state.visualFilters = new Set();
  state.listConditionsOpen = true;
  state._listConditionCache = null;
  state.ruleDraft = null;
  state.ruleDraftPlatform = null;
  state.settingsDraft = null;
  state.page = 1;
  render();
  if (!state.demo && !state.data[platform]) loadPlatform(platform).then(render).catch(handleFatal);
}

function scheduleRender(delay) {
  if (state.scanRenderTimer) return;
  state.scanRenderTimer = setTimeout(function () {
    state.scanRenderTimer = null;
    render();
  }, delay == null ? 100 : delay);
}

function updateScanProgress() {
  const scan = currentScan();
  const pct = scanPercent(scan);
  const topLabel = document.querySelector('[data-scan-label]');
  if (topLabel) topLabel.textContent = scan.status === 'scanning' ? `扫描中 ${pct}%` : scan.status === 'paused' ? '继续扫描' : '扫描关注列表';
  if (!['scanning', 'paused', 'stopping'].includes(scan.status)) return;
  if (state.view === 'accounts') {
    const el = document.querySelector('.scan-inline');
    if (!el) return;
    if (el.dataset.scanStatus !== scan.status) {
      el.outerHTML = renderScanInline(scan);
      return;
    }
    const bar = el.querySelector('[data-scan-inline-progress]');
    const chip = el.querySelector('[data-scan-inline-pct]');
    const sub = el.querySelector('[data-scan-inline-sub]');
    if (bar) bar.style.width = pct + '%';
    if (chip) chip.textContent = pct + '%';
    if (sub) sub.textContent = scan.current || scanPhaseLabel(scan);
  } else if (state.view === 'overview') {
    const panel = document.querySelector('.scan-panel');
    if (!panel) return;
    if (panel.dataset.scanStatus === 'completed') return;
    const activePanel = panel.querySelector('.ring-fill');
    if (!activePanel && scan.status !== 'scanning' && scan.status !== 'paused') return;
    if (panel.dataset.scanStatus !== scan.status) {
      panel.outerHTML = renderScanPanel(scan, followingAccounts().length, followingAccounts().filter(function (a) { return a.enrichedAt; }).length);
      return;
    }
    const bar = panel.querySelector('[data-scan-progress]');
    const percent = panel.querySelector('[data-scan-percent]');
    const phase = panel.querySelector('[data-scan-phase]');
    const current = panel.querySelector('[data-scan-current]');
    const hint = panel.querySelector('[data-scan-hint]');
    const ring = panel.querySelector('.ring-fill');
    if (bar) bar.style.width = pct + '%';
    if (percent) percent.textContent = pct + '%';
    if (phase) phase.textContent = scanPhaseLabel(scan);
    if (current) current.textContent = scan.current || '正在准备分析';
    if (hint) hint.textContent = scan.phase === 'list'
      ? `已读取 ${fmtNum(scan.scanned)} / ${fmtNum(scan.total || '?')} 个账号`
      : `已分析 ${fmtNum(scan.enriched)} / ${fmtNum(scan.enrichTotal || 0)} 个账号`;
    if (ring) {
      const circumference = 2 * Math.PI * 42;
      ring.setAttribute('stroke-dashoffset', (circumference * (1 - Math.max(0, Math.min(100, pct)) / 100)).toFixed(1));
    }
  }
}

function updateCleanupModalLive(cleanup) {
  if (!cleanup || !state.modal || state.modal.type !== 'cleanup') return;
  const total = Number(cleanup.total) || 0;
  const done = Number(cleanup.done) || 0;
  const pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;
  const results = Array.isArray(cleanup.results) ? cleanup.results : [];
  const success = cleanup.success != null ? Number(cleanup.success) : results.filter(function (r) { return r.ok; }).length;
  const failed = cleanup.failed != null ? Number(cleanup.failed) : results.filter(function (r) { return !r.ok; }).length;
  const pctEl = document.querySelector('[data-cleanup-pct]');
  if (pctEl) pctEl.innerHTML = pct + '<small>%</small>';
  const bar = document.querySelector('[data-cleanup-progress]');
  if (bar) bar.style.width = pct + '%';
  const current = document.querySelector('[data-cleanup-current]');
  if (current) current.textContent = cleanup.current || '准备中…';
  const doneEl = document.querySelector('[data-cleanup-done]');
  if (doneEl) doneEl.textContent = done + ' / ' + total;
  const successEl = document.querySelector('[data-cleanup-success]');
  if (successEl) successEl.textContent = success;
  const failedEl = document.querySelector('[data-cleanup-failed]');
  if (failedEl) failedEl.textContent = failed;
  const log = document.querySelector('[data-cleanup-log]');
  if (log) {
    log.innerHTML = results.slice(-7).reverse().map(function (r) {
      return `<div class="progress-log-row">${icon(r.ok ? 'check' : 'alert')}<span class="nm">${esc(r.name || r.id)}</span><span class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '成功' : '失败'}</span></div>`;
    }).join('') || '<div class="progress-log-row"><span class="nm">准备开始处理…</span></div>';
  }
}

function toast(message, level) {
  const root = document.getElementById('toastRoot');
  const el = document.createElement('div');
  el.className = 'toast ' + (level || '');
  const ic = level === 'error' ? 'alert' : level === 'warn' ? 'alert' : level === 'success' ? 'check' : 'info';
  el.innerHTML = `${icon(ic)}<div class="t">${esc(message)}</div><button class="close" data-close-toast>${icon('close')}</button>`;
  el.querySelector('[data-close-toast]').addEventListener('click', function () { el.remove(); });
  root.appendChild(el);
  setTimeout(function () { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; el.style.transition = '180ms ease'; setTimeout(function () { el.remove(); }, 200); }, 4200);
}

function handleFatal(e) {
  console.error(e);
  toast((e && e.message) || '发生未知错误', 'error');
}

/* --------------------------- Data loading ------------------------------ */
async function loadPlatform(platform) {
  const payload = await bridge.call('getPlatform', platform);
  state.data[platform] = payload;
  invalidateAccountCache();
  if (state.boot) {
    state.boot.connections[platform] = payload.account;
    state.boot.rules[platform] = payload.rules;
    state.boot.stats[platform] = payload.stats;
    state.boot.scans[platform] = payload.scan;
    state.boot.cleanups[platform] = payload.cleanup;
    state.boot.lastSummary[platform] = payload.lastSummary;
  }
  return payload;
}

async function loadBootstrap() {
  const data = await bridge.call('bootstrap');
  state.boot = data;
  const savedPageSize = Number(localStorage.getItem('sh.pageSize') || 0);
  const bootPageSize = Number(data.settings && data.settings.ui && data.settings.ui.pageSize) || 50;
  state.pageSize = clampPageSize(savedPageSize || bootPageSize);
  state._pageSizeCustom = PAGE_SIZE_PRESETS.indexOf(state.pageSize) < 0;
  state.historyTab = 'cleanup';
  await Promise.all(['bili', 'douyin'].map(async function (platform) {
    try { await loadPlatform(platform); } catch (e) { console.error('load platform failed', platform, e); }
  }));
  state.loading = false;
}

/* ------------------------------ Init ----------------------------------- */
async function init() {
  bindGlobalEvents();
  try {
    await loadBootstrap();
    render();
    if (state.view === 'overview') contentEl.scrollTop = 0;
  } catch (e) {
    state.loading = false;
    state.loadError = e.message || String(e);
    render();
    console.error(e);
  }
}

/* --------------------------- Event binding ----------------------------- */
function bindGlobalEvents() {
  document.addEventListener('click', function (event) {
    const openMenu = document.querySelector('.select-menu[open]');
    if (openMenu && !event.target.closest('.select-menu')) openMenu.removeAttribute('open');
    const closer = event.target.closest('[data-close-toast]');
    if (closer) { const t = closer.closest('.toast'); if (t) t.remove(); return; }
    const el = event.target.closest('[data-act]');
    if (!el) {
      const overlay = event.target.closest('.overlay');
      if (overlay && event.target === overlay && !overlay.dataset.static) closeModal();
      return;
    }
    handleAction(el.dataset.act, el, event);
  });
  document.addEventListener('change', function (event) {
    handleChange(event.target);
  });
  document.addEventListener('input', function (event) {
    handleInput(event.target);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (state.modal) closeModal();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      navigate('accounts');
      setTimeout(function () { const el = document.getElementById('searchInput'); if (el) el.focus(); }, 80);
    }
  });
  window.addEventListener('hashchange', function () {
    const view = (location.hash || '').replace('#', '');
    if (VIEW_META[view] && view !== state.view) { state.view = view; state.page = 1; render(); }
  });
  document.addEventListener('error', function (event) {
    const img = event.target;
    if (img && img.tagName === 'IMG' && img.dataset.avatar) {
      const wrap = img.closest('.avatar-wrap');
      if (wrap) wrap.classList.add('img-failed');
    }
  }, true);
  if (api && api.onEvent) {
    api.onEvent(function (event) {
      if (!event) return;
      if (event.type === 'scan') {
        const platform = event.platform;
        if (state.boot && state.boot.scans) state.boot.scans[platform] = event.state;
        if (state.data[platform]) state.data[platform].scan = event.state;
        if (event.state && (event.state.status === 'completed' || event.state.status === 'stopped' || event.state.status === 'error')) {
          clearTimeout(state.scanRenderTimer);
          state.scanRenderTimer = null;
          // The scan-end event performs the single authoritative reload.
        } else if (platform === state.platform) {
          updateScanProgress();
        }
      } else if (event.type === 'scan-end') {
        if (event.state && event.state.status === 'completed') {
          const p = event.platform === 'bili' ? 'B站' : '抖音';
          toast(p + '扫描完成，关注数据已更新', 'success');
        } else if (event.state && event.state.status === 'paused' && event.state.riskPaused) {
          toast('扫描已自动暂停：平台要求安全验证，请完成验证后继续', 'warn');
        } else if (event.state && event.state.status === 'error') {
          toast(event.state.error || '扫描失败', 'error');
        }
        if (event.platform === state.platform) state.selection.clear();
        loadPlatform(event.platform).then(async function () {
          try { state.boot.history = await bridge.call('getHistory'); } catch (e) { /* ignore */ }
          if (event.platform === state.platform) render();
        }).catch(handleFatal);
      } else if (event.type === 'cleanup') {
        const platform = event.platform;
        if (state.data[platform]) state.data[platform].cleanup = event.state;
        if (state.boot && state.boot.cleanups) state.boot.cleanups[platform] = event.state;
        if (state.modal && state.modal.type === 'cleanup' && state.modal.platform === platform) {
          const status = event.state && event.state.status;
          if (state.modal._cleanupStatus !== status) {
            state.modal._cleanupStatus = status;
            renderModal();
          } else if (status === 'running') {
            updateCleanupModalLive(event.state);
          }
        }
      } else if (event.type === 'cleanup-end') {
        loadPlatform(event.platform).then(async function () {
          try { state.boot.history = await bridge.call('getHistory'); } catch (e) { /* ignore */ }
          if (state.modal && state.modal.type === 'cleanup' && state.modal.platform === event.platform) renderModal();
          if (event.platform === state.platform && state.view !== 'settings') render();
        }).catch(handleFatal);
      } else if (event.type === 'connection') {
        if (state.boot) state.boot.connections[event.platform] = event.account;
        if (event.account) {
          loadPlatform(event.platform).then(function () { if (event.platform === state.platform) render(); }).catch(handleFatal);
        }
      } else if (event.type === 'account-updated') {
        const platform = event.platform;
        if (platform === state.platform && state.view === 'accounts' && currentScan().status === 'scanning') {
          // Avoid re-rendering on every enriched row; the scan end refresh handles it.
        }
      } else if (event.type === 'toast') {
        toast(event.message, event.level);
      } else if (event.type === 'cleanup-risk') {
        toast(event.error || '平台要求安全验证，清理已自动暂停', 'warn');
      } else if (event.type === 'scan-error') {
        toast(event.error || '扫描失败', 'error');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);

/* ======================================================================== *
 *  OVERVIEW
 * ======================================================================== */
function renderOverview() {
  if (!isConnected()) return renderOnboarding();
  const p = activePayload();
  const list = decoratedAccounts();
  const total = list.length;
  const high = list.filter(function (a) { return a.risk === 'high'; }).length;
  const matched = list.filter(function (a) { return a.match; }).length;
  const suggested = list.filter(function (a) { return a.suggested; }).length;
  const whitelist = allFollowingAccounts().filter(function (a) { return a.whitelist; }).length;
  const analyzed = list.filter(function (a) { return a.enrichedAt; }).length;
  const scan = currentScan();
  const summary = p.lastSummary;
  const platform = PLATFORM_META[state.platform];
  const lastScanText = scan.endedAt ? fmtDateTime(scan.endedAt) : '尚未扫描';
  const heroTitle = scan.status === 'scanning'
    ? '正在整理你的<br><em>关注列表。</em>'
    : (high ? '关注列表，<br><em>保持清爽。</em>' : '关注列表，<br><em>一目了然。</em>');
  const heroDesc = scan.status === 'scanning'
    ? '扫描在本地进行，可随时暂停。已扫描的数据会立即保存，下次不用从头开始。'
    : '把长期不更新、低互动或已经异常的账号找出来，由你逐一确认后再清理。没有自动误操作。';

  return `<div class="page">
    <div class="overview-top">
      <section class="hero">
        <div class="hero-corner-note"><span class="dot"></span>本地处理 · 不上传</div>
        <div>
          <div class="eyebrow">${platform.short} FOLLOW LIST / ${state.demo ? 'DEMO' : 'LIVE'}</div>
          <h1 class="hero-title">${heroTitle}</h1>
          <p class="hero-desc">${heroDesc}</p>
        </div>
        <div>
          <div class="hero-stats">
            <div class="hero-stat"><div class="num">${fmtNum(total)}<small>个</small></div><div class="lbl">当前关注</div></div>
            <div class="hero-stat"><div class="num rose">${fmtNum(high)}<small>个</small></div><div class="lbl">高风险待检查</div></div>
            <div class="hero-stat"><div class="num">${fmtNum(whitelist)}<small>个</small></div><div class="lbl">白名单保护</div></div>
          </div>
          <div class="hero-actions">
            <button class="btn btn-primary" data-act="view-high-risk">${icon('target')}查看高风险账号</button>
            <button class="btn" data-act="nav" data-view="rules">${icon('filter')}编辑筛选变量</button>
          </div>
        </div>
      </section>
      ${renderScanPanel(scan, total, analyzed)}
    </div>

    <div class="stat-grid">
      <div class="card stat-card">
        <div><div class="stat-label">${icon('users')}关注总数</div><div class="stat-value">${fmtNum(total)}<small>个</small></div><div class="stat-trend">${summary ? `上次扫描新增 ${summary.added || 0} 个` : '等待首次扫描'}</div></div>
        <div class="stat-icon jade">${icon('users')}</div>
      </div>
      <div class="card stat-card">
        <div><div class="stat-label">${icon('alert')}高风险</div><div class="stat-value" style="color:var(--rose)">${fmtNum(high)}<small>个</small></div><div class="stat-trend">${total ? Math.round(high / total * 100) : 0}% 的关注账号</div></div>
        <div class="stat-icon rose">${icon('alert')}</div>
      </div>
      <div class="card stat-card">
        <div><div class="stat-label">${icon('filter')}筛选匹配</div><div class="stat-value">${fmtNum(matched)}<small>个</small></div><div class="stat-trend">其中建议清理 ${fmtNum(suggested)} 个</div></div>
        <div class="stat-icon amber">${icon('filter')}</div>
      </div>
      <div class="card stat-card">
        <div><div class="stat-label">${icon('shieldCheck')}白名单保护</div><div class="stat-value">${fmtNum(whitelist)}<small>个</small></div><div class="stat-trend">不会被批量清理</div></div>
        <div class="stat-icon blue">${icon('shieldCheck')}</div>
      </div>
    </div>

    <div class="overview-bottom">
      ${renderRiskCard(list)}
      ${renderRecentPanel()}
    </div>

    <div class="tip-strip">${icon('info')}<div><strong>关于评分：</strong>没有头像、没有作品或没有简介，并不等于僵尸账号。综合评分只是帮你排列检查顺序的参考，最终是否取消关注始终由你确认。${state.demo ? '<br><strong>当前为演示数据，</strong>所有取消关注操作都只在本地模拟，不会触碰真实账号。' : ''}</div></div>
  </div>`;
}

function renderOnboarding() {
  const connectedOther = state.platform === 'bili' ? (state.data.douyin && state.data.douyin.account) : (state.data.bili && state.data.bili.account);
  const platform = PLATFORM_META[state.platform];
  return `<div class="page">
    <div class="onboard">
      <section class="onboard-hero">
        <div class="onboard-copy">
          <div class="eyebrow onboard-eyebrow">FOLLOW LIST, CLEAN AGAIN</div>
          <h1 class="onboard-title">把关注列表，<br><em>重新整理一遍。</em></h1>
          <p class="onboard-desc">连接你的${esc(platform.label)}账号，完整扫描关注列表，用多个变量交叉分析，再由你亲自确认每一个要清理的账号。没有黑箱，也不会替你直接操作。</p>
          <div class="onboard-actions">
            <button class="btn btn-primary btn-lg" data-act="connect" data-platform="${state.platform}">${platformLogo(state.platform)}连接${esc(platform.short)}账号</button>
            <button class="btn btn-lg" data-act="connect" data-platform="${state.platform === 'bili' ? 'douyin' : 'bili'}">${platformLogo(state.platform === 'bili' ? 'douyin' : 'bili')}连接${state.platform === 'bili' ? '抖音' : 'B站'}</button>
            <button class="btn btn-ghost btn-lg" data-act="demo">${icon('play')}先看看演示</button>
          </div>
          <div class="onboard-steps">
            <div class="onboard-step"><div class="n">1</div><div><div class="t">扫码连接</div><div class="s">复用本机登录状态，尽量只登录一次</div></div></div>
            <div class="onboard-step"><div class="n">2</div><div><div class="t">完整扫描</div><div class="s">自动翻页，暂停后数据仍在</div></div></div>
            <div class="onboard-step"><div class="n">3</div><div><div class="t">确认清理</div><div class="s">逐条检查，批量取关可暂停</div></div></div>
          </div>
        </div>
        <div class="onboard-visual">
          <div class="orbit-card">
            <div class="orbit-head"><div class="orbit-avatar">${icon('users')}</div><div><div class="orbit-title">关注列表分析</div><div class="orbit-sub">${PLATFORM_META[state.platform].label} · 本地数据</div></div><span class="chip jade" style="margin-left:auto">预览</span></div>
            <div class="orbit-bars"><div class="orbit-bar"><span style="width:82%"></span></div><div class="orbit-bar"><span class="dark" style="width:56%"></span></div><div class="orbit-bar"><span style="width:34%"></span></div></div>
            <div class="orbit-tags"><span class="chip">长期未更新</span><span class="chip">低互动</span><span class="chip">异常状态</span></div>
          </div>
          <div class="orbit-card">
            <div class="orbit-head"><div class="orbit-avatar" style="background:#fdf2e1;color:#b56b0c">${icon('shieldCheck')}</div><div><div class="orbit-title">清理前，先由你确认</div><div class="orbit-sub">白名单保护 · 二次确认 · 可随时暂停</div></div></div>
          </div>
        </div>
      </section>

      <div class="onboard-features">
        <div class="card feature-card"><div class="feature-icon" style="background:var(--jade-soft);color:var(--jade)">${icon('scan')}</div><h4>完整扫描，不只看第一页</h4><p>自动翻页获取全部关注账号，扫描进度实时保存，暂停或关闭后再继续。</p></div>
        <div class="card feature-card"><div class="feature-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('filter')}</div><h4>多变量组合筛选</h4><p>活跃度、资料完整度、关注时间、互动关系自由组合，支持 AND / OR 与权重评分。</p></div>
        <div class="card feature-card"><div class="feature-icon" style="background:var(--amber-soft);color:var(--amber)">${icon('shieldCheck')}</div><h4>人工确认后才操作</h4><p>先展示准备取消的关注数量，二次确认、限速执行，遇到平台限制自动暂停。</p></div>
      </div>
      ${connectedOther ? `<div class="alert info">${icon('info')}<div>另一个平台已连接。可以在左上角切换平台继续管理，或者连接当前平台的账号。</div></div>` : ''}
      <div class="tip-strip">${icon('lock')}<div><strong>登录与数据：</strong>工具使用内置浏览器复用平台登录态，登录 Cookie 由 Windows 上的 Chromium 会话保存；关注列表和分析结果只写入本机数据文件，不上传任何服务器。你随时可以在设置中退出登录并清除数据。</div></div>
    </div>
  </div>`;
}

function renderScanPanel(scan, total, analyzed) {
  const pct = scanPercent(scan);
  const active = scan.status === 'scanning' || scan.status === 'paused' || scan.status === 'stopping';
  const done = scan.status === 'completed';
  const err = scan.status === 'error';
  const ringColor = err ? 'rose' : scan.riskPaused ? 'amber' : '';
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);
  let body = '';
  if (active) {
    const phase = scanPhaseLabel(scan);
    body = `
      <div class="scan-ring-row">
        <div class="ring"><svg viewBox="0 0 96 96"><circle class="ring-bg" cx="48" cy="48" r="42" fill="none" stroke-width="6"/><circle class="ring-fill ${ringColor}" cx="48" cy="48" r="42" fill="none" stroke-width="6" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/></svg><div class="ring-center"><strong data-scan-percent>${pct}%</strong><span>进度</span></div></div>
        <div class="scan-meta">
          <div class="phase" data-scan-phase>${esc(phase)}</div>
          <div class="current" data-scan-current>${esc(scan.current || (scan.phase === 'list' ? '正在读取关注列表' : '正在准备分析'))}</div>
          <div class="hint" data-scan-hint>${scan.phase === 'list' ? `已读取 ${fmtNum(scan.scanned)} / ${fmtNum(scan.total || '?')} 个账号` : `已分析 ${fmtNum(scan.enriched)} / ${fmtNum(scan.enrichTotal || 0)} 个账号`}</div>
        </div>
      </div>
      <div class="scan-progressbar"><span data-scan-progress style="width:${pct}%"></span></div>
      <div class="scan-counts"><span>已扫描 <b>${fmtNum(scan.scanned)}</b></span><span>分析 <b>${fmtNum(scan.enriched)}</b></span><span>失败 <b>${fmtNum(scan.failed)}</b></span></div>
      <div class="scan-actions">
        ${scan.status === 'paused' ? `<button class="btn btn-jade btn-sm" data-act="resume-scan">${icon('play')}继续扫描</button>` : `<button class="btn btn-sm" data-act="pause-scan">${icon('pause')}暂停</button>`}
        <button class="btn btn-ghost btn-sm" data-act="stop-scan">${icon('stop')}停止</button>
      </div>
      ${scan.status === 'paused' && scan.error ? `<div class="alert ${scan.riskPaused ? 'warn' : 'info'}" style="padding:8px 10px">${icon(scan.riskPaused ? 'alert' : 'info')}<div>${esc(scan.error)}</div></div>` : ''}`;
  } else if (done) {
    const summary = activePayload() && activePayload().lastSummary;
    body = `
      <div class="scan-ring-row">
        <div class="ring"><svg viewBox="0 0 96 96"><circle class="ring-bg" cx="48" cy="48" r="42" fill="none" stroke-width="6"/><circle class="ring-fill" cx="48" cy="48" r="42" fill="none" stroke-width="6" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="0"/></svg><div class="ring-center"><strong>${analyzed ? Math.round(analyzed / Math.max(1, total) * 100) : 0}%</strong><span>已分析</span></div></div>
        <div class="scan-meta"><div class="phase" style="color:var(--jade)">上次扫描完成</div><div class="current">${fmtDateTime(scan.endedAt)}</div><div class="hint">${fmtNum(scan.scanned)} 个账号 · ${fmtNum(scan.enriched)} 个完成分析${scan.failed ? ' · ' + scan.failed + ' 个失败' : ''}</div></div>
      </div>
      <div class="scan-progressbar"><span style="width:100%"></span></div>
      ${summary ? `<div class="scan-counts"><span>较上次新增 <b>${fmtNum(summary.added || 0)}</b></span><span>已取关 / 移出 <b>${fmtNum(summary.removed || 0)}</b></span></div>` : ''}
      <div class="scan-actions"><span class="small muted">如需重新扫描，请用右上角的扫描按钮。</span><button class="btn btn-sm" data-act="nav" data-view="accounts">${icon('users')}打开关注列表</button></div>`;
  } else if (err) {
    body = `<div class="scan-empty"><div class="scan-empty-icon" style="background:var(--rose-soft);color:var(--rose)">${icon('alert')}</div><h4>扫描没有完成</h4><p>${esc(scan.error || '发生未知错误')}</p><p class="small muted">请用右上角的扫描按钮重试。</p></div>`;
  } else {
    body = `<div class="scan-empty"><div class="scan-empty-icon">${icon('scan')}</div><h4>${total ? '可以开始扫描了' : '先扫描关注列表'}</h4><p>${total ? '重新扫描会更新活跃度和作品数据，已有分析会尽量复用。' : '扫描会自动翻页读取全部关注账号，并尽量补充活跃度与作品数据。'}</p><p class="small muted">使用右上角的扫描按钮开始。</p></div>`;
  }
  const statusTitle = active ? (scan.status === 'paused' ? '扫描已暂停' : '正在扫描关注列表') : done ? '扫描状态' : err ? '扫描状态' : '扫描状态';
  return `<section class="card scan-panel" data-scan-status="${scan.status}">
    <div class="scan-panel-head"><div class="scan-panel-title">${active ? '<span class="live-dot"></span>' : ''}${statusTitle}</div><span class="chip ${active ? 'jade' : done ? 'jade' : err ? 'rose' : 'line'}">${active ? '运行中' : done ? '已完成' : err ? '需重试' : '待开始'}</span></div>
    ${body}
  </section>`;
}

function renderRiskCard(list) {
  const total = list.length;
  const dist = { high: 0, medium: 0, low: 0, unknown: 0 };
  list.forEach(function (a) { dist[a.risk] = (dist[a.risk] || 0) + 1; });
  const highPct = total ? Math.round(dist.high / total * 100) : 0;
  const rows = [
    { key: 'high', label: '高风险', color: RISK_COLORS.high },
    { key: 'medium', label: '中风险', color: RISK_COLORS.medium },
    { key: 'low', label: '低风险', color: RISK_COLORS.low },
    { key: 'unknown', label: '数据不足', color: RISK_COLORS.unknown }
  ];
  return `<div class="card risk-card">
    <div class="card-head"><div><div class="card-title">${icon('target')}风险分布</div><div class="card-sub">按当前筛选变量综合评分</div></div><button class="btn btn-ghost btn-sm" data-act="view-high-risk">查看高风险 ${icon('arrowRight')}</button></div>
    <div class="risk-bar-large">${rows.map(function (r) { return `<span class="${r.key}" style="width:${total ? (dist[r.key] / total * 100) : 0}%"></span>`; }).join('')}</div>
    <div class="risk-legend">
      ${rows.map(function (r) { return `<div class="risk-legend-row"><span class="risk-legend-dot" style="background:${r.color}"></span><span style="width:58px">${r.label}</span><div class="bar"><span style="width:${total ? (dist[r.key] / total * 100) : 0}%;background:${r.color}"></span></div><span class="num">${fmtNum(dist[r.key])}</span><span class="pct">${total ? Math.round(dist[r.key] / total * 100) : 0}%</span></div>`; }).join('')}
    </div>
    <div class="risk-note">高风险表示命中多个清理信号，不是“一定需要取关”。建议先打开账号详情，确认是否仍有价值。</div>
  </div>`;
}

function renderRecentPanel() {
  const history = activeHistory();
  const cleanups = (history.cleanups || []).filter(function (c) { return c.platform === state.platform; }).slice(0, 3);
  return `<div class="card card-pad">
    <div class="card-head"><div><div class="card-title">${icon('history')}最近清理</div><div class="card-sub">取关历史保存在本地</div></div><button class="btn btn-ghost btn-sm" data-act="nav" data-view="history">全部记录 ${icon('arrowRight')}</button></div>
    ${cleanups.length ? `<div class="recent-list">${cleanups.map(function (c) {
      const ok = c.results ? c.results.filter(function (r) { return r.ok; }).length : (c.success || 0);
      return `<div class="recent-row"><div class="recent-icon">${icon('broom')}</div><div class="grow"><div class="recent-title">清理了 ${fmtNum(c.total)} 个账号</div><div class="recent-sub">${fmtDateTime(c.endedAt || c.startedAt)} · ${ok} 个成功${c.failed ? ' · ' + c.failed + ' 个失败' : ''}</div></div><div class="recent-meta"><div class="num">${fmtNum(ok)}</div><div class="lbl">成功</div></div></div>`;
    }).join('')}</div>` : `<div class="empty-state" style="padding:22px 0 14px"><div class="empty-art" style="width:44px;height:44px;border-radius:12px;margin-bottom:9px">${icon('broom')}</div><h3 style="font-size:13px;margin-bottom:3px">还没有清理记录</h3><p style="font-size:10px;margin-bottom:0">确认要清理的账号后，在这里回看每一次操作。</p></div>`}
  </div>`;
}

/* ======================================================================== *
 *  ACCOUNTS
 * ======================================================================== */
const PAGE_SIZE_PRESETS = [20, 50, 100, 200, 500];

function clampPageSize(value) {
  const n = Math.floor(Number(value) || 0);
  if (!Number.isFinite(n) || n < 10) return 50;
  return Math.max(10, Math.min(1000, n));
}

function currentPageSize() {
  return clampPageSize(state.pageSize || 50);
}

function setDisplayPageSize(value, silent) {
  const size = clampPageSize(value);
  state.pageSize = size;
  state._pageSizeCustom = PAGE_SIZE_PRESETS.indexOf(size) < 0;
  try { localStorage.setItem('sh.pageSize', String(size)); } catch (e) { /* ignore */ }
  if (state.boot && state.boot.settings && state.boot.settings.ui) state.boot.settings.ui.pageSize = size;
  const pages = Math.max(1, Math.ceil(filteredAccounts().length / size));
  state.page = Math.max(1, Math.min(state.page, pages));
  renderContent();
  if (!silent) toast('每页显示已调整为 ' + fmtNum(size) + ' 条', 'info');
}

function availableRuleFields() {
  return window.SH.Rules.FIELDS.filter(function (f) { return window.SH.Rules.fieldAvailable(state.platform, f.key); });
}

function rulesThreshold(field, ops, fallback) {
  const rules = activeRules();
  const condition = (rules.conditions || []).find(function (c) {
    return c.enabled !== false && c.field === field && (!ops || ops.indexOf(c.op) >= 0) && Number.isFinite(Number(c.value));
  });
  return condition ? Number(condition.value) : fallback;
}

function visualThresholds() {
  return {
    videoX: rulesThreshold('videoCount', ['lt', 'lte', 'eq'], 3),
    recentY: rulesThreshold('followDays', ['lt', 'lte'], 30),
    inactiveDays: rulesThreshold('lastActiveDays', ['gt', 'gte'], 180),
    longFollowDays: rulesThreshold('followDays', ['gt', 'gte'], 365)
  };
}

function verifiedVideoCount(account) {
  return account.videoCountVerified === true && account.videoCount != null ? Number(account.videoCount) : null;
}

function visualFilterGroups() {
  const t = visualThresholds();
  const accounts = decoratedAccounts();
  const hasMutual = accounts.some(function (a) { return a.mutual != null; });
  const status = function (a) { return String(a.accountStatus || 'unknown'); };
  const priority = function (a) { return a._eval.priority || { hits: [] }; };
  const groups = [
    {
      key: 'status', label: '账号状态', resetLabel: '全部账号',
      options: [
        { id: 'status_abnormal', label: '异常账号', test: function (a) { return status(a) === 'banned' || status(a) === 'inaccessible' || priority(a).banned; } },
        { id: 'status_deleted', label: '注销账号', test: function (a) { return status(a) === 'deleted' || priority(a).deleted; } },
        { id: 'status_inaccessible', label: '无法访问账号', test: function (a) { return status(a) === 'inaccessible'; } }
      ]
    },
    {
      key: 'risk', label: '风险情况', resetLabel: '全部风险',
      options: [
        { id: 'risk_priority', label: '重点异常', test: function (a) { return (priority(a).hits || []).length > 0; } },
        { id: 'risk_high', label: '高风险', test: function (a) { return a.risk === 'high'; } },
        { id: 'risk_suggested', label: '建议清理', test: function (a) { return !!a.suggested; } }
      ]
    },
    {
      key: 'works', label: '作品情况', resetLabel: '全部作品',
      options: [
        { id: 'works_have', label: '有作品', test: function (a) { const v = verifiedVideoCount(a); return v != null && v > 0; } },
        { id: 'works_none', label: '没有作品', test: function (a) { const v = verifiedVideoCount(a); return v != null && v === 0; } },
        { id: 'works_lt', label: '作品数少于' + t.videoX + '（' + (t.videoX > 2 ? '1–' + (t.videoX - 1) + '个' : '1个') + '）', test: function (a) { const v = verifiedVideoCount(a); return v != null && v < t.videoX; } },
        { id: 'works_zero', label: '作品数量为零', test: function (a) { const v = verifiedVideoCount(a); return v != null && v === 0; } },
        { id: 'works_unknown', label: '作品数未知', test: function (a) { return verifiedVideoCount(a) == null; } }
      ]
    },
    {
      key: 'update', label: '更新情况', resetLabel: '全部更新',
      options: [
        { id: 'update_long', label: '长期停更', test: function (a) { const d = a._eval.metrics.lastActiveDays; return d != null && d > t.inactiveDays; } },
        { id: 'update_recent', label: '最近更新', test: function (a) { const d = a._eval.metrics.lastActiveDays; return d != null && d <= 30; } },
        { id: 'update_over', label: '超过' + t.inactiveDays + '天未更新', test: function (a) { const d = a._eval.metrics.lastActiveDays; return d != null && d > t.inactiveDays; } }
      ]
    },
    {
      key: 'profile', label: '账号资料', resetLabel: '全部资料',
      options: [
        { id: 'profile_no_avatar', label: '无头像', test: function (a) { return a._eval.metrics.noAvatar; } },
        { id: 'profile_no_bio', label: '无简介', test: function (a) { return a._eval.metrics.emptyBio; } },
        { id: 'profile_no_both', label: '无头像且无简介', test: function (a) { return a._eval.metrics.noAvatar && a._eval.metrics.emptyBio; } },
        { id: 'profile_three_none', label: '三无账号', test: function (a) { return a._eval.metrics.noAvatar && a._eval.metrics.emptyBio && a.videoCount != null && Number(a.videoCount) === 0; } }
      ]
    }
  ];
  if (hasMutual) {
    groups.push({
      key: 'interaction', label: '互动情况', resetLabel: '全部互动',
      options: [
        { id: 'interaction_low', label: '低互动账号', test: function (a) { return a.mutual === false; } },
        { id: 'interaction_none', label: '无互动账号', test: function (a) { return a.mutual === false && a.special !== true; } }
      ]
    });
  }
  groups.push({
    key: 'follow', label: '关注时间', resetLabel: '全部关注时间',
    options: [
      { id: 'follow_recent', label: '最近' + t.recentY + '天关注', test: function (a) { const d = a._eval.metrics.followDays; return d != null && d <= t.recentY; } },
      { id: 'follow_long', label: '长期关注', test: function (a) { const d = a._eval.metrics.followDays; return d != null && d >= t.longFollowDays; } }
    ]
  }, {
    key: 'other', label: '其他', resetLabel: '全部其他',
    options: [
      { id: 'other_whitelist', label: '白名单（勾选后显示）', test: function (a) { return !!a.whitelist; } }
    ]
  });

  const covered = new Set([
    'accountBanned', 'accountDeleted', 'accountInaccessible', 'accountAbnormal', 'abnormalNickname',
    'videoCount', 'noWorks', 'lastActiveDays', 'lastPostDays', 'lastDynamicDays',
    'noAvatar', 'emptyBio', 'notMutual', 'notSpecial', 'followDays', 'followedAt'
  ]);
  const rules = activeRules();
  const custom = (rules.conditions || []).filter(function (c) {
    return c.enabled !== false && window.SH.Rules.fieldAvailable(state.platform, c.field) && !covered.has(c.field);
  });
  if (custom.length) {
    groups.push({
      key: 'custom', label: '其他筛选变量', resetLabel: '全部自定义',
      options: custom.map(function (condition) {
        return {
          id: 'rule:' + condition.id,
          ruleCondition: condition,
          label: window.SH.Rules.describeCondition(condition),
          test: function (a) {
            const result = window.SH.Rules.evalCondition(condition, a._eval.metrics);
            return result.known && result.matched;
          }
        };
      })
    });
  }
  return groups;
}

function listConditionData() {
  const rules = activeRules();
  const groups = visualFilterGroups();
  const options = groups.reduce(function (all, group) { return all.concat(group.options); }, []);
  const activeIds = state.visualFilters || new Set();
  const activeOptions = options.filter(function (option) { return activeIds.has(option.id); });
  const key = [
    state.platform,
    state._accountRev || 0,
    rules.updatedAt || 0,
    rules.logic || 'any',
    (rules.conditions || []).map(function (c) { return c.id + ':' + JSON.stringify(c); }).join('|'),
    activeOptions.map(function (o) { return o.id; }).join(','),
  ].join('~');
  if (state._listConditionCache && state._listConditionCache.key === key) return state._listConditionCache.value;

  const accounts = decoratedAccounts();
  options.forEach(function (option) { option.count = 0; });
  const whitelistAccounts = allFollowingAccounts();
  options.forEach(function (option) {
    const source = option.id === 'other_whitelist' ? whitelistAccounts : accounts;
    source.forEach(function (account) { if (option.test(account)) option.count += 1; });
  });

  const matchSet = new Set();
  if (activeOptions.length) {
    const fixedOptions = activeOptions.filter(function (o) { return !o.ruleCondition; });
    const ruleOptions = activeOptions.filter(function (o) { return o.ruleCondition; });
    const subsetRules = ruleOptions.length ? Object.assign({}, rules, { conditions: ruleOptions.map(function (o) { return o.ruleCondition; }) }) : null;
    accounts.forEach(function (account) {
      let pass = false;
      if (rules.logic === 'score' && subsetRules) {
        pass = window.SH.Rules.evaluate(account, subsetRules).match && fixedOptions.every(function (o) { return o.test(account); });
      } else if (rules.logic === 'all') {
        pass = activeOptions.every(function (o) { return o.test(account); });
      } else {
        pass = activeOptions.some(function (o) { return o.test(account); });
      }
      if (pass) matchSet.add(String(account.id));
    });
  }

  const value = { key: key, groups: groups, options: options, activeCount: activeOptions.length, totalCount: options.length, matchSet: matchSet, thresholds: visualThresholds() };
  state._listConditionCache = { key: key, value: value };
  return value;
}

function invalidateListConditionCache() {
  state._listConditionCache = null;
}

function enabledRuleCount() {
  const rules = activeRules();
  return (rules.conditions || []).filter(function (c) { return c.enabled !== false; }).length;
}

function ruleLogicLabel() {
  const logic = activeRules().logic;
  if (logic === 'all') return '同时满足 AND';
  if (logic === 'score') return '评分阈值';
  return '满足任一 OR';
}

function ruleMatchedAccounts() {
  const data = listConditionData();
  if (!data.activeCount) return [];
  return decoratedAccounts().filter(function (a) { return data.matchSet.has(String(a.id)); });
}

function ruleUnmatchedAccounts() {
  const data = listConditionData();
  if (!data.activeCount) return [];
  return decoratedAccounts().filter(function (a) { return !data.matchSet.has(String(a.id)); });
}

function selectedInRuleCount() {
  if (!state.selection.size) return 0;
  const matched = listConditionData().matchSet;
  let count = 0;
  state.selection.forEach(function (id) { if (matched.has(String(id))) count += 1; });
  return count;
}

function applyFilterChange(options) {
  state.page = 1;
  if (options && options.keepScroll) renderContent(true); else renderContent();
}

function filteredAccounts() {
  let list = decoratedAccounts();
  const f = state.filters;
  if (f.q) {
    const q = f.q.trim().toLowerCase();
    if (q) list = list.filter(function (a) {
      return [a.name, a.uniqueId, a.signature, a.category, a.official].some(function (v) { return String(v || '').toLowerCase().includes(q); });
    });
  }
  if (f.risk !== 'all') list = list.filter(function (a) { return a.risk === f.risk; });
  if (f.match === 'yes') {
    const matchSet = listConditionData().matchSet;
    list = list.filter(function (a) { return matchSet.has(String(a.id)); });
  }
  if (f.match === 'no') {
    const matchSet = listConditionData().matchSet;
    list = list.filter(function (a) { return !matchSet.has(String(a.id)); });
  }
  if (f.whitelist === 'only') list = list.filter(function (a) { return a.whitelist; });
  if (f.whitelist === 'none') list = list.filter(function (a) { return !a.whitelist; });
  if (f.works === 'none') list = list.filter(function (a) { return verifiedVideoCount(a) === 0; });
  if (f.works === 'have') list = list.filter(function (a) { return verifiedVideoCount(a) > 0; });
  if (f.profile === 'noAvatar') list = list.filter(function (a) { return a._eval.metrics.noAvatar; });
  if (f.profile === 'noBio') list = list.filter(function (a) { return a._eval.metrics.emptyBio; });
  if (f.category !== 'all') list = list.filter(function (a) { return a.category === f.category; });
  if (f.suggestedOnly) list = list.filter(function (a) { return a.suggested; });
  const sort = f.sort;
  const uidCompare = function (a, b) {
    return String(a.uniqueId || a.mid || a.id || '').localeCompare(String(b.uniqueId || b.mid || b.id || ''), 'zh-CN', { numeric: true });
  };
  const videoValue = function (a) { return a.videoCountVerified === true && a.videoCount != null ? Number(a.videoCount) : null; };
  let hitMap = null;
  list.sort(function (a, b) {
    if (sort === 'risk_desc') return b.riskScore - a.riskScore || (b.confidence - a.confidence) || uidCompare(a, b);
    if (sort === 'risk_asc') return a.riskScore - b.riskScore || (a.confidence - b.confidence) || uidCompare(a, b);
    if (sort === 'follow_asc') return (a.followedAt || 0) - (b.followedAt || 0) || uidCompare(a, b);
    if (sort === 'follow_desc') return (b.followedAt || 0) - (a.followedAt || 0) || uidCompare(a, b);
    if (sort === 'active_asc' || sort === 'active_desc') {
      const av = a._eval.metrics.lastActiveDays;
      const bv = b._eval.metrics.lastActiveDays;
      if (av == null && bv == null) return uidCompare(a, b);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (sort === 'active_asc') return bv - av || uidCompare(a, b);
      return av - bv || uidCompare(a, b);
    }
    if (sort === 'video_asc' || sort === 'video_desc') {
      const av = videoValue(a);
      const bv = videoValue(b);
      if (av == null && bv == null) return uidCompare(a, b);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (sort === 'video_asc') return av - bv || uidCompare(a, b);
      return bv - av || uidCompare(a, b);
    }
    if (sort === 'relation_desc' || sort === 'relation_asc') {
      const rank = function (x) { if (x.mutual === true) return 3; if (x.special === true) return 2; if (x.mutual === false) return 1; return 0; };
      const delta = rank(a) - rank(b);
      return sort === 'relation_desc' ? (-delta || uidCompare(a, b)) : (delta || uidCompare(a, b));
    }
    if (sort === 'hits_desc' || sort === 'hits_asc') {
      if (!hitMap) {
        const activeOptions = listConditionData().options.filter(function (o) { return (state.visualFilters || new Set()).has(o.id); });
        hitMap = new Map(decoratedAccounts().map(function (acc) {
          return [String(acc.id), activeOptions.filter(function (o) { return o.test(acc); }).length];
        }));
      }
      const delta = (hitMap.get(String(a.id)) || 0) - (hitMap.get(String(b.id)) || 0);
      return sort === 'hits_desc' ? (-delta || uidCompare(a, b)) : (delta || uidCompare(a, b));
    }
    if (sort === 'uid_asc') return uidCompare(a, b);
    if (sort === 'uid_desc') return uidCompare(b, a);
    if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN') || uidCompare(a, b);
    return uidCompare(a, b);
  });
  return list;
}

function selectionAuditText(total, selected, inMatch) {
  if (!selected) return '“全选本页”只选择当前页；完整关注列表和按筛选变量选择在“选择操作”中，跨页操作会先显示预计数量。';
  const out = Math.max(0, selected - inMatch);
  return '已选 ' + fmtNum(selected) + ' 个：其中 ' + fmtNum(inMatch) + ' 个属于当前筛选匹配' + (out ? '，' + fmtNum(out) + ' 个不属于当前筛选。' : '。') + ' 筛选条件变化不会自动清除已选，可用“选择操作”重新选择。';
}

function renderListConditions(data) {
  const activeIds = state.visualFilters || new Set();
  const open = !!state.listConditionsOpen;
  return `<div class="list-conditions-bar">
    <div class="list-conditions-head">
      <button class="list-conditions-toggle" data-act="toggle-list-conditions-panel" aria-expanded="${open}">
        <span class="lc-icon">${icon('filter')}</span>
        <span class="eyebrow">列表条件</span>
        <span class="lc-active-count">${data.activeCount} 个启用</span>
        <span class="chip line">${esc(ruleLogicLabel())}</span>
        <span class="lc-chevron ${open ? 'open' : ''}">${icon('chevronDown')}</span>
      </button>
      <div class="list-conditions-actions">
        <button class="btn btn-ghost btn-sm" data-act="reset-list-conditions">${icon('undo')}重置</button>
        <button class="btn btn-sm" data-act="nav" data-view="rules">${icon('filter')}编辑筛选变量</button>
      </div>
    </div>
    ${open ? `<div class="list-conditions-panel"><div class="list-conditions-source">${icon('info')}分类和 X/Y 阈值来自“筛选变量”；在筛选变量中新增的自定义条件会追加到“其他筛选变量”。作品数未确认时显示“未知”，不会按 0 计算。</div>
      ${data.groups.map(function (group) {
        const activeInGroup = group.options.filter(function (o) { return activeIds.has(o.id); }).length;
        return `<div class="list-cond-group">
          <div class="list-cond-group-head"><div><b>${esc(group.label)}</b>${activeInGroup ? `<span class="chip jade" style="height:17px;font-size:8px">${activeInGroup} 个</span>` : ''}</div><button class="list-cond-all" data-act="reset-list-group" data-group="${attr(group.key)}">${esc(group.resetLabel || '全部')}</button></div>
          <div class="list-cond-options">
            ${group.options.map(function (option) {
              const active = activeIds.has(option.id);
              return `<button class="list-cond-option ${active ? 'active' : ''}" data-act="toggle-list-condition" data-id="${attr(option.id)}" aria-pressed="${active}" title="匹配 ${option.count || 0} 个账号">
                <span class="lco-check">${active ? icon('check') : ''}</span><span class="lco-label">${esc(option.label)}</span><span class="lco-count">${fmtNum(option.count || 0)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}
  </div>`;
}

const SORT_PAIRS = {
  account: ['uid_asc', 'uid_desc'],
  follow: ['follow_asc', 'follow_desc'],
  works: ['video_desc', 'video_asc'],
  active: ['active_desc', 'active_asc'],
  relation: ['relation_desc', 'relation_asc'],
  hits: ['hits_desc', 'hits_asc'],
  risk: ['risk_desc', 'risk_asc']
};

const SORT_FIRST_DOWN = { works: true, active: true, relation: true, hits: true, risk: true };
function renderSortButton(column) {
  const pair = SORT_PAIRS[column] || [];
  const active = pair.indexOf(state.filters.sort) >= 0;
  let iconName = 'sort';
  if (active) {
    const first = state.filters.sort === pair[0];
    const down = SORT_FIRST_DOWN[column] ? first : !first;
    iconName = down ? 'chevronDown' : 'chevronUp';
  }
  return `<button class="th-sort ${active ? 'active' : ''}" data-act="sort-column" data-column="${column}" title="按此列排序">${icon(iconName)}</button>`;
}

function renderAccounts() {
  if (!isConnected()) return renderConnectEmpty('关注列表还没有数据', '连接账号并完成一次扫描后，就可以在这里查看、筛选和管理关注账号。', '连接账号');
  pruneWhitelistSelection();
  const all = decoratedAccounts();
  const listData = listConditionData();
  const totalConditions = listData.totalCount;
  const activeConditionCount = listData.activeCount;
  const matchCount = activeConditionCount ? listData.matchSet.size : 0;
  const matchDisplay = activeConditionCount ? fmtNum(matchCount) : '—';
  const total = all.length;
  const hiddenWhitelist = whitelistViewActive() ? 0 : allFollowingAccounts().filter(function (a) { return a.whitelist; }).length;
  const unmatchedCount = Math.max(0, total - matchCount);
  const filtered = filteredAccounts();
  const scan = currentScan();
  const selected = state.selection.size;
  const inMatch = selected ? selectedInRuleCount() : 0;
  const pageSize = currentPageSize();
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (state.page > pages) state.page = pages;
  const page = Math.max(1, state.page);
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  const selectedOnPage = rows.length > 0 && rows.every(function (a) { return state.selection.has(a.id); });
  const pageSelected = rows.filter(function (a) { return state.selection.has(a.id); }).length;
  const viewLabel = state.filters.match === 'yes' ? '筛选结果' : state.filters.match === 'no' ? '未匹配账号' : '全部关注';
  const filterSelectDisabled = !activeConditionCount || !matchCount;
  const unmatchedSelectDisabled = !activeConditionCount || !unmatchedCount;
  const audit = selectionAuditText(total, selected, inMatch);

  return `<div class="page">
    ${state.demo ? `<div class="alert warn mb-12">${icon('info')}<div><strong>演示模式：</strong>这些是模拟数据，取消关注只会在本地演示，不会执行真实操作。 <button class="btn btn-sm" style="margin-left:8px" data-act="exit-demo">退出演示</button></div></div>` : ''}
    <div class="accounts-heading">
      <div><div class="accounts-title">关注列表 <span class="count">${fmtNum(total)}</span></div><div class="accounts-sub">共 ${fmtNum(total)} 个关注账号 · 当前显示 ${fmtNum(filtered.length)} 个 · ${hiddenWhitelist ? '白名单 ' + fmtNum(hiddenWhitelist) + ' 个已隐藏 · ' : ''}${activeConditionCount ? '当前筛选匹配 ' + fmtNum(matchCount) + ' 个' : '列表条件未启用'} · ${scan.status === 'completed' ? '上次扫描 ' + fmtDateTime(scan.endedAt) : scan.status === 'scanning' ? '扫描进行中' : '数据来自最近一次扫描'}</div></div>
      <div class="accounts-actions">
        <div class="select-all-group">
          <button class="btn btn-sm btn-primary select-all-main" data-act="select-page" ${rows.length ? '' : 'disabled'} title="只选择当前正在查看的这一页账号，其他页面不受影响">${icon('check')}全选本页</button>
          <details class="select-menu">
            <summary class="btn btn-sm select-menu-toggle" title="更多选择方式">选择操作 ${icon('chevronDown')}</summary>
            <div class="select-menu-panel">
              <button data-act="select-filtered" ${filterSelectDisabled ? 'disabled' : ''}>${icon('filter')}<span>全选所有（当前列表条件）</span><b>${fmtNum(matchCount)}</b></button>
              <button data-act="invert-filtered" ${filterSelectDisabled ? 'disabled' : ''}>${icon('undo')}<span>反选当前列表条件</span><small>仅条件结果内</small></button>
              <button data-act="select-unmatched" ${unmatchedSelectDisabled ? 'disabled' : ''}>${icon('users')}<span>选择未命中列表条件</span><b>${fmtNum(unmatchedCount)}</b></button>
              <button data-act="select-all-following">${icon('check')}<span>选择全部关注账号</span><b>${fmtNum(total)}</b></button>
              <div class="select-menu-sep"></div>
              <button data-act="select-page" ${rows.length ? '' : 'disabled'}>${icon('check')}<span>选择当前页面</span><b>${fmtNum(rows.length)}</b></button>
              <button data-act="invert-page" ${rows.length ? '' : 'disabled'}>${icon('undo')}<span>反选当前页面</span></button>
              <div class="select-menu-sep"></div>
              <button data-act="clear-selection" ${selected ? '' : 'disabled'}>${icon('close')}<span>清空选择</span><b>${fmtNum(selected)}</b></button>
            </div>
          </details>
        </div>
        <button class="btn btn-sm" data-act="export-menu">${icon('download')}导出</button>
      </div>
    </div>
    ${scan.status === 'scanning' || scan.status === 'paused' ? renderScanInline(scan) : ''}
    <div class="filter-summary-bar">
      <div class="filter-summary-left">
        <span class="eyebrow">筛选变量</span>
        <strong>${totalConditions ? (activeConditionCount ? esc(ruleLogicLabel()) + ' · 列表启用 ' + activeConditionCount + ' / ' + totalConditions + ' 个条件' : '列表条件未启用') : '请先在筛选变量中添加条件'}</strong>
        <span class="filter-summary-count">匹配 <b>${matchDisplay}</b> / ${fmtNum(total)}</span>
        <button class="btn btn-ghost btn-sm" data-act="nav" data-view="rules">${icon('filter')}${totalConditions ? '编辑筛选变量' : '设置筛选变量'}</button>
      </div>
      <div class="seg filter-view-seg">
        <button class="${state.filters.match === 'all' ? 'active' : ''}" data-act="set-match-view" data-view="all">全部关注 <em>${fmtNum(total)}</em></button>
        <button class="${state.filters.match === 'yes' ? 'active' : ''}" data-act="set-match-view" data-view="yes" ${activeConditionCount ? '' : 'disabled'}>筛选结果 <em>${fmtNum(matchCount)}</em></button>
        <button class="${state.filters.match === 'no' ? 'active' : ''}" data-act="set-match-view" data-view="no" ${activeConditionCount ? '' : 'disabled'}>未匹配 <em>${fmtNum(unmatchedCount)}</em></button>
      </div>
    </div>
    <div class="selection-status ${selected ? (inMatch < selected ? 'mixed' : 'has-selection') : ''}">
      <div class="selection-metrics">
        <div><span>关注总数</span><b data-sel-total>${fmtNum(total)}</b></div>
        <div><span>筛选匹配</span><b data-sel-match>${matchDisplay}</b></div>
        <div><span>已选择</span><b data-sel-selected>${fmtNum(selected)}</b></div>
        <div><span>未选择</span><b data-sel-unselected>${fmtNum(Math.max(0, total - selected))}</b></div>
        <div><span>本页已选</span><b><span data-sel-page-selected>${fmtNum(pageSelected)}</span> / ${fmtNum(rows.length)}</b></div>
      </div>
      <div class="selection-audit" data-sel-audit>${esc(audit)}</div>
      ${selected ? `<button class="btn btn-ghost btn-sm" data-act="clear-selection">${icon('close')}清空选择</button>` : ''}
    </div>
    ${renderListConditions(listData)}
    <div class="card toolbar">
      <div class="toolbar-row">
        <div class="searchbox">${icon('search')}<input id="searchInput" type="search" placeholder="搜索昵称、账号或简介…" value="${attr(state.filters.q)}" autocomplete="off"></div>
        ${state.filters.q ? `<button class="btn btn-ghost btn-sm" data-act="clear-search">${icon('close')}清除搜索</button>` : ''}
        ${state.filters.risk !== 'all' ? `<span class="active-quick-chip">${state.filters.risk === 'high' ? '高风险视图' : state.filters.risk === 'medium' ? '中风险视图' : '低风险视图'}<button data-act="clear-risk-filter" title="清除风险视图">${icon('close')}</button></span>` : ''}
        <span class="small muted">搜索只缩小列表显示，不改变列表条件和选择范围；点击表头排序</span>
      </div>
    </div>
    <div class="card table-card">
      <div class="table-scope-note">
        <span class="chip line">选择范围</span>
        <span>“全选本页”= 当前页 ${fmtNum(rows.length)} 个；“全选所有（当前列表条件）”= 当前条件匹配 ${fmtNum(matchCount)} 个（跨页确认）；“选择全部关注账号”= ${fmtNum(total)} 个（跨页确认）；页首复选框 = 当前页。</span>
      </div>
      ${rows.length ? `<div class="table-scroll"><table class="accounts">
        <thead><tr>
          <th style="width:36px"><button class="checkbox ${selectedOnPage ? 'checked' : ''}" data-act="toggle-page" title="只选择/取消当前页显示的账号">${icon('check')}</button></th>
          <th style="width:300px">账号 ${renderSortButton('account')}</th><th style="width:100px">关注时间 ${renderSortButton('follow')}</th><th style="width:66px">作品 ${renderSortButton('works')}</th><th style="width:130px">最近活跃 ${renderSortButton('active')}</th><th style="width:108px">关系 ${renderSortButton('relation')}</th><th style="width:246px">命中条件 ${renderSortButton('hits')}</th><th style="width:118px">风险 ${renderSortButton('risk')}</th><th style="width:66px"></th>
        </tr></thead>
        <tbody>${rows.map(function (a) { return renderAccountRow(a, true); }).join('')}</tbody>
      </table></div>
      <div class="table-footer"><span data-table-summary>${viewLabel}：显示 ${filtered.length ? start + 1 : 0}–${Math.min(start + rows.length, filtered.length)} 条，共 ${fmtNum(filtered.length)} 条 · 本页已选 ${fmtNum(pageSelected)} / ${fmtNum(rows.length)} 个 · 全部已选 ${fmtNum(selected)} 个</span><div class="table-footer-right">${renderPageSizeControl()}${renderPagination(page, pages)}</div></div>` : `<div class="empty-state"><div class="empty-art">${icon('search')}</div><h3>${state.filters.match === 'yes' && activeConditionCount ? '当前列表条件没有匹配账号' : '当前列表没有账号'}</h3><p>${state.filters.match === 'yes' && activeConditionCount ? '可以减少启用的列表条件、切换 AND/OR 组合，或回到全部关注。' : '可以清除搜索，或到筛选变量添加/启用条件。'}</p><div class="row gap-8" style="justify-content:center">${state.filters.match !== 'all' ? `<button class="btn" data-act="set-match-view" data-view="all">${icon('undo')}查看全部关注</button>` : ''}${state.filters.q ? `<button class="btn" data-act="clear-search">${icon('close')}清除搜索</button>` : ''}<button class="btn" data-act="nav" data-view="rules">${icon('filter')}编辑筛选变量</button></div></div>`}
    </div>
    ${state.selection.size ? renderBulkBar() : ''}
  </div>`;
}

function renderConnectEmpty(title, desc, button) {
  const p = PLATFORM_META[state.platform];
  return `<div class="page"><div class="card" style="padding:0"><div class="empty-state" style="padding-top:96px;padding-bottom:104px">
    <div class="connect-logo ${p.cls}" style="margin-bottom:18px">${p.cls === 'bili' ? 'B' : '抖'}</div>
    <h3>${esc(title || ('还没有连接' + p.short))}</h3>
    <p>${esc(desc || '连接账号后，扫描会读取你的完整关注列表。登录状态会保存在本机，尽量只需扫码一次。')}</p>
    <div class="empty-actions"><button class="btn btn-primary" data-act="connect" data-platform="${state.platform}">${icon('link')}${esc(button || '连接账号')}</button><button class="btn" data-act="demo">${icon('play')}查看演示</button></div>
  </div></div></div>`;
}

function renderScanInline(scan) {
  const pct = scanPercent(scan);
  return `<div class="scan-inline" data-scan-status="${scan.status}">
    <div class="spinner" style="width:19px;height:19px;border-width:2px;flex:none"></div>
    <div class="grow"><div class="scan-inline-title">${scan.status === 'paused' ? '扫描已暂停' : '正在扫描'} <span class="chip ${scan.status === 'paused' ? 'amber' : 'jade'}" data-scan-inline-pct style="height:18px;font-size:9px">${pct}%</span></div><div class="scan-inline-sub" data-scan-inline-sub>${esc(scan.current || scanPhaseLabel(scan))}</div></div>
    <div class="scan-progressbar"><span data-scan-inline-progress style="width:${pct}%"></span></div>
    ${scan.status === 'paused' ? `<button class="btn btn-sm btn-jade" data-act="resume-scan">${icon('play')}继续</button>` : `<button class="btn btn-sm" data-act="pause-scan">${icon('pause')}暂停</button>`}
    <button class="btn btn-ghost btn-sm" data-act="stop-scan">${icon('stop')}停止</button>
  </div>`;
}

function activeListConditionLabels(account) {
  const data = listConditionData();
  const activeIds = state.visualFilters || new Set();
  if (!data.activeCount) return [];
  return data.options.filter(function (option) { return activeIds.has(option.id) && option.test(account); }).map(function (option) { return option.label; });
}

function renderAccountRow(a, canBulk) {
  const selected = state.selection.has(a.id);
  const risk = riskMeta(a.risk);
  const color = riskColor(a.risk);
  const metrics = a._eval.metrics;
  const priority = a._eval.priority || { hits: [], labels: [], reasons: [] };
  const lastActive = a.lastActiveAt || a.lastPostAt || a.lastDynamicAt;
  const conditionLabels = activeListConditionLabels(a);
  const allHitLabels = Array.from(new Set(conditionLabels));
  const reasonHtml = allHitLabels.length
    ? allHitLabels.slice(0, 2).map(function (label) { return `<span class="reason-chip" title="${attr(label)}">${esc(label)}</span>`; }).join('') + (allHitLabels.length > 2 ? `<span class="reason-chip more" title="${attr(allHitLabels.join('、'))}">+${allHitLabels.length - 2}</span>` : '')
    : '<span class="reason-empty">未命中</span>';
  const relation = [];
  if (a.mutual === true) relation.push('<span class="chip jade">互关</span>');
  else if (a.mutual === false) relation.push('<span class="chip line">未互关</span>');
  else relation.push('<span class="chip">关系未知</span>');
  if (a.special === true) relation.push('<span class="chip amber">特别关注</span>');
  const abnormal = a.accountStatus && a.accountStatus !== 'normal';
  const statusChip = abnormal && !(priority.hits || []).some(function (h) { return h === 'banned' || h === 'deleted'; }) ? `<span class="mini-badge" style="background:var(--rose-soft);color:var(--rose)">${esc(statusLabel(a.accountStatus))}</span>` : '';
  const priorityClass = { banned: 'rose', deleted: 'rose', abnormalNickname: 'amber', zeroWorks: 'slate' };
  const priorityShort = { banned: '封禁/异常', deleted: '已注销', abnormalNickname: '异常昵称', zeroWorks: '0作品' };
  const priorityBadges = (priority.hits || []).slice(0, 2).map(function (key) {
    return `<span class="priority-badge ${priorityClass[key] || 'slate'}" title="${attr((priority.reasons || []).join('；'))}">${esc(priorityShort[key] || key)}</span>`;
  }).join('');
  return `<tr data-act="open-account" data-id="${attr(a.id)}" class="${selected ? 'selected' : ''} ${a.whitelist ? 'whitelisted' : ''}">
    <td><button class="checkbox ${selected ? 'checked' : ''} ${canBulk ? '' : 'disabled'}" data-act="toggle-select" data-id="${attr(a.id)}" ${canBulk ? '' : 'disabled'} title="${canBulk ? '选择这个筛选结果' : '请先设置筛选条件'}">${icon('check')}</button></td>
    <td><div class="account-cell">${avatarHTML(a)}<div style="min-width:0"><div class="account-name-row"><span class="account-name">${esc(a.name || '未命名账号')}</span>${priorityBadges}${a.whitelist ? `<span class="mini-badge" style="color:var(--jade);background:var(--jade-soft)">白名单</span>` : ''}${a.starred ? `<span class="mini-badge" style="color:var(--amber);background:var(--amber-soft)">关注中</span>` : ''}${statusChip}</div><div class="account-sub" title="${attr(a.signature || '')}">${a.uniqueId ? esc(a.uniqueId) + ' · ' : ''}${esc(a.signature || '暂无简介')}</div></div></div></td>
    <td><div class="cell-main">${fmtDate(a.followedAt)}</div><div class="cell-sub">${followDuration(metrics.followDays)}</div></td>
    <td title="${a.videoCountVerified !== true ? '作品数尚未核验，不参与清理筛选' : '已核验作品数量'}"><div class="cell-main">${a.videoCountVerified !== true ? '待核验' : (a.videoCount == null ? '—' : fmtNum(a.videoCount))}</div><div class="cell-sub">${a.videoCountVerified !== true ? '不参与筛选' : a.videoCount === 0 ? '没有作品' : '个作品'}</div></td>
    <td><div class="cell-main">${lastActive ? ago(lastActive) : '暂无数据'}</div><div class="cell-sub">${lastActive ? fmtDate(lastActive) : '—'}</div></td>
    <td><div class="relation-tags">${relation.join('')}</div></td>
    <td><div class="reason-chips">${reasonHtml}</div></td>
    <td><div class="risk-cell" title="综合评分 ${a.riskScore}/100 · 数据完整度 ${a.confidence}%"><div class="risk-level"><div class="risk-number" style="color:${color}">${a.riskScore}${a.confidence < 45 ? '<span title="数据完整度较低">*</span>' : ''}${a.suggested ? '<span class="suggest-tag">建议</span>' : ''}</div><div class="risk-label">${risk.label}</div></div><div class="risk-meter"><span style="width:${a.riskScore}%;background:${color}"></span></div></div></td>
    <td><div class="row-actions"><button class="icon-btn ${a.starred ? 'active' : ''}" data-act="toggle-star" data-id="${attr(a.id)}" title="${a.starred ? '取消收藏' : '收藏并自动加入白名单'}">${icon('star')}</button><button class="icon-btn ${a.whitelist ? 'active' : ''}" data-act="toggle-whitelist" data-id="${attr(a.id)}" title="${a.whitelist ? '移出白名单' : '加入白名单'}">${icon('shieldCheck')}</button></div></td>
  </tr>`;
}

function renderPageSizeControl() {
  const size = currentPageSize();
  const custom = state._pageSizeCustom || PAGE_SIZE_PRESETS.indexOf(size) < 0;
  return `<div class="page-size-control"><span>每页</span><select id="pageSizeSelect">${PAGE_SIZE_PRESETS.map(function (n) { return `<option value="${n}" ${!custom && size === n ? 'selected' : ''}>${n}</option>`; }).join('')}<option value="custom" ${custom ? 'selected' : ''}>自定义…</option></select>${custom ? `<input id="pageSizeInput" type="number" min="10" max="1000" step="10" value="${size}" title="每页显示 10–1000 条">` : ''}<span>条</span></div>`;
}

function renderPagination(page, pages) {
  if (pages <= 1) return '';
  const numbers = [];
  if (pages <= 7) { for (let i = 1; i <= pages; i += 1) numbers.push(i); }
  else {
    numbers.push(1);
    if (page > 3) numbers.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i += 1) numbers.push(i);
    if (page < pages - 2) numbers.push('…');
    numbers.push(pages);
  }
  return `<div class="pagination"><button class="page-btn" data-act="page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${icon('chevronLeft')}</button>${numbers.map(function (n) { return n === '…' ? '<span class="page-ellipsis">…</span>' : `<button class="page-btn ${n === page ? 'active' : ''}" data-act="page" data-page="${n}">${n}</button>`; }).join('')}<button class="page-btn" data-act="page" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>${icon('chevronRight')}</button></div>`;
}

function updateSelectionUI() {
  const selection = state.selection;
  document.querySelectorAll('table.accounts tbody tr[data-id]').forEach(function (row) {
    const id = row.dataset.id;
    const selected = selection.has(id);
    row.classList.toggle('selected', selected);
    const box = row.querySelector('[data-act="toggle-select"]');
    if (box) box.classList.toggle('checked', selected);
  });
  const pageSize = currentPageSize();
  const rows = filteredAccounts().slice((state.page - 1) * pageSize, state.page * pageSize);
  const headerBox = document.querySelector('table.accounts thead [data-act="toggle-page"]');
  if (headerBox) headerBox.classList.toggle('checked', rows.length > 0 && rows.every(function (a) { return selection.has(a.id); }));
  const total = followingAccounts().length;
  const selected = selection.size;
  const inMatch = selected ? selectedInRuleCount() : 0;
  const setText = function (selector, value) { const el = document.querySelector(selector); if (el) el.textContent = fmtNum(value); };
  setText('[data-sel-total]', total);
  const matchCell = document.querySelector('[data-sel-match]');
  if (matchCell) { const d = listConditionData(); matchCell.textContent = d.activeCount ? fmtNum(d.matchSet.size) : '—'; }

  setText('[data-sel-selected]', selected);
  setText('[data-sel-unselected]', Math.max(0, total - selected));
  const pageSelected = rows.filter(function (a) { return selection.has(a.id); }).length;
  setText('[data-sel-page-selected]', pageSelected);
  const audit = document.querySelector('[data-sel-audit]');
  if (audit) audit.textContent = selectionAuditText(total, selected, inMatch);
  const status = document.querySelector('.selection-status');
  if (status) {
    status.classList.toggle('has-selection', selected > 0 && inMatch === selected);
    status.classList.toggle('mixed', selected > 0 && inMatch < selected);
  }
  const clearBtn = document.querySelector('.selection-status [data-act="clear-selection"]');
  if (clearBtn) clearBtn.disabled = selected === 0;
  let bar = document.querySelector('.bulk-bar');
  if (selection.size) {
    if (bar) bar.outerHTML = renderBulkBar();
    else {
      const page = document.querySelector('.page');
      if (page) page.insertAdjacentHTML('beforeend', renderBulkBar());
    }
  } else if (bar) {
    bar.remove();
  }
  const footer = document.querySelector('[data-table-summary]');
  if (footer) {
    const start = (state.page - 1) * pageSize;
    const shownRows = filteredAccounts();
    const viewLabel = state.filters.match === 'yes' ? '筛选结果' : state.filters.match === 'no' ? '未匹配账号' : '全部关注';
    footer.textContent = viewLabel + '：显示 ' + (shownRows.length ? start + 1 : 0) + '–' + Math.min(start + rows.length, shownRows.length) + ' 条，共 ' + fmtNum(shownRows.length) + ' 条 · 本页已选 ' + fmtNum(pageSelected) + ' / ' + fmtNum(rows.length) + ' 个 · 全部已选 ' + fmtNum(selection.size) + ' 个';
  }
}

function renderBulkBar() {
  const total = followingAccounts().length;
  return `<div class="bulk-bar"><div class="bulk-count">已选择 <b>${fmtNum(state.selection.size)}</b> 个 <span class="bulk-scope">/ 关注总数 ${fmtNum(total)}</span></div><div class="bulk-divider"></div><button class="btn btn-sm" data-act="bulk-whitelist">${icon('shieldCheck')}加入白名单</button><button class="btn btn-sm btn-danger" data-act="bulk-cleanup">${icon('broom')}批量取消关注</button><button class="btn btn-sm" data-act="clear-selection">${icon('close')}取消选择</button></div>`;
}

/* ======================================================================== *
 *  RULES
 * ======================================================================== */
function ensureRuleDraft() {
  if (!state.ruleDraft || state.ruleDraftPlatform !== state.platform) {
    state.ruleDraft = cloneRules(activeRules());
    state.ruleDraftPlatform = state.platform;
  }
  return state.ruleDraft;
}

function rulesDirty() {
  if (!state.ruleDraft) return false;
  const a = cloneRules(state.ruleDraft);
  const b = cloneRules(activeRules());
  delete a.updatedAt;
  delete b.updatedAt;
  return JSON.stringify(a) !== JSON.stringify(b);
}

function draftEvaluation() {
  const draft = state.ruleDraft || activeRules();
  const accounts = followingAccounts();
  const now = Date.now();
  const evaluated = accounts.map(function (a) { return window.SH.Rules.evaluate(a, draft, now); });
  const dist = { high: 0, medium: 0, low: 0, unknown: 0 };
  evaluated.forEach(function (e) { dist[e.risk] += 1; });
  return {
    total: accounts.length,
    matched: evaluated.filter(function (e) { return e.match; }).length,
    suggested: evaluated.filter(function (e) { return e.suggested; }).length,
    high: dist.high,
    dist: dist,
    accounts: accounts,
    evaluated: evaluated
  };
}

function renderRules() {
  if (!isConnected()) return renderConnectEmpty('连接账号后配置筛选变量', '规则会作用在扫描到的关注账号上。连接账号并完成扫描后，这里会实时显示每个条件命中的账号数量。', '连接账号');
  ensureRuleDraft();
  const draft = state.ruleDraft;
  const accounts = followingAccounts();
  const metricsList = accounts.map(function (a) { return window.SH.Rules.getMetrics(a, Date.now()); });
  const dirty = rulesDirty();
  const presets = [
    { key: 'priority', title: '重点异常', desc: '封禁、注销、异常昵称、零作品', icon: 'alert' },
    { key: 'inactive', title: '长期停更', desc: '关注超过一年，最近半年没有更新', icon: 'clock' },
    { key: 'lowRelation', title: '低互动关系', desc: '关注很久、没有互关、也很久没活跃', icon: 'users' },
    { key: 'empty', title: '三无账号', desc: '无头像、简介为空、没有作品', icon: 'user' },
    { key: 'abnormal', title: '异常账号', desc: '注销、封禁或无法访问', icon: 'alert' }
  ];
  return `<div class="page">
    <div class="rules-topbar">
      <div><div class="rules-title">筛选变量</div><div class="rules-sub">这里统一管理活跃度、关注时间、作品、资料、关系和重点异常变量。变量决定“筛选匹配”；权重只影响评分排序。设置后可回到关注列表查看筛选结果。</div></div>
      <div class="rules-actions">
        <span id="rulesDirty" class="chip ${dirty ? 'amber' : 'line'}" style="height:28px">${dirty ? '有未保存修改' : '已保存'}</span>
        <button class="btn btn-sm" data-act="reset-rules">${icon('undo')}恢复默认</button>
        <button class="btn btn-sm btn-primary" data-act="save-rules">${icon('check')}保存并应用</button>
      </div>
    </div>
    <div class="rules-layout">
      <div class="rules-main">
        <div class="card logic-card">
          <div class="logic-row">
            <div><div class="eyebrow">逻辑关系</div><div style="font-size:11px;font-weight:600;margin-top:3px">账号需要怎样满足条件？</div></div>
            <div class="seg">
              <button class="${draft.logic === 'all' ? 'active' : ''}" data-act="set-logic" data-logic="all">${icon('check')}同时满足 AND</button>
              <button class="${draft.logic === 'any' ? 'active' : ''}" data-act="set-logic" data-logic="any">${icon('plus')}任一满足 OR</button>
              <button class="${draft.logic === 'score' ? 'active' : ''}" data-act="set-logic" data-logic="score">${icon('target')}按分数</button>
            </div>
            <div class="logic-hint">${draft.logic === 'all' ? '所有已启用条件都为真，才算命中。' : draft.logic === 'any' ? '任意一个条件为真，即视为命中。' : '综合评分达到建议阈值时命中。'}</div>
            <div style="margin-left:auto;display:flex;align-items:center;gap:7px"><span class="small muted">建议清理阈值</span><input class="threshold-input" id="ruleThreshold" type="number" min="0" max="100" value="${Number(draft.suggestThreshold) || 55}"><span class="small muted">分</span></div>
          </div>
        </div>

        <div class="presets">${presets.map(function (p) { return `<button class="preset-card" data-act="preset" data-preset="${p.key}"><div class="pt">${icon(p.icon)}${p.title}</div><div class="ps">${p.desc}</div></button>`; }).join('')}</div>

        <div class="card" style="padding:16px 17px">
          <div class="card-head" style="margin-bottom:10px"><div><div class="card-title">${icon('filter')}条件组合 <span class="chip line" style="height:19px;margin-left:2px">${draft.conditions.filter(function (c) { return c.enabled !== false; }).length} 个启用</span></div><div class="card-sub">每行的权重会影响综合评分，0 权重不可用；建议为真正重要的信号设置更高权重。</div></div><button class="btn btn-ghost btn-sm" data-act="open-rules-help">${icon('info')}怎么设置</button></div>
          <div class="condition-list" id="conditionList">
            ${draft.conditions.length ? draft.conditions.map(function (condition, index) { return renderRuleCondition(condition, index, metricsList, accounts.length); }).join('') : `<div class="rules-empty">还没有条件。可以从下面的下拉框添加一个，或选择一个预设。</div>`}
          </div>
          <div class="add-cond">
            <div class="select"><select id="addConditionSelect"><option value="">＋ 添加一个条件…</option>${window.SH.Rules.FIELD_GROUPS.map(function (group) { const list = availableRuleFields().filter(function (f) { return f.group === group.key; }); return list.length ? `<optgroup label="${esc(group.label)}">${list.map(function (f) { return `<option value="${attr(f.key)}">${esc(f.label)}</option>`; }).join('')}</optgroup>` : ''; }).join('')}</select></div>
            <button class="btn btn-sm" data-act="add-condition">${icon('plus')}添加所选条件</button>
            <span class="small muted">也可以从上方预设快速开始</span>
          </div>
          <div class="rules-footer-note">${icon('alert')}<div>权重只用于计算“清理优先级”。评分高只代表命中更多信号，不代表账号一定没有价值。没有头像、没有作品或没有简介，不能单独作为僵尸号的结论。</div></div>
        </div>
      </div>
      <aside class="card preview-card" id="rulesPreview">${renderRulesPreview()}</aside>
    </div>
  </div>`;
}

function renderRuleCondition(condition, index, metricsList, totalAccounts) {
  const field = window.SH.Rules.FIELD_MAP[condition.field] || window.SH.Rules.FIELDS[0];
  const group = window.SH.Rules.FIELD_GROUPS.find(function (g) { return g.key === field.group; }) || { tone: 'jade' };
  const matches = metricsList.reduce(function (sum, metrics) {
    return sum + (window.SH.Rules.evalCondition(condition, metrics).matched ? 1 : 0);
  }, 0);
  const fieldOptions = window.SH.Rules.FIELD_GROUPS.map(function (g) {
    const fields = availableRuleFields().filter(function (f) { return f.group === g.key; });
    return fields.length ? `<optgroup label="${esc(g.label)}">${fields.map(function (f) { return `<option value="${attr(f.key)}" ${condition.field === f.key ? 'selected' : ''}>${esc(f.label)}</option>`; }).join('')}</optgroup>` : '';
  }).join('');
  let control = '';
  if (field.type === 'boolean') {
    control = `<span class="chip line" style="height:30px">满足</span><span class="cond-unit">· 是 / 否</span>`;
  } else if (field.type === 'date') {
    control = `<div class="cond-op"><select data-rop data-cid="${attr(condition.id)}"><option value="before" ${condition.op === 'before' ? 'selected' : ''}>早于</option><option value="after" ${condition.op === 'after' ? 'selected' : ''}>晚于</option></select></div><input class="cond-input wide" type="date" data-rval data-cid="${attr(condition.id)}" value="${attr(condition.value || '')}">`;
  } else if (field.type === 'string') {
    control = `<div class="cond-op"><select data-rop data-cid="${attr(condition.id)}"><option value="contains" ${condition.op === 'contains' ? 'selected' : ''}>包含</option><option value="notContains" ${condition.op === 'notContains' ? 'selected' : ''}>不包含</option></select></div><input class="cond-input wide" type="text" data-rval data-cid="${attr(condition.id)}" value="${attr(condition.value || '')}" placeholder="${attr(field.placeholder || '')}">`;
  } else if (field.type === 'number') {
    const ops = field.ops.map(function (op) { return `<option value="${op}" ${condition.op === op ? 'selected' : ''}>${window.SH.Rules.OP_LABELS[op]}</option>`; }).join('');
    control = `<div class="cond-op"><select data-rop data-cid="${attr(condition.id)}">${ops}</select></div>
      <input class="cond-input" type="number" data-rval data-cid="${attr(condition.id)}" value="${attr(condition.value)}" placeholder="${attr(field.placeholder || '')}">
      ${condition.op === 'between' ? `<span class="cond-between-sep">~</span><input class="cond-input" type="number" data-rval2 data-cid="${attr(condition.id)}" value="${attr(condition.value2 || '')}" placeholder="上限">` : ''}
      <span class="cond-unit">${esc(field.unit || '')}</span>`;
  }
  return `<div class="condition-card ${condition.enabled === false ? 'disabled' : ''}" data-cid="${attr(condition.id)}">
    <div class="cond-tone ${group.tone}"></div>
    <div class="cond-body">
      <div class="cond-line">
        <div class="cond-field"><select data-rfield data-cid="${attr(condition.id)}">${fieldOptions}</select></div>
        ${control}
        <span class="cond-match" data-match-for="${attr(condition.id)}">当前命中 <b>${fmtNum(matches)}</b> / ${fmtNum(totalAccounts)}</span>
      </div>
      <div class="cond-hint">${esc(field.hint || '')}${field.type === 'boolean' ? ' · 这是二值信号，满足则计入评分。' : ''}</div>
    </div>
    <div class="cond-side">
      <select class="weight-select" data-rweight data-cid="${attr(condition.id)}" title="权重">${[1, 2, 3, 4, 5].map(function (w) { return `<option value="${w}" ${Number(condition.weight) === w ? 'selected' : ''}>权重 ${w} · ${window.SH.Rules.WEIGHT_LABELS[w]}</option>`; }).join('')}</select>
      <label class="switch" title="启用条件"><input type="checkbox" data-renabled data-cid="${attr(condition.id)}" ${condition.enabled !== false ? 'checked' : ''}><span class="track"></span></label>
      <button class="icon-btn danger" data-act="remove-condition" data-cid="${attr(condition.id)}" title="删除条件">${icon('trash')}</button>
    </div>
  </div>`;
}

function renderRulesPreview() {
  const draft = state.ruleDraft || activeRules();
  const result = draftEvaluation();
  const total = result.total;
  const pct = total ? Math.round(result.matched / total * 100) : 0;
  const dist = result.dist;
  const reasons = {};
  result.evaluated.forEach(function (e) {
    if (!e.match && !e.suggested) return;
    e.reasons.forEach(function (r) { reasons[r.label] = (reasons[r.label] || 0) + 1; });
  });
  const topReasons = Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; }).slice(0, 4);
  const maxReason = topReasons.length ? reasons[topReasons[0]] : 0;
  return `<div class="card-head"><div><div class="card-title">${icon('sparkles')}实时预览</div><div class="card-sub">基于当前 ${fmtNum(total)} 个关注账号</div></div><span class="chip jade">未保存也可预览</span></div>
    <div class="preview-big"><div><div class="num">${fmtNum(result.matched)}<small>个命中</small></div><div class="lbl" style="margin-top:4px">其中 ${fmtNum(result.suggested)} 个建议清理</div></div><span class="pct">${pct}%</span></div>
    <div class="mini-dist" style="margin-top:14px">${['high', 'medium', 'low', 'unknown'].map(function (key) { return `<span class="${key}" style="width:${total ? dist[key] / total * 100 : 0}%"></span>`; }).join('')}</div>
    <div class="mini-legend">
      <div class="row"><span class="dot" style="background:${RISK_COLORS.high}"></span>高风险 <b>${fmtNum(dist.high)}</b></div>
      <div class="row"><span class="dot" style="background:${RISK_COLORS.medium}"></span>中风险 <b>${fmtNum(dist.medium)}</b></div>
      <div class="row"><span class="dot" style="background:${RISK_COLORS.low}"></span>低风险 <b>${fmtNum(dist.low)}</b></div>
      <div class="row"><span class="dot" style="background:${RISK_COLORS.unknown}"></span>数据不足 <b>${fmtNum(dist.unknown)}</b></div>
    </div>
    <div class="preview-divider"></div>
    <div class="eyebrow" style="margin-bottom:8px">最常见的命中信号</div>
    ${topReasons.length ? `<div class="reason-rank">${topReasons.map(function (label) { return `<div class="reason-rank-row"><span class="name">${esc(label)}</span><div class="bar"><span style="width:${maxReason ? reasons[label] / maxReason * 100 : 0}%"></span></div><span class="n">${reasons[label]}</span></div>`; }).join('')}</div>` : '<div class="small muted" style="line-height:1.7">当前条件还没有命中任何账号。可以放宽条件，或者先去扫描更多数据。</div>'}
    <div class="preview-note" style="border-top:0;padding-top:6px">修改参数后，请点右上角的“保存并应用”。这是本页唯一的保存入口。</div>
    <div class="preview-note">建议清理 = 命中规则 + 评分达到 ${Number(draft.suggestThreshold) || 55} 分 + 不在白名单。可以随时在列表中调整。</div>`;
}

function updateRulesLive() {
  if (state.view !== 'rules' || !state.ruleDraft) return;
  if (state._rulesLiveTimer) clearTimeout(state._rulesLiveTimer);
  state._rulesLiveTimer = setTimeout(updateRulesLiveNow, 180);
}

function updateRulesLiveNow() {
  state._rulesLiveTimer = null;
  if (state.view !== 'rules' || !state.ruleDraft) return;
  const accounts = followingAccounts();
  const metricsList = accounts.map(function (a) { return window.SH.Rules.getMetrics(a, Date.now()); });
  document.querySelectorAll('[data-match-for]').forEach(function (el) {
    const condition = state.ruleDraft.conditions.find(function (c) { return c.id === el.dataset.matchFor; });
    if (!condition) return;
    const count = metricsList.reduce(function (sum, metrics) { return sum + (window.SH.Rules.evalCondition(condition, metrics).matched ? 1 : 0); }, 0);
    el.innerHTML = `当前命中 <b>${fmtNum(count)}</b> / ${fmtNum(accounts.length)}`;
  });
  const preview = document.getElementById('rulesPreview');
  if (preview) preview.innerHTML = renderRulesPreview();
  const dirty = rulesDirty();
  const chip = document.getElementById('rulesDirty');
  if (chip) { chip.className = 'chip ' + (dirty ? 'amber' : 'line'); chip.textContent = dirty ? '有未保存修改' : '已保存'; }
}

/* ======================================================================== *
 *  HISTORY
 * ======================================================================== */
function renderHistory() {
  const history = activeHistory();
  const cleanups = (history.cleanups || []).filter(function (c) { return c.platform === state.platform; });
  const scans = (history.scans || []).filter(function (s) { return s.platform === state.platform; });
  const unfollowed = accountList().filter(function (a) { return a.following === false; }).sort(function (a, b) { return (b.unfollowedAt || 0) - (a.unfollowedAt || 0); });
  const tab = state.historyTab;
  let body = '';
  if (tab === 'scan') body = renderScanHistory(scans);
  else if (tab === 'unfollowed') body = renderUnfollowed(unfollowed);
  else body = renderCleanupHistory(cleanups);
  return `<div class="page">
    <div class="history-head"><div><div class="history-title">清理记录</div><div class="history-sub">每次扫描和取消关注都会留下本地记录，方便回看和避免重复处理。</div></div><div class="rules-actions"><button class="btn btn-sm" data-act="export-history">${icon('download')}导出表格</button>${state.demo ? '<span class="demo-chip">演示记录</span>' : ''}</div></div>
    <div class="tabs">
      <button class="tab ${tab === 'cleanup' ? 'active' : ''}" data-act="history-tab" data-tab="cleanup">${icon('broom')}清理记录 <span class="n">${cleanups.length}</span></button>
      <button class="tab ${tab === 'scan' ? 'active' : ''}" data-act="history-tab" data-tab="scan">${icon('scan')}扫描记录 <span class="n">${scans.length}</span></button>
      <button class="tab ${tab === 'unfollowed' ? 'active' : ''}" data-act="history-tab" data-tab="unfollowed">${icon('users')}已取消关注 <span class="n">${unfollowed.length}</span></button>
    </div>
    ${body}
  </div>`;
}

function renderCleanupHistory(cleanups) {
  if (!cleanups.length) return `<div class="card"><div class="empty-state"><div class="empty-art">${icon('broom')}</div><h3>还没有清理记录</h3><p>在关注列表中筛选并确认要取消关注的账号后，这里会记录每次操作的结果。</p><button class="btn btn-primary" data-act="nav" data-view="accounts">${icon('users')}去关注列表看看</button></div></div>`;
  return `<div class="history-list">${cleanups.map(function (c) {
    const results = c.results || [];
    const avatars = results.slice(0, 6).map(function (r) { return avatarHTML(r); }).join('');
    const ok = c.success != null ? Number(c.success) : results.filter(function (r) { return r.ok; }).length;
    const failed = c.failed != null ? Number(c.failed) : results.filter(function (r) { return !r.ok; }).length;
    return `<div class="card history-card">
      <div class="history-date"><div class="d">${fmtDate(c.endedAt || c.startedAt)}</div><div class="t">${new Date(c.endedAt || c.startedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div></div>
      <div class="history-icon">${icon('broom')}</div>
      <div class="history-main"><div class="h-title">取消关注 ${fmtNum(c.total)} 个账号 <span class="badge ${failed ? 'amber' : 'jade'}">${failed ? '部分完成' : '已完成'}</span></div><div class="h-sub">操作间隔 ${c.options ? Math.round((c.options.intervalMs || 2200) / 100) / 10 : 2.2} 秒 · 本地记录</div></div>
      <div class="history-avatars">${avatars}${results.length > 6 ? `<span class="more">+${results.length - 6}</span>` : ''}</div>
      <div class="history-stats"><div class="history-stat"><div class="v jade">${fmtNum(ok)}</div><div class="l">成功</div></div><div class="history-stat"><div class="v rose">${fmtNum(failed)}</div><div class="l">失败</div></div></div>
      <div class="history-actions"><button class="icon-btn" data-act="history-detail" data-id="${attr(c.id)}" title="查看详情">${icon('eye')}</button><button class="icon-btn" data-act="history-export" data-id="${attr(c.id)}" title="导出本条记录">${icon('download')}</button></div>
    </div>`;
  }).join('')}</div>`;
}

function renderScanHistory(scans) {
  if (!scans.length) return `<div class="card"><div class="empty-state"><div class="empty-art">${icon('scan')}</div><h3>还没有扫描记录</h3><p>完成一次关注列表扫描后，这里会记录扫描数量和变化。请用右上角的扫描按钮开始。</p></div></div>`;
  return `<div class="card" style="padding:6px 16px 10px"><table class="scan-history-table">
    <thead><tr><th>开始时间</th><th>状态</th><th>读取</th><th>完成分析</th><th>失败</th><th>新增关注</th><th>取消关注</th><th>模式</th></tr></thead>
    <tbody>${scans.map(function (s) { return `<tr><td>${fmtDateTime(s.startedAt)}</td><td><span class="badge ${s.status === 'completed' ? 'jade' : s.status === 'error' ? 'rose' : 'slate'}">${s.status === 'completed' ? '完成' : s.status === 'error' ? '失败' : esc(s.status || '未知')}</span></td><td>${fmtNum(s.scanned)}</td><td>${fmtNum(s.enriched)}</td><td>${fmtNum(s.failed)}</td><td>${s.added ? '+' + s.added : '—'}</td><td>${s.removed ? '-' + s.removed : '—'}</td><td>${s.mode === 'deep' ? '深度' : s.mode === 'none' ? '仅列表' : '活跃度'}</td></tr>`; }).join('')}</tbody>
  </table></div>`;
}

function renderUnfollowed(list) {
  if (!list.length) return `<div class="card"><div class="empty-state"><div class="empty-art">${icon('users')}</div><h3>还没有已取消关注的记录</h3><p>批量清理成功后，账号会在这里保留记录，重新扫描时也会被标记为已取关。</p></div></div>`;
  const shown = list.slice(0, 200);
  const extra = list.length - shown.length;
  return `<div class="card" style="padding:16px">${extra ? `<div class="alert mb-12">${icon('info')}<div>已取关账号共 ${fmtNum(list.length)} 个，这里显示最近 ${fmtNum(shown.length)} 个。完整列表请使用“导出表格”。</div></div>` : ''}<div class="unfollowed-grid">${shown.map(function (a) {
    return `<div class="unfollowed-item">${avatarHTML(a)}<div style="min-width:0"><div class="u-name">${esc(a.name || '未命名账号')}</div><div class="u-sub">${esc(a.uniqueId || a.id)} · ${statusLabel(a.accountStatus)}</div></div><div class="u-date">${fmtDate(a.unfollowedAt)}<br>取消关注</div></div>`;
  }).join('')}</div></div>`;
}

/* ======================================================================== *
 *  SETTINGS
 * ======================================================================== */
function ensureSettingsDraft() {
  if (!state.settingsDraft) state.settingsDraft = deepClone(state.boot.settings);
  return state.settingsDraft;
}

function settingsDirty() {
  if (!state.settingsDraft || !state.boot) return false;
  return JSON.stringify(state.settingsDraft) !== JSON.stringify(state.boot.settings);
}

function renderSettings() {
  if (!state.boot) return '';
  ensureSettingsDraft();
  const draft = state.settingsDraft;
  const p = activePayload();
  const conn = p && p.account;
  const platform = state.platform;
  const platformMeta = PLATFORM_META[platform];
  const ps = draft[platform];
  const cs = draft.cleanup;
  const dirty = settingsDirty();
  return `<div class="page">
    <div class="rules-topbar"><div><div class="rules-title">设置</div><div class="rules-sub">连接、扫描与清理的安全选项。修改后点击保存，设置会应用到下一次任务。</div></div><div class="rules-actions"><span id="settingsDirty" class="chip ${dirty ? 'amber' : 'line'}" style="height:28px">${dirty ? '有未保存修改' : '已保存'}</span><button class="btn btn-sm btn-primary" data-act="save-settings">${icon('check')}保存设置</button></div></div>
    <div class="settings-grid">
      <div class="card settings-card span-2">
        <h3>${icon('link')}账号与连接</h3>
        <div class="desc">${state.demo ? '当前在演示模式。演示数据不会被写入真实账号，所有操作都在本地模拟。' : '登录状态保存在本机 Chromium 会话中。内置浏览器会尽量复用已有登录，只有失效时才需要重新扫码。'}</div>
        ${conn ? `<div class="connection-box">${avatarHTML(conn, 'rounded')}<div><div class="c-name">${esc(conn.name || '账号')}</div><div class="c-sub">${platformMeta.label} · ${state.demo ? '演示账号' : '已连接'}${conn.connectedAt ? ' · ' + fmtDate(conn.connectedAt) : ''}</div></div><button class="btn btn-sm" data-act="connect" data-platform="${platform}">${icon('refresh')}重新登录</button><button class="btn btn-sm" data-act="disconnect" data-platform="${platform}">${icon('logout')}退出登录</button></div>` : `<div class="connection-box"><div class="connect-logo ${platformMeta.cls}" style="width:40px;height:40px;border-radius:12px;font-size:15px;margin:0">${platformMeta.cls === 'bili' ? 'B' : '抖'}</div><div><div class="c-name">未连接${esc(platformMeta.short)}</div><div class="c-sub">连接后即可扫描关注列表</div></div><button class="btn btn-sm btn-primary" data-act="connect" data-platform="${platform}">${icon('link')}连接账号</button></div>`}
        ${state.demo ? `<div class="mt-12"><button class="btn btn-sm" data-act="exit-demo">${icon('logout')}退出演示模式</button></div>` : ''}
      </div>

      <div class="card settings-card">
        <h3>${icon('scan')}扫描行为</h3>
        <div class="desc">扫描分为两个阶段：先读取完整关注列表，再逐个分析账号。分析越深，耗时和平台请求越多。</div>
        <div class="radio-cards">
          <label class="radio-card"><input type="radio" name="enrichMode" data-setting="${platform}.enrichMode" value="activity" ${ps.enrichMode === 'activity' ? 'checked' : ''}><div class="rc-title"><span class="dot"></span>完整核验</div><div class="rc-desc">同步核验资料、关系、作品、状态、粉丝等变量</div></label>
          <label class="radio-card"><input type="radio" name="enrichMode" data-setting="${platform}.enrichMode" value="deep" ${ps.enrichMode === 'deep' ? 'checked' : ''}><div class="rc-title"><span class="dot"></span>完整核验 + 动态</div><div class="rc-desc">在完整核验基础上额外读取最近动态</div></label>
        </div>
        <div class="setting-row"><div><div class="setting-label">请求间隔</div><div class="setting-hint">每个账号分析之间等待的时间。太短更容易触发平台风控。</div></div><div class="setting-control"><input class="input" type="number" min="180" step="50" data-setting="${platform}.requestDelayMs" value="${ps.requestDelayMs}"><span class="input-unit">毫秒</span></div></div>
        ${platform === 'douyin' ? `<div class="setting-row"><div><div class="setting-label">每页读取数量</div><div class="setting-hint">抖音关注列表使用游标分页，固定每页 20 个，避免分页错位</div></div><div class="setting-control"><input class="input" type="number" value="20" disabled><span class="input-unit">个</span></div></div>` : `<div class="setting-row"><div><div class="setting-label">每页读取数量</div><div class="setting-hint">B站每页最多 50 个</div></div><div class="setting-control"><input class="input" type="number" min="10" max="50" data-setting="${platform}.pageSize" value="${ps.pageSize}"><span class="input-unit">个</span></div></div>`}
        ${platform === 'bili' ? `<div class="setting-row"><div><div class="setting-label">同时分析最近动态</div><div class="setting-hint">深度分析时额外读取 B站动态。请求更多、更容易触发风控，默认关闭。</div></div><div class="setting-control"><label class="switch"><input type="checkbox" data-setting="bili.analyzeDynamics" ${ps.analyzeDynamics ? 'checked' : ''}><span class="track"></span></label></div></div>` : ''}
      </div>

      <div class="card settings-card">
        <h3>${icon('shieldCheck')}清理安全</h3>
        <div class="desc">取消关注会按间隔逐个执行。连续失败或平台提示验证时会自动暂停，避免持续操作造成风险。</div>
        <div class="setting-row"><div><div class="setting-label">操作间隔</div><div class="setting-hint">每次取消关注之间至少等待的时间，最小 1.2 秒。</div></div><div class="setting-control"><input class="input" type="number" min="1200" step="100" data-setting="cleanup.intervalMs" value="${cs.intervalMs}"><span class="input-unit">毫秒</span></div></div>
        <div class="setting-row"><div><div class="setting-label">每批数量</div><div class="setting-hint">每执行多少个账号后进入一次较长冷却。</div></div><div class="setting-control"><input class="input" type="number" min="1" max="100" data-setting="cleanup.batchSize" value="${cs.batchSize}"><span class="input-unit">个</span></div></div>
        <div class="setting-row"><div><div class="setting-label">批次冷却</div><div class="setting-hint">达到每批数量后暂停多久再继续。</div></div><div class="setting-control"><input class="input" type="number" min="0" max="60000" step="500" data-setting="cleanup.batchPauseMs" value="${cs.batchPauseMs}"><span class="input-unit">毫秒</span></div></div>
        <div class="setting-row"><div><div class="setting-label">连续失败自动暂停</div><div class="setting-hint">避免在登录失效或平台异常时反复尝试。</div></div><div class="setting-control"><input class="input" type="number" min="1" max="10" data-setting="cleanup.maxConsecutiveFailures" value="${cs.maxConsecutiveFailures}"><span class="input-unit">次</span></div></div>
      </div>

      <div class="card settings-card span-2">
        <h3>${icon('folder')}本地数据</h3>
        <div class="desc">扫描结果、筛选变量和清理历史都保存在本机。你可以随时打开数据目录备份或清理。CSV 文件使用 UTF-8 BOM，Excel 可直接打开。</div>
        <div class="data-path">${icon('folder')}<span class="mono">${esc(state.boot.dataPath || '')}</span><button class="icon-btn" data-act="open-data" title="打开数据目录">${icon('external')}</button></div>
        <div class="row gap-8" style="flex-wrap:wrap">
          <button class="btn btn-sm" data-act="create-shortcut">${icon('external')}创建桌面快捷方式</button>
          <button class="btn btn-sm" data-act="export-all">${icon('download')}导出全部关注</button>
          <button class="btn btn-sm" data-act="export-unfollowed">${icon('download')}导出已取关</button>
          <button class="btn btn-sm" data-act="export-history">${icon('download')}导出清理记录</button>
          <button class="btn btn-sm" data-act="open-data">${icon('folder')}打开数据目录</button>
        </div>
      </div>

      <div class="card settings-card">
        <h3>${icon('info')}关于拾光</h3>
        <div class="about-list">
          <div><b>版本</b> ${esc(state.boot.version || '1.0.0')} · Windows 独立桌面版</div>
          <div><b>数据</b> 全部保存在本机，不上传服务器。</div>
          <div><b>登录</b> 使用内置浏览器会话，不读取桌面客户端的加密缓存；关闭软件后登录态仍会保留，失效时需要重新扫码。</div>
          <div class="mt-8 muted">平台接口和页面结构可能变化。若扫描或清理持续失败，请先更新工具。工具不会绕过平台安全验证；遇到验证请在弹出窗口完成，然后点击继续。</div>
        </div>
      </div>

      <div class="card settings-card danger-zone">
        <h3>${icon('alert')}危险操作</h3>
        <div class="desc">这些操作会影响本地记录，请确认后再执行。取消关注本身不会在这里被撤销。</div>
        <div class="danger-row"><div><div class="setting-label">清除当前平台的本地关注数据</div><div class="setting-hint">保留登录状态，只删除扫描结果、筛选变量和历史快照。</div></div><button class="btn btn-sm" data-act="clear-platform">清除数据</button></div>
        <div class="danger-row"><div><div class="setting-label">清除全部清理与扫描记录</div><div class="setting-hint">只删除历史记录，不影响关注列表缓存。</div></div><button class="btn btn-sm" data-act="clear-history">清除记录</button></div>
        <div class="danger-row"><div><div class="setting-label">退出登录并清除登录会话</div><div class="setting-hint">需要重新扫码才能继续扫描或取消关注。</div></div><button class="btn btn-sm btn-danger" data-act="disconnect" data-platform="${platform}">退出登录</button></div>
      </div>
    </div>
  </div>`;
}
