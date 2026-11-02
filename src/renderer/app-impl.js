/* =========================================================================
 * Action implementations, form handling and exports
 * ========================================================================= */
'use strict';

/* ------------------------------ Scanning ------------------------------- */
async function startScan(resume) {
  if (state.demo) { toast('演示模式不会启动真实扫描', 'info'); return; }
  if (!isConnected()) { toast('请先连接账号', 'error'); return; }
  const m = state.modal;
  const settings = state.boot.settings[state.platform];
  const opts = resume
    ? { resume: true }
    : {
      enrichMode: (m && m.mode) || settings.enrichMode,
      requestDelayMs: (m && m.delay) || settings.requestDelayMs,
      forceEnrich: !!(m && m.force)
    };
  closeModal();
  try {
    await bridge.call('scanStart', state.platform, opts);
    toast(resume ? '已继续扫描' : '扫描已开始，可以随时暂停', 'success');
    navigate('accounts');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function pauseScan() {
  if (state.demo) return;
  try {
    await bridge.call('scanPause', state.platform);
    await loadPlatform(state.platform);
    render();
    toast('扫描已暂停，数据已保留', 'info');
  } catch (e) { toast(e.message, 'error'); }
}

async function resumeScan() {
  if (state.demo) return;
  try {
    await bridge.call('scanResume', state.platform);
    render();
    toast('已继续扫描', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

/* ------------------------------ Accounts ------------------------------- */
async function toggleWhitelist(id) {
  const account = accountList().find(function (a) { return String(a.id) === String(id); });
  if (!account) return;
  const next = !account.whitelist;
  if (state.demo) {
    account.whitelist = next;
    account.whitelistManual = next;
    if (!next && (account.mutual === true || account.special === true || account.starred === true)) {
      account.whitelist = true;
      account.whitelistAuto = true;
      account.whitelistReason = [account.mutual === true ? '互相关注' : '', account.special === true ? '特别关注' : '', account.starred === true ? '已收藏' : ''].filter(Boolean).join('、');
    }
    invalidateAccountCache();
    toast(account.whitelist ? (next ? '已加入白名单：' + account.name : '该账号因互关/特别关注/收藏自动保留在白名单') : '已移出白名单：' + account.name, 'success');
    render();
    return;
  }
  try {
    const saved = await bridge.call('updateAccount', state.platform, id, { whitelist: next });
    Object.assign(account, saved || {});
    invalidateAccountCache();
    toast(account.whitelist ? (next ? '已加入白名单：' + account.name : '该账号因互关/特别关注/收藏自动保留在白名单') : '已移出白名单：' + account.name, 'success');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

async function toggleStar(id) {
  const account = accountList().find(function (a) { return String(a.id) === String(id); });
  if (!account) return;
  const next = !account.starred;
  if (state.demo) {
    account.starred = next;
    if (next) {
      account.whitelist = true;
      account.whitelistAuto = true;
      account.whitelistReason = '已收藏';
    } else if (account.whitelistAuto && account.mutual !== true && account.special !== true && !account.whitelistManual) {
      account.whitelist = false;
      account.whitelistAuto = false;
      account.whitelistReason = '';
    }
    invalidateAccountCache();
    toast(next ? '已收藏并自动加入白名单' : '已取消收藏', 'info');
    render();
    return;
  }
  try {
    const saved = await bridge.call('updateAccount', state.platform, id, { starred: next });
    Object.assign(account, saved || {});
    invalidateAccountCache();
    toast(next ? '已收藏并自动加入白名单' : '已取消收藏', 'info');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

async function saveNote(id, note) {
  const account = accountList().find(function (a) { return String(a.id) === String(id); });
  if (!account) return;
  if (state.demo) { account.note = note; toast('备注已保存', 'success'); return; }
  try {
    await bridge.call('updateAccount', state.platform, id, { note: note });
    account.note = note;
    toast('备注已保存', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function bulkWhitelist(ids) {
  if (!ids.length) return;
  if (state.demo) {
    const target = new Set(ids.map(String));
    accountList().forEach(function (a) { if (target.has(String(a.id))) a.whitelist = true; });
    state.selection.clear();
    invalidateAccountCache();
    toast('已将 ' + ids.length + ' 个账号加入白名单', 'success');
    render();
    return;
  }
  try {
    await bridge.call('bulkWhitelist', state.platform, ids, true);
    const target = new Set(ids.map(String));
    accountList().forEach(function (a) { if (target.has(String(a.id))) a.whitelist = true; });
    state.selection.clear();
    invalidateAccountCache();
    toast('已将 ' + ids.length + ' 个账号加入白名单', 'success');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

function openCleanup(ids, opts) {
  const sourceMode = (opts && opts.source) === 'detail' ? 'detail' : 'selection';
  const byId = new Map(accountList().map(function (a) { return [String(a.id), a]; }));
  const candidateIds = Array.from(new Set((ids || []).map(String)));
  const accounts = candidateIds.map(function (id) { return byId.get(id); }).filter(Boolean);
  const validAll = accounts.filter(function (a) { return a.following !== false && !a.whitelist; });
  const whitelistExcluded = accounts.filter(function (a) { return !!a.whitelist; }).length;
  if (!validAll.length) { toast('没有可清理的账号（可能已被白名单保护或已不再关注）', 'warn'); return; }
  const totalCount = followingAccounts().length;
  const filterData = listConditionData();
  const filterCount = filterData.activeCount ? filterData.matchSet.size : 0;
  const matchedIds = filterData.matchSet;
  const inMatch = candidateIds.filter(function (id) { return matchedIds.has(id); }).length;
  const scoreById = new Map(decoratedAccounts().map(function (a) { return [String(a.id), a.riskScore]; }));
  validAll.sort(function (a, b) { return (scoreById.get(String(b.id)) || 0) - (scoreById.get(String(a.id)) || 0); });
  const valid = validAll.slice(0, MAX_CLEANUP_PER_RUN);
  const defaults = (state.boot.settings && state.boot.settings.cleanup) || { intervalMs: 2200, batchSize: 20, batchPauseMs: 8000, maxConsecutiveFailures: 2 };
  state.modal = {
    type: 'cleanup', platform: state.platform, ids: valid.map(function (a) { return a.id; }), step: 'confirm', agreed: false, _cleanupStatus: null,
    sourceMode: sourceMode,
    totalCount: totalCount,
    filterCount: filterCount,
    selectedCount: candidateIds.length,
    inMatch: inMatch,
    whitelistExcluded: whitelistExcluded,
    truncated: Math.max(0, validAll.length - valid.length),
    options: { intervalMs: defaults.intervalMs, batchSize: defaults.batchSize, batchPauseMs: defaults.batchPauseMs, maxConsecutiveFailures: defaults.maxConsecutiveFailures }
  };
  renderModal();
}

async function confirmStartCleanup() {
  const m = state.modal;
  if (!m || m.type !== 'cleanup') return;
  if (!m.agreed) { toast('请先勾选确认', 'warn'); return; }
  const ids = m.ids || [];
  if (!ids.length) return;
  m.step = 'running';
  if (state.demo) { startDemoCleanup(ids, m.options); return; }
  renderModal();
  try {
    const res = await bridge.call('cleanupStart', state.platform, ids, m.options);
    if (res && res.state && state.data[state.platform]) state.data[state.platform].cleanup = res.state;
    if (state.modal && state.modal.type === 'cleanup') renderModal();
  } catch (e) {
    if (state.modal && state.modal.type === 'cleanup') {
      state.modal.step = 'confirm';
      state.modal.error = e.message;
      renderModal();
    }
    toast(e.message, 'error');
  }
}

async function cleanupPause() {
  if (state.demo) {
    state.demoPaused = true;
    if (state.demoCleanup) state.demoCleanup.status = 'paused';
    renderModal();
    return;
  }
  try { await bridge.call('cleanupPause', state.platform); renderModal(); } catch (e) { toast(e.message, 'error'); }
}

async function cleanupResume() {
  if (state.demo) {
    state.demoPaused = false;
    if (state.demoCleanup) state.demoCleanup.status = 'running';
    renderModal();
    return;
  }
  try { await bridge.call('cleanupResume', state.platform); renderModal(); } catch (e) { toast(e.message, 'error'); }
}

async function cleanupStop() {
  if (state.demo) {
    state.demoPaused = false;
    if (state.demoCleanupTimer) clearTimeout(state.demoCleanupTimer);
    state.demoCleanupTimer = null;
    if (state.demoCleanup) {
      state.demoCleanup.status = 'stopped';
      state.demoCleanup.endedAt = Date.now();
      state.demoCleanup.error = '已手动停止，未处理的账号仍保留在关注列表';
    }
    renderModal();
    render();
    return;
  }
  try { await bridge.call('cleanupStop', state.platform); renderModal(); } catch (e) { toast(e.message, 'error'); }
}

/* -------------------------------- Rules -------------------------------- */
function applyRulePreset(key) {
  if (!state.ruleDraft) return;
  const R = window.SH.Rules;
  let conditions = [];
  let logic = 'all';
  let threshold = 55;
  if (key === 'priority') {
    conditions = [R.makeCondition('accountBanned', { weight: 5 }), R.makeCondition('accountDeleted', { weight: 5 }), R.makeCondition('abnormalNickname', { weight: 3 }), R.makeCondition('noWorks', { weight: 2 })];
    logic = 'any'; threshold = 55;
  } else if (key === 'inactive') {
    conditions = [R.makeCondition('followDays', { op: 'gt', value: 365, weight: 2 }), R.makeCondition('lastActiveDays', { op: 'gt', value: 180, weight: 4 })];
    logic = 'all'; threshold = 50;
  } else if (key === 'lowRelation') {
    conditions = [R.makeCondition('followDays', { op: 'gt', value: 365, weight: 2 }), R.makeCondition('notMutual', { weight: 2 }), R.makeCondition('lastActiveDays', { op: 'gt', value: 90, weight: 3 })];
    logic = 'all'; threshold = 55;
  } else if (key === 'empty') {
    conditions = [R.makeCondition('noAvatar', { weight: 1 }), R.makeCondition('emptyBio', { weight: 1 }), R.makeCondition('noWorks', { weight: 3 })];
    logic = 'all'; threshold = 45;
  } else if (key === 'abnormal') {
    conditions = [R.makeCondition('accountAbnormal', { weight: 5 })];
    logic = 'any'; threshold = 60;
  }
  state.ruleDraft.conditions = conditions;
  state.ruleDraft.logic = logic;
  state.ruleDraft.suggestThreshold = threshold;
  renderContent();
}

function addConditionFromSelect(value) {
  if (!state.ruleDraft) return;
  const select = document.getElementById('addConditionSelect');
  const fieldKey = value || (select && select.value);
  if (!fieldKey) { toast('请选择要添加的条件', 'info'); return; }
  state.ruleDraft.conditions.push(window.SH.Rules.makeCondition(fieldKey));
  renderContent();
}

async function saveRules() {
  if (!state.ruleDraft) return;
  if (state.demo) {
    state.demoData[state.platform].rules = cloneRules(state.ruleDraft);
    state.demoData[state.platform].rules.updatedAt = Date.now();
    state.ruleDraft = cloneRules(state.demoData[state.platform].rules);
    invalidateAccountCache();
    state.page = 1;
    toast('筛选变量已应用，仅对本次演示生效；已选账号保持不变', 'success');
    render();
    return;
  }
  try {
    const saved = await bridge.call('saveRules', state.platform, state.ruleDraft);
    if (state.data[state.platform]) state.data[state.platform].rules = saved;
    if (state.boot) state.boot.rules[state.platform] = saved;
    state.ruleDraft = cloneRules(saved);
    state.ruleDraftPlatform = state.platform;
    invalidateAccountCache();
    state.page = 1;
    toast('筛选变量已保存并应用；已选账号保持不变', 'success');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

/* ------------------------------- Settings ------------------------------ */
async function saveSettings() {
  if (state.demo) {
    state.boot.settings = deepClone(state.settingsDraft);
    toast('演示设置已应用，不会写入真实配置', 'success');
    render();
    return;
  }
  try {
    const saved = await bridge.call('saveSettings', state.settingsDraft);
    state.boot.settings = saved;
    state.settingsDraft = deepClone(saved);
    toast('设置已保存', 'success');
    render();
  } catch (e) { toast(e.message, 'error'); }
}

/* ------------------------------- Export -------------------------------- */
function buildAccountsCSV(accounts, rules) {
  const rows = [['平台', '昵称', '账号ID', '主页', '简介', '关注时间', '关注天数', '作品数', '粉丝数', '最近作品', '最近活跃', '互相关注', '特别关注', '账号状态', '风险分', '风险等级', '命中条件', '白名单', '备注', '当前仍关注', '取消关注时间']];
  accounts.forEach(function (a) {
    const ev = window.SH.Rules.evaluate(a, rules);
    rows.push([
      PLATFORM_META[state.platform].label, a.name || '', a.uniqueId || a.id, profileURL(state.platform, a), a.signature || '',
      fmtDate(a.followedAt), ev.metrics.followDays == null ? '' : ev.metrics.followDays, a.videoCountVerified === true && a.videoCount != null ? a.videoCount : '',
      a.followerCount == null ? '' : a.followerCount, fmtDate(a.lastPostAt), fmtDate(a.lastActiveAt || a.lastPostAt || a.lastDynamicAt),
      a.mutual == null ? '未提供' : a.mutual ? '是' : '否', a.special == null ? '未提供' : a.special ? '是' : '否',
      statusLabel(a.accountStatus), ev.score, ev.riskLabel, ev.reasons.map(function (r) { return r.label; }).join('；'),
      a.whitelist ? '是' : '否', a.note || '', a.following === false ? '否' : '是', fmtDate(a.unfollowedAt)
    ]);
  });
  return '\uFEFF' + rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
}

function buildHistoryCSV(records) {
  const rows = [['平台', '开始时间', '结束时间', '状态', '总数', '成功', '失败', '账号', '结果', '错误', '操作间隔(ms)', '每批数量']];
  records.forEach(function (c) {
    (c.results || []).forEach(function (r) {
      rows.push([PLATFORM_META[c.platform] ? PLATFORM_META[c.platform].label : c.platform, fmtDateTime(c.startedAt), fmtDateTime(c.endedAt), c.status, c.total, c.success, c.failed, r.name || r.id, r.ok ? '成功' : '失败', r.error || '', c.options ? c.options.intervalMs : '', c.options ? c.options.batchSize : '']);
    });
    if (!(c.results || []).length) rows.push([PLATFORM_META[c.platform] ? PLATFORM_META[c.platform].label : c.platform, fmtDateTime(c.startedAt), fmtDateTime(c.endedAt), c.status, c.total, c.success, c.failed, '', '', '', c.options ? c.options.intervalMs : '', c.options ? c.options.batchSize : '']);
  });
  return '\uFEFF' + rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
}

async function doExport(mode) {
  let accounts;
  if (mode === 'filtered') accounts = filteredAccounts();
  else if (mode === 'unfollowed') accounts = accountList().filter(function (a) { return a.following === false; });
  else accounts = followingAccounts();
  if (!accounts.length) { toast('没有可导出的账号', 'info'); return; }
  if (state.demo) {
    const csv = buildAccountsCSV(accounts, activeRules());
    downloadText('关注列表_' + (state.platform === 'bili' ? 'B站' : '抖音') + '_演示_' + new Date().toISOString().slice(0, 10) + '.csv', csv);
    toast('已导出 ' + accounts.length + ' 个账号（演示）', 'success');
    return;
  }
  try {
    const ids = accounts.map(function (a) { return a.id; });
    const apiMode = mode === 'unfollowed' ? 'unfollowed' : mode === 'following' ? 'following' : 'all';
    const res = await bridge.call('exportAccounts', state.platform, ids, apiMode);
    if (!res.canceled) toast('已导出 ' + res.count + ' 个账号', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

function exportCleanupRecord(record) {
  const csv = buildHistoryCSV([Object.assign({ platform: state.platform }, record)]);
  downloadText('清理记录_' + fmtDate(record.endedAt || Date.now()).replace(/\//g, '-') + '.csv', csv);
  toast('清理记录已导出', 'success');
}

function exportHistory() {
  const records = (activeHistory().cleanups || []).filter(function (c) { return c.platform === state.platform; });
  if (!records.length) { toast('当前没有可导出的清理记录', 'info'); return; }
  downloadText('清理记录_' + (state.platform === 'bili' ? 'B站' : '抖音') + '_' + new Date().toISOString().slice(0, 10) + '.csv', buildHistoryCSV(records));
  toast('清理记录已导出', 'success');
}

/* ------------------------------ Confirm -------------------------------- */
function openConfirm(opts) {
  state.modal = Object.assign({ type: 'confirm' }, opts);
  renderModal();
}

/* --------------------------- Form events ------------------------------- */
function markRulesDirty() {
  const chip = document.getElementById('rulesDirty');
  if (chip) { chip.className = 'chip amber'; chip.textContent = '有未保存修改'; }
}

function handleChange(target) {
  if (!target) return;
  if (target.id === 'filterRisk') { state.filters.risk = target.value; applyFilterChange(); return; }
  if (target.id === 'filterWorks') { state.filters.works = target.value; applyFilterChange(); return; }
  if (target.id === 'filterProfile') { state.filters.profile = target.value; applyFilterChange(); return; }
  if (target.id === 'filterCategory') { state.filters.category = target.value; applyFilterChange(); return; }
  if (target.id === 'filterSort') { state.filters.sort = target.value; state.page = 1; renderContent(); return; }
  if (target.id === 'pageSizeSelect') {
    if (target.value === 'custom') {
      state._pageSizeCustom = true;
      renderContent();
      setTimeout(function () { const input = document.getElementById('pageSizeInput'); if (input) { input.focus(); input.select(); } }, 40);
      return;
    }
    setDisplayPageSize(Number(target.value));
    return;
  }
  if (target.id === 'pageSizeInput') {
    setDisplayPageSize(target.value, true);
    return;
  }
  if (target.id === 'addConditionSelect') return;
  if (target.dataset.setting) {
    const path = target.dataset.setting;
    if (target.type === 'radio' && !target.checked) return;
    let value;
    if (target.type === 'number') value = Number(target.value);
    else if (target.type === 'checkbox') value = !!target.checked;
    else value = target.value;
    setPath(state.settingsDraft, path, value);
    const chip = document.getElementById('settingsDirty');
    if (chip) { chip.className = 'chip amber'; chip.textContent = '有未保存修改'; }
    return;
  }
  if (target.hasAttribute('data-rfield')) {
    const condition = state.ruleDraft && state.ruleDraft.conditions.find(function (c) { return c.id === target.dataset.cid; });
    if (!condition) return;
    const field = window.SH.Rules.FIELD_MAP[target.value];
    condition.field = target.value;
    condition.op = field.defaultOp;
    condition.value = field.type === 'boolean' ? '' : (field.placeholder != null ? field.placeholder : '');
    condition.value2 = '';
    markRulesDirty();
    renderContent();
    return;
  }
  if (target.hasAttribute('data-rop')) {
    const condition = state.ruleDraft && state.ruleDraft.conditions.find(function (c) { return c.id === target.dataset.cid; });
    if (!condition) return;
    condition.op = target.value;
    markRulesDirty();
    renderContent();
    return;
  }
  if (target.hasAttribute('data-rweight')) {
    const condition = state.ruleDraft && state.ruleDraft.conditions.find(function (c) { return c.id === target.dataset.cid; });
    if (!condition) return;
    condition.weight = Number(target.value) || 1;
    markRulesDirty();
    renderContent();
    return;
  }
  if (target.hasAttribute('data-renabled')) {
    const condition = state.ruleDraft && state.ruleDraft.conditions.find(function (c) { return c.id === target.dataset.cid; });
    if (!condition) return;
    condition.enabled = !!target.checked;
    markRulesDirty();
    renderContent();
    return;
  }
  if (target.dataset.scanMode) {
    if (!state.modal) return;
    state.modal.mode = target.value;
    renderModal();
    return;
  }
  if (target.id === 'scanForce') {
    if (state.modal) state.modal.force = target.checked;
    return;
  }
  if (target.id === 'cleanupAgree') {
    if (!state.modal) return;
    state.modal.agreed = target.checked;
    renderModal();
    return;
  }
  if (target.id === 'cleanupInterval' || target.id === 'cleanupBatch') {
    if (!state.modal) return;
    if (target.id === 'cleanupInterval') state.modal.options.intervalMs = Math.max(1200, Number(target.value) || 2200);
    else state.modal.options.batchSize = Math.max(1, Math.min(100, Number(target.value) || 20));
    return;
  }
}

function handleInput(target) {
  if (!target) return;
  if (target.id === 'searchInput') {
    state.filters.q = target.value;
    state.page = 1;
    if (state._searchTimer) clearTimeout(state._searchTimer);
    state._searchTimer = setTimeout(function () {
      renderContent();
      const el = document.getElementById('searchInput');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 220);
    return;
  }
  if (target.hasAttribute('data-rval') || target.hasAttribute('data-rval2')) {
    const condition = state.ruleDraft && state.ruleDraft.conditions.find(function (c) { return c.id === target.dataset.cid; });
    if (!condition) return;
    if (target.hasAttribute('data-rval')) condition.value = target.value;
    else condition.value2 = target.value;
    markRulesDirty();
    updateRulesLive();
    return;
  }
  if (target.id === 'ruleThreshold') {
    if (!state.ruleDraft) return;
    state.ruleDraft.suggestThreshold = Math.max(0, Math.min(100, Number(target.value) || 0));
    markRulesDirty();
    updateRulesLive();
    return;
  }
  if (target.id === 'scanDelayInput') {
    if (state.modal) state.modal.delay = Math.max(200, Number(target.value) || 600);
    return;
  }
}
