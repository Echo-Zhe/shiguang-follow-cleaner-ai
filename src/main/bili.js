'use strict';

const crypto = require('crypto');
const { BrowserWindow } = require('electron');
const { BaseClient, PlatformError } = require('./base-client');

const API = 'https://api.bilibili.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const MIXIN_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];
const TYPE_NAMES = {
  1: '动画', 4: '游戏', 5: '娱乐', 13: '番剧', 17: '单机游戏', 23: '电影', 36: '科技',
  119: '鬼畜', 129: '舞蹈', 138: '搞笑', 155: '时尚', 160: '生活', 181: '影视', 188: '数码',
  211: '美食', 217: '动物', 223: '汽车', 234: '运动', 250: '旅行', 251: '生活', 254: '生活'
};

function encValue(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

function mixinKey(imgKey, subKey) {
  const raw = imgKey + subKey;
  let out = '';
  for (let i = 0; i < MIXIN_TAB.length; i += 1) out += raw[MIXIN_TAB[i]] || '';
  return out.slice(0, 32);
}

function signWbi(params, imgKey, subKey) {
  const mixin = mixinKey(imgKey, subKey);
  const wts = Math.round(Date.now() / 1000);
  const withWts = Object.assign({}, params, { wts: wts });
  const query = Object.keys(withWts)
    .filter(function (k) { return withWts[k] !== undefined && withWts[k] !== null; })
    .sort()
    .map(function (k) { return encValue(k) + '=' + encValue(withWts[k]); })
    .join('&');
  const w_rid = crypto.createHash('md5').update(query + mixin).digest('hex');
  return Object.assign({}, params, { w_rid: w_rid, wts: wts });
}

function secondsToMs(value) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 1e12 ? n : n * 1000;
}

