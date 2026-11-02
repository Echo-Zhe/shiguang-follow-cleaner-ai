/* =========================================================================
 * Modal views — loaded after app.js
 * ========================================================================= */
'use strict';

function openModal(type, payload) {
  state.modal = Object.assign({ type: type }, payload || {});
  renderModal();
}

function closeModal() {
  state.modal = null;
  const root = document.getElementById('overlayRoot');
  if (root) root.innerHTML = '';
}

function renderModal() {
  const root = document.getElementById('overlayRoot');
  if (!root) return;
  if (!state.modal) { root.innerHTML = ''; return; }
  const type = state.modal.type;
  let html = '';
  if (type === 'connect') html = renderConnectModal();
  else if (type === 'scan-options') html = renderScanOptionsModal();
  else if (type === 'detail') html = renderDetailModal();
  else if (type === 'cleanup') html = renderCleanupModal();
  else if (type === 'confirm') html = renderConfirmModal();
  else if (type === 'history-detail') html = renderHistoryDetailModal();
  else if (type === 'export') html = renderExportModal();
  else if (type === 'rules-help') html = renderRulesHelpModal();
  root.innerHTML = html;
  bindImageFallbacks();
}

function modalShell(opts) {
  const drawer = opts.drawer;
  const wide = opts.wide ? ' wide' : opts.narrow ? ' narrow' : '';
  const overlayClass = drawer ? 'overlay drawer-overlay' : 'overlay';
  const box = drawer ? 'drawer' : 'modal' + wide;
  return `<div class="${overlayClass}" id="modalOverlay">
    <div class="${box}" role="dialog" aria-modal="true">
      ${drawer ? opts.content : `
        <div class="modal-head"><div><h2>${opts.title || ''}</h2>${opts.subtitle ? `<p>${opts.subtitle}</p>` : ''}</div><button class="modal-close" data-act="close-modal" title="关闭">${icon('close')}</button></div>
        <div class="modal-body">${opts.body || ''}</div>
        ${opts.footer ? `<div class="modal-foot ${opts.footerBetween ? 'between' : ''}">${opts.footer}</div>` : ''}
      `}
    </div>
  </div>`;
}

function renderConnectModal() {
  const m = state.modal;
  const meta = PLATFORM_META[m.platform || state.platform];
  const status = m.status || 'waiting';
  const isError = status === 'error';
  const isSuccess = status === 'success';
  const body = `<div class="connect-visual">
    <div class="connect-logo ${meta.cls}">${meta.cls === 'bili' ? 'B' : '抖'}</div>
    <h3>${isSuccess ? '连接成功' : isError ? '连接没有完成' : '在登录窗口中完成扫码'}</h3>
    <p>${isSuccess ? '账号已连接，可以开始扫描关注列表。' : isError ? esc(m.message || '请重试，或检查网络后再次登录。') : `已为你打开${meta.label}登录窗口。登录状态会保存在本机，下次尽量直接复用，不需要重复扫码。`}</p>
  </div>
  ${isSuccess ? `<div class="connect-wait" style="justify-content:center"><span class="conn-chip"><span class="dot"></span>${esc(m.accountName || '已连接')}</span></div>` : isError ? `<div class="alert danger">${icon('alert')}<div>${esc(m.message || '登录失败')}</div></div>` : `<div class="connect-wait"><span class="spinner"></span><div class="grow"><div class="t">等待登录完成…</div><div class="s">请不要关闭弹出的登录窗口。登录成功后此窗口会自动关闭。</div></div></div>`}
  <div class="connect-steps">
    <div class="connect-step"><div class="n">1</div><div class="t">打开登录</div><div class="s">内置浏览器已复用本机会话</div></div>
    <div class="connect-step"><div class="n">2</div><div class="t">扫码或验证</div><div class="s">按平台页面提示完成</div></div>
    <div class="connect-step"><div class="n">3</div><div class="t">自动识别</div><div class="s">成功后自动关闭登录窗口</div></div>
  </div>`;
  const footer = `<button class="btn btn-ghost" data-act="close-modal">${isSuccess ? '关闭' : '稍后再说'}</button>${isError ? `<button class="btn btn-primary" data-act="connect-retry">${icon('refresh')}重试连接</button>` : ''}`;
  return modalShell({ title: isSuccess ? '连接成功' : '连接' + meta.label, subtitle: '使用内置浏览器登录，登录态保存在本机', body: body, footer: footer, narrow: true });
}

