/* =========================================================================
 * Actions and demo simulation — loaded after app.js
 * ========================================================================= */
'use strict';

function enterDemo() {
  state.demo = true;
  state.visualFilters = new Set();
  state.listConditionsOpen = true;
  state._listConditionCache = null;
  state.demoData.bili = window.SHDemo.build('bili');
  state.demoData.douyin = window.SHDemo.build('douyin');
  state.demoHistory.bili = window.SHDemo.history('bili');
  state.demoHistory.douyin = window.SHDemo.history('douyin');
  state.demoCleanup = null;
  state.selection.clear();
  state.ruleDraft = null;
  state.ruleDraftPlatform = null;
  state.settingsDraft = null;
  state.page = 1;
  invalidateAccountCache();
  render();
  toast('已载入演示数据，所有取消关注都会在本地模拟', 'info');
}

function exitDemo() {
  state.demo = false;
  state.visualFilters = new Set();
  state.listConditionsOpen = true;
  state._listConditionCache = null;
  state.demoCleanup = null;
  state.demoPaused = false;
  if (state.demoCleanupTimer) clearTimeout(state.demoCleanupTimer);
  state.demoCleanupTimer = null;
  state.selection.clear();
  state.ruleDraft = null;
  state.ruleDraftPlatform = null;
  state.settingsDraft = null;
  state.page = 1;
  invalidateAccountCache();
  render();
  toast('已退出演示模式', 'info');
}

function startDemoCleanup(ids, options) {
  if (state.demoCleanupTimer) clearTimeout(state.demoCleanupTimer);
  const byId = new Map(accountList().map(function (a) { return [String(a.id), a]; }));
  const valid = ids.filter(function (id) {
    const a = byId.get(String(id));
    return a && a.following !== false && !a.whitelist;
  });
  state.demoCleanup = {
    status: 'running', startedAt: Date.now(), total: valid.length, done: 0, success: 0, failed: 0,
    current: '', error: '', results: [], options: options, queue: valid, index: 0
  };
  state.demoPaused = false;
  state.modal.step = 'running';
  renderModal();
  const tick = function () {
    const c = state.demoCleanup;
    if (!c || c.status !== 'running') return;
    if (state.demoPaused) { state.demoCleanupTimer = setTimeout(tick, 220); return; }
    if (c.index >= c.queue.length) {
      c.status = 'completed'; c.endedAt = Date.now(); c.current = '';
      if (state.demoHistory[state.platform]) {
        state.demoHistory[state.platform].cleanups.unshift({
          id: 'demo_cleanup_' + Date.now(), platform: state.platform, startedAt: c.startedAt, endedAt: c.endedAt,
          status: 'completed', total: c.total, success: c.success, failed: c.failed, results: c.results.slice(), options: c.options
        });
      }
      render();
      if (state.modal && state.modal.type === 'cleanup') renderModal();
      return;
    }
    const id = c.queue[c.index];
    const account = byId.get(String(id));
    c.current = account ? account.name : id;
    const fail = c.index > 0 && c.index % 9 === 7;
    const entry = { id: id, name: account ? account.name : id, avatar: account ? account.avatar : '', ok: !fail, error: fail ? '模拟：平台提示操作频繁' : '', at: Date.now() };
    c.results.push(entry);
    c.done += 1;
    if (fail) c.failed += 1;
    else {
      c.success += 1;
      if (account) { account.following = false; account.unfollowedAt = Date.now(); invalidateAccountCache(); }
    }
    c.index += 1;
    if (state.modal && state.modal.type === 'cleanup') updateCleanupModalLive(c);
    const wait = Math.max(260, Math.min(900, Number(options.intervalMs) / 4));
    state.demoCleanupTimer = setTimeout(tick, wait);
  };
  state.demoCleanupTimer = setTimeout(tick, 350);
}