function pickAvatar(account) {
  const face = String(account.avatar || account.face || '').trim();
  if (!face) return '';
  return face.replace(/^http:\/\//i, 'https://');
}

function hasAvatarUrl(url) {
  return !!url && !/noface|member\/noface|face\/default/i.test(url);
}

class BiliClient extends BaseClient {
  constructor(opts) {
    super(opts);
    this.wbi = null;
    this.verifyWindow = null;
    this.buvidPrimed = false;
  }

  headers(extra) {
    return Object.assign({
      'user-agent': UA,
      referer: 'https://www.bilibili.com/',
      origin: 'https://www.bilibili.com',
      accept: 'application/json, text/plain, */*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }, extra || {});
  }

  async primeCookies() {
    if (this.buvidPrimed) return;
    this.buvidPrimed = true;
    try {
      await this.session.fetch('https://www.bilibili.com/', {
        headers: { 'user-agent': UA, accept: 'text/html' },
        credentials: 'include'
      });
    } catch (e) { /* cookie priming is best-effort */ }
  }

  async rawGet(path, params) {
    const url = new URL(path, API);
    if (params) Object.keys(params).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null) url.searchParams.set(k, String(params[k]));
    });
    const res = await this.session.fetch(url.toString(), {
      method: 'GET',
      headers: this.headers(),
      credentials: 'include'
    });
    const status = res.status;
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new PlatformError('RISK', 'B站返回了验证页面，任务已暂停。请在弹出的浏览器窗口完成安全验证后继续。', { status: status, url: url.toString() });
    }
    let json;
    try { json = JSON.parse(text); } catch (e) {
      throw new PlatformError('PARSE', 'B站返回了无法识别的数据');
    }
    if (status === 412 || json.code === -412) {
      throw new PlatformError('RISK', 'B站请求过于频繁，已触发风控。请暂停片刻或完成安全验证后继续。', json);
    }
    return { json: json, status: status, url: url.toString() };
  }

  async getIdentity() {
    const res = await this.rawGet('/x/web-interface/nav');
    const data = res.json.data || {};
    if (res.json.code !== 0 || !data.isLogin) {
      throw new PlatformError('NEED_LOGIN', 'B站尚未登录或登录已失效');
    }
    if (data.wbi_img) this.setWbi(data.wbi_img);
    return {
      id: String(data.mid),
      mid: String(data.mid),
      platform: 'bili',
      name: data.uname,
      avatar: pickAvatar({ avatar: data.face }),
      level: data.level_info ? data.level_info.current_level : null,
      vip: data.vipStatus === 1,
      connectedAt: Date.now()
    };
  }

  setWbi(wbiImg) {
    if (!wbiImg || !wbiImg.img_url || !wbiImg.sub_url) return;
    const imgKey = wbiImg.img_url.split('/').pop().split('.')[0];
    const subKey = wbiImg.sub_url.split('/').pop().split('.')[0];
    this.wbi = { imgKey: imgKey, subKey: subKey, at: Date.now() };
  }

  async getWbiKeys(force) {
    if (!force && this.wbi && Date.now() - this.wbi.at < 6 * 3600 * 1000) return this.wbi;
    const res = await this.rawGet('/x/web-interface/nav');
    if (res.json.data && res.json.data.wbi_img) this.setWbi(res.json.data.wbi_img);
    if (!this.wbi) throw new PlatformError('WBI', '无法获取B站请求签名，请稍后重试');
    return this.wbi;
  }

  async signedGet(path, params, retry) {
    let attempt = retry == null ? 1 : retry;
    for (let i = 0; i < attempt; i += 1) {
      const keys = await this.getWbiKeys(i > 0);
      const signed = signWbi(params || {}, keys.imgKey, keys.subKey);
      const res = await this.rawGet(path, signed);
      const code = res.json.code;
      if (code === 0) return res.json;
      if (code === -101) throw new PlatformError('NEED_LOGIN', 'B站登录已失效');
      if (code === -352 || code === -412) {
        this.wbi = null;
        throw new PlatformError('RISK', 'B站触发了安全校验（-352）。任务已自动暂停，请稍等片刻或完成浏览器验证后继续。', res.json);
      }
      return res.json;
    }
    throw new PlatformError('UNKNOWN', 'B站请求失败');
  }

  async login() {
    try {
      const existing = await this.getIdentity();
      if (existing) return existing;
    } catch (e) {
      if (!(e instanceof PlatformError) || e.code !== 'NEED_LOGIN') throw e;
    }
    if (this.loginPromise) return this.loginPromise;
    this.loginPromise = this.openLoginWindow();
    try {
      return await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  async openLoginWindow() {
    const parent = this.getMainWindow();
    const win = new BrowserWindow({
      width: 500,
      height: 760,
      minWidth: 420,
      minHeight: 620,
      parent: parent && !parent.isDestroyed() ? parent : undefined,
      modal: false,
      show: true,
      title: '登录 B站 · 拾光',
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      webPreferences: {
        partition: 'persist:bili',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false
      }
    });
    this.loginWindow = win;
    win.setMenuBarVisibility(false);
    win.on('closed', function () { /* handled below */ });
    try {
      await win.loadURL('https://passport.bilibili.com/login?from_spm_id=333.1007.top_bar.login', { userAgent: UA });
    } catch (e) { /* page may still show */ }

    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = async (cookiesFound) => {
        if (finished) return;
        finished = true;
        clearInterval(timer);
        if (!cookiesFound) {
          if (!win.isDestroyed()) win.close();
          reject(new PlatformError('CANCELLED', '已取消登录'));
          return;
        }
        try {
          let identity = null;
          let lastError = null;
          for (let attempt = 0; attempt < 5 && !identity; attempt += 1) {
            await new Promise(r => setTimeout(r, 900 + attempt * 400));
            try { identity = await this.getIdentity(); } catch (e) { lastError = e; }
          }
          if (!win.isDestroyed()) win.close();
          if (!identity) throw lastError || new Error('登录状态读取失败');
          this.emit({ type: 'connection', platform: 'bili', account: identity });
          resolve(identity);
        } catch (e) {
          if (!win.isDestroyed()) win.close();
          reject(new PlatformError('LOGIN_FAILED', '登录状态读取失败：' + e.message));
        }
      };
      const timer = setInterval(async () => {
        if (win.isDestroyed()) {
          if (!finished) finish(false);
          return;
        }
        try {
          const cookies = await this.session.cookies.get({ url: 'https://www.bilibili.com/' });
          const map = {};
          cookies.forEach(function (c) { map[c.name] = c.value; });
          if (map.SESSDATA && map.bili_jct && map.DedeUserID) finish(true);
        } catch (e) { /* keep polling */ }
      }, 1000);
      win.on('closed', function () {
        this.loginWindow = null;
        if (!finished) finish(false);
      }.bind(this));
      setTimeout(function () { if (!finished) finish(false); }, 5 * 60 * 1000);
    });
  }

  async getCookie(name) {
    const cookies = await this.session.cookies.get({ url: 'https://www.bilibili.com/' });
    const found = cookies.find(function (c) { return c.name === name; });
    return found ? found.value : '';
  }

  normalizeFollowing(item) {
    const mid = String(item.mid);
    const avatar = pickAvatar({ avatar: item.face });
    return {
      id: mid,
      mid: mid,
      platform: 'bili',
      name: item.uname || '未命名账号',
      avatar: avatar,
      hasAvatar: hasAvatarUrl(avatar),
      signature: (item.sign || '').trim(),
      followedAt: secondsToMs(item.mtime),
      mtime: item.mtime || null,
      mutual: item.attribute === 6,
      special: item.special === 1,
      attribute: item.attribute,
      official: item.official_verify && item.official_verify.desc ? item.official_verify.desc : '',
      vip: !!(item.vip && item.vip.vipType > 0),
      level: null,
      videoCount: null,
      followerCount: null,
      lastPostAt: null,
      lastDynamicAt: null,
      updateFrequencyDays: null,
      category: '',
      accountStatus: 'normal',
      accountStatusNote: '',
      statusSource: 'follow_list',
      statusVerified: false,
      statusCheckedAt: null,
      relationshipKnown: true,
      interactionKnown: false,
      interactionNote: 'B站未提供逐账号互动明细，仅能识别互关和特别关注',
      source: 'followings',
      fetchedAt: Date.now()
    };
  }

  async fetchFollowingPage(page, ps) {
    const identity = await this.getIdentity();
    const res = await this.rawGet('/x/relation/followings', {
      vmid: identity.mid,
      pn: page,
      ps: ps,
      order: 'desc',
      order_type: 'attention'
    });
    const json = res.json;
    if (json.code === -101) throw new PlatformError('NEED_LOGIN', 'B站登录已失效');
    if (json.code === -352 || json.code === -412) throw new PlatformError('RISK', 'B站关注列表请求触发了安全验证，请完成验证后继续。', json);
    if (json.code !== 0) throw new PlatformError('API', json.message || ('B站接口错误 ' + json.code), json);
    return json.data || {};
  }

  async enrichAccount(account, mode) {
    const patch = {
      enrichedAt: Date.now(),
      enrichError: '',
      lastEnrichAt: Date.now()
    };
    let arcError = null;
    try {
      const arc = await this.signedGet('/x/space/wbi/arc/search', {
        mid: account.mid,
        ps: 6,
        pn: 1,
        order: 'pubdate',
        index: 0,
        order_avoided: 'true'
      }, 2);
      if (arc.code === 0) {
        const data = arc.data || {};
        const vlist = (data.list && data.list.vlist) || [];
        const count = data.page && data.page.count != null ? Number(data.page.count) : vlist.length;
        patch.videoCountCheckedAt = Date.now();
        if (Number.isFinite(count) && count > 0) {
          patch.videoCount = count;
          patch.videoCountVerified = true;
          patch.videoCountSource = 'arc_search';
          patch.videoCountNote = '';
        } else if (!(Number(account.videoCount) > 0)) {
          patch.videoCount = null;
          patch.videoCountVerified = false;
          patch.videoCountSource = 'unverified_zero';
          patch.videoCountNote = 'B站作品列表为空或返回0，暂按未知处理';
        }
        patch.accountStatus = 'normal';
        patch.statusSource = 'arc_search';
        patch.statusVerified = true;
        patch.statusCheckedAt = Date.now();
        patch.statusCheckError = '';
        if (vlist.length) {
          patch.lastPostAt = secondsToMs(vlist[0].created);
          const times = vlist.map(function (v) { return Number(v.created); }).filter(function (n) { return n > 0; });
          if (times.length >= 2) {
            let total = 0;
            for (let i = 1; i < times.length; i += 1) total += Math.max(0, times[i - 1] - times[i]);
            const avgSeconds = total / (times.length - 1);
            patch.updateFrequencyDays = Math.round((avgSeconds / 86400) * 10) / 10;
          }
          const typeid = vlist[0].typeid;
          patch.category = TYPE_NAMES[typeid] || '';
        } else {
          patch.lastPostAt = null;
          patch.updateFrequencyDays = null;
        }
        patch.lastActiveAt = Math.max(patch.lastPostAt || 0, account.lastDynamicAt || 0) || null;
      } else if (arc.code === -404 || arc.code === 22003) {
        patch.accountStatus = 'deleted';
        patch.accountStatusNote = 'B站空间不存在或已注销';
        patch.statusSource = 'arc_search';
        patch.statusVerified = true;
        patch.statusCheckedAt = Date.now();
        patch.videoCount = null;
      } else if (arc.code === -352 || arc.code === -412) {
        throw new PlatformError('RISK', 'B站风控校验失败，任务已自动暂停');
      } else {
        arcError = arc.message || ('code ' + arc.code);
        patch.statusCheckError = arcError;
      }
    } catch (e) {
      if (e instanceof PlatformError && e.code === 'RISK') throw e;
      arcError = e.message;
      patch.statusCheckError = e.message;
    }

    if (mode === 'deep' && !this.dynamicBlocked && this.store.getSettings().bili && this.store.getSettings().bili.analyzeDynamics) {
      try {
        const dyn = await this.signedGet('/x/polymer/web-dynamic/v1/feed/space', {
          host_mid: account.mid,
          offset: '',
          features: 'itemOpusStyle'
        }, 1);
        if (dyn.code === 0 && dyn.data && Array.isArray(dyn.data.items) && dyn.data.items.length) {
          const item = dyn.data.items.find(function (x) { return x && x.type !== 'DYNAMIC_TYPE_LIVE_RCMD'; }) || dyn.data.items[0];
          const author = item && item.modules && item.modules.module_author;
          if (author && author.pub_ts) patch.lastDynamicAt = secondsToMs(author.pub_ts);
        }
      } catch (e) {
        patch.dynamicError = e.message || String(e);
        if (e && (e.code === 'RISK' || e.code === 'RISK_CONTROL')) this.dynamicBlocked = true;
      }
    }

    {
      try {
        const res = await this.rawGet('/x/web-interface/card', { mid: account.mid });
        const json = res.json;
        if (json.code === 0 && json.data && json.data.card) {
          const card = json.data.card;
          patch.level = card.level_info ? card.level_info.current_level : account.level;
          patch.followerCount = json.data.follower != null ? json.data.follower : card.fans;
          patch.signature = card.sign || account.signature || '';
          patch.official = card.official_verify && card.official_verify.desc ? card.official_verify.desc : account.official;
          patch.vip = !!(card.vip && card.vip.type > 0);
          if (json.data.archive_count != null) {
            const archiveCount = Number(json.data.archive_count);
            if (Number.isFinite(archiveCount) && archiveCount > 0) {
              patch.videoCount = archiveCount;
              patch.videoCountVerified = true;
              patch.videoCountSource = 'card';
              patch.videoCountNote = '';
            } else if (!(Number(patch.videoCount) > 0) && !(Number(account.videoCount) > 0)) {
              patch.videoCount = null;
              patch.videoCountVerified = false;
              patch.videoCountSource = 'card_zero_unconfirmed';
              patch.videoCountNote = 'B站卡片返回0，暂按未知处理';
            }
          }
          if (card.spacesta && card.spacesta !== 0) {
            patch.accountStatus = 'inaccessible';
            patch.accountStatusNote = 'B站空间状态异常';
          } else if (!patch.accountStatus || patch.accountStatus === 'unknown' || patch.accountStatus === 'normal') {
            patch.accountStatus = 'normal';
          }
          patch.statusSource = 'card';
          patch.statusVerified = true;
          patch.statusCheckedAt = Date.now();
        } else if (json.code === -404 || json.code === -626) {
          patch.accountStatus = 'deleted';
          patch.accountStatusNote = 'B站账号不存在或已注销';
          patch.statusSource = 'card';
          patch.statusVerified = true;
          patch.statusCheckedAt = Date.now();
        } else if (json.code === -352 || json.code === -412) {
          throw new PlatformError('RISK', 'B站风控校验失败，任务已自动暂停');
        } else {
          patch.statusCheckError = json.message || ('card code ' + json.code);
        }
      } catch (e) {
        if (e instanceof PlatformError && e.code === 'RISK') throw e;
        patch.cardError = e.message;
        patch.statusCheckError = e.message;
      }
    }

    if (arcError) patch.enrichError = arcError;
    patch.lastActiveAt = Math.max(patch.lastPostAt || account.lastPostAt || 0, patch.lastDynamicAt || account.lastDynamicAt || 0) || null;
    return patch;
  }

  async performScan(scan, options) {
    const ps = Math.max(20, Math.min(50, Number(this.store.getSettings().bili.pageSize) || 50));
    let added = 0;
    let removed = 0;
    const identity = await this.getIdentity();
    this.store.setConnection('bili', identity);

    const previouslyFollowing = this.store.getAccounts('bili').filter(function (a) { return a.following; }).length;
    if (!scan.listDone) {
      let listComplete = false;
      let page = Math.max(1, Number(scan.page) || 0);
      if (Number(scan.page) === 0) page = 1;
      else page = Number(scan.page) + 1;
      while (true) {
        await this.waitIfPaused();
        if (this.scanStopped) throw new PlatformError('STOPPED', '扫描已停止');
        scan.phase = 'list';
        scan.current = '正在读取关注列表第 ' + page + ' 页';
        this.emitScan({ phase: 'list', current: scan.current, page: page - 1 });
        let data;
        try {
          data = await this.fetchFollowingPage(page, ps);
        } catch (e) {
          if (e instanceof PlatformError && (e.code === 'RISK' || e.code === 'NEED_LOGIN')) throw e;
          scan.failed += 1;
          this.emitScan({ failed: scan.failed, error: '第 ' + page + ' 页读取失败，将重试一次' });
          await this.sleep(1500);
          data = await this.fetchFollowingPage(page, ps);
        }
        const list = Array.isArray(data.list) ? data.list : [];
        const total = Number(data.total);
        if (Number.isFinite(total) && total > 0) scan.total = total;
        if (!list.length) {
          scan.page = page;
          listComplete = true;
          break;
        }
        const normalized = list.map(this.normalizeFollowing.bind(this));
        const before = new Set(scan.seenIds || []);
        normalized.forEach(function (a) { before.add(a.id); });
        const merged = this.store.upsertAccounts('bili', normalized, { scanStartedAt: scan.startedAt });
        added += merged.added;
        scan.seenIds = Array.from(before);
        scan.scanned = scan.seenIds.length;
        scan.page = page;
        if (!scan.total) scan.total = scan.scanned;
        if (scan.total && scan.scanned > scan.total) scan.total = scan.scanned;
        this.emitScan({
          scanned: scan.scanned,
          total: scan.total,
          page: page,
          current: '已读取 ' + scan.scanned + ' / ' + (scan.total || '?') + ' 个账号'
        });
        if (list.length < ps) { listComplete = true; break; }
        if (scan.total && scan.scanned >= scan.total) { listComplete = true; break; }
        page += 1;
        await this.sleep(options.requestDelayMs);
      }

      if (!scan.seenIds.length && previouslyFollowing > 0) {
        throw new PlatformError('INCOMPLETE', 'B站返回了空的关注列表，可能是隐私设置、接口变更或网络异常。为避免误删本地记录，本次没有修改任何关注状态。');
      }
      if (!listComplete || (scan.total && scan.seenIds.length < scan.total)) {
        throw new PlatformError('INCOMPLETE', 'B站关注列表没有完整读取（已读取 ' + scan.seenIds.length + ' / ' + (scan.total || '?') + '）。为避免把未读取的账号误判为已取关，本次没有修改任何关注状态。');
      }
      // Accounts no longer present in a complete list are marked as not following.
      removed = this.store.markMissing('bili', scan.seenIds, scan.startedAt);
      scan.listDone = true;
      scan.phase = 'enrich';
      scan.current = '关注列表读取完成';
      scan.total = scan.total || scan.seenIds.length;
      const all = this.store.getAccounts('bili').filter(function (a) { return a.following !== false; });
      // Re-verify all variables for every account on each scan.
      const queue = options.enrichMode === 'none' ? [] : all.map(function (a) { return a.id; });
      scan.enrichQueue = queue;
      scan.enrichIndex = 0;
      scan.enrichTotal = queue.length;
      this.emitScan({
        listDone: true,
        phase: queue.length ? 'enrich' : 'done',
        current: queue.length ? '准备分析 ' + queue.length + ' 个账号' : '关注列表读取完成',
        enrichTotal: queue.length,
        scanned: scan.scanned,
        total: scan.total
      });
      if (previouslyFollowing > scan.seenIds.length) {
        // Difference is shown in lastSummary after the scan completes.
        scan.removedDuringScan = previouslyFollowing - scan.seenIds.length;
      }
    }

    if (scan.enrichQueue && scan.enrichQueue.length && options.enrichMode !== 'none') {
      for (let i = Number(scan.enrichIndex) || 0; i < scan.enrichQueue.length; i += 1) {
        await this.waitIfPaused();
        if (this.scanStopped) throw new PlatformError('STOPPED', '扫描已停止');
        const id = scan.enrichQueue[i];
        const account = this.store.getAccount('bili', id);
        if (!account) { scan.enrichIndex = i + 1; continue; }
        scan.phase = 'enrich';
        scan.current = account.name || account.id;
        scan.enrichIndex = i;
        this.emitScan({ phase: 'enrich', current: scan.current, enriched: i, enrichTotal: scan.enrichQueue.length, enrichIndex: i });
        try {
          const patch = await this.enrichAccount(account, options.enrichMode);
          this.store.patchAccount('bili', id, patch);
          scan.enriched = i + 1;
          this.emit({ type: 'account-updated', platform: 'bili', account: this.store.getAccount('bili', id) });
        } catch (e) {
          if (e instanceof PlatformError && (e.code === 'RISK' || e.code === 'NEED_LOGIN')) throw e;
          scan.enriched = i + 1;
          scan.failed += 1;
          this.store.patchAccount('bili', id, {
            lastEnrichAt: Date.now(),
            enrichError: e.message || String(e)
          });
          this.emitScan({ failed: scan.failed, enrichError: e.message || String(e) });
        }
        scan.enrichIndex = i + 1;
        scan.enrichTotal = scan.enrichQueue.length;
        this.emitScan({
          enriched: scan.enriched,
          enrichIndex: scan.enrichIndex,
          enrichTotal: scan.enrichTotal,
          current: '分析 ' + (i + 1) + ' / ' + scan.enrichQueue.length + ' · ' + (account.name || account.id)
        });
        if (i + 1 < scan.enrichQueue.length) {
          await this.sleep(options.requestDelayMs);
          if ((i + 1) % 50 === 0) {
            scan.current = '已分析 ' + (i + 1) + ' 个账号，短暂冷却以降低风控风险';
            this.emitScan({ current: scan.current });
            await this.sleep(8000);
          }
        }
      }
    }

    scan.scanned = scan.seenIds.length;
    scan.phase = 'done';
    scan.current = '';
    this.emitScan({ phase: 'done', scanned: scan.scanned, enriched: scan.enriched, failed: scan.failed, current: '' });
    const now = Date.now();
    return {
      added: added,
      removed: removed,
      total: scan.total,
      scanned: scan.scanned,
      enriched: scan.enriched,
      failed: scan.failed,
      finishedAt: now
    };
  }

  async unfollowAccount(account) {
    const csrf = await this.getCookie('bili_jct');
    if (!csrf) throw new PlatformError('NEED_LOGIN', 'B站登录状态已失效，请重新连接');
    const body = new URLSearchParams({
      fid: String(account.mid || account.id),
      act: '2',
      re_src: '11',
      csrf: csrf,
      jsonp: 'jsonp'
    }).toString();
    const res = await this.session.fetch(API + '/x/relation/modify', {
      method: 'POST',
      headers: this.headers({
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }),
      body: body,
      credentials: 'include'
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (e) {
      throw new PlatformError('RISK', 'B站返回了验证页面或无法识别的数据，清理已暂停');
    }
    if (json.code === 0) return { ok: true };
    if (json.code === -101) throw new PlatformError('NEED_LOGIN', 'B站登录已失效');
    if (json.code === -111) throw new PlatformError('NEED_LOGIN', 'B站安全令牌失效，请重新连接账号');
    if (json.code === -352 || json.code === -412 || res.status === 412) {
      throw new PlatformError('RISK', 'B站触发了操作频率限制，清理已自动暂停', json);
    }
    if (json.code === 22003 || json.code === -404) {
      return { ok: true, alreadyUnfollowed: true };
    }
    return { ok: false, error: json.message || ('B站返回 ' + json.code) };
  }

  showVerificationWindow() {
    if (this.verifyWindow && !this.verifyWindow.isDestroyed()) {
      this.verifyWindow.show();
      this.verifyWindow.focus();
      return;
    }
    const parent = this.getMainWindow();
    const win = new BrowserWindow({
      width: 1080,
      height: 760,
      parent: parent && !parent.isDestroyed() ? parent : undefined,
      modal: false,
      show: true,
      title: '完成 B站安全验证后，回到拾光点击继续',
      autoHideMenuBar: true,
      webPreferences: {
        partition: 'persist:bili',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    this.verifyWindow = win;
    win.setMenuBarVisibility(false);
    win.on('closed', function () { this.verifyWindow = null; }.bind(this));
    win.loadURL('https://www.bilibili.com/', { userAgent: UA }).catch(function () {});
  }
}

module.exports = { BiliClient, signWbi, mixinKey, TYPE_NAMES };