async function beginConnect(platform) {
  if (state.demo) { state.demo = false; state.demoCleanup = null; state.demoPaused = false; }
  state.modal = { type: 'connect', platform: platform, status: 'waiting' };
  renderModal();
  try {
    const identity = await bridge.call('connect', platform);
    if (state.boot) state.boot.connections[platform] = identity;
    try { await loadPlatform(platform); } catch (e) { /* ignore */ }
    if (state.modal && state.modal.type === 'connect') {
      state.modal.status = 'success';
      state.modal.accountName = identity.name;
      renderModal();
      setTimeout(function () {
        if (state.modal && state.modal.type === 'connect' && state.modal.status === 'success') closeModal();
        render();
      }, 900);
    }
    toast(PLATFORM_META[platform].label + '连接成功', 'success');
  } catch (e) {
    if (!state.modal || state.modal.type !== 'connect') {
      if (e.code !== 'CANCELLED') toast(e.message, 'error');
      return;
    }
    state.modal.status = 'error';
    state.modal.message = e.code === 'CANCELLED' ? '已取消登录。你可以稍后重新连接。' : (e.message || '连接失败');
    renderModal();
    if (e.code !== 'CANCELLED') toast(e.message, 'error');
  }
}

function renderScanOptionsModal() {
  const m = state.modal;
  const settings = state.boot.settings;
  const scan = currentScan();
  if (scan.status === 'paused') {
    return modalShell({
      title: '继续上次扫描', subtitle: '扫描进度和已读取的数据已保存', narrow: true,
      body: `<div class="alert info">${icon('info')}<div>上次扫描停在「${esc(scanPhaseLabel(scan))}」。预计已读取 ${fmtNum(scan.scanned)} 个关注账号${scan.riskPaused ? '，平台要求完成安全验证' : ''}。继续后会从上次位置接着进行，不会重新读取已完成的账号。</div></div>${scan.riskPaused ? `<div class="alert warn mt-12">${icon('alert')}<div>请先在打开的平台验证窗口中完成滑块或安全验证，然后点击继续。</div></div>` : ''}`,
      footer: `<button class="btn btn-ghost" data-act="close-modal">取消</button><button class="btn btn-primary" data-act="start-scan" data-resume="1">${icon('play')}继续扫描</button>`
    });
  }
  const mode = m.mode || (settings[state.platform] && settings[state.platform].enrichMode) || 'deep';
  const delay = m.delay || (settings[state.platform] && settings[state.platform].requestDelayMs) || 600;
  const total = totalFollowing();
  const est = mode === 'activity' ? Math.max(1, Math.ceil(total * 0.7 / 60)) : Math.max(1, Math.ceil(total * 1.25 / 60));
  const body = `<div class="alert info">${icon('info')}<div>扫描会先读取完整关注列表，再逐个分析账号。任务在本地执行，可随时暂停；已读取的数据会随时保存。</div></div>
    <div class="radio-cards" style="margin-top:14px">
      <label class="radio-card"><input type="radio" name="scanMode" data-scan-mode value="activity" ${mode === 'activity' ? 'checked' : ''}><div class="rc-title"><span class="dot"></span>完整核验</div><div class="rc-desc">同步核验作品、关系、资料、状态、粉丝等全部变量</div></label>
      <label class="radio-card"><input type="radio" name="scanMode" data-scan-mode value="deep" ${mode === 'deep' ? 'checked' : ''}><div class="rc-title"><span class="dot"></span>完整核验 + 动态</div><div class="rc-desc">在完整核验基础上额外读取最近动态</div></label>
    </div>
    <div class="option-grid mt-12">
      <div class="field"><label>每个账号的请求间隔</label><div class="row gap-6"><input class="input" id="scanDelayInput" type="number" min="200" step="50" value="${Number(delay) || 600}"><span class="input-unit">毫秒</span></div></div>
      <div class="field"><label>已有分析</label><label class="row gap-6" style="height:33px;font-size:10.5px;color:var(--ink-2)"><input type="checkbox" id="scanForce" ${m.force ? 'checked' : ''} style="accent-color:var(--jade)">强制重新分析全部账号</label></div>
    </div>
    <div class="warn-list"><div class="alert warn">${icon('alert')}<div>预计耗时约 ${est} 分钟，具体取决于账号数量与平台响应。请求间隔过短更容易触发平台安全验证。</div></div><div class="alert">${icon('lock')}<div>关注的账号越多，扫描越久。分析失败不会影响关注列表本身；网络失败不会被判定为封禁或注销，可以之后补扫。</div></div></div>`;
  return modalShell({
    title: '扫描关注列表', subtitle: total ? `当前平台有 ${fmtNum(total)} 个关注账号` : '连接并完成第一次扫描', wide: true, body: body,
    footer: `<button class="btn btn-ghost" data-act="close-modal">取消</button><button class="btn btn-primary" data-act="start-scan">${icon('scan')}开始扫描</button>`
  });
}

