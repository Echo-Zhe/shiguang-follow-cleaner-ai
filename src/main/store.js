'use strict';

const fs = require('fs');
const path = require('path');
const Rules = require('../shared/rules');

const STATE_VERSION = 1;

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch === undefined ? base : patch;
  const out = Object.assign({}, base);
  Object.keys(patch).forEach(function (key) {
    const value = patch[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && base && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  });
  return out;
}

function defaultSettings() {
  return {
    bili: {
      enrichMode: 'deep',
      requestDelayMs: 900,
      pageSize: 50,
      analyzeDynamics: false
    },
    douyin: {
      enrichMode: 'deep',
      requestDelayMs: 1600,
      pageSize: 20
    },
    cleanup: {
      intervalMs: 2200,
      batchSize: 20,
      batchPauseMs: 8000,
      maxConsecutiveFailures: 2
    },
    ui: {
      pageSize: 50,
      reduceMotion: false
    }
  };
}

function emptyScan() {
  return {
    status: 'idle',
    phase: 'idle',
    startedAt: null,
    endedAt: null,
    total: null,
    scanned: 0,
    failed: 0,
    enriched: 0,
    enrichTotal: 0,
    page: 0,
    listDone: false,
    current: '',
    error: '',
    mode: 'activity',
    seenIds: [],
    enrichQueue: [],
    enrichIndex: 0,
    riskPaused: false
  };
}

function emptyCleanup() {
  return {
    status: 'idle',
    startedAt: null,
    endedAt: null,
    total: 0,
    done: 0,
    success: 0,
    failed: 0,
    current: '',
    error: '',
    results: [],
    options: null
  };
}

function defaultPlatform(platform) {
  return {
    account: null,
    accounts: {},
    rules: Rules.defaultRules(platform),
    scan: emptyScan(),
    cleanup: emptyCleanup(),
    lastSummary: null,
    connectedAt: null
  };
}

function defaultState() {
  return {
    version: STATE_VERSION,
    createdAt: Date.now(),
    settings: defaultSettings(),
    platforms: {
      bili: defaultPlatform('bili'),
      douyin: defaultPlatform('douyin')
    },
    history: { scans: [], cleanups: [] },
    meta: { lastOpenedAt: Date.now() }
  };
}

function autoWhitelistReasons(account) {
  const reasons = [];
  if (account && account.mutual === true) reasons.push('互相关注');
  if (account && account.special === true) reasons.push('特别关注');
  if (account && account.starred === true) reasons.push('已收藏');
  return reasons;
}

function applyAutoWhitelist(account) {
  if (!account) return account;
  const reasons = autoWhitelistReasons(account);
  if (reasons.length) {
    account.whitelist = true;
    account.whitelistAuto = true;
    account.whitelistReason = reasons.join('、');
  } else if (account.whitelistAuto && !account.whitelistManual) {
    account.whitelist = false;
    account.whitelistAuto = false;
    account.whitelistReason = '';
  }
  return account;
}