function confirmSelectionScope(kind) {
  const selected = state.selection;
  let candidates = [];
  let title = '';
  let verb = '';
  if (kind === 'filtered') {
    if (!listConditionData().activeCount) { toast('请先在筛选变量中启用至少一个条件', 'warn'); return; }
    candidates = ruleMatchedAccounts();
    title = '全选所有（当前列表条件）';
    verb = '正选';
  } else if (kind === 'unmatched') {
    if (!listConditionData().activeCount) { toast('请先在筛选变量中启用至少一个条件', 'warn'); return; }
    candidates = ruleUnmatchedAccounts();
    title = '选择未命中列表条件';
    verb = '选择未筛选账号';
  } else if (kind === 'all') {
    candidates = followingAccounts();
    title = '选择全部关注账号';
    verb = '选择全部关注账号';
  } else if (kind === 'invert-filtered') {
    if (!listConditionData().activeCount) { toast('请先在筛选变量中启用至少一个条件', 'warn'); return; }
    candidates = ruleMatchedAccounts();
    title = '反选当前列表条件';
    verb = '反选';
  } else {
    return;
  }
  if (!candidates.length) { toast('当前范围内没有账号', 'info'); return; }
  const ids = candidates.map(function (a) { return String(a.id); });
  const selectedIn = ids.filter(function (id) { return selected.has(id); }).length;
  let after = new Set(selected);
  let message = '';
  if (kind === 'invert-filtered') {
    ids.forEach(function (id) { if (after.has(id)) after.delete(id); else after.add(id); });
    message = '当前筛选匹配 ' + fmtNum(ids.length) + ' 个账号，其中已选 ' + fmtNum(selectedIn) + ' 个。本次只在筛选结果内部反选：取消 ' + fmtNum(selectedIn) + ' 个、选中 ' + fmtNum(ids.length - selectedIn) + ' 个；筛选结果之外的已选账号保持不变。执行后全部已选 ' + fmtNum(after.size) + ' 个。这是跨页面操作。';
  } else {
    const added = ids.filter(function (id) { return !after.has(id); }).length;
    if (!added) { toast('当前范围内的账号已经全部选中', 'info'); return; }
    ids.forEach(function (id) { after.add(id); });
    message = '当前范围内有 ' + fmtNum(ids.length) + ' 个账号，其中已选 ' + fmtNum(selectedIn) + ' 个。本次将新增 ' + fmtNum(added) + ' 个，已有的选择保持不变；执行后全部已选 ' + fmtNum(after.size) + ' 个。这是跨页面操作，不会只影响当前页。';
  }
  openConfirm({
    title: title,
    message: message,
    confirmText: '确认' + verb + '（' + fmtNum(ids.length) + ' 个范围）',
    danger: false,
    onConfirm: function () {
      state.selection = after;
      renderContent();
      toast(title + '完成：全部已选 ' + fmtNum(after.size) + ' 个', 'success');
    }
  });
}