function renderDetailModal() {
  const id = state.modal.id;
  const account = accountList().find(function (a) { return String(a.id) === String(id); });
  if (!account) return modalShell({ title: '账号详情', body: '<div class="empty-state"><h3>账号不存在</h3><p>可能已被清理或数据已更新。</p></div>', footer: '<button class="btn" data-act="close-modal">关闭</button>', narrow: true });
  const ev = window.SH.Rules.evaluate(account, activeRules());
  const metrics = ev.metrics;
  const priority = ev.priority || { hits: [], labels: [], reasons: [] };
  const color = riskColor(ev.risk);
  const lastActive = account.lastActiveAt || account.lastPostAt || account.lastDynamicAt;
  const reasons = ev.reasons;
  const content = `
    <div class="drawer-head"><div class="row between"><div class="row gap-8"><span class="chip ${account.whitelist ? 'jade' : 'line'}">${account.whitelist ? '白名单保护' : '关注中'}</span>${account.starred ? '<span class="chip amber">值得保留</span>' : ''}</div><button class="modal-close" data-act="close-modal" title="关闭">${icon('close')}</button></div></div>
    <div class="drawer-body">
      <div class="detail-hero">
        <div class="detail-person">${avatarHTML(account, 'rounded')}<div style="min-width:0"><div class="detail-name">${esc(account.name || '未命名账号')}<span class="badge ${ev.risk === 'high' ? 'rose' : ev.risk === 'medium' ? 'amber' : 'jade'}">${ev.riskLabel}</span></div><div class="detail-id">${esc(account.uniqueId || account.id)} · ${PLATFORM_META[state.platform].label}</div></div></div>
        <div class="detail-bio">${esc(account.signature || '这个人还没有填写简介。')}</div>
        <div class="detail-score-row">
          <div class="detail-score"><span class="v" style="color:${color}">${ev.score}</span><span class="u">/100</span></div>
          <div class="detail-score-meta">清理优先级<br><span style="color:${color};font-weight:650">${ev.riskLabel}</span> · 数据完整度 ${ev.confidence}%</div>
          <div class="detail-actions-row"><button class="btn btn-sm ${account.whitelist ? 'btn-soft' : ''}" data-act="toggle-whitelist" data-id="${attr(account.id)}">${icon('shieldCheck')}${account.whitelist ? '已在白名单' : '加入白名单'}</button><button class="btn btn-sm ${account.starred ? 'btn-soft' : ''}" data-act="toggle-star" data-id="${attr(account.id)}">${icon('star')}${account.starred ? '已标记' : '值得保留'}</button></div>
        </div>
      </div>

      ${priority.hits.length ? `<div class="section-title">重点识别</div>
      <div class="priority-detail">
        <div class="priority-detail-head">${priority.labels.map(function (label) { return `<span class="priority-badge ${/封禁|注销/.test(label) ? 'rose' : /昵称/.test(label) ? 'amber' : 'slate'}">${esc(label)}</span>`; }).join('')}<span class="small muted">系统只根据平台状态、明确昵称特征和已采集资料判断</span></div>
        <div class="reason-list">${priority.reasons.map(function (r) { return `<div class="reason-item" style="border-color:#eadfdf;background:#fdfafa"><span class="r-dot"></span><span class="r-label">${esc(r)}</span></div>`; }).join('')}</div>
      </div>` : `<div class="section-title">重点识别</div><div class="alert">${icon('check')}<div>当前数据中没有命中封禁、注销、异常昵称或零作品等重点条件。若状态数据尚未采集，请使用深度分析补充。</div></div>`}
      <div class="section-title">账号资料</div>
      <div class="meta-grid">
        <div class="meta-item"><div class="meta-label">关注时间</div><div class="meta-value">${fmtDate(account.followedAt)}</div><div class="meta-label" style="margin-top:2px">${followDuration(metrics.followDays)}</div></div>
        <div class="meta-item"><div class="meta-label">作品数量</div><div class="meta-value">${account.videoCountVerified === true ? (account.videoCount == null ? '暂无数据' : fmtNum(account.videoCount) + ' 个') : '待核验'}</div><div class="meta-label" style="margin-top:2px">${account.videoCountVerified === true ? (account.videoCount === 0 ? '没有发布作品' : '公开作品') : '尚未核验，不参与清理'}</div></div>
        <div class="meta-item"><div class="meta-label">粉丝数量</div><div class="meta-value">${account.followerCount == null ? '暂无数据' : fmtNum(account.followerCount)}</div></div>
        <div class="meta-item"><div class="meta-label">账号等级 / 分类</div><div class="meta-value">${account.level != null ? 'Lv.' + account.level : '—'}${account.category ? ' · ' + esc(account.category) : ''}</div></div>
        <div class="meta-item"><div class="meta-label">最近更新</div><div class="meta-value">${account.lastPostAt ? ago(account.lastPostAt) : '暂无数据'}</div><div class="meta-label" style="margin-top:2px">${account.lastPostAt ? fmtDate(account.lastPostAt) : '—'}</div></div>
        <div class="meta-item"><div class="meta-label">最近活跃</div><div class="meta-value">${lastActive ? ago(lastActive) : '暂无数据'}</div><div class="meta-label" style="margin-top:2px">${lastActive ? fmtDate(lastActive) : '—'}</div></div>
        ${account.lastDynamicAt ? `<div class="meta-item"><div class="meta-label">最近动态</div><div class="meta-value">${ago(account.lastDynamicAt)}</div><div class="meta-label" style="margin-top:2px">${fmtDate(account.lastDynamicAt)}</div></div>` : ''}
        <div class="meta-item"><div class="meta-label">互相关注</div><div class="meta-value">${account.mutual == null ? '平台未提供' : account.mutual ? '是' : '否'}</div></div>
        <div class="meta-item"><div class="meta-label">特别关注</div><div class="meta-value">${account.special == null ? '平台未提供' : account.special ? '是' : '否'}</div></div>
        <div class="meta-item"><div class="meta-label">账号状态</div><div class="meta-value">${statusLabel(account.accountStatus)}</div><div class="meta-label" style="margin-top:2px">${esc(account.accountStatusNote || '')}</div></div>
        <div class="meta-item"><div class="meta-label">平均更新间隔</div><div class="meta-value">${account.updateFrequencyDays == null ? '暂无数据' : account.updateFrequencyDays + ' 天'}</div></div>
      </div>

      <div class="section-title">最近轨迹</div>
      <div class="timeline">
        <div class="timeline-item"><span class="timeline-dot active"></span><div><div class="timeline-t">关注了这个账号</div><div class="timeline-s">${fmtDateTime(account.followedAt)} · ${followDuration(metrics.followDays)}</div></div></div>
        <div class="timeline-item"><span class="timeline-dot active"></span><div><div class="timeline-t">${account.lastPostAt ? '最近一次发布作品' : '没有公开作品'}</div><div class="timeline-s">${account.lastPostAt ? fmtDateTime(account.lastPostAt) + ' · ' + ago(account.lastPostAt) : '暂无数据'}</div></div></div>
        <div class="timeline-item"><span class="timeline-dot"></span><div><div class="timeline-t">最近一次活跃</div><div class="timeline-s">${lastActive ? fmtDateTime(lastActive) + ' · ' + ago(lastActive) : '平台没有提供足够的活跃信息'}</div></div></div>
      </div>

      <div class="section-title">命中的清理信号</div>
      ${reasons.length ? `<div class="reason-list">${reasons.map(function (r) { return `<div class="reason-item"><span class="r-dot"></span><span class="r-label">${esc(r.label)}</span><span class="r-weight">权重 ${r.weight}</span></div>`; }).join('')}</div>` : `<div class="alert">${icon('info')}<div>当前规则没有命中这个账号。它可能仍然值得保留，或者需要调整筛选条件。</div></div>`}
      <div class="small muted mt-8" style="line-height:1.65">${esc(account.interactionNote || '平台没有提供逐账号的互动明细。这里的“互动”只包含可公开获取的互关、特别关注等关系信号。')}</div>

      <div class="section-title">我的备注</div>
      <textarea class="note-area" id="detailNote" placeholder="记下为什么想保留或清理它，仅保存在本机…">${esc(account.note || '')}</textarea>
      <div class="row between mt-8"><span class="xsmall muted">备注不会同步到平台</span><button class="btn btn-sm" data-act="save-note" data-id="${attr(account.id)}">${icon('check')}保存备注</button></div>
      ${account.enrichError || account.profileError || account.postError ? `<div class="alert warn mt-12">${icon('alert')}<div>部分数据未取到：${esc(account.enrichError || account.profileError || account.postError)}</div></div>` : ''}
    </div>
    <div class="drawer-foot"><button class="btn btn-danger" data-act="detail-cleanup" data-id="${attr(account.id)}" ${account.whitelist ? 'disabled title="请先移出白名单"' : ''}>${icon('broom')}取消关注这个账号</button><button class="btn" data-act="open-profile" data-id="${attr(account.id)}">${icon('external')}打开主页</button><div class="grow"></div><button class="btn btn-ghost" data-act="close-modal">关闭</button></div>`;
  return `<div class="overlay drawer-overlay" id="modalOverlay"><div class="drawer" role="dialog" aria-modal="true">${content}</div></div>`;
}

