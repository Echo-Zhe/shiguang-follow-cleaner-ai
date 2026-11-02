'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  app, BrowserWindow, ipcMain, session, shell, dialog, Menu, nativeTheme
} = require('electron');
const { Store } = require('./src/main/store');
const { BiliClient } = require('./src/main/bili');
const { DouyinClient } = require('./src/main/douyin');
const { CleanupRunner } = require('./src/main/cleanup-runner');
const Rules = require('./src/shared/rules');

const APP_NAME = 'ShiGuangFollowCleaner';
const DISPLAY_NAME = '拾光 · 关注清理';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

// Chromium needs an explicit, writable user-data-dir on first launch in some
// Windows environments. Re-exec once with the switch so the browser process
// starts with it from the very beginning.
if (!process.argv.some(arg => arg.startsWith('--user-data-dir')) && process.env.SH_RELAUNCHED !== '1') {
  try {
    const userDataRoot = path.join(app.getPath('appData'), APP_NAME);
    fs.mkdirSync(userDataRoot, { recursive: true });
    const args = process.argv.slice(1)
      .filter(arg => !arg.startsWith('--user-data-dir'))
      .concat(['--user-data-dir=' + path.join(userDataRoot, 'Chromium')]);
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: 'ignore',
      env: Object.assign({}, process.env, { SH_RELAUNCHED: '1' })
    });
    child.unref();
    app.exit(0);
  } catch (e) {
    // Fall back to configuring paths in this process if re-exec is unavailable.
    try {
      const userDataRoot = path.join(app.getPath('appData'), APP_NAME);
      fs.mkdirSync(userDataRoot, { recursive: true });
      app.setPath('userData', userDataRoot);
      app.commandLine.appendSwitch('user-data-dir', path.join(userDataRoot, 'Chromium'));
    } catch (err) { /* ignore */ }
  }
}
app.setName(APP_NAME);
app.setAppUserModelId('com.shiguang.followcleaner');
app.commandLine.appendSwitch('lang', 'zh-CN');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.exit(0);
} else {
  app.on('second-instance', function () {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let store = null;
let biliSession = null;
let douyinSession = null;
let bili = null;
let douyin = null;
let biliCleanup = null;
let douyinCleanup = null;
let quitting = false;

function emit(event) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('app:event', event);
  }
}

function log(message, error) {
  try {
    const dir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const line = new Date().toISOString() + ' ' + message + (error ? ' :: ' + (error.stack || String(error)) : '') + '\n';
    fs.appendFileSync(path.join(dir, 'app.log'), line);
  } catch (e) { /* ignore */ }
}

function setupSession(platform) {
  const partition = platform === 'bili' ? 'persist:bili' : 'persist:douyin';
  const ses = session.fromPartition(partition);
  ses.setUserAgent(UA);
  ses.setPermissionRequestHandler(function (webContents, permission, callback) { callback(false); });
  try {
    ses.webRequest.onBeforeSendHeaders({
      urls: ['*://*.hdslb.com/*', '*://*.douyinpic.com/*', '*://*.douyinpic.cn/*', '*://*.douyinstatic.com/*']
    }, function (details, callback) {
      const headers = Object.assign({}, details.requestHeaders);
      if (!headers.Referer && !headers.referer) {
        headers.Referer = platform === 'bili' ? 'https://www.bilibili.com/' : 'https://www.douyin.com/';
      }
      callback({ requestHeaders: headers });
    });
  } catch (e) { /* ignore */ }
  return ses;
}

function createWindow() {
  const icon = path.join(__dirname, 'assets', 'icon.png');
  const hidden = process.argv.includes('--hidden');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1160,
    minHeight: 720,
    show: false,
    title: DISPLAY_NAME,
    icon: fs.existsSync(icon) ? icon : undefined,
    backgroundColor: '#f4f5f1',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.on('console-message', function (event, level, message, line, sourceId) {
    const text = String((event && event.message) || message || '');
    const lvl = (event && event.level) != null ? event.level : level;
    const src = (event && event.sourceId) || sourceId || '';
    const ln = (event && event.lineNumber) != null ? event.lineNumber : line;
    if (text.includes('Electron Security Warning')) return;
    log('renderer[' + lvl + '] ' + text + ' @' + src + ':' + ln);
  });
  mainWindow.webContents.on('render-process-gone', function (event, details) {
    log('renderer process gone ' + JSON.stringify(details));
  });
  mainWindow.webContents.on('did-fail-load', function (event, code, desc, url) {
    log('render did-fail-load ' + code + ' ' + desc + ' ' + url);
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', function () {
    if (!hidden) mainWindow.show();
    if (process.env.SH_CAPTURE_AFTER) {
      const delay = Math.max(400, Number(process.env.SH_CAPTURE_AFTER) || 1200);
      setTimeout(async () => {
        try {
          if (process.env.SH_CAPTURE_JS) {
            try {
              const jsResult = await mainWindow.webContents.executeJavaScript(process.env.SH_CAPTURE_JS, true);
              log('capture js result ' + JSON.stringify(jsResult).slice(0, 2000));
            } catch (e) { log('capture js failed', e); }
            await new Promise(r => setTimeout(r, Number(process.env.SH_CAPTURE_WAIT || 1000)));
          }
          try { mainWindow.show(); mainWindow.focus(); } catch (e) { /* ignore */ }
          try { if (mainWindow.webContents.invalidate) mainWindow.webContents.invalidate(); } catch (e) { /* ignore */ }
          await new Promise(r => setTimeout(r, 450));
          const image = await mainWindow.webContents.capturePage();
          const target = process.env.SH_CAPTURE_PATH || path.join(app.getPath('userData'), 'shot.png');
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, image.toPNG());
          log('captured ' + target);
        } catch (e) { log('capture failed', e); }
        if (process.env.SH_CAPTURE_QUIT === '1') app.quit();
      }, delay);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(function (details) {
    if (/^https:\/\//i.test(details.url)) shell.openExternal(details.url).catch(function () {});
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', function (event, url) {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  mainWindow.on('closed', function () { mainWindow = null; });
}

function bootstrapData() {
  const settings = store.getSettings();
  const result = {
    version: app.getVersion(),
    platformLabels: { bili: '哔哩哔哩', douyin: '抖音' },
    settings: settings,
    connections: { bili: store.platform('bili').account, douyin: store.platform('douyin').account },
    rules: { bili: store.platform('bili').rules, douyin: store.platform('douyin').rules },
    stats: { bili: store.stats('bili'), douyin: store.stats('douyin') },
    scans: { bili: publicScanState(store.platform('bili').scan), douyin: publicScanState(store.platform('douyin').scan) },
    cleanups: { bili: publicCleanupState(store.platform('bili').cleanup), douyin: publicCleanupState(store.platform('douyin').cleanup) },
    history: store.getHistory(),
    dataPath: path.join(app.getPath('userData'), 'data'),
    lastSummary: { bili: store.platform('bili').lastSummary, douyin: store.platform('douyin').lastSummary }
  };
  return result;
}

function publicScanState(scan) {
  const out = Object.assign({}, scan || {});
  out.seenCount = Array.isArray(out.seenIds) ? out.seenIds.length : 0;
  out.queueCount = Array.isArray(out.enrichQueue) ? out.enrichQueue.length : 0;
  delete out.seenIds;
  delete out.enrichQueue;
  return out;
}

function publicCleanupState(cleanup) {
  const out = Object.assign({}, cleanup || {});
  delete out.queue;
  out.results = Array.isArray(out.results) ? out.results.slice(-200) : [];
  return out;
}

function platformPayload(platform) {
  const p = store.platform(platform);
  return {
    platform: platform,
    account: p.account,
    accounts: Object.values(p.accounts),
    rules: p.rules,
    scan: publicScanState(p.scan),
    cleanup: publicCleanupState(p.cleanup),
    stats: store.stats(platform),
    lastSummary: p.lastSummary
  };
}

function requireClient(platform) {
  const client = platform === 'bili' ? bili : douyin;
  if (!client) throw new Error('未知平台');
  return client;
}

function clientFor(platform) {
  return platform === 'bili' ? bili : douyin;
}

function toCSV(rows) {
  return '\uFEFF' + rows.map(function (row) {
    return row.map(function (cell) {
      const value = cell == null ? '' : String(cell);
      if (/[",\r\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
      return value;
    }).join(',');
  }).join('\r\n');
}

function fmtDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function profileURL(platform, account) {
  if (platform === 'bili') return 'https://space.bilibili.com/' + (account.mid || account.id);
  return 'https://www.douyin.com/user/' + encodeURIComponent(account.secUid || account.id);
}

async function exportAccounts(platform, ids, mode) {
  const p = store.platform(platform);
  let accounts = Object.values(p.accounts);
  if (Array.isArray(ids) && ids.length) {
    const set = new Set(ids.map(String));
    accounts = accounts.filter(function (a) { return set.has(String(a.id)); });
  }
  if (mode === 'following') accounts = accounts.filter(function (a) { return a.following !== false; });
  if (mode === 'unfollowed') accounts = accounts.filter(function (a) { return a.following === false; });
  accounts.sort(function (a, b) {
    const ea = Rules.evaluate(a, p.rules);
    const eb = Rules.evaluate(b, p.rules);
    return eb.score - ea.score;
  });
  const rows = [[
    '平台', '昵称', '账号ID', '主页', '简介', '关注时间', '关注天数', '作品数', '粉丝数', '最近作品', '最近活跃',
    '互相关注', '特别关注', '账号状态', '重点标记', '重点原因', '风险分', '风险等级', '命中条件', '白名单', '备注', '当前仍关注', '取消关注时间'
  ]];
  accounts.forEach(function (a) {
    const ev = Rules.evaluate(a, p.rules);
    rows.push([
      platform === 'bili' ? '哔哩哔哩' : '抖音',
      a.name || '',
      a.uniqueId || a.id,
      profileURL(platform, a),
      a.signature || '',
      fmtDate(a.followedAt),
      ev.metrics.followDays != null ? ev.metrics.followDays : '',
      a.videoCount == null ? '' : a.videoCount,
      a.followerCount == null ? '' : a.followerCount,
      fmtDate(a.lastPostAt),
      fmtDate(a.lastActiveAt || a.lastPostAt || a.lastDynamicAt),
      a.mutual == null ? '未提供' : (a.mutual ? '是' : '否'),
      a.special == null ? '未提供' : (a.special ? '是' : '否'),
      (Rules.STATUS_META[a.accountStatus] || {}).label || a.accountStatus || '',
      ev.priority.labels.join('；'),
      ev.priority.reasons.join('；'),
      ev.score,
      ev.riskLabel,
      ev.reasons.map(function (r) { return r.label; }).join('；'),
      a.whitelist ? '是' : '否',
      a.note || '',
      a.following === false ? '否' : '是',
      fmtDate(a.unfollowedAt)
    ]);
  });
  const label = platform === 'bili' ? 'B站' : '抖音';
  const suffix = mode === 'unfollowed' ? '已取关账号' : '关注列表';
  const defaultPath = path.join(app.getPath('documents'), suffix + '_' + label + '_' + new Date().toISOString().slice(0, 10) + '.csv');
  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const result = await dialog.showSaveDialog(win, {
    title: '导出表格',
    defaultPath: defaultPath,
    filters: [{ name: 'CSV 表格（Excel 可直接打开）', extensions: ['csv'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, toCSV(rows), 'utf8');
  return { canceled: false, path: result.filePath, count: accounts.length };
}

async function handleCall(method, args) {
  switch (method) {
    case 'bootstrap':
      return bootstrapData();
    case 'getPlatform':
      return platformPayload(args[0]);
    case 'connect': {
      const platform = args[0];
      if (!['bili', 'douyin'].includes(platform)) throw new Error('未知平台');
      const client = requireClient(platform);
      const identity = await client.login();
      store.setConnection(platform, identity);
      emit({ type: 'connection', platform: platform, account: identity });
      return identity;
    }
    case 'disconnect': {
      const platform = args[0];
      const options = args[1] || {};
      store.clearConnection(platform, { clearAccounts: !!options.clearAccounts });
      if (options.clearSession) {
        const ses = platform === 'bili' ? biliSession : douyinSession;
        try { await ses.clearStorageData(); } catch (e) { /* ignore */ }
        if (platform === 'douyin' && douyin) douyin.closeWindows();
      }
      emit({ type: 'connection', platform: platform, account: null });
      return true;
    }
    case 'saveSettings':
      return store.saveSettings(args[0] || {});
    case 'saveRules': {
      const platform = args[0];
      const rules = store.setRules(platform, args[1]);
      return rules;
    }
    case 'scanStart': {
      const platform = args[0];
      const options = args[1] || {};
      const client = requireClient(platform);
      if (client.scanRunning) {
        if (client.scanPaused) {
          client.resumeScan().catch(function (e) { log('resume scan failed', e); });
          return client.scanState;
        }
        throw new Error('扫描任务正在运行');
      }
      // Start in the background; progress is delivered through app:event.
      client.startScan(options).catch(function (e) { log('background scan failed', e); });
      return client.scanState;
    }
    case 'scanPause': {
      const client = requireClient(args[0]);
      return client.pauseScan();
    }
    case 'scanResume': {
      const client = requireClient(args[0]);
      if (!client.scanRunning) {
        client.startScan({ resume: true }).catch(function (e) { log('background scan resume failed', e); });
        return client.scanState;
      }
      client.resumeScan().catch(function (e) { log('resume scan failed', e); });
      return client.scanState;
    }
    case 'scanStop': {
      const client = requireClient(args[0]);
      return client.stopScan();
    }
    case 'updateAccount': {
      const platform = args[0];
      const id = String(args[1]);
      const patch = args[2] || {};
      const allowed = {};
      if ('whitelist' in patch) allowed.whitelist = !!patch.whitelist;
      if ('starred' in patch) allowed.starred = !!patch.starred;
      if ('note' in patch) allowed.note = String(patch.note || '').slice(0, 500);
      const account = store.patchAccount(platform, id, allowed);
      if (!account) throw new Error('账号不存在');
      return account;
    }
    case 'bulkWhitelist': {
      const platform = args[0];
      const ids = args[1] || [];
      const value = !!args[2];
      store.setWhitelist(platform, ids.map(String), value);
      return { count: ids.length, whitelist: value };
    }
    case 'cleanupStart': {
      const platform = args[0];
      const ids = (args[1] || []).map(String);
      const options = args[2] || {};
      const runner = platform === 'bili' ? biliCleanup : douyinCleanup;
      if (!runner) throw new Error('清理模块未初始化');
      if (runner.running) throw new Error('清理任务正在运行');
      if (!ids.length) throw new Error('没有选择要取消关注的账号');
      if (ids.length > 2000) throw new Error('为降低平台风控与界面卡顿风险，单次最多清理 2000 个账号，请分批进行');
      const p = store.platform(platform);
      const valid = [];
      let excludedWhitelist = 0;
      let excludedNotFollowing = 0;
      ids.forEach(function (id) {
        const account = p.accounts[id];
        if (!account) return;
        if (account.whitelist) { excludedWhitelist += 1; return; }
        if (account.following === false) { excludedNotFollowing += 1; return; }
        valid.push(id);
      });
      if (!valid.length) throw new Error('选中的账号均已被保护或已取关');
      // Run in the background; the renderer receives cleanup progress events.
      runner.start(valid, options).catch(function (e) { log('background cleanup failed', e); });
      return {
        total: valid.length,
        excludedWhitelist: excludedWhitelist,
        excludedNotFollowing: excludedNotFollowing,
        state: runner.state
      };
    }
    case 'cleanupPause': {
      const runner = args[0] === 'bili' ? biliCleanup : douyinCleanup;
      return runner ? runner.pause() : null;
    }
    case 'cleanupResume': {
      const runner = args[0] === 'bili' ? biliCleanup : douyinCleanup;
      if (!runner) return null;
      if (!runner.running) {
        const state = store.platform(args[0]).cleanup;
        throw new Error(state.error || '清理任务已中断，请重新选择账号');
      }
      return runner.resume();
    }
    case 'cleanupStop': {
      const runner = args[0] === 'bili' ? biliCleanup : douyinCleanup;
      return runner ? runner.stop() : null;
    }
    case 'exportAccounts':
      return exportAccounts(args[0], args[1], args[2] || 'all');
    case 'getHistory':
      return store.getHistory();
    case 'createShortcut': {
      const desktop = app.getPath('desktop');
      const shortcutPath = path.join(desktop, '拾光关注清理.lnk');
      const coreExe = process.execPath;
      const dataDir = app.getPath('userData');
      const iconPath = path.join(__dirname, 'assets', 'icon.ico');
      const args = '--no-sandbox --disable-gpu --user-data-dir="' + dataDir + '"';
      const created = shell.writeShortcutLink(shortcutPath, 'create', {
        target: coreExe,
        args: args,
        workingDirectory: path.dirname(coreExe),
        icon: fs.existsSync(iconPath) ? iconPath : process.execPath,
        iconIndex: 0,
        description: '拾光 · 关注清理'
      });
      if (!created) throw new Error('创建桌面快捷方式失败');
      return { path: shortcutPath };
    }
    case 'openDataFolder': {
      const target = path.join(app.getPath('userData'), 'data');
      fs.mkdirSync(target, { recursive: true });
      await shell.openPath(target);
      return true;
    }
    case 'openExternal': {
      const url = String(args[0] || '');
      if (!/^https:\/\/(space\.bilibili\.com|www\.douyin\.com)\//i.test(url)) throw new Error('不支持的链接');
      await shell.openExternal(url);
      return true;
    }
    case 'clearPlatform': {
      const platform = args[0];
      const options = args[1] || {};
      if (options.accounts) store.clearPlatformAccounts(platform);
      return true;
    }
    case 'clearAllHistory': {
      store.state.history.scans = [];
      store.state.history.cleanups = [];
      store.scheduleSave();
      return true;
    }
    case 'appInfo':
      return {
        version: app.getVersion(),
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        userData: app.getPath('userData'),
        dataPath: path.join(app.getPath('userData'), 'data')
      };
    default:
      throw new Error('未知操作: ' + method);
  }
}

function registerIPC() {
  ipcMain.handle('app:call', async function (event, method, args) {
    try {
      const data = await handleCall(String(method), Array.isArray(args) ? args : []);
      return { ok: true, data: data };
    } catch (e) {
      log('IPC ' + method + ' failed', e);
      return {
        ok: false,
        error: {
          code: (e && e.code) || 'ERROR',
          message: (e && e.message) || '操作失败'
        }
      };
    }
  });
}

app.whenReady().then(async function () {
  nativeTheme.themeSource = 'light';
  Menu.setApplicationMenu(null);
  store = new Store(path.join(app.getPath('userData'), 'data'));
  store.init();
  biliSession = setupSession('bili');
  douyinSession = setupSession('douyin');
  bili = new BiliClient({ platform: 'bili', store: store, session: biliSession, emit: emit, getMainWindow: function () { return mainWindow; } });
  douyin = new DouyinClient({ platform: 'douyin', store: store, session: douyinSession, emit: emit, getMainWindow: function () { return mainWindow; } });
  biliCleanup = new CleanupRunner({ platform: 'bili', client: bili, store: store, emit: emit });
  douyinCleanup = new CleanupRunner({ platform: 'douyin', client: douyin, store: store, emit: emit });
  registerIPC();
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(function (e) {
  log('startup failed', e);
  dialog.showErrorBox('启动失败', (e && e.message) || String(e));
  app.quit();
});

app.on('window-all-closed', function () {
  app.quit();
});

app.on('before-quit', function () {
  quitting = true;
  try { if (bili) bili.stopScan(); } catch (e) { /* ignore */ }
  try { if (douyin) { douyin.stopScan(); douyin.closeWindows(); } } catch (e) { /* ignore */ }
  try { if (store) store.flush(); } catch (e) { /* ignore */ }
});

process.on('uncaughtException', function (e) { log('uncaught exception', e); });
process.on('unhandledRejection', function (e) { log('unhandled rejection', e); });

