/*
 * Pure rule engine shared by the Electron main process and the renderer.
 * No Node or DOM APIs are used here.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SH = root.SH || {};
    root.SH.Rules = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY = 86400000;
  const PLATFORMS = { bili: '哔哩哔哩', douyin: '抖音' };

  const FIELD_GROUPS = [
    { key: 'priority', label: '重点变量（优先）', tone: 'rose' },
    { key: 'activity', label: '活跃与内容', tone: 'jade' },
    { key: 'profile', label: '账号资料', tone: 'blue' },
    { key: 'relation', label: '关注关系', tone: 'amber' },
    { key: 'status', label: '账号状态', tone: 'rose' }
  ];

  const FIELDS = [
    {
      key: 'accountBanned', label: '封禁 / 异常账号', group: 'priority', type: 'boolean', defaultOp: 'isTrue',
      hint: '平台明确返回封禁、受限或主页不可访问；网络失败不算'
    },
    {
      key: 'accountDeleted', label: '已注销 / 用户不存在', group: 'priority', type: 'boolean', defaultOp: 'isTrue',
      hint: '平台明确返回已注销/不存在，或昵称明确显示注销'
    },
    {
      key: 'accountInaccessible', label: '无法访问账号', group: 'priority', type: 'boolean', defaultOp: 'isTrue',
      hint: '平台明确返回空间不可访问或被限制，不是临时网络错误'
    },
    {
      key: 'abnormalNickname', label: '异常昵称（用户+数字/乱码）', group: 'priority', type: 'boolean', defaultOp: 'isTrue',
      hint: '“用户+数字”、纯数字、自动生成 ID、乱码等；纯数字/英文会结合状态与资料判断'
    },
    {
      key: 'followDays', label: '关注时长', group: 'relation', type: 'number', unit: '天',
      ops: ['gt', 'gte', 'lt', 'lte', 'between'], defaultOp: 'gt', placeholder: 365,
      hint: '从你关注该账号起算'
    },
    {
      key: 'lastActiveDays', label: '最近活跃距今', group: 'activity', type: 'number', unit: '天',
      ops: ['gt', 'gte', 'lt', 'lte', 'between'], defaultOp: 'gt', placeholder: 180,
      hint: '取最近作品与最近动态中较新的一项'
    },
    {
      key: 'lastPostDays', label: '最近作品距今', group: 'activity', type: 'number', unit: '天',
      ops: ['gt', 'gte', 'lt', 'lte', 'between'], defaultOp: 'gt', placeholder: 180,
      hint: '没有作品时该字段为空，请配合「没有发布作品」使用'
    },
    {
      key: 'lastDynamicDays', label: '最近动态距今', group: 'activity', type: 'number', unit: '天',
      ops: ['gt', 'gte', 'lt', 'lte', 'between'], defaultOp: 'gt', placeholder: 180,
      platforms: ['bili'],
      hint: 'B站深度分析可选读取；抖音不提供该字段'
    },
    {
      key: 'videoCount', label: '作品数量', group: 'activity', type: 'number', unit: '个',
      ops: ['gt', 'gte', 'lt', 'lte', 'between', 'eq'], defaultOp: 'lt', placeholder: 3,
      hint: '公开作品总数；小于3会包含1–2个作品，不等于没有作品'
    },
    {
      key: 'followerCount', label: '粉丝数量', group: 'profile', type: 'number', unit: '人',
      ops: ['gt', 'gte', 'lt', 'lte', 'between'], defaultOp: 'lt', placeholder: 1000,
      hint: '仅作为参考，不建议单独据此清理'
    },
    {
      key: 'level', label: '账号等级', group: 'profile', type: 'number', unit: '级',
      ops: ['lt', 'lte', 'gt', 'gte', 'eq'], defaultOp: 'lt', placeholder: 2,
      platforms: ['bili'],
      hint: 'B站等级；抖音不提供'
    },
    {
      key: 'updateFrequencyDays', label: '平均更新间隔', group: 'activity', type: 'number', unit: '天',
      ops: ['gt', 'gte', 'lt', 'lte', 'between'], defaultOp: 'gt', placeholder: 30,
      hint: '根据最近若干作品估算'
    },
    {
      key: 'noAvatar', label: '未设置头像', group: 'profile', type: 'boolean', defaultOp: 'isTrue',
      hint: '没有头像不等于僵尸号，建议只作为弱信号'
    },
    {
      key: 'emptyBio', label: '个人简介为空', group: 'profile', type: 'boolean', defaultOp: 'isTrue',
      hint: '简介为空是常见情况，请谨慎使用'
    },
    {
      key: 'noWorks', label: '作品数量为零', group: 'priority', type: 'boolean', defaultOp: 'isTrue',
      hint: '只在平台明确返回作品数为 0 时命中；未知不算'
    },
    {
      key: 'notMutual', label: '未互相关注', group: 'relation', type: 'boolean', defaultOp: 'isTrue',
      hint: '平台提供互关状态时可用；未知状态不会命中'
    },
    {
      key: 'notSpecial', label: '非特别关注', group: 'relation', type: 'boolean', defaultOp: 'isTrue',
      hint: '没有被你标为特别关注'
    },
    {
      key: 'accountAbnormal', label: '账号异常或不可访问', group: 'status', type: 'boolean', defaultOp: 'isTrue',
      hint: '已注销、封禁、无法访问等'
    },
    {
      key: 'followedAt', label: '关注时间', group: 'relation', type: 'date', defaultOp: 'before',
      hint: '按具体日期筛选关注关系'
    },
    {
      key: 'category', label: '内容分类', group: 'profile', type: 'string', defaultOp: 'contains',
      placeholder: '例如：游戏', hint: '来自最近作品的平台分区，可能不准确'
    }
  ];

  const FIELD_MAP = {};
  FIELDS.forEach(function (field) { FIELD_MAP[field.key] = field; });

  const OP_LABELS = {
    gt: '大于', gte: '大于等于', lt: '小于', lte: '小于等于', eq: '等于', between: '介于',
    isTrue: '满足', before: '早于', after: '晚于', contains: '包含', notContains: '不包含'
  };

  const WEIGHT_LABELS = { 1: '轻微', 2: '一般', 3: '较高', 4: '重要', 5: '核心' };

  const RISK_META = {
    high: { label: '高风险', short: '高', color: 'rose', order: 3 },
    medium: { label: '中风险', short: '中', color: 'amber', order: 2 },
    low: { label: '低风险', short: '低', color: 'jade', order: 1 },
    unknown: { label: '数据不足', short: '—', color: 'slate', order: 0 }
  };

  const STATUS_META = {
    normal: { label: '正常', tone: 'jade' },
    banned: { label: '封禁 / 受限', tone: 'rose' },
    deleted: { label: '已注销 / 不存在', tone: 'rose' },
    inaccessible: { label: '无法访问', tone: 'amber' },
    unknown: { label: '未确认', tone: 'slate' }
  };

  function uid(prefix) {
    return (prefix || 'c') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function daysSince(ts, now) {
    if (!ts) return null;
    const ms = ts > 1e12 ? ts : ts * 1000;
    const diff = (now || Date.now()) - ms;
    if (!Number.isFinite(diff)) return null;
    return Math.max(0, Math.floor(diff / DAY));
  }

  function hasRealAvatar(account) {
    const url = String(account.avatar || '').trim();
    if (!url) return false;
    if (/noface|default|member\/noface|user-avatar|blank\.(png|jpg)/i.test(url)) return false;
    return true;
  }

  const PRIORITY_FILTERS = [
    { key: 'banned', label: '封禁 / 异常', short: '封禁异常', desc: '平台明确返回封禁、受限或主页不可访问', tone: 'rose' },
    { key: 'deleted', label: '注销 / 不存在', short: '注销不存在', desc: '平台明确返回已注销、用户不存在，或昵称明确显示注销', tone: 'rose' },
    { key: 'abnormalNickname', label: '异常昵称', short: '异常昵称', desc: '“用户+数字”、纯数字、乱码等，结合账号状态和资料判断', tone: 'amber' },
    { key: 'zeroWorks', label: '作品为零', short: '零作品', desc: '平台明确返回作品数为 0；未获取到数量时不算', tone: 'slate' }
  ];

  function hasVerifiedAbnormalStatus(account) {
    const status = String(account.accountStatus || 'unknown');
    return status === 'banned' || status === 'deleted' || status === 'inaccessible';
  }

  function detectNicknameAnomaly(account) {
    const name = String(account.name || '').trim();
    const empty = { matched: false, deletedName: false, bannedName: false, strong: false, reasons: [] };
    if (!name) return empty;

    const status = String(account.accountStatus || 'unknown');
    const signals = [];
    if (status === 'banned' || status === 'deleted' || status === 'inaccessible') signals.push('账号状态异常');
    if (account.videoCount != null && Number(account.videoCount) === 0) signals.push('作品数为 0');
    if (account.hasAvatar === false || !hasRealAvatar(account)) signals.push('没有头像');
    if (!String(account.signature || account.sign || '').trim()) signals.push('没有简介');
    if (account.mutual === false) signals.push('未互关');

    const bannedName = /(已封禁|已被封禁|账号已封禁|封禁用户|账号被限制)/.test(name);
    const deletedName = /(已注销|注销用户|用户已注销|账号已注销|账号不存在|用户不存在|该用户不存在|账号已删除|用户已删除)/.test(name);
    const userDigits = /^用户\s*[0-9]{4,}$/.test(name) || /^用户\s*[a-zA-Z0-9_.-]{5,}$/.test(name);
    const onlyDigits = /^[0-9]{5,}$/.test(name);
    const autoHandle = /^(?:bili|user|douyin|dy)[_-]?[0-9]{5,}$/i.test(name);
    const numericSuffix = /[\u4e00-\u9fa5A-Za-z]{1,8}[_\-\s]?[0-9]{6,}$/.test(name) && !/[a-zA-Z]{6,}/.test(name);
    const garbled = /[\uFFFD\u0000-\u001F]/.test(name);
    const symbolCount = (name.match(/[^\p{L}\p{N}\u4e00-\u9fa5]/gu) || []).length;
    const symbolRatio = name.length ? symbolCount / name.length : 0;
    const randomSymbols = name.length >= 4 && symbolRatio > 0.6;
    const randomMix = /^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9_-]{12,}$/.test(name);

    const reasons = [];
    let strong = false;
    let medium = false;
    if (bannedName) { strong = true; reasons.push('昵称明确显示账号已被封禁或限制'); }
    if (deletedName) { strong = true; reasons.push('昵称明确显示已注销或不存在'); }
    if (userDigits) { strong = true; reasons.push('昵称为“用户+数字/随机字符”格式'); }
    if (garbled) { strong = true; reasons.push('昵称包含乱码或控制字符'); }
    if (onlyDigits) { medium = true; reasons.push('昵称为纯数字'); }
    if (autoHandle) { medium = true; reasons.push('昵称为自动生成的数字账号'); }
    if (numericSuffix) { medium = true; reasons.push('昵称带超长数字后缀'); }
    if (randomSymbols) { medium = true; reasons.push('昵称主要由异常符号组成'); }
    if (randomMix) { medium = true; reasons.push('昵称为无意义字母数字组合'); }

    const matched = strong || (medium && signals.length >= 2);
    if (medium && signals.length) reasons.push('辅助信号：' + signals.join('、'));
    return {
      matched: matched,
      deletedName: deletedName,
      bannedName: bannedName,
      strong: strong,
      reasons: reasons,
      signals: signals,
      pattern: bannedName ? 'banned_name' : deletedName ? 'deleted_name' : userDigits ? 'user_digits' : garbled ? 'garbled' : onlyDigits ? 'digits' : autoHandle ? 'auto_handle' : numericSuffix ? 'numeric_suffix' : randomSymbols ? 'symbols' : randomMix ? 'random_mix' : ''
    };
  }

  function getPriority(account) {
    const status = String(account.accountStatus || 'unknown');
    const nickname = detectNicknameAnomaly(account);
    const banned = status === 'banned' || status === 'inaccessible' || account.isBan === true || nickname.bannedName;
    const deleted = status === 'deleted' || account.userExists === false || nickname.deletedName;
    const abnormalNickname = nickname.matched;
    const zeroWorks = account.videoCount != null && Number(account.videoCount) === 0;
    const hits = [];
    const labels = [];
    const reasons = [];
    if (banned) {
      hits.push('banned');
      labels.push('封禁 / 异常');
      reasons.push(nickname.bannedName && status !== 'banned' && status !== 'inaccessible' ? '昵称明确显示账号已被封禁或限制' : status === 'inaccessible' ? '平台返回账号空间不可访问' : '平台返回账号被封禁或受限');
    }
    if (deleted) {
      hits.push('deleted');
      labels.push('注销 / 不存在');
      reasons.push(nickname.deletedName && status !== 'deleted' ? '昵称明确显示已注销或不存在' : '平台返回账号已注销或不存在');
    }
    if (abnormalNickname) {
      hits.push('abnormalNickname');
      labels.push('异常昵称');
      reasons.push(...nickname.reasons.filter(function (r) { return !r.startsWith('辅助信号'); }).slice(0, 2));
    }
    if (zeroWorks) {
      hits.push('zeroWorks');
      labels.push('作品为零');
      reasons.push('平台明确返回作品数量为 0');
    }
    return {
      banned: banned,
      deleted: deleted,
      abnormalNickname: abnormalNickname,
      zeroWorks: zeroWorks,
      hits: hits,
      labels: labels,
      reasons: Array.from(new Set(reasons)),
      nickname: nickname,
      status: status
    };
  }

  function matchesPriority(accountOrPriority, keys, logic) {
    const selected = Array.isArray(keys) ? keys : [];
    if (!selected.length) return true;
    const priority = accountOrPriority && accountOrPriority.hits ? accountOrPriority : getPriority(accountOrPriority || {});
    if (logic === 'all') return selected.every(function (key) { return !!priority[key]; });
    return selected.some(function (key) { return !!priority[key]; });
  }

  function getPriorityCounts(accounts) {
    const counts = { banned: 0, deleted: 0, abnormalNickname: 0, zeroWorks: 0 };
    (accounts || []).forEach(function (account) {
      const priority = account && account._eval && account._eval.priority ? account._eval.priority : getPriority(account || {});
      PRIORITY_FILTERS.forEach(function (p) { if (priority[p.key]) counts[p.key] += 1; });
    });
    return counts;
  }

  function getMetrics(account, now, priorityOverride) {
    now = now || Date.now();
    const priority = priorityOverride || getPriority(account);
    const followDays = account.followDays != null ? Number(account.followDays) : daysSince(account.followedAt || account.mtime, now);
    const lastPostDays = account.lastPostDays != null ? Number(account.lastPostDays) : daysSince(account.lastPostAt, now);
    const lastDynamicDays = account.lastDynamicDays != null ? Number(account.lastDynamicDays) : daysSince(account.lastDynamicAt, now);
    const knownActive = [lastPostDays, lastDynamicDays].filter(function (v) { return v != null; });
    const lastActiveDays = account.lastActiveDays != null
      ? Number(account.lastActiveDays)
      : (knownActive.length ? Math.min.apply(null, knownActive) : null);
    const videoCount = account.videoCountVerified === true ? toNumber(account.videoCount) : null;
    const followerCount = toNumber(account.followerCount);
    const level = toNumber(account.level);
    const updateFrequencyDays = toNumber(account.updateFrequencyDays);
    const status = account.accountStatus || 'unknown';
    const abnormal = status === 'banned' || status === 'deleted' || status === 'inaccessible';
    return {
      followDays: followDays,
      followedAt: account.followedAt ? (account.followedAt > 1e12 ? account.followedAt : account.followedAt * 1000) : (account.mtime ? account.mtime * 1000 : null),
      lastPostDays: lastPostDays,
      lastDynamicDays: lastDynamicDays,
      lastActiveDays: lastActiveDays,
      videoCount: videoCount,
      followerCount: followerCount,
      level: level,
      updateFrequencyDays: updateFrequencyDays,
      noAvatar: account.hasAvatar === false ? true : (account.hasAvatar === true ? false : !hasRealAvatar(account)),
      emptyBio: !String(account.signature || account.sign || '').trim(),
      noWorks: videoCount === 0,
      notMutual: account.mutual === true ? false : (account.mutual === false ? true : null),
      notSpecial: account.special === true ? false : (account.special === false ? true : null),
      accountAbnormal: abnormal,
      accountBanned: priority.banned,
      accountDeleted: priority.deleted,
      accountInaccessible: status === 'inaccessible',
      abnormalNickname: priority.abnormalNickname,
      category: String(account.category || ''),
      status: status
    };
  }

  function compareNumber(actual, op, value, value2) {
    if (actual == null) return false;
    const target = toNumber(value);
    if (op === 'between') {
      const upper = toNumber(value2);
      if (target == null || upper == null) return false;
      return actual >= Math.min(target, upper) && actual <= Math.max(target, upper);
    }
    if (target == null) return false;
    switch (op) {
      case 'gt': return actual > target;
      case 'gte': return actual >= target;
      case 'lt': return actual < target;
      case 'lte': return actual <= target;
      case 'eq': return actual === target;
      default: return false;
    }
  }

  function evalCondition(condition, metrics) {
    if (!condition || condition.enabled === false) return { known: false, matched: false };
    const field = FIELD_MAP[condition.field];
    if (!field) return { known: false, matched: false };
    const value = metrics[condition.field];

    if (field.type === 'boolean') {
      if (value == null) return { known: false, matched: false };
      return { known: true, matched: value === true };
    }

    if (field.type === 'number') {
      const target = toNumber(condition.value);
      const target2 = toNumber(condition.value2);
      if (target == null || (condition.op === 'between' && target2 == null)) {
        return { known: false, matched: false };
      }
      if (value == null) return { known: false, matched: false };
      return { known: true, matched: compareNumber(value, condition.op, condition.value, condition.value2) };
    }

    if (field.type === 'date') {
      if (value == null || !condition.value) return { known: false, matched: false };
      const date = new Date(condition.value + (String(condition.value).length <= 10 ? 'T00:00:00' : '')).getTime();
      if (!Number.isFinite(date)) return { known: false, matched: false };
      const endOfDay = date + DAY - 1;
      if (condition.op === 'before') return { known: true, matched: value < date };
      if (condition.op === 'after') return { known: true, matched: value > endOfDay };
      return { known: false, matched: false };
    }

    if (field.type === 'string') {
      const needle = String(condition.value || '').trim();
      if (!needle) return { known: false, matched: false };
      const haystack = String(value || '');
      if (condition.op === 'contains') return { known: true, matched: haystack.includes(needle) };
      if (condition.op === 'notContains') return { known: true, matched: !haystack.includes(needle) };
      return { known: false, matched: false };
    }

    return { known: false, matched: false };
  }

  function describeValue(condition) {
    const field = FIELD_MAP[condition.field];
    if (!field) return '';
    if (field.type === 'boolean') return field.label;
    if (field.type === 'date') return condition.value || '';
    if (field.type === 'string') return '「' + (condition.value || '') + '」';
    const op = OP_LABELS[condition.op] || condition.op;
    if (condition.op === 'between') return op + ' ' + condition.value + ' ~ ' + condition.value2 + (field.unit || '');
    return op + ' ' + condition.value + (field.unit || '');
  }

  function describeCondition(condition) {
    const field = FIELD_MAP[condition.field];
    if (!field) return '未知条件';
    if (field.type === 'boolean') return field.label;
    if (field.type === 'date') {
      return field.label + ' ' + (OP_LABELS[condition.op] || '') + ' ' + (condition.value || '');
    }
    if (field.type === 'string') {
      return field.label + ' ' + (OP_LABELS[condition.op] || '') + ' ' + (condition.value || '');
    }
    return field.label + ' ' + describeValue(condition);
  }

  function fieldAvailable(platform, fieldKey) {
    const field = FIELD_MAP[fieldKey];
    return !!field && (!field.platforms || field.platforms.includes(platform));
  }

  function makeCondition(fieldKey, overrides) {
    const field = FIELD_MAP[fieldKey] || FIELDS[0];
    return Object.assign({
      id: uid('cond'),
      field: field.key,
      op: field.defaultOp,
      value: field.type === 'boolean' ? '' : (field.placeholder != null ? field.placeholder : ''),
      value2: '',
      weight: 2,
      enabled: true
    }, overrides || {});
  }

  function defaultRules(platform) {
    const conditions = [
      makeCondition('followDays', { op: 'gt', value: 365, weight: 2 }),
      makeCondition('lastActiveDays', { op: 'gt', value: 180, weight: 4 }),
      makeCondition('videoCount', { op: 'lt', value: 3, weight: 2 }),
      makeCondition('notMutual', { weight: 2 }),
      makeCondition('accountAbnormal', { weight: 5 }),
      makeCondition('noAvatar', { weight: 1, enabled: false }),
      makeCondition('emptyBio', { weight: 1, enabled: false })
    ];
    if (platform === 'bili') {
      conditions.splice(4, 0, makeCondition('notSpecial', { weight: 1, enabled: false }));
    }
    return {
      version: 1,
      logic: 'any',
      suggestThreshold: 55,
      highThreshold: 70,
      mediumThreshold: 40,
      conditions: conditions,
      updatedAt: Date.now()
    };
  }

  function normalizeRules(input, platform) {
    const base = defaultRules(platform);
    if (!input || !Array.isArray(input.conditions)) return base;
    const conditions = input.conditions
      .filter(function (c) { return c && FIELD_MAP[c.field]; })
      .map(function (c) {
        const field = FIELD_MAP[c.field];
        return {
          id: c.id || uid('cond'),
          field: c.field,
          op: field.ops ? (field.ops.includes(c.op) ? c.op : field.defaultOp) : field.defaultOp,
          value: c.value != null ? c.value : '',
          value2: c.value2 != null ? c.value2 : '',
          weight: Math.max(1, Math.min(5, Number(c.weight) || 2)),
          enabled: c.enabled !== false
        };
      });
    return {
      version: 1,
      logic: ['all', 'any', 'score'].includes(input.logic) ? input.logic : 'any',
      suggestThreshold: Math.max(0, Math.min(100, Number(input.suggestThreshold) || 55)),
      highThreshold: Math.max(1, Math.min(100, Number(input.highThreshold) || 70)),
      mediumThreshold: Math.max(0, Math.min(99, Number(input.mediumThreshold) || 40)),
      conditions: conditions.length ? conditions : base.conditions,
      updatedAt: input.updatedAt || Date.now()
    };
  }

  function evaluate(account, rules, now) {
    rules = rules || defaultRules(account.platform);
    now = now || Date.now();
    const priority = getPriority(account);
    const metrics = getMetrics(account, now, priority);
    const enabled = (rules.conditions || []).filter(function (c) { return c.enabled !== false; });
    let totalWeight = 0;
    let matchedWeight = 0;
    let knownWeight = 0;
    let matchedCount = 0;
    let knownCount = 0;
    const results = [];
    const reasons = [];

    enabled.forEach(function (condition) {
      const weight = Math.max(1, Math.min(5, Number(condition.weight) || 1));
      totalWeight += weight;
      const result = evalCondition(condition, metrics);
      if (result.known) {
        knownWeight += weight;
        knownCount += 1;
      }
      if (result.matched) {
        matchedWeight += weight;
        matchedCount += 1;
        reasons.push({
          id: condition.id,
          field: condition.field,
          label: describeCondition(condition),
          weight: weight,
          group: (FIELD_MAP[condition.field] || {}).group || 'activity'
        });
      }
      results.push({
        id: condition.id,
        field: condition.field,
        label: describeCondition(condition),
        weight: weight,
        known: result.known,
        matched: result.matched,
        value: metrics[condition.field]
      });
    });

    const score = totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0;
    const confidence = totalWeight ? Math.round((knownWeight / totalWeight) * 100) : 0;
    const highThreshold = Number(rules.highThreshold) || 70;
    const mediumThreshold = Number(rules.mediumThreshold) || 40;
    let risk = score >= highThreshold ? 'high' : (score >= mediumThreshold ? 'medium' : 'low');
    if (enabled.length === 0) risk = 'unknown';
    if (confidence < 25 && score < highThreshold) risk = risk === 'medium' ? 'low' : risk;

    let match = false;
    if (enabled.length) {
      if (rules.logic === 'all') {
        match = results.filter(function (r) { return r.known; }).length === enabled.length && matchedCount === enabled.length;
      } else if (rules.logic === 'score') {
        match = score >= (Number(rules.suggestThreshold) || 55);
      } else {
        match = matchedCount > 0;
      }
    }
    const suggested = !!match && score >= (Number(rules.suggestThreshold) || 55) && account.following !== false && !account.whitelist;
    return {
      metrics: metrics,
      priority: priority,
      results: results,
      reasons: reasons,
      score: score,
      confidence: confidence,
      risk: risk,
      riskLabel: RISK_META[risk].label,
      match: match,
      suggested: suggested,
      matchedCount: matchedCount,
      enabledCount: enabled.length,
      weights: { total: totalWeight, matched: matchedWeight, known: knownWeight }
    };
  }

  function enrich(account, rules, now) {
    const result = evaluate(account, rules, now);
    return Object.assign({}, account, {
      _eval: result,
      priority: result.priority,
      priorityHits: result.priority.hits,
      riskScore: result.score,
      risk: result.risk,
      reasons: result.reasons,
      suggested: result.suggested,
      match: result.match,
      confidence: result.confidence
    });
  }

  function riskDistribution(accounts, rules, now) {
    const dist = { high: 0, medium: 0, low: 0, unknown: 0 };
    accounts.forEach(function (account) {
      const result = account._eval || evaluate(account, rules, now);
      dist[result.risk] = (dist[result.risk] || 0) + 1;
    });
    return dist;
  }

  return {
    DAY: DAY,
    PLATFORMS: PLATFORMS,
    PRIORITY_FILTERS: PRIORITY_FILTERS,
    FIELD_GROUPS: FIELD_GROUPS,
    FIELDS: FIELDS,
    FIELD_MAP: FIELD_MAP,
    fieldAvailable: fieldAvailable,
    OP_LABELS: OP_LABELS,
    WEIGHT_LABELS: WEIGHT_LABELS,
    RISK_META: RISK_META,
    STATUS_META: STATUS_META,
    uid: uid,
    daysSince: daysSince,
    hasRealAvatar: hasRealAvatar,
    detectNicknameAnomaly: detectNicknameAnomaly,
    getPriority: getPriority,
    matchesPriority: matchesPriority,
    getPriorityCounts: getPriorityCounts,
    getMetrics: getMetrics,
    evalCondition: evalCondition,
    describeCondition: describeCondition,
    makeCondition: makeCondition,
    defaultRules: defaultRules,
    normalizeRules: normalizeRules,
    evaluate: evaluate,
    enrich: enrich,
    riskDistribution: riskDistribution,
    compareNumber: compareNumber
  };
});