function renderConfirmModal() {
  const m = state.modal;
  return modalShell({
    title: m.title || '请确认', subtitle: m.subtitle || '', narrow: true,
    body: `<div class="alert ${m.danger ? 'danger' : 'info'}">${icon(m.danger ? 'alert' : 'info')}<div>${m.message || ''}</div></div>`,
    footer: `<button class="btn btn-ghost" data-act="close-modal">${esc(m.cancelText || '取消')}</button><button class="btn ${m.danger ? 'btn-danger' : 'btn-primary'}" data-act="confirm-yes">${esc(m.confirmText || '确认')}</button>`
  });
}

function renderCleanupModal() {
  const m = state.modal;
  const cleanup = state.demo ? state.demoCleanup : currentCleanup();
  if (m.step === 'confirm' || !cleanup || cleanup.status === 'idle') return renderCleanupConfirm();
  return renderCleanupProgress(cleanup);
}

function renderCleanupConfirm() {
  const m = state.modal;
  const ids = m.ids || [];
  const total = followingAccounts().length;
  const byId = new Map(accountList().map(function (a) { return [String(a.id), a]; }));
  const accounts = ids.map(function (id) { return byId.get(String(id)); }).filter(Boolean);
  const whitelisted = accounts.filter(function (a) { return a.whitelist; }).length;
  const valid = accounts.filter(function (a) { return !a.whitelist && a.following !== false; });
  const risks = { high: 0, medium: 0, low: 0 };
  valid.forEach(function (a) { const e = window.SH.Rules.evaluate(a, activeRules()); risks[e.risk] = (risks[e.risk] || 0) + 1; });
  const preview = valid.slice(0, 6).map(function (a) { return `<div class="cleanup-preview-row">${avatarHTML(a)}<span class="nm">${esc(a.name)}</span><span class="rk">${window.SH.Rules.evaluate(a, activeRules()).riskLabel}</span></div>`; }).join('');
  const options = m.options || ((state.boot.settings && state.boot.settings.cleanup) || { intervalMs: 2200, batchSize: 20, batchPauseMs: 8000, maxConsecutiveFailures: 2 });
  return modalShell({
    title: state.demo ? '模拟批量取消关注' : '批量取消关注',
    subtitle: '请再次确认。取消关注后账号会从关注列表移除，平台侧操作无法在这里撤回。',
    wide: true,
    body: `<div class="cleanup-audit">
      ${m.sourceMode === 'selection' ? `<div><span>关注总数</span><b>${fmtNum(m.totalCount || total)}</b></div><div><span>筛选匹配</span><b>${fmtNum(m.filterCount || 0)}</b></div>` : `<div><span>来源</span><b>单个账号详情</b></div><div><span>关注总数</span><b>${fmtNum(total)}</b></div>`}
      <div><span>已选择</span><b>${fmtNum(m.selectedCount || valid.length)}</b></div>
      <div class="emphasis"><span>本次实际执行</span><b>${fmtNum(valid.length)}</b></div>
    </div>
    ${m.sourceMode === 'selection' ? `<div class="cleanup-scope-note">已选 ${fmtNum(m.selectedCount || valid.length)} 个：其中 ${fmtNum(m.inMatch || 0)} 个属于当前筛选匹配${Math.max(0, (m.selectedCount || 0) - (m.inMatch || 0)) ? '，' + fmtNum(Math.max(0, (m.selectedCount || 0) - (m.inMatch || 0))) + ' 个不属于' : ''}。取消关注处理的是已选账号，不受当前筛选结果限制。</div>` : ''}
    <div class="cleanup-summary">
      <div class="cleanup-count-card"><div class="eyebrow">即将处理</div><div class="big">${fmtNum(valid.length)}<small>个账号</small></div><div class="sub">高风险 ${risks.high} · 中风险 ${risks.medium} · 低风险 ${risks.low}${(m.whitelistExcluded || whitelisted) ? ' · 白名单已排除 ' + fmtNum(m.whitelistExcluded || whitelisted) + ' 个' : ''}</div></div>
      <div class="cleanup-preview"><div class="cleanup-preview-title"><span>账号预览</span><span>${valid.length > 6 ? '前 6 个 / 共 ' + valid.length + ' 个' : '全部'}</span></div><div class="cleanup-preview-list">${preview || '<div class="small muted">没有可处理的账号</div>'}</div></div>
    </div>
    <details class="cleanup-list-details">
      <summary>查看本次准备执行的账号名单${valid.length > 200 ? '（前 200 个，共 ' + fmtNum(valid.length) + ' 个）' : '（共 ' + fmtNum(valid.length) + ' 个）'}</summary>
      <div class="cleanup-full-list">${valid.slice(0, 200).map(function (a) { return `<div class="cleanup-full-row">${avatarHTML(a)}<span class="nm">${esc(a.name || a.id)}</span><span class="rk">${window.SH.Rules.evaluate(a, activeRules()).riskLabel}</span></div>`; }).join('')}</div>
    </details>
    <div class="section-title">执行节奏</div>
    <div class="option-grid">
      <div class="field"><label>每次操作间隔（毫秒）</label><input class="input" id="cleanupInterval" type="number" min="1200" step="100" value="${options.intervalMs}" style="width:100%"></div>
      <div class="field"><label>每批数量</label><input class="input" id="cleanupBatch" type="number" min="1" max="100" value="${options.batchSize}" style="width:100%"></div>
    </div>
    ${m.truncated ? `<div class="alert warn mt-12">${icon('alert')}<div>本次选中的账号超过单次安全上限 ${MAX_CLEANUP_PER_RUN} 个。为避免长时间运行与平台风控，本次先处理前 ${fmtNum(valid.length)} 个，剩余 ${fmtNum(m.truncated)} 个可在下次继续。</div></div>` : ''}
    <div class="warn-list">
      ${state.demo ? `<div class="alert warn">${icon('info')}<div><strong>当前是演示模式。</strong>点击开始后只会模拟进度与结果，不会向抖音或 B站发送任何取消关注请求。</div></div>` : `<div class="alert warn">${icon('alert')}<div>取消关注是不可自动撤销的平台操作。请确认列表中没有误选重要账号；你可以先取消选择或加入白名单。</div></div>`}
      <div class="alert">${icon('shieldCheck')}<div>执行中会实时显示成功、失败和平台限制状态。遇到安全验证会自动暂停，已成功的账号不会重复处理。</div></div>
    </div>
    ${valid.length ? `<label class="confirm-box"><input type="checkbox" id="cleanupAgree" ${m.agreed ? 'checked' : ''}><span class="t">我已检查以上 ${valid.length} 个账号，并确认<b>取消关注</b>。我知道平台侧操作无法由本工具自动恢复，需要重新关注。</span></label>` : `<div class="alert danger">${icon('alert')}<div>选中的账号都被白名单保护或已不再关注，不能执行清理。</div></div>`}
    ${m.error ? `<div class="alert danger mt-12">${icon('alert')}<div>${esc(m.error)}</div></div>` : ''}`,
    footer: `<div class="foot-note">${valid.length ? '预计耗时约 ' + Math.max(1, Math.ceil(valid.length * Math.max(1.2, options.intervalMs / 1000) / 60)) + ' 分钟' : ''}</div><button class="btn btn-ghost" data-act="close-modal">取消</button><button class="btn btn-danger" data-act="start-cleanup" ${(!m.agreed || !valid.length) ? 'disabled' : ''}>${icon(state.demo ? 'play' : 'broom')}${state.demo ? '开始模拟清理' : '确认取消关注 ' + valid.length + ' 个'}</button>`
  });
}