class Store {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.file = path.join(baseDir, 'app-state.json');
    this.backup = path.join(baseDir, 'app-state.backup.json');
    this.state = defaultState();
    this.saveTimer = null;
    this.dirty = false;
    this.bulkMode = false;
    this.bulkDelayMs = 15000;
    this.lastBackupAt = 0;
  }

  init() {
    fs.mkdirSync(this.baseDir, { recursive: true });
    let loaded = null;
    for (const candidate of [this.file, this.backup]) {
      try {
        if (!fs.existsSync(candidate)) continue;
        const raw = fs.readFileSync(candidate, 'utf8');
        if (!raw.trim()) continue;
        loaded = JSON.parse(raw);
        break;
      } catch (e) {
        // Try the backup or start fresh.
      }
    }
    if (loaded && typeof loaded === 'object') {
      this.state = this.migrate(loaded);
    } else {
      this.state = defaultState();
      this.saveNow();
    }
    this.state.meta.lastOpenedAt = Date.now();
    for (const platform of ['bili', 'douyin']) {
      const p = this.state.platforms[platform];
      if (p.scan && (p.scan.status === 'scanning' || p.scan.status === 'working')) {
        p.scan.status = 'paused';
        p.scan.error = '上次扫描被中断，可继续扫描';
      }
      if (p.cleanup && p.cleanup.status === 'running') {
        p.cleanup.status = 'paused';
        p.cleanup.error = '上次清理被中断';
      }
    }
    this.scheduleSave();
    return this.state;
  }

  migrate(loaded) {
    const base = defaultState();
    const migrated = deepMerge(base, loaded);
    migrated.version = STATE_VERSION;
    migrated.platforms = migrated.platforms || {};
    for (const platform of ['bili', 'douyin']) {
      const p = migrated.platforms[platform] || defaultPlatform(platform);
      p.accounts = p.accounts || {};
      p.scan = deepMerge(emptyScan(), p.scan || {});
      p.cleanup = deepMerge(emptyCleanup(), p.cleanup || {});
      p.rules = Rules.normalizeRules(p.rules, platform);
      p.accounts = Object.fromEntries(Object.entries(p.accounts).filter(function (entry) {
        return entry[1] && typeof entry[1] === 'object' && entry[1].id;
      }));
      // A platform-reported 0 is not proof that the account has no works.
      // Only keep 0 when it was explicitly verified; otherwise treat it as unknown.
      for (const account of Object.values(p.accounts)) {
        applyAutoWhitelist(account);
        if (platform === 'douyin' && account.videoCount != null && account.videoCountVerified !== true &&
            account.videoCountSource !== 'profile' && account.videoCountSource !== 'posts') {
          account.videoCountVerified = false;
          account.videoCountSource = 'following_list_unverified';
          account.videoCountNote = '关注列表返回的数字未经过作品资料核验';
        }
        if (platform === 'bili' && Number(account.videoCount) > 0 && account.videoCountVerified !== true) {
          account.videoCountVerified = true;
          account.videoCountSource = account.videoCountSource || 'arc_search';
        }
        if (account.videoCount === 0 && account.videoCountVerified !== true) {
          account.videoCount = null;
          account.videoCountVerified = false;
          account.videoCountSource = account.videoCountSource || 'unverified_zero';
          account.videoCountNote = '平台曾返回0，但作品列表未确认；暂按未知处理';
        }
        if (account.videoCount == null) {
          account.videoCount = null;
          account.videoCountVerified = false;
          account.videoCountSource = account.videoCountSource || 'unknown';
        } else if (!account.videoCountSource) {
          account.videoCountSource = 'platform';
        }
      }
      migrated.platforms[platform] = p;
    }
    migrated.history = migrated.history || { scans: [], cleanups: [] };
    migrated.history.scans = Array.isArray(migrated.history.scans) ? migrated.history.scans : [];
    migrated.history.cleanups = Array.isArray(migrated.history.cleanups) ? migrated.history.cleanups : [];
    migrated.settings = deepMerge(defaultSettings(), migrated.settings || {});
    // The works-count repair invalidates any cleanup that was selected using
    // the old unverified zero values. Stop it instead of letting it resume.
    const repairVersion = Number(migrated.meta && migrated.meta.worksRepairVersion) || 0;
    if (repairVersion < 2) {
      for (const platform of ['bili', 'douyin']) {
        const c = migrated.platforms[platform] && migrated.platforms[platform].cleanup;
        if (c && (c.status === 'paused' || c.status === 'running')) {
          c.status = 'stopped';
          c.endedAt = Date.now();
          c.current = '';
          c.error = '作品数量数据已修正，旧清理任务已自动停止。请重新核对名单后再执行。';
        }
      }
      migrated.meta = migrated.meta || {};
      migrated.meta.worksRepairVersion = 2;
    }
    return migrated;
  }

  beginBulk() {
    this.bulkMode = true;
  }

  endBulk() {
    this.bulkMode = false;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.flush();
  }

  scheduleSave(delay) {
    this.dirty = true;
    if (this.saveTimer) return;
    const wait = this.bulkMode ? Math.max(delay || 0, this.bulkDelayMs) : (delay || 180);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, wait);
  }

  saveNow() {
    if (!this.state) return;
    try {
      fs.mkdirSync(this.baseDir, { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.state), 'utf8');
      const now = Date.now();
      if (fs.existsSync(this.file) && now - this.lastBackupAt > 5 * 60 * 1000) {
        try { fs.copyFileSync(this.file, this.backup); this.lastBackupAt = now; } catch (e) { /* ignore backup errors */ }
      }
      try { fs.rmSync(this.file, { force: true }); } catch (e) { /* ignore */ }
      fs.renameSync(tmp, this.file);
      this.dirty = false;
    } catch (e) {
      // Last-resort direct write; never crash the app because of persistence.
      try { fs.writeFileSync(this.file, JSON.stringify(this.state), 'utf8'); } catch (err) { /* ignore */ }
    }
  }

  flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.dirty) this.saveNow();
  }

  getState() { return this.state; }
  getSettings() { return this.state.settings; }
  saveSettings(patch) {
    this.state.settings = deepMerge(this.state.settings, patch || {});
    this.scheduleSave();
    return this.state.settings;
  }

  platform(platform) { return this.state.platforms[platform]; }

  setConnection(platform, account) {
    const p = this.platform(platform);
    p.account = account;
    p.connectedAt = Date.now();
    this.scheduleSave();
  }

  clearConnection(platform, options) {
    const p = this.platform(platform);
    p.account = null;
    p.connectedAt = null;
    if (options && options.clearAccounts) {
      p.accounts = {};
      p.scan = emptyScan();
      p.lastSummary = null;
    }
    this.scheduleSave();
  }

  getAccounts(platform) {
    return Object.values(this.platform(platform).accounts);
  }

  getAccount(platform, id) {
    return this.platform(platform).accounts[id];
  }

  upsertAccounts(platform, list, opts) {
    const p = this.platform(platform);
    const now = Date.now();
    const added = [];
    const updated = [];
    list.forEach((incoming) => {
      if (!incoming || !incoming.id) return;
      const id = String(incoming.id);
      const existing = p.accounts[id];
      if (!existing) {
        p.accounts[id] = Object.assign({}, incoming, {
          id: id,
          platform: platform,
          following: true,
          firstSeenAt: now,
          lastSeenAt: now,
          whitelist: false,
          starred: false,
          note: '',
          enrichedAt: incoming.enrichedAt || null,
          unfollowedAt: null
        });
        applyAutoWhitelist(p.accounts[id]);
        added.push(p.accounts[id]);
      } else {
        const preserve = {
          whitelist: existing.whitelist,
          starred: existing.starred,
          note: existing.note,
          firstSeenAt: existing.firstSeenAt,
          enrichedAt: existing.enrichedAt,
          lastPostAt: incoming.lastPostAt != null ? incoming.lastPostAt : existing.lastPostAt,
          lastDynamicAt: incoming.lastDynamicAt != null ? incoming.lastDynamicAt : existing.lastDynamicAt,
          lastActiveAt: incoming.lastActiveAt != null ? incoming.lastActiveAt : existing.lastActiveAt,
          videoCount: incoming.videoCount != null ? incoming.videoCount : existing.videoCount,
          followerCount: incoming.followerCount != null ? incoming.followerCount : existing.followerCount,
          level: incoming.level != null ? incoming.level : existing.level,
          category: incoming.category || existing.category,
          updateFrequencyDays: incoming.updateFrequencyDays != null ? incoming.updateFrequencyDays : existing.updateFrequencyDays,
          accountStatus: incoming.accountStatus || existing.accountStatus,
          mutual: incoming.mutual != null ? incoming.mutual : existing.mutual,
          special: incoming.special != null ? incoming.special : existing.special,
          raw: incoming.raw || existing.raw
        };
        p.accounts[id] = Object.assign({}, existing, incoming, preserve, {
          following: true,
          lastSeenAt: now,
          missingSince: null,
          unfollowedAt: null
        });
        applyAutoWhitelist(p.accounts[id]);
        updated.push(p.accounts[id]);
      }
    });
    if (opts && opts.scanStartedAt) p.scan.startedAt = opts.scanStartedAt;
    this.scheduleSave();
    return { added: added.length, updated: updated.length };
  }

  markMissing(platform, seenIds, startedAt) {
    const p = this.platform(platform);
    const seen = new Set((seenIds || []).map(String));
    let missing = 0;
    Object.values(p.accounts).forEach(function (account) {
      if (account.following && !seen.has(String(account.id))) {
        const now = Date.now();
        account.following = false;
        account.missingSince = now;
        account.unfollowedAt = now;
        account.lastAction = 'missing';
        account.lastActionAt = now;
        missing += 1;
      }
    });
    if (missing) this.scheduleSave();
    return missing;
  }

  patchAccount(platform, id, patch) {
    const p = this.platform(platform);
    const account = p.accounts[id];
    if (!account) return null;
    Object.assign(account, patch || {});
    applyAutoWhitelist(account);
    this.scheduleSave();
    return account;
  }

  setWhitelist(platform, ids, value) {
    const p = this.platform(platform);
    (ids || []).forEach((id) => {
      if (p.accounts[id]) {
        p.accounts[id].whitelist = !!value;
        p.accounts[id].whitelistManual = !!value;
        if (!value) {
          p.accounts[id].whitelistAuto = false;
          p.accounts[id].whitelistReason = '';
          applyAutoWhitelist(p.accounts[id]);
        }
      }
    });
    this.scheduleSave();
  }

  setRules(platform, rules) {
    const p = this.platform(platform);
    p.rules = Rules.normalizeRules(rules, platform);
    p.rules.updatedAt = Date.now();
    this.scheduleSave();
    return p.rules;
  }

  setScan(platform, scan) {
    this.platform(platform).scan = scan;
    this.scheduleSave();
    return scan;
  }

  setCleanup(platform, cleanup) {
    this.platform(platform).cleanup = cleanup;
    this.scheduleSave();
    return cleanup;
  }

  setLastSummary(platform, summary) {
    this.platform(platform).lastSummary = summary;
    this.scheduleSave();
  }

  addScanRecord(record) {
    this.state.history.scans.unshift(record);
    this.state.history.scans = this.state.history.scans.slice(0, 120);
    this.scheduleSave();
  }

  addCleanupRecord(record) {
    const safe = Object.assign({}, record);
    if (Array.isArray(safe.results) && safe.results.length > 2000) {
      safe.results = safe.results.slice(-2000);
      safe.resultsTruncated = true;
    }
    this.state.history.cleanups.unshift(safe);
    this.state.history.cleanups = this.state.history.cleanups.slice(0, 120);
    this.scheduleSave();
  }

  getHistory() { return this.state.history; }

  stats(platform) {
    const p = this.platform(platform);
    const accounts = Object.values(p.accounts);
    const following = accounts.filter(function (a) { return a.following !== false; });
    const whitelist = following.filter(function (a) { return a.whitelist; });
    const unfollowed = accounts.filter(function (a) { return a.following === false && a.unfollowedAt; });
    return {
      total: following.length,
      all: accounts.length,
      whitelist: whitelist.length,
      unfollowed: unfollowed.length,
      enriched: following.filter(function (a) { return a.enrichedAt; }).length,
      abnormal: following.filter(function (a) { return ['banned', 'deleted', 'inaccessible'].includes(a.accountStatus); }).length
    };
  }

  clearPlatformAccounts(platform) {
    const p = this.platform(platform);
    p.accounts = {};
    p.scan = emptyScan();
    p.cleanup = emptyCleanup();
    p.rules = Rules.defaultRules(platform);
    p.lastSummary = null;
    this.scheduleSave();
  }

  exportAll() {
    return {
      exportedAt: new Date().toISOString(),
      version: STATE_VERSION,
      settings: this.state.settings,
      platforms: this.state.platforms,
      history: this.state.history
    };
  }
}

module.exports = { Store, defaultSettings, defaultState, emptyScan, emptyCleanup, deepMerge };
