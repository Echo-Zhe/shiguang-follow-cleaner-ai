'use strict';

const { BrowserWindow } = require('electron');
const { BaseClient, PlatformError } = require('./base-client');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const HOME = 'https://www.douyin.com/';
const API = 'https://www.douyin.com/aweme/v1/web';
const DAY = 86400000;

function toMs(value) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 1e12 ? n : n * 1000;
}

function firstUrl(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj.replace(/^http:\/\//i, 'https://');
  const list = obj.url_list || obj.urlList;
  if (Array.isArray(list) && list.length) return String(list[0]).replace(/^http:\/\//i, 'https://');
  return '';
}

function normalizeSecUid(value) {
  const str = String(value || '');
  if (/^MS4wLjAB/.test(str)) return str;
  return '';
}

class DouyinClient extends BaseClient {
  constructor(opts) {
    super(opts);
    this.signer = null;
    this.signerReady = null;
    this.identity = null;
    this.worker = null;
    this.workerBusy = false;
    this.douyinLoginWindow = null;
    this.capturingSecUid = false;
  }

  headers() {
    return {
      'user-agent': UA,
      referer: 'https://www.douyin.com/',
      accept: 'application/json, text/plain, */*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };
  }

  webPreferences(extra) {
    return Object.assign({
      partition: 'persist:douyin',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }, extra || {});
  }

  async ensureSigner() {
    if (this.signer && !this.signer.isDestroyed() && !this.signer.webContents.isDestroyed()) {
      return this.signer;
    }
    if (this.signerReady) return this.signerReady;
    this.signerReady = (async () => {
      const win = new BrowserWindow({
        show: false,
        width: 1360,
        height: 900,
        title: '抖音连接窗口',
        autoHideMenuBar: true,
        webPreferences: this.webPreferences()
      });
      this.signer = win;
      win.setMenuBarVisibility(false);
      win.webContents.on('render-process-gone', () => {
        this.signer = null;
        this.signerReady = null;
      });
      win.on('closed', () => {
        this.signer = null;
        this.signerReady = null;
      });
      try {
        await win.loadURL(HOME, { userAgent: UA });
      } catch (e) { /* still try to evaluate */ }
      await new Promise(r => setTimeout(r, 3200));
      // The page installs its signing hook asynchronously. Probe a harmless
      // request until the hook appends a_bogus to the URL.
      let ready = false;
      for (let i = 0; i < 4 && !ready; i += 1) {
        try {
          const probe = await this.rawXhr('https://www.douyin.com/aweme/v1/web/query/user/?' + this.commonParams({ publish_video_strategy_type: '2' }).toString());
          if (probe.finalURL && (probe.finalURL.includes('a_bogus=') || probe.text && probe.text.includes('status_code'))) ready = true;
        } catch (e) { /* retry */ }
        if (!ready) {
          await new Promise(r => setTimeout(r, 1500));
          try { await win.webContents.reload(); } catch (e) {}
          await new Promise(r => setTimeout(r, 2500));
        }
      }
      if (!ready) {
        throw new PlatformError('SIGNER', '抖音页面风控组件加载失败，请检查网络后重试');
      }
      return win;
    })();
    try {
      return await this.signerReady;
    } catch (e) {
      this.signerReady = null;
      throw e;
    }
  }

  commonParams(extra) {
    const params = new URLSearchParams({
      device_platform: 'webapp',
      aid: '6383',
      channel: 'channel_pc_web',
      pc_client_type: '1',
      version_code: '190500',
      version_name: '19.5.0',
      cookie_enabled: 'true',
      screen_width: '1440',
      screen_height: '900',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Chrome',
      browser_version: '156.0.0.0',
      browser_online: 'true',
      engine_name: 'Blink',
      engine_version: '156.0.0.0',
      os_name: 'Windows',
      os_version: '10',
      cpu_core_num: '16',
      device_memory: '8',
      platform: 'PC',
      downlink: '10',
      effective_type: '4g',
      round_trip_time: '50'
    });
    if (extra) Object.keys(extra).forEach(function (k) {
      if (extra[k] !== undefined && extra[k] !== null) params.set(k, String(extra[k]));
    });
    return params;
  }

  async rawXhr(url, method, body) {
    const win = await this.ensureSigner();
    const script = `new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open(${JSON.stringify(method || 'GET')}, ${JSON.stringify(url)}, true);
        xhr.withCredentials = true;
        xhr.timeout = 25000;
        ${body ? "xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');" : ''}
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            resolve({
              status: xhr.status,
              finalURL: xhr.responseURL,
              text: (xhr.responseText || '').slice(0, 2500000)
            });
          }
        };
        xhr.onerror = function () { resolve({ error: 'network_error' }); };
        xhr.ontimeout = function () { resolve({ error: 'timeout' }); };
        xhr.send(${body ? JSON.stringify(body) : 'null'});
      } catch (e) { resolve({ error: String(e) }); }
    })`;
    let result;
    try {
      result = await win.webContents.executeJavaScript(script, true);
    } catch (e) {
      if (this.signer === win) { this.signer = null; this.signerReady = null; }
      throw new PlatformError('PAGE', '抖音连接窗口已失效，请重试');
    }
    if (!result || result.error) throw new PlatformError('NETWORK', '抖音请求失败：' + (result && result.error ? result.error : '未知错误'));
    return result;
  }

  parsePayload(result, path) {
    const finalURL = result.finalURL || '';
    const text = result.text || '';
    if (result.status === 0) throw new PlatformError('NETWORK', '抖音请求被中断');
    if (finalURL.includes('/verify') || /captcha|verify-center|安全检查|安全验证/.test(finalURL)) {
      throw new PlatformError('RISK', '抖音要求完成安全验证，任务已自动暂停', { url: finalURL });
    }
    if (result.status === 412 || result.status === 429) {
      throw new PlatformError('RISK', '抖音操作过于频繁，任务已自动暂停', { status: result.status, url: finalURL });
    }
    if (!text || text.trim().startsWith('<')) {
      throw new PlatformError('RISK', '抖音返回了验证页面，任务已自动暂停', { url: finalURL, status: result.status });
    }
    let json;
    try { json = JSON.parse(text); } catch (e) {
      throw new PlatformError('PARSE', '抖音返回了无法识别的数据');
    }
    if (json.status_code === 8 || /用户未登录|未登录/.test(json.status_msg || '')) {
      throw new PlatformError('NEED_LOGIN', '抖音登录已失效，请重新连接账号');
    }
    if (json.status_code === 2096 || json.status_code === 2095) {
      throw new PlatformError('RISK', '抖音风控拦截：' + (json.status_msg || json.status_code), json);
    }
    return { json: json, finalURL: finalURL, path: path };
  }

  async apiGet(path, params) {
    const query = this.commonParams(params || {});
    const url = 'https://www.douyin.com' + path + (path.includes('?') ? '&' : '?') + query.toString();
    const result = await this.rawXhr(url, 'GET');
    return this.parsePayload(result, path);
  }

  async getIdentity(force) {
    if (!force && this.identity && Date.now() - this.identity.checkedAt < 10 * 60 * 1000) return this.identity;
    await this.ensureSigner();
    const res = await this.apiGet('/aweme/v1/web/user/profile/self/', {
      publish_video_strategy_type: '2'
    });
    const user = res.json.user || (res.json.data && res.json.data.user);
    if (!user || !user.sec_uid) {
      const secUid = await this.resolveSecUid();
      if (!secUid) throw new PlatformError('NEED_LOGIN', '抖音尚未登录或登录已失效');
      const identity = {
        id: secUid, secUid: secUid, platform: 'douyin', name: '抖音账号', avatar: '',
        connectedAt: Date.now(), checkedAt: Date.now()
      };
      this.identity = identity;
      return identity;
    }
    const identity = {
      id: user.sec_uid,
      secUid: user.sec_uid,
      uid: user.uid,
      platform: 'douyin',
      name: user.nickname || '抖音账号',
      avatar: firstUrl(user.avatar_thumb) || firstUrl(user.avatar_medium),
      uniqueId: user.unique_id || (user.short_id && String(user.short_id) !== '0' ? user.short_id : ''),
      signature: user.signature || '',
      followerCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      awemeCount: user.aweme_count || 0,
      connectedAt: Date.now(),
      checkedAt: Date.now()
    };
    this.identity = identity;
    this.store.setConnection('douyin', identity);
    return identity;
  }

  async resolveSecUid() {
    if (this.capturingSecUid) return '';
    this.capturingSecUid = true;
    const win = await this.ensureSigner();
    const seen = new Set();
    try {
      try { await win.loadURL('https://www.douyin.com/user/self', { userAgent: UA }); } catch (e) { /* ignore */ }
      await new Promise(r => setTimeout(r, 7000));
      const found = await win.webContents.executeJavaScript(`(() => {
        const html = document.documentElement.innerHTML;
        const m = html.match(/MS4wLjAB[A-Za-z0-9_-]{20,}/);
        if (m) return m[0];
        for (let i = 0; i < localStorage.length; i++) {
          const v = String(localStorage.getItem(localStorage.key(i)) || '');
          const mm = v.match(/MS4wLjAB[A-Za-z0-9_-]{20,}/);
          if (mm) return mm[0];
        }
        const entries = performance.getEntriesByType('resource').map(e => e.name).join(' ');
        const mm2 = entries.match(/MS4wLjAB[A-Za-z0-9_-]{20,}/);
        return mm2 ? mm2[0] : '';
      })()`, true).catch(function () { return ''; });
      if (found) seen.add(found);
      if (seen.size) {
        const arr = Array.from(seen);
        // The current user's id is usually the one requested by the self page.
        return arr[0];
      }
      return '';
    } finally {
      this.capturingSecUid = false;
      try { await win.loadURL(HOME, { userAgent: UA }); } catch (e) { /* ignore */ }
    }
  }

  async login() {
    try {
      const existing = await this.getIdentity(true);
      if (existing) return existing;
    } catch (e) {
      if (!(e instanceof PlatformError) || e.code !== 'NEED_LOGIN') throw e;
    }
    if (this.loginPromise) return this.loginPromise;
    this.loginPromise = this.openLoginWindow();
    try { return await this.loginPromise; } finally { this.loginPromise = null; }
  }

  async openLoginWindow() {
    const parent = this.getMainWindow();
    const win = new BrowserWindow({
      width: 520,
      height: 800,
      minWidth: 420,
      minHeight: 620,
      parent: parent && !parent.isDestroyed() ? parent : undefined,
      modal: false,
      show: true,
      title: '扫码登录抖音 · 登录成功后自动关闭',
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      webPreferences: this.webPreferences()
    });
    this.douyinLoginWindow = win;
    win.setMenuBarVisibility(false);
    try {
      await win.loadURL(HOME, { userAgent: UA });
      await new Promise(r => setTimeout(r, 1200));
      await win.webContents.executeJavaScript(`(() => {
        const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const els = [...document.querySelectorAll('button, div, span, a')].filter(visible);
        const login = els.find(el => {
          const t = (el.textContent || '').trim();
          const r = el.getBoundingClientRect();
          return t === '登录' && r.top < 120 && r.right > innerWidth - 320 && el.children.length <= 2;
        });
        if (login) login.click();
        return !!login;
      })()`, true).catch(function () {});
    } catch (e) { /* page may still be usable */ }

    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = async (ok) => {
        if (finished) return;
        finished = true;
        clearInterval(timer);
        if (!ok) {
          if (!win.isDestroyed()) win.close();
          reject(new PlatformError('CANCELLED', '已取消登录'));
          return;
        }
        try {
          await new Promise(r => setTimeout(r, 2000));
          if (!win.isDestroyed()) win.close();
          // Recreate the signer page after login so its cookies and identity are fresh.
          if (this.signer && !this.signer.isDestroyed()) this.signer.destroy();
          this.signer = null;
          this.signerReady = null;
          this.identity = null;
          let identity = null;
          let lastError = null;
          for (let attempt = 0; attempt < 4 && !identity; attempt += 1) {
            try { identity = await this.getIdentity(true); } catch (e) { lastError = e; await new Promise(r => setTimeout(r, 1200)); }
          }
          if (!identity) throw lastError || new Error('登录状态读取失败');
          this.emit({ type: 'connection', platform: 'douyin', account: identity });
          resolve(identity);
        } catch (e) {
          reject(new PlatformError('LOGIN_FAILED', '登录状态读取失败：' + e.message));
        }
      };
      const timer = setInterval(async () => {
        if (win.isDestroyed()) {
          if (!finished) finish(false);
          return;
        }
        try {
          const cookies = await this.session.cookies.get({ url: 'https://www.douyin.com/' });
          const map = {};
          cookies.forEach(function (c) { map[c.name] = c.value; });
          const hasSession = !!(map.sessionid || map.sessionid_ss || map.sid_tt);
          if (hasSession) finish(true);
        } catch (e) { /* keep polling */ }
      }, 1200);
      win.on('closed', function () {
        this.douyinLoginWindow = null;
        if (!finished) finish(false);
      }.bind(this));
      setTimeout(function () { if (!finished) finish(false); }, 5 * 60 * 1000);
    });
  }

  normalizeFollowing(item) {
    const user = item.user || item.user_info || item;
    const secUid = normalizeSecUid(user.sec_uid || item.sec_uid || item.sec_user_id);
    if (!secUid) return null;
    const avatar = firstUrl(user.avatar_thumb) || firstUrl(user.avatar_medium) || firstUrl(user.avatar_larger);
    const followTime = item.follow_time || item.followTime || user.follow_time || item.create_time;
    const followedAt = toMs(followTime);
    let mutual = null;
    if (typeof user.follower_status === 'number') mutual = user.follower_status === 1;
    else if (typeof item.follower_status === 'number') mutual = item.follower_status === 1;
    else if (typeof item.mutual === 'boolean') mutual = item.mutual;
    let special = null;
    if (typeof user.special_follow_status === 'number') special = user.special_follow_status === 1;
    else if (typeof item.special === 'boolean') special = item.special;
    const abnormal = user.is_ban === true || item.is_ban === true;
    const banName = /(已封禁|已被封禁|账号已封禁|封禁用户|账号被限制)/.test(String(user.nickname || ''));
    const deletedName = /(已注销|注销用户|用户已注销|账号已注销|账号不存在|用户不存在|该用户不存在|账号已删除|用户已删除)/.test(String(user.nickname || ''));
    const rawAwemeCount = user.aweme_count != null && Number.isFinite(Number(user.aweme_count)) ? Number(user.aweme_count) : null;
    const knownWorks = rawAwemeCount != null && rawAwemeCount > 0;
    return {
      id: secUid,
      secUid: secUid,
      uid: user.uid || item.uid || '',
      platform: 'douyin',
      name: user.nickname || '未命名账号',
      avatar: avatar,
      hasAvatar: !!avatar,
      signature: String(user.signature || '').trim(),
      followedAt: followedAt,
      followTimeRaw: followTime || null,
      mutual: mutual,
      special: special,
      relationshipKnown: mutual != null,
      interactionKnown: false,
      interactionNote: '抖音未提供逐账号互动明细，仅能识别互相关注等公开关系',
      uniqueId: user.unique_id || user.short_id || '',
      followerCount: user.follower_count != null ? user.follower_count : null,
      videoCount: knownWorks ? rawAwemeCount : null,
      videoCountSource: knownWorks ? 'following_list' : 'unknown',
      videoCountVerified: false,
      videoCountNote: rawAwemeCount === 0 ? '关注列表返回0，需通过资料或作品列表确认' : '',
      totalFavorited: user.total_favorited != null ? user.total_favorited : null,
      level: null,
      lastPostAt: null,
      lastActiveAt: null,
      updateFrequencyDays: null,
      category: '',
      official: user.custom_verify || user.enterprise_verify_reason || '',
      liveStatus: user.live_status != null ? user.live_status : null,
      ipLocation: user.ip_location || '',
      accountStatus: deletedName ? 'deleted' : ((abnormal || banName) ? 'banned' : 'normal'),
      accountStatusNote: deletedName ? '账号昵称显示已注销或不可用' : ((abnormal || banName) ? '抖音账号状态异常' : ''),
      statusSource: (deletedName || banName) ? 'nickname' : 'follow_list',
      statusVerified: abnormal || banName,
      statusCheckedAt: null,
      statusCheckError: '',
      source: 'following/list',
      fetchedAt: Date.now()
    };
  }

  async fetchFollowingPage(options) {
    const identity = await this.getIdentity();
    const opts = options || {};
    const offset = Number(opts.offset) || 0;
    const count = Math.max(10, Math.min(20, Number(opts.count) || 20));
    const sourceType = Number(opts.sourceType) || 4;
    const maxTime = Number(opts.maxTime) || 0;
    const minTime = Number(opts.minTime) || 0;
    const res = await this.apiGet('/aweme/v1/web/user/following/list/', {
      sec_user_id: identity.secUid,
      offset: offset,
      count: count,
      max_time: maxTime,
      min_time: minTime,
      source_type: sourceType
    });
    const json = res.json;
    const payload = json && json.data && (json.data.followings || json.data.following_list) ? json.data : json;
    let list = payload.followings || payload.following_list || payload.following || (Array.isArray(payload.data) ? payload.data : []);
    if (list == null && (json.status_code === 0 || json.status_code === undefined)) list = [];
    if (!Array.isArray(list)) {
      if (json.status_code === 8) throw new PlatformError('NEED_LOGIN', '抖音登录已失效');
      throw new PlatformError('API', json.status_msg || ('抖音关注列表返回异常（status_code ' + (json.status_code == null ? '?' : json.status_code) + '）'));
    }
    const num = function (value) {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    return {
      list: list,
      hasMore: json.has_more === 1 || json.has_more === '1' || json.has_more === true,
      total: num(json.total != null ? json.total : json.total_count),
      offset: num(json.offset != null ? json.offset : payload.offset),
      maxTime: num(json.max_time != null ? json.max_time : payload.max_time),
      minTime: num(json.min_time != null ? json.min_time : payload.min_time),
      sourceType: sourceType,
      statusCode: json.status_code,
      rawKeys: Object.keys(json).slice(0, 20)
    };
  }

  async fetchPosts(secUid) {
    const res = await this.apiGet('/aweme/v1/web/aweme/post/', {
      sec_user_id: secUid,
      count: 6,
      max_cursor: 0,
      locate_query: 'false',
      show_live_replay_strategy: '1',
      need_time_list: '1',
      time_list_query: '0',
      whale_cut_token: '',
      cut_version: '1',
      publish_video_strategy_type: '2'
    });
    const json = res.json;
    if (json.status_code != null && Number(json.status_code) !== 0) {
      if (Number(json.status_code) === 8) throw new PlatformError('NEED_LOGIN', '抖音登录已失效');
      throw new PlatformError('POST', json.status_msg || ('抖音作品接口返回异常（status_code ' + json.status_code + '）'));
    }
    const list = Array.isArray(json.aweme_list) ? json.aweme_list : [];
    return { list: list, hasMore: json.has_more === 1 || json.has_more === true, maxCursor: json.max_cursor };
  }

  async fetchProfile(secUid) {
    const res = await this.apiGet('/aweme/v1/web/user/profile/other/', {
      sec_user_id: secUid,
      publish_video_strategy_type: '2'
    });
    const json = res.json;
    const user = json.user || (json.data && json.data.user);
    if (!user || !user.sec_uid) {
      if (json.status_code === 8) throw new PlatformError('NEED_LOGIN', '抖音登录已失效');
      throw new PlatformError('PROFILE', json.status_msg || '无法读取账号资料');
    }
    return user;
  }

  async enrichAccount(account, mode) {
    const patch = {
      enrichedAt: Date.now(), lastEnrichAt: Date.now(), enrichError: '',
      videoCountCheckedAt: Date.now()
    };
    try {
      const posts = await this.fetchPosts(account.secUid);
      if (posts.list.length) {
        const times = posts.list.map(function (v) { return Number(v.create_time); }).filter(function (n) { return n > 0; });
        patch.lastPostAt = toMs(times[0]);
        if (times.length >= 2) {
          let total = 0;
          for (let i = 1; i < times.length; i += 1) total += Math.max(0, times[i - 1] - times[i]);
          patch.updateFrequencyDays = Math.round((total / (times.length - 1) / 86400) * 10) / 10;
        }
        patch.lastActiveAt = patch.lastPostAt;
        const authorCount = posts.list[0].author && posts.list[0].author.aweme_count != null
          ? Number(posts.list[0].author.aweme_count) : null;
        if (authorCount != null && Number.isFinite(authorCount) && authorCount > 0) {
          patch.videoCount = authorCount;
          patch.videoCountVerified = true;
          patch.videoCountSource = 'posts';
          patch.videoCountNote = '';
        }
      } else {
        // Empty post list can mean private, restricted, hidden, or a failed/limited
        // endpoint. It is NOT proof that the account has zero works.
        patch.lastPostAt = null;
        patch.updateFrequencyDays = null;
        if (!(Number(account.videoCount) > 0)) {
          patch.videoCountNote = '作品列表为空，数量未确认';
        }
      }
    } catch (e) {
      if (e instanceof PlatformError && (e.code === 'RISK' || e.code === 'NEED_LOGIN')) throw e;
      patch.postError = e.message;
    }

    // Every scan verifies the full profile: works count, relation flags,
    // followers, status and other variables must come from the same pass.
    {
      try {
        const user = await this.fetchProfile(account.secUid);
        const profileCount = user.aweme_count != null && Number.isFinite(Number(user.aweme_count))
          ? Number(user.aweme_count) : null;
        if (profileCount != null && profileCount > 0) {
          patch.videoCount = profileCount;
          patch.videoCountVerified = true;
          patch.videoCountSource = 'profile';
          patch.videoCountNote = '';
        } else if (profileCount === 0 && !knownPositive) {
          // Profile 0 is also not treated as confirmed zero: many private or
          // restricted accounts report 0 here while still having works.
          patch.videoCount = null;
          patch.videoCountVerified = false;
          patch.videoCountSource = 'profile_zero_unconfirmed';
          patch.videoCountNote = '资料返回0，但作品列表未确认；暂按未知处理';
        }
        patch.followerCount = user.follower_count != null ? user.follower_count : patch.followerCount;
        patch.signature = user.signature || account.signature || '';
        patch.uniqueId = user.unique_id || user.short_id || account.uniqueId;
        patch.official = user.custom_verify || user.enterprise_verify_reason || account.official;
        patch.ipLocation = user.ip_location || account.ipLocation;
        patch.liveStatus = user.live_status != null ? user.live_status : account.liveStatus;
        patch.totalFavorited = user.total_favorited != null ? user.total_favorited : account.totalFavorited;
        if (user.is_ban === true) {
          patch.accountStatus = 'banned';
          patch.accountStatusNote = '抖音账号处于封禁或限制状态';
        } else if (user.ban_user_functions && Object.keys(user.ban_user_functions).length) {
          patch.accountStatus = 'inaccessible';
          patch.accountStatusNote = '账号部分功能受限';
        } else {
          patch.accountStatus = 'normal';
          patch.accountStatusNote = '';
        }
        patch.statusSource = 'profile';
        patch.statusVerified = true;
        patch.statusCheckedAt = Date.now();
        patch.statusCheckError = '';
        if (typeof user.follower_status === 'number') patch.mutual = user.follower_status === 1;
        if (typeof user.special_follow_status === 'number') patch.special = user.special_follow_status === 1;
        patch.relationshipKnown = typeof patch.mutual === 'boolean';
      } catch (e) {
        if (e instanceof PlatformError && (e.code === 'RISK' || e.code === 'NEED_LOGIN')) throw e;
        patch.profileError = e.message;
        patch.statusCheckError = e.message;
      }
    }
    return patch;
  }

  oldestFollowSeconds(list) {
    let oldest = 0;
    (list || []).forEach(function (item) {
      const user = item && (item.user || item.user_info || item);
      const raw = item && (item.follow_time || item.followTime || (user && user.follow_time));
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return;
      const seconds = n > 1e12 ? Math.floor(n / 1000) : n;
      if (!oldest || seconds < oldest) oldest = seconds;
    });
    return oldest;
  }

  async performScan(scan, options) {
    const count = 20;
    let added = 0;
    let removed = 0;
    const identity = await this.getIdentity();
    this.store.setConnection('douyin', identity);
    const previouslyFollowing = this.store.getAccounts('douyin').filter(function (a) { return a.following; }).length;
    if (!scan.listDone) {
      let page = Number(scan.page) || 0;
      let sourceType = Number(scan.sourceType) || 4;
      let offset = Number(scan.nextOffset != null ? scan.nextOffset : scan.offset) || 0;
      let maxTime = Number(scan.maxTime) || 0;
      let minTime = Number(scan.minTime) || 0;
      let stall = 0;
      let guard = 0;
      let listComplete = false;
      let graceUsed = false;
      let fallbackUsed = sourceType === 1;
      let emptyRetryUsed = false;
      let lastDebug = [];
      while (guard < 5000) {
        guard += 1;
        await this.waitIfPaused();
        if (this.scanStopped) throw new PlatformError('STOPPED', '扫描已停止');
        scan.phase = 'list';
        scan.current = sourceType === 1
          ? '正在读取抖音关注列表（时间游标，第 ' + (page + 1) + ' 页）'
          : '正在读取抖音关注列表第 ' + (page + 1) + ' 页';
        this.emitScan({ phase: 'list', current: scan.current, page: page, offset: offset, sourceType: sourceType, maxTime: maxTime });
        let data;
        try {
          data = await this.fetchFollowingPage({ offset: offset, count: count, sourceType: sourceType, maxTime: maxTime, minTime: minTime });
        } catch (e) {
          if (e instanceof PlatformError && (e.code === 'RISK' || e.code === 'NEED_LOGIN')) {
            if (e.code === 'RISK') this.showVerificationWindow();
            throw e;
          }
          scan.failed += 1;
          this.emitScan({ failed: scan.failed, error: '第 ' + (page + 1) + ' 页读取失败，2 秒后重试一次：' + (e.message || e) });
          await this.sleep(2000);
          try {
            data = await this.fetchFollowingPage({ offset: offset, count: count, sourceType: sourceType, maxTime: maxTime, minTime: minTime });
          } catch (retryError) {
            if (retryError instanceof PlatformError && (retryError.code === 'RISK' || retryError.code === 'NEED_LOGIN')) throw retryError;
            throw new PlatformError('API', '抖音关注列表第 ' + (page + 1) + ' 页连续两次读取失败：' + (retryError.message || retryError));
          }
        }
        const normalized = data.list.map(this.normalizeFollowing.bind(this)).filter(Boolean);
        if (data.total) scan.total = Math.max(Number(scan.total) || 0, Number(data.total) || 0);
        const seen = new Set(scan.seenIds || []);
        let newCount = 0;
        normalized.forEach(function (a) { if (!seen.has(a.id)) { seen.add(a.id); newCount += 1; } });
        if (normalized.length) {
          const merged = this.store.upsertAccounts('douyin', normalized, { scanStartedAt: scan.startedAt });
          added += merged.added;
        }
        scan.seenIds = Array.from(seen);
        scan.scanned = scan.seenIds.length;
        if (!scan.total) scan.total = scan.scanned;
        if (scan.total && scan.scanned > scan.total) scan.total = scan.scanned;
        if (newCount === 0) stall += 1; else stall = 0;

        try {
          console.log('[douyin] following page=' + (page + 1) + ' source_type=' + sourceType + ' offset=' + offset + ' max_time=' + maxTime + ' returned=' + normalized.length + ' new=' + newCount + ' has_more=' + (!!data.hasMore) + ' total=' + (data.total == null ? '?' : data.total));
        } catch (logError) { /* console may be unavailable */ }
        const debugEntry = {
          page: page + 1,
          sourceType: sourceType,
          offset: offset,
          maxTime: maxTime,
          returned: normalized.length,
          newCount: newCount,
          hasMore: !!data.hasMore,
          total: data.total,
          nextOffset: data.offset,
          minTime: data.minTime,
          at: Date.now()
        };
        scan.paginationDebug = (scan.paginationDebug || []).concat([debugEntry]).slice(-12);
        lastDebug = scan.paginationDebug;
        scan.offset = offset;
        scan.maxTime = maxTime;
        scan.minTime = minTime;
        scan.sourceType = sourceType;
        scan.page = page + 1;
        this.emitScan({
          scanned: scan.scanned,
          total: scan.total,
          page: scan.page,
          offset: offset,
          sourceType: sourceType,
          newCount: newCount,
          current: '已读取 ' + scan.scanned + ' 个账号 · 第 ' + (page + 1) + ' 页返回 ' + normalized.length + ' 条 / 新增 ' + newCount
        });

        if (!normalized.length && page === 0 && sourceType === 4 && !emptyRetryUsed) {
          emptyRetryUsed = true;
          fallbackUsed = true;
          sourceType = 1;
          maxTime = data.maxTime || data.minTime || 0;
          offset = 0;
          stall = 0;
          scan.sourceType = 1;
          scan.maxTime = maxTime;
          this.emitScan({ sourceType: 1, current: '首次请求返回空列表，正在用时间游标确认关注列表…' });
          await this.sleep(options.requestDelayMs);
          continue;
        }
        if (!normalized.length && sourceType === 1 && data.maxTime && data.maxTime !== maxTime && !emptyRetryUsed) {
          emptyRetryUsed = true;
          maxTime = data.maxTime;
          scan.maxTime = maxTime;
          this.emitScan({ current: '已取得时间游标，继续读取关注列表…' });
          await this.sleep(options.requestDelayMs);
          continue;
        }
        let hasMore = !!data.hasMore;
        if (!hasMore) {
          const suspicious = !graceUsed && (normalized.length >= count || (scan.total && scan.scanned < scan.total));
          if (suspicious) {
            graceUsed = true;
            this.emitScan({ current: '接口提前表示结束，正在核对是否还有下一页…' });
          } else {
            listComplete = true;
            break;
          }
        }

        if (stall >= 3) {
          if (sourceType === 4 && !fallbackUsed) {
            const oldest = data.minTime || this.oldestFollowSeconds(data.list);
            if (!oldest) {
              throw new PlatformError('INCOMPLETE', '抖音关注列表分页游标没有前进，且无法取得时间游标。已保留已采集数据。诊断：' + JSON.stringify(lastDebug));
            }
            fallbackUsed = true;
            sourceType = 1;
            maxTime = oldest;
            offset = 0;
            stall = 0;
            scan.sourceType = 1;
            scan.nextOffset = 0;
            scan.maxTime = maxTime;
            this.emitScan({ sourceType: 1, current: '综合分页游标没有前进，已切换为时间游标继续采集' });
            await this.sleep(options.requestDelayMs);
            continue;
          }
          throw new PlatformError('INCOMPLETE', '抖音关注列表连续 3 页没有新增账号，分页可能失效。已保留已采集数据。诊断：' + JSON.stringify(lastDebug));
        }

        let nextOffset = offset;
        let nextMaxTime = maxTime;
        if (sourceType === 4) {
          const maybe = data.offset === null || data.offset === undefined ? null : Number(data.offset);
          if (Number.isFinite(maybe) && maybe !== offset) nextOffset = maybe;
          else nextOffset = offset + Math.max(normalized.length, count);
          if (!Number.isFinite(nextOffset) || nextOffset === offset) nextOffset = offset + count;
        } else {
          let next = data.minTime || this.oldestFollowSeconds(data.list) || 0;
          if (next && next === maxTime) next = Math.max(1, next - 1);
          if (!next) {
            throw new PlatformError('INCOMPLETE', '抖音时间分页游标缺失，无法继续采集。已保留已采集数据。诊断：' + JSON.stringify(lastDebug));
          }
          nextMaxTime = next;
        }
        offset = sourceType === 4 ? nextOffset : 0;
        maxTime = nextMaxTime;
        minTime = 0;
        page += 1;
        scan.nextOffset = nextOffset;
        scan.offset = offset;
        scan.maxTime = maxTime;
        scan.sourceType = sourceType;
        scan.page = page;
        if (hasMore || graceUsed) await this.sleep(options.requestDelayMs);
      }
      if (!scan.seenIds.length && previouslyFollowing > 0) {
        throw new PlatformError('INCOMPLETE', '抖音返回了空的关注列表，可能是隐私设置、接口变更或网络异常。为避免误删本地记录，本次没有修改任何关注状态。');
      }
      if (!listComplete) {
        throw new PlatformError('INCOMPLETE', '抖音关注列表没有完整读取（已读取 ' + scan.seenIds.length + '，分页达到安全上限）。已保留已采集数据。');
      }
      if (scan.total && scan.seenIds.length < scan.total) {
        const missing = scan.total - scan.seenIds.length;
        const tolerance = Math.max(50, Math.ceil(scan.total * 0.01));
        if (missing > tolerance) {
          throw new PlatformError('INCOMPLETE', '抖音关注列表未完整读取：已读取 ' + scan.seenIds.length + ' / 平台返回总数 ' + scan.total + '。分页可能提前结束，已保留已采集数据。诊断：' + JSON.stringify(lastDebug));
        }
        // A few accounts can be missing because the platform total is stale or
        // duplicates were returned. Do not mark anyone as unfollowed in this
        // case, but continue to enrich the accounts that were read.
        scan.listIncomplete = true;
        scan.listWarning = '关注列表读取到 ' + scan.seenIds.length + ' / ' + scan.total + ' 个，可能有少量账号暂时未读取；本次不会把未读取账号标记为已取关。';
        scan.current = scan.listWarning;
        this.emitScan({ warning: scan.listWarning, current: scan.listWarning });
      }
      if (!scan.total && previouslyFollowing > 10 && scan.seenIds.length < previouslyFollowing * 0.6) {
        throw new PlatformError('INCOMPLETE', '抖音本次只读取到 ' + scan.seenIds.length + ' 个账号，但本地上次有 ' + previouslyFollowing + ' 个关注。为防止把未读取的账号误标为已取关，本次没有修改任何关注状态。请重试或反馈诊断：' + JSON.stringify(lastDebug));
      }
      // Never mark missing when the list is known to be incomplete.
      if (!scan.listIncomplete) removed = this.store.markMissing('douyin', scan.seenIds, scan.startedAt);
      scan.listDone = true;
      scan.listComplete = !scan.listIncomplete;
      scan.phase = 'enrich';
      scan.total = scan.total || scan.seenIds.length;
      scan.current = '关注列表读取完成';
      const all = this.store.getAccounts('douyin').filter(function (a) { return a.following !== false; });
      // Re-verify every account and every variable on each scan. Do not reuse
      // an old enrichment just because it happened recently.
      const queue = options.enrichMode === 'none' ? [] : all.map(function (a) { return a.id; });
      scan.enrichQueue = queue;
      scan.enrichIndex = 0;
      scan.enrichTotal = queue.length;
      this.emitScan({
        listDone: true, phase: queue.length ? 'enrich' : 'done', current: queue.length ? '准备分析 ' + queue.length + ' 个账号' : '关注列表读取完成',
        enrichTotal: queue.length, scanned: scan.scanned, total: scan.total
      });
      if (previouslyFollowing > scan.seenIds.length) scan.removedDuringScan = previouslyFollowing - scan.seenIds.length;
    }

    if (scan.enrichQueue && scan.enrichQueue.length && options.enrichMode !== 'none') {
      for (let i = Number(scan.enrichIndex) || 0; i < scan.enrichQueue.length; i += 1) {
        await this.waitIfPaused();
        if (this.scanStopped) throw new PlatformError('STOPPED', '扫描已停止');
        const account = this.store.getAccount('douyin', scan.enrichQueue[i]);
        if (!account) { scan.enrichIndex = i + 1; continue; }
        scan.phase = 'enrich';
        scan.current = account.name;
        scan.enrichIndex = i;
        this.emitScan({ phase: 'enrich', current: account.name, enriched: i, enrichTotal: scan.enrichQueue.length, enrichIndex: i });
        try {
          const patch = await this.enrichAccount(account, options.enrichMode);
          this.store.patchAccount('douyin', account.id, patch);
          scan.enriched = i + 1;
          this.emit({ type: 'account-updated', platform: 'douyin', account: this.store.getAccount('douyin', account.id) });
        } catch (e) {
          if (e instanceof PlatformError && (e.code === 'RISK' || e.code === 'NEED_LOGIN')) throw e;
          scan.enriched = i + 1;
          scan.failed += 1;
          this.store.patchAccount('douyin', account.id, { lastEnrichAt: Date.now(), enrichError: e.message || String(e) });
          this.emitScan({ failed: scan.failed, enrichError: e.message || String(e) });
        }
        scan.enrichIndex = i + 1;
        scan.enrichTotal = scan.enrichQueue.length;
        this.emitScan({
          enriched: scan.enriched, enrichIndex: scan.enrichIndex, enrichTotal: scan.enrichTotal,
          current: '分析 ' + (i + 1) + ' / ' + scan.enrichQueue.length + ' · ' + (account.name || account.id)
        });
        if (i + 1 < scan.enrichQueue.length) {
          await this.sleep(options.requestDelayMs);
          if ((i + 1) % 30 === 0) {
            scan.current = '已分析 ' + (i + 1) + ' 个账号，短暂冷却以降低风控风险';
            this.emitScan({ current: scan.current });
            await this.sleep(6000);
          }
        }
      }
    }

    scan.scanned = scan.seenIds.length;
    scan.phase = 'done';
    scan.current = '';
    this.emitScan({ phase: 'done', scanned: scan.scanned, enriched: scan.enriched, failed: scan.failed, current: '' });
    return { added: added, removed: removed, total: scan.total, scanned: scan.scanned, enriched: scan.enriched, failed: scan.failed, finishedAt: Date.now() };
  }

  async ensureWorker() {
    if (this.worker && !this.worker.isDestroyed()) return this.worker;
    const win = new BrowserWindow({
      show: false,
      width: 1280,
      height: 900,
      title: '抖音操作窗口',
      autoHideMenuBar: true,
      webPreferences: this.webPreferences()
    });
    this.worker = win;
    win.setMenuBarVisibility(false);
    win.on('closed', function () { this.worker = null; }.bind(this));
    return win;
  }

  async detectPageState(win) {
    return win.webContents.executeJavaScript(`(() => {
      const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const bodyText = document.body ? document.body.innerText : '';
      const loginButton = [...document.querySelectorAll('button, div, span')].some(el => visible(el) && (el.textContent || '').trim() === '登录' && el.getBoundingClientRect().top < 120);
      const verify = /安全验证|滑块验证|拖动滑块|完成验证|验证码/.test(bodyText);
      return { bodyText: bodyText.slice(0, 1200), loginButton: loginButton, verify: verify };
    })()`, true).catch(function () { return { bodyText: '', loginButton: false, verify: false }; });
  }

  async unfollowAccount(account) {
    if (!this.workerBusy) this.workerBusy = true;
    try {
      const win = await this.ensureWorker();
      const profileURL = 'https://www.douyin.com/user/' + encodeURIComponent(account.secUid || account.id);
      try {
        await win.loadURL(profileURL, { userAgent: UA });
      } catch (e) {
        throw new PlatformError('PAGE', '无法打开抖音主页：' + e.message);
      }
      await new Promise(r => setTimeout(r, 2400));
      const state = await this.detectPageState(win);
      if (state.verify) {
        win.show();
        throw new PlatformError('RISK', '抖音要求完成安全验证，清理已自动暂停', { url: profileURL });
      }
      if (state.loginButton || /扫码登录|登录后继续/.test(state.bodyText)) {
        throw new PlatformError('NEED_LOGIN', '抖音登录已失效，请重新连接账号');
      }
      const result = await win.webContents.executeJavaScript(`new Promise((resolve) => {
        const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const pick = list => list.sort((a, b) => {
          const ea = /follow/i.test(a.getAttribute('data-e2e') || '') ? -2 : 0;
          const eb = /follow/i.test(b.getAttribute('data-e2e') || '') ? -2 : 0;
          const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect();
          return (ea - eb) || (a.children.length - b.children.length) || (ra.top - rb.top);
        })[0];
        const started = Date.now();
        const attempt = () => {
          const all = [...document.querySelectorAll('button, [role="button"], [data-e2e*="follow"], div, span')]
            .filter(el => visible(el) && (el.textContent || '').trim().length <= 8);
          const exact = text => all.filter(el => (el.textContent || '').trim() === text);
          const btn = pick(exact('已关注').concat(exact('互相关注')));
          if (btn) {
            const label = (btn.textContent || '').trim();
            btn.click();
            resolve({ ok: true, clicked: true, label: label });
            return;
          }
          if (Date.now() - started > 5500) {
            const already = pick(exact('关注'));
            if (already) resolve({ ok: true, already: true });
            else resolve({ ok: false, reason: 'not_found', body: (document.body ? document.body.innerText : '').slice(0, 800) });
            return;
          }
          setTimeout(attempt, 320);
        };
        attempt();
      })`, true);
      if (!result || !result.ok) {
        if (result && result.already) return { ok: true, alreadyUnfollowed: true };
        throw new PlatformError('UI', '未找到「已关注」按钮，可能页面结构已更新');
      }
      await new Promise(r => setTimeout(r, 850));
      const confirm = await win.webContents.executeJavaScript(`new Promise((resolve) => {
        const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const started = Date.now();
        const attempt = () => {
          const nodes = [...document.querySelectorAll('button, [role="button"], div, span, a')].filter(el => visible(el));
          const exact = text => nodes.filter(el => (el.textContent || '').trim() === text).sort((a, b) => a.children.length - b.children.length)[0];
          const cancel = exact('取消关注');
          if (cancel) { cancel.click(); resolve({ clicked: true }); return; }
          if (Date.now() - started > 3200) { resolve({ clicked: false }); return; }
          setTimeout(attempt, 260);
        };
        attempt();
      })()`, true).catch(function () { return { clicked: false }; });
      await new Promise(r => setTimeout(r, 1600));
      const after = await win.webContents.executeJavaScript(`(() => {
        const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const all = [...document.querySelectorAll('button, [role="button"], [data-e2e*="follow"], div, span')].filter(el => visible(el) && (el.textContent || '').trim().length <= 8);
        const hasFollowing = all.some(el => ['已关注', '互相关注'].includes((el.textContent || '').trim()));
        const hasFollow = all.some(el => (el.textContent || '').trim() === '关注');
        return { hasFollowing: hasFollowing, hasFollow: hasFollow, text: (document.body ? document.body.innerText : '').slice(0, 500) };
      })()`, true);
      if (after.hasFollowing) {
        return { ok: false, error: confirm.clicked ? '点击取消关注后状态未变化' : '未出现取消关注确认按钮' };
      }
      if (/操作频繁|操作过于频繁|请稍后再试/.test(after.text)) {
        throw new PlatformError('RISK', '抖音提示操作频繁，清理已自动暂停');
      }
      return { ok: true };
    } finally {
      this.workerBusy = false;
    }
  }

  showVerificationWindow() {
    if (this.signer && !this.signer.isDestroyed()) {
      this.signer.show();
      this.signer.focus();
      return;
    }
    if (this.worker && !this.worker.isDestroyed()) {
      this.worker.show();
      this.worker.focus();
      return;
    }
    this.ensureSigner().then(function (win) { if (win && !win.isDestroyed()) { win.show(); win.focus(); } }).catch(function () {});
  }

  closeWindows() {
    for (const win of [this.signer, this.worker, this.douyinLoginWindow]) {
      if (win && !win.isDestroyed()) win.destroy();
    }
    this.signer = null;
    this.worker = null;
    this.douyinLoginWindow = null;
    this.signerReady = null;
  }
}

module.exports = { DouyinClient, normalizeSecUid };