function renderCleanupProgress(cleanup) {
  const total = Number(cleanup.total) || 0;
  const done = Number(cleanup.done) || 0;
  const pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;
  const results = cleanup.results || [];
  const success = cleanup.success != null ? Number(cleanup.success) : results.filter(function (r) { return r.ok; }).length;
  const failed = cleanup.failed != null ? Number(cleanup.failed) : results.filter(function (r) { return !r.ok; }).length;
  const status = cleanup.status;
  if (state.modal) state.modal._cleanupStatus = status;
  const finished = status === 'completed' || status === 'stopped' || status === 'error';
  if (finished) {
    const title = status === 'completed' ? '清理完成' : status === 'stopped' ? '清理已停止' : '清理中断';
    return modalShell({
      title: title, subtitle: status === 'completed' ? '本次清理的账号已记录在本地历史中' : '未处理的账号不会被标记为已取关',
      body: `<div class="done-icon">${icon(status === 'completed' ? 'check' : status === 'stopped' ? 'stop' : 'alert')}</div>
        <div class="progress-hero"><div class="phase">${state.demo ? '演示模拟结果' : (status === 'completed' ? '所有选中账号已处理' : '任务未全部完成')}</div><div class="current">${esc(cleanup.error || (status === 'completed' ? '可以回到关注列表查看最新状态。' : ''))}</div></div>
        <div class="done-stats"><div class="done-stat"><div class="v" style="color:var(--jade)">${fmtNum(success)}</div><div class="l">成功</div></div><div class="done-stat"><div class="v" style="color:var(--rose)">${fmtNum(failed)}</div><div class="l">失败</div></div><div class="done-stat"><div class="v">${fmtNum(cleanup.total)}</div><div class="l">本次选择</div></div></div>
        <div class="result-table">${results.slice(-20).map(function (r) { return `<div class="result-row">${avatarHTML(r)}<span class="nm">${esc(r.name || r.id)}</span><span class="st ${r.ok ? 'ok' : 'fail'}">${r.ok ? '已取消关注' : '失败'}</span></div>`; }).join('') || '<div class="result-row"><span class="nm">没有产生处理结果</span></div>'}</div>
        ${cleanup.error ? `<div class="alert ${status === 'completed' ? 'info' : 'warn'} mt-12">${icon('info')}<div>${esc(cleanup.error)}</div></div>` : ''}`,
      footer: `<button class="btn" data-act="cleanup-export">${icon('download')}导出本次结果</button><div class="grow"></div><button class="btn btn-primary" data-act="cleanup-close">完成</button>`
    });
  }
  const statusText = status === 'paused' ? (cleanup.autoPaused ? '已自动暂停' : '已暂停') : status === 'stopping' ? '正在停止…' : '正在取消关注';
  return modalShell({
    title: statusText, subtitle: state.demo ? '演示模式 · 正在本地模拟' : '请保持软件运行，建议不要关闭网络',
    body: `<div class="progress-hero"><div class="pct" data-cleanup-pct>${pct}<small>%</small></div><div class="phase">${statusText}</div><div class="current" data-cleanup-current>${esc(cleanup.current || '准备中…')}</div></div>
      <div class="progress-line"><span data-cleanup-progress style="width:${pct}%"></span></div>
      <div class="progress-counts"><div class="progress-count"><div class="v"><span data-cleanup-done>${done} / ${total}</span></div><div class="l">已处理</div></div><div class="progress-count"><div class="v jade" data-cleanup-success>${success}</div><div class="l">成功</div></div><div class="progress-count"><div class="v rose" data-cleanup-failed>${failed}</div><div class="l">失败</div></div></div>
      ${cleanup.error ? `<div class="alert warn">${icon('alert')}<div>${esc(cleanup.error)}</div></div>` : ''}
      <div class="progress-log" data-cleanup-log>${results.slice(-7).reverse().map(function (r) { return `<div class="progress-log-row">${icon(r.ok ? 'check' : 'alert')}<span class="nm">${esc(r.name || r.id)}</span><span class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '成功' : '失败'}</span></div>`; }).join('') || '<div class="progress-log-row"><span class="nm">准备开始处理…</span></div>'}</div>
      <div class="alert mt-12">${icon('shieldCheck')}<div>遇到平台限制或安全验证会自动暂停。暂停后会保留已成功的账号，继续时不会重复操作。</div></div>`,
    footer: `<button class="btn btn-ghost" data-act="cleanup-stop">${icon('stop')}停止</button><div class="grow"></div>${status === 'paused' ? `<button class="btn btn-jade" data-act="cleanup-resume">${icon('play')}继续清理</button>` : `<button class="btn" data-act="cleanup-pause" ${status === 'stopping' ? 'disabled' : ''}>${icon('pause')}暂停</button>`}`
  });
}