function handleAction(action, el, event) {
  switch (action) {
    case 'nav':
      navigate(el.dataset.view || 'overview');
      break;
    case 'switch-platform':
      switchPlatform(el.dataset.platform);
      break;
    case 'connect': {
      const platform = el.dataset.platform || state.platform;
      if (state.demo) exitDemo();
      openModal('connect', { platform: platform, status: 'waiting' });
      setTimeout(function () { beginConnect(platform); }, 150);
      break;
    }
    case 'connect-retry': {
      if (!state.modal) return;
      beginConnect(state.modal.platform);
      break;
    }
    case 'demo':
      enterDemo();
      break;
    case 'exit-demo':
      exitDemo();
      break;
    case 'scan': {
      if (state.demo) { toast('演示模式使用预置的扫描结果；退出演示后即可扫描真实账号', 'info'); return; }
      if (!isConnected()) {
        openModal('connect', { platform: state.platform, status: 'waiting' });
        setTimeout(function () { beginConnect(state.platform); }, 150);
        return;
      }
      const scan = currentScan();
      if (scan.status === 'scanning') { navigate('accounts'); return; }
      openModal('scan-options', {});
      break;
    }
    case 'start-scan': {
      const resume = el.dataset.resume === '1';
      startScan(resume);
      break;
    }
    case 'pause-scan':
      pauseScan();
      break;
    case 'resume-scan':
      resumeScan();
      break;
    case 'stop-scan':
      openConfirm({
        title: '停止扫描', message: '停止后，已读取和分析的数据会保留，但本次扫描不会继续。可以之后重新扫描。', confirmText: '停止扫描', danger: false,
        onConfirm: async function () {
          try { await bridge.call('scanStop', state.platform); toast('已停止扫描', 'info'); } catch (e) { toast(e.message, 'error'); }
          try { await loadPlatform(state.platform); } catch (e) {}
          render();
        }
      });
      break;
    case 'view-rule-results':
      if (rulesDirty()) { toast('请先保存筛选变量的修改，再查看筛选结果', 'warn'); return; }
      if (!enabledRuleCount()) { toast('请先添加并启用至少一个筛选变量', 'warn'); return; }
      state.listConditionsOpen = true;
      state.page = 1;
      navigate('accounts');
      break;
    case 'view-high-risk':
      state.filters = Object.assign(defaultFilters(), { risk: 'high' });
      state.page = 1;
      navigate('accounts');
      break;
    case 'quick-filter': {
      const q = el.dataset.quick;
      state.filters.risk = 'all';
      state.filters.suggestedOnly = false;
      state.filters.whitelist = 'all';
      if (q === 'high') state.filters.risk = 'high';
      if (q === 'suggested') state.filters.suggestedOnly = true;
      if (q === 'whitelist') state.filters.whitelist = 'only';
      applyFilterChange();
      break;
    }
    case 'sort-column': {
      const column = el.dataset.column;
      const pair = SORT_PAIRS[column];
      if (!pair) return;
      state.filters.sort = state.filters.sort === pair[0] ? pair[1] : pair[0];
      state.page = 1;
      renderContent();
      break;
    }
    case 'toggle-list-conditions-panel':
      state.listConditionsOpen = !state.listConditionsOpen;
      renderContent();
      break;
    case 'toggle-list-condition': {
      const id = el.dataset.id;
      if (!id) return;
      if (!state.visualFilters) state.visualFilters = new Set();
      if (state.visualFilters.has(id)) state.visualFilters.delete(id);
      else state.visualFilters.add(id);
      invalidateListConditionCache();
      const data = listConditionData();
      state.page = 1;
      state.filters.match = data.activeCount ? 'yes' : 'all';
      renderContent();
      toast(data.activeCount ? '列表条件已更新：' + fmtNum(data.activeCount) + ' 个启用，匹配 ' + fmtNum(data.matchSet.size) + ' 个' : '列表条件已重置，返回全部关注', 'info');
      break;
    }
    case 'reset-list-group': {
      const groupKey = el.dataset.group;
      const data = listConditionData();
      const group = data.groups.find(function (g) { return g.key === groupKey; });
      if (!group) return;
      if (!state.visualFilters) state.visualFilters = new Set();
      group.options.forEach(function (o) { state.visualFilters.delete(o.id); });
      invalidateListConditionCache();
      const next = listConditionData();
      state.page = 1;
      state.filters.match = next.activeCount ? 'yes' : 'all';
      renderContent();
      break;
    }
    case 'reset-list-conditions':
      state.visualFilters = new Set();
      state.filters = defaultFilters();
      state.page = 1;
      invalidateListConditionCache();
      renderContent();
      toast('列表条件已重置，当前显示全部关注', 'info');
      break;
    case 'enable-all-list-conditions': {
      const data = listConditionData();
      state.visualFilters = new Set(data.options.map(function (o) { return o.id; }));
      invalidateListConditionCache();
      state.page = 1;
      state.filters.match = 'yes';
      renderContent();
      break;
    }
    case 'disable-all-list-conditions':
      state.visualFilters = new Set();
      invalidateListConditionCache();
      state.page = 1;
      state.filters.match = 'all';
      renderContent();
      break;
    case 'clear-risk-filter':
      state.filters.risk = 'all';
      state.page = 1;
      renderContent();
      break;
    case 'clear-search':
      state.filters.q = '';
      state.page = 1;
      renderContent();
      break;
    case 'set-match-view': {
      const view = el.dataset.view === 'yes' ? 'yes' : el.dataset.view === 'no' ? 'no' : 'all';
      if (view !== 'all' && !listConditionData().activeCount) { toast('请先在列表条件中启用至少一个条件', 'warn'); return; }
      state.filters.match = view;
      state.page = 1;
      renderContent();
      break;
    }
    case 'clear-filters':
      state.filters = defaultFilters();
      state.page = 1;
      renderContent();
      break;
    case 'page':
      state.page = Math.max(1, Number(el.dataset.page) || 1);
      renderContent();
      break;
    case 'toggle-select': {
      const id = el.dataset.id;
      if (!id) return;
      if (state.selection.has(id)) state.selection.delete(id); else state.selection.add(id);
      updateSelectionUI();
      break;
    }
    case 'select-all-following':
      confirmSelectionScope('all');
      break;
    case 'select-filtered':
      confirmSelectionScope('filtered');
      break;
    case 'invert-filtered':
      confirmSelectionScope('invert-filtered');
      break;
    case 'select-unmatched':
      confirmSelectionScope('unmatched');
      break;
    case 'toggle-page': {
      const pageSize = currentPageSize();
      const rows = filteredAccounts().slice((state.page - 1) * pageSize, state.page * pageSize);
      if (!rows.length) return;
      const all = rows.every(function (a) { return state.selection.has(a.id); });
      if (all) rows.forEach(function (a) { state.selection.delete(a.id); });
      else rows.forEach(function (a) { state.selection.add(a.id); });
      renderContent();
      break;
    }
    case 'select-page': {
      const pageSize = currentPageSize();
      const rows = filteredAccounts().slice((state.page - 1) * pageSize, state.page * pageSize);
      if (!rows.length) return;
      const already = rows.filter(function (a) { return state.selection.has(a.id); }).length;
      rows.forEach(function (a) { state.selection.add(a.id); });
      renderContent();
      toast(already === rows.length ? '当前页已全选（' + fmtNum(rows.length) + ' 个）' : '已全选当前页 ' + fmtNum(rows.length) + ' 个；其他页面选择保留', 'success');
      break;
    }
    case 'invert-page': {
      const pageSize = currentPageSize();
      const rows = filteredAccounts().slice((state.page - 1) * pageSize, state.page * pageSize);
      if (!rows.length) return;
      rows.forEach(function (a) { if (state.selection.has(a.id)) state.selection.delete(a.id); else state.selection.add(a.id); });
      renderContent();
      break;
    }
    case 'clear-selection':
      state.selection.clear();
      updateSelectionUI();
      break;
    case 'bulk-whitelist':
      if (state.selection.size) bulkWhitelist(Array.from(state.selection));
      break;
    case 'bulk-cleanup': {
      if (!state.selection.size) { toast('请先选择要取消关注的账号', 'warn'); return; }
      openCleanup(Array.from(state.selection), { source: 'selection' });
      break;
    }
    case 'toggle-whitelist':
      toggleWhitelist(el.dataset.id);
      break;
    case 'toggle-star':
      toggleStar(el.dataset.id);
      break;
    case 'open-account':
      openModal('detail', { id: el.dataset.id });
      break;
    case 'detail-cleanup': {
      const id = el.dataset.id;
      closeModal();
      openCleanup([id], { source: 'detail' });
      break;
    }
    case 'open-profile': {
      const id = el.dataset.id;
      const account = accountList().find(function (a) { return String(a.id) === String(id); });
      if (!account) return;
      bridge.call('openExternal', profileURL(state.platform, account)).catch(function (e) { toast(e.message, 'error'); });
      break;
    }
    case 'save-note': {
      const noteEl = document.getElementById('detailNote');
      saveNote(el.dataset.id, noteEl ? noteEl.value : '');
      break;
    }
    case 'export-menu':
      openModal('export', {});
      break;
    case 'export-choice': {
      const mode = el.dataset.mode;
      closeModal();
      doExport(mode);
      break;
    }
    case 'export-all':
      doExport('all');
      break;
    case 'export-unfollowed':
      doExport('unfollowed');
      break;
    case 'export-history':
      exportHistory();
      break;
    case 'history-export': {
      const record = (activeHistory().cleanups || []).find(function (c) { return String(c.id) === String(el.dataset.id); });
      if (record) exportCleanupRecord(record);
      break;
    }
    case 'history-tab':
      state.historyTab = el.dataset.tab || 'cleanup';
      renderContent();
      break;
    case 'history-detail': {
      const record = (activeHistory().cleanups || []).find(function (c) { return String(c.id) === String(el.dataset.id); });
      if (record) openModal('history-detail', { record: record });
      break;
    }
    case 'set-logic':
      if (!state.ruleDraft) return;
      state.ruleDraft.logic = el.dataset.logic;
      renderContent();
      break;
    case 'preset':
      applyRulePreset(el.dataset.preset);
      break;
    case 'add-condition':
      addConditionFromSelect();
      break;
    case 'remove-condition':
      if (!state.ruleDraft) return;
      state.ruleDraft.conditions = state.ruleDraft.conditions.filter(function (c) { return c.id !== el.dataset.cid; });
      renderContent();
      break;
    case 'save-rules':
      saveRules();
      break;
    case 'reset-rules':
      openConfirm({
        title: '恢复默认规则', message: '当前未保存的条件组合会被替换为默认规则。点击“保存并应用”后才会写入本地。', confirmText: '恢复默认', danger: false,
        onConfirm: function () {
          state.ruleDraft = window.SH.Rules.defaultRules(state.platform);
          state.ruleDraftPlatform = state.platform;
          renderContent();
        }
      });
      break;
    case 'open-rules-help':
      openModal('rules-help', {});
      break;
    case 'save-settings':
      saveSettings();
      break;
    case 'disconnect': {
      const platform = el.dataset.platform || state.platform;
      if (state.demo) { exitDemo(); return; }
      openConfirm({
        title: '退出登录', message: '将清除本机保存的登录 Cookie。本地关注数据和分析结果会保留，但下次需要重新扫码登录。', confirmText: '退出登录', danger: true,
        onConfirm: async function () {
          try {
            await bridge.call('disconnect', platform, { clearSession: true });
            if (state.boot) state.boot.connections[platform] = null;
            if (state.data[platform]) state.data[platform].account = null;
            toast('已退出登录', 'info');
            render();
          } catch (e) { toast(e.message, 'error'); }
        }
      });
      break;
    }
    case 'clear-platform':
      if (state.demo) { toast('演示模式不会修改真实本地数据', 'info'); return; }
      openConfirm({
        title: '清除本地关注数据', message: '会删除当前平台扫描到的账号、规则和历史快照。登录状态会保留。此操作不会取消任何关注。', confirmText: '清除数据', danger: true,
        onConfirm: async function () {
          try {
            await bridge.call('clearPlatform', state.platform, { accounts: true });
            await loadPlatform(state.platform);
            state.selection.clear();
            toast('本地关注数据已清除', 'info');
            render();
          } catch (e) { toast(e.message, 'error'); }
        }
      });
      break;
    case 'clear-history':
      if (state.demo) {
        state.demoHistory[state.platform] = { cleanups: [], scans: [] };
        toast('演示记录已清空（不影响真实记录）', 'info');
        render();
        return;
      }
      openConfirm({
        title: '清除历史记录', message: '会清空扫描记录和清理记录，不影响当前关注列表缓存。', confirmText: '清除记录', danger: true,
        onConfirm: async function () {
          try {
            await bridge.call('clearAllHistory');
            if (state.boot) state.boot.history = { cleanups: [], scans: [] };
            toast('历史记录已清除', 'info');
            render();
          } catch (e) { toast(e.message, 'error'); }
        }
      });
      break;
    case 'open-data':
      bridge.call('openDataFolder').catch(function (e) { toast(e.message, 'error'); });
      break;
    case 'create-shortcut':
      bridge.call('createShortcut').then(function (res) {
        toast('桌面快捷方式已创建：' + res.path, 'success');
      }).catch(function (e) { toast(e.message, 'error'); });
      break;
    case 'reload':
      location.reload();
      break;
    case 'close-modal':
      closeModal();
      break;
    case 'confirm-yes': {
      const m = state.modal;
      closeModal();
      if (m && typeof m.onConfirm === 'function') {
        try { const result = m.onConfirm(); if (result && result.catch) result.catch(function (e) { toast(e.message, 'error'); }); } catch (e) { toast(e.message, 'error'); }
      }
      break;
    }
    case 'cleanup-pause':
      cleanupPause();
      break;
    case 'cleanup-resume':
      cleanupResume();
      break;
    case 'cleanup-stop':
      openConfirm({
        title: '停止清理', message: '已成功的账号不会回滚；未处理的账号会保留在关注列表中。确定停止本次清理吗？', confirmText: '停止清理', danger: true,
        onConfirm: function () { cleanupStop(); }
      });
      break;
    case 'cleanup-close':
      closeModal();
      state.selection.clear();
      if (state.demo) { render(); break; }
      loadPlatform(state.platform).then(function () { render(); }).catch(handleFatal);
      break;
    case 'cleanup-export': {
      if (state.demo) {
        const c = state.demoCleanup;
        if (!c) return;
        exportCleanupRecord({ id: 'current', startedAt: c.startedAt, endedAt: c.endedAt, total: c.total, success: c.success, failed: c.failed, results: c.results, options: c.options, platform: state.platform });
        return;
      }
      const recent = (activeHistory().cleanups || []).find(function (c) { return c.platform === state.platform; });
      if (recent) { exportCleanupRecord(recent); return; }
      const c = currentCleanup();
      if (!c) return;
      exportCleanupRecord({ id: 'current', startedAt: c.startedAt, endedAt: c.endedAt, total: c.total, success: c.success, failed: c.failed, results: c.results, options: c.options, platform: state.platform });
      break;
    }
    case 'start-cleanup':
      confirmStartCleanup();
      break;
    default:
      break;
  }
}