function renderHistoryDetailModal() {
  const m = state.modal;
  const record = m.record;
  if (!record) return modalShell({ title: '清理详情', body: '<div class="small muted">记录不存在</div>', footer: '<button class="btn" data-act="close-modal">关闭</button>', narrow: true });
  const results = record.results || [];
  return modalShell({
    title: '清理详情', subtitle: fmtDateTime(record.endedAt || record.startedAt) + ' · ' + (record.status === 'completed' ? '已完成' : '未完成'),
    body: `<div class="cleanup-summary"><div class="cleanup-count-card"><div class="eyebrow">本次处理</div><div class="big">${fmtNum(record.total)}<small>个账号</small></div><div class="sub">成功 ${fmtNum(record.success != null ? record.success : results.filter(function (r) { return r.ok; }).length)} · 失败 ${fmtNum(record.failed != null ? record.failed : results.filter(function (r) { return !r.ok; }).length)}</div></div><div class="cleanup-preview"><div class="cleanup-preview-title"><span>操作参数</span></div><div class="small muted" style="line-height:1.8">操作间隔：${record.options ? (record.options.intervalMs / 1000).toFixed(1) : '—'} 秒<br>每批数量：${record.options ? record.options.batchSize : '—'} 个<br>状态：${record.status === 'completed' ? '完成' : esc(record.status || '未知')}</div></div></div>
    <div class="section-title">账号结果</div>
    ${results.length > 500 ? `<div class="alert info mb-12">${icon('info')}<div>本次共有 ${fmtNum(results.length)} 条结果，详情窗口显示最近 500 条。完整结果请导出 CSV。</div></div>` : ''}
    <div class="result-table" style="max-height:320px">${results.slice(-500).map(function (r) { return `<div class="result-row">${avatarHTML(r)}<span class="nm">${esc(r.name || r.id)}</span><span class="small muted">${r.error ? esc(r.error) : ''}</span><span class="st ${r.ok ? 'ok' : 'fail'}">${r.ok ? '成功' : '失败'}</span></div>`; }).join('')}</div>`,
    footer: `<button class="btn" data-act="history-export" data-id="${attr(record.id)}">${icon('download')}导出</button><div class="grow"></div><button class="btn btn-primary" data-act="close-modal">关闭</button>`
  });
}

function renderExportModal() {
  return modalShell({
    title: '导出数据', subtitle: 'CSV 使用 UTF-8 BOM，Excel 可以直接打开', narrow: true,
    body: `<div class="reason-list">
      <button class="preset-card" data-act="export-choice" data-mode="following" style="text-align:left"><div class="pt">${icon('users')}当前关注列表</div><div class="ps">包含资料、关注时间、活跃度、评分与命中条件</div></button>
      <button class="preset-card" data-act="export-choice" data-mode="filtered" style="text-align:left"><div class="pt">${icon('filter')}当前筛选结果</div><div class="ps">只导出当前搜索和筛选条件下看到的账号</div></button>
      <button class="preset-card" data-act="export-choice" data-mode="unfollowed" style="text-align:left"><div class="pt">${icon('history')}已取消关注</div><div class="ps">包含取消关注时间，方便避免重复处理</div></button>
    </div>`,
    footer: `<button class="btn btn-ghost" data-act="close-modal">取消</button>`
  });
}

function renderRulesHelpModal() {
  return modalShell({
    title: '怎么设置规则', subtitle: '先从保守的组合开始，再逐步调整', wide: true,
    body: `<div class="alert info">${icon('info')}<div><strong>AND / OR：</strong>“同时满足”更严格，适合明确的高风险特征；“任一满足”更宽，适合先做一次全面检查。两种模式都可以配合评分阈值使用。</div></div>
    <div class="section-title">推荐思路</div>
    <div class="reason-list">
      <div class="reason-item" style="border-color:var(--line);background:var(--surface-soft)"><span class="r-dot" style="background:var(--jade)"></span><span class="r-label"><b>长期停更：</b>关注超过 365 天 + 最近 180 天没有活跃。两个条件同时满足再建议清理。</span></div>
      <div class="reason-item" style="border-color:var(--line);background:var(--surface-soft)"><span class="r-dot" style="background:var(--jade)"></span><span class="r-label"><b>低互动：</b>未互关 + 关注超过一年 + 最近 90 天没有更新。适合清理“单向关注且早已不活跃”的账号。</span></div>
      <div class="reason-item" style="border-color:var(--line);background:var(--surface-soft)"><span class="r-dot" style="background:var(--jade)"></span><span class="r-label"><b>三无账号：</b>无头像 + 简介为空 + 没有作品。建议只作为检查线索，不要单独作为僵尸号结论。</span></div>
    </div>
    <div class="alert warn mt-12">${icon('alert')}<div>“没有头像 / 没有简介 / 没有作品”都是低权重弱信号。把它们放在“同时满足”里可以降低误判，但仍需人工打开账号详情确认。评分只决定检查顺序，不直接等于取消关注。</div></div>`,
    footer: `<button class="btn btn-primary" data-act="close-modal">知道了</button>`
  });
}
