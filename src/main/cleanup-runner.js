'use strict';

const { emptyCleanup } = require('./store');
const { PlatformError } = require('./base-client');

class CleanupRunner {
  constructor(opts) {
    this.platform = opts.platform;
    this.client = opts.client;
    this.store = opts.store;
    this.emit = opts.emit;
    this.running = false;
    this.paused = false;
    this.stopped = false;
    this.waiters = [];
    this.queue = [];
    this.index = 0;
    this.options = null;
    this.results = [];
    this.successCount = 0;
    this.failCount = 0;
  }

  get state() { return this.store.platform(this.platform).cleanup; }

  emitState(patch) {
    const next = Object.assign({}, this.state, patch || {});
    next.updatedAt = Date.now();
    this.store.setCleanup(this.platform, next);
    const publicState = Object.assign({}, next);
    delete publicState.queue;
    publicState.results = Array.isArray(next.results) ? next.results.slice(-200) : [];
    this.emit({ type: 'cleanup', platform: this.platform, state: publicState });
    return next;
  }

  releaseWaiters() {
    const list = this.waiters.splice(0);
    list.forEach(function (resolve) { resolve(); });
  }

  async waitIfPaused() {
    if (this.stopped) throw new PlatformError('STOPPED', '清理已停止');
    if (!this.paused) return;
    await new Promise((resolve) => { this.waiters.push(resolve); });
    if (this.stopped) throw new PlatformError('STOPPED', '清理已停止');
  }

  async sleep(ms) {
    if (this.stopped) throw new PlatformError('STOPPED', '清理已停止');
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        if (this.stopped) return resolve();
        if (Date.now() - start >= ms) return resolve();
        setTimeout(tick, Math.min(150, ms));
      };
      tick();
    });
  }

  async start(ids, options) {
    if (this.running) throw new PlatformError('BUSY', '清理任务已在运行中');
    options = options || {};
    const unique = Array.from(new Set((ids || []).map(String)));
    this.queue = unique;
    this.index = 0;
    this.options = {
      intervalMs: Math.max(1200, Number(options.intervalMs) || 2200),
      batchSize: Math.max(1, Math.min(100, Number(options.batchSize) || 20)),
      batchPauseMs: Math.max(0, Math.min(60000, Number(options.batchPauseMs) || 8000)),
      maxConsecutiveFailures: Math.max(1, Math.min(10, Number(options.maxConsecutiveFailures) || 2)),
      dryRun: !!options.dryRun
    };
    const cleanup = Object.assign(emptyCleanup(), {
      status: 'running',
      startedAt: Date.now(),
      total: unique.length,
      options: this.options,
      index: 0,
      current: '',
      error: '',
      results: []
    });
    this.results = [];
    this.successCount = 0;
    this.failCount = 0;
    this.store.beginBulk ? this.store.beginBulk() : null;
    this.store.setCleanup(this.platform, cleanup);
    this.emit({ type: 'cleanup', platform: this.platform, state: cleanup });
    this.running = true;
    this.paused = false;
    this.stopped = false;

    let consecutiveFailures = 0;
    try {
      for (this.index = 0; this.index < this.queue.length; this.index += 1) {
        if (this.stopped) break;
        await this.waitIfPaused();
        const id = this.queue[this.index];
        const account = this.store.getAccount(this.platform, id);
        if (!account || account.following === false || account.whitelist) {
          this.results.push({ id: id, name: account ? account.name : id, ok: false, skipped: true, error: '已跳过（已取关或白名单）', at: Date.now() });
          this.failCount += 1;
          this.emitState({
            done: this.index + 1,
            index: this.index + 1,
            failed: this.failCount,
            success: this.successCount,
            results: this.results
          });
          continue;
        }
        this.emitState({
          current: account.name || account.id,
          index: this.index,
          done: this.index,
          results: this.results
        });
        let result;
        try {
          if (this.options.dryRun) {
            result = { ok: true, dryRun: true };
          } else {
            result = await this.client.unfollowAccount(account);
          }
        } catch (e) {
          if (e && (e.code === 'RISK' || e.code === 'RISK_CONTROL')) {
            this.paused = true;
            this.emitState({
              status: 'paused',
              autoPaused: true,
              error: e.message || '平台要求验证，清理已自动暂停',
              current: account.name || account.id
            });
            this.emit({ type: 'cleanup-risk', platform: this.platform, error: e.message, account: { id: account.id, name: account.name } });
            this.client.showVerificationWindow && this.client.showVerificationWindow(e.detail);
            await this.waitIfPaused();
            consecutiveFailures = 0;
            this.index -= 1;
            continue;
          }
          if (e && e.code === 'NEED_LOGIN') throw e;
          result = { ok: false, error: (e && e.message) || '未知错误' };
        }

        const entry = {
          id: account.id,
          secUid: account.secUid || null,
          name: account.name,
          avatar: account.avatar || '',
          ok: !!(result && result.ok),
          error: result && result.error ? String(result.error) : '',
          dryRun: !!(result && result.dryRun),
          at: Date.now()
        };
        this.results.push(entry);
        if (entry.ok) {
          consecutiveFailures = 0;
          if (!this.options.dryRun) {
            this.store.patchAccount(this.platform, account.id, {
              following: false,
              unfollowedAt: Date.now(),
              lastAction: 'unfollow',
              lastActionAt: Date.now()
            });
          }
        } else {
          consecutiveFailures += 1;
        }
        if (entry.ok) this.successCount += 1; else this.failCount += 1;
        this.emitState({
          done: this.index + 1,
          index: this.index + 1,
          success: this.successCount,
          failed: this.failCount,
          current: account.name || account.id,
          results: this.results
        });
        this.emit({ type: 'cleanup-progress', platform: this.platform, entry: entry, index: this.index, total: this.queue.length });

        if (consecutiveFailures >= this.options.maxConsecutiveFailures) {
          this.paused = true;
          this.emitState({
            status: 'paused',
            autoPaused: true,
            error: '连续失败 ' + consecutiveFailures + ' 次，已自动暂停。请检查登录状态或平台限制。'
          });
          await this.waitIfPaused();
          consecutiveFailures = 0;
        }

        if (this.index + 1 < this.queue.length) {
          await this.sleep(this.options.intervalMs);
          if ((this.index + 1) % this.options.batchSize === 0) {
            this.emitState({ cooldownUntil: Date.now() + this.options.batchPauseMs });
            await this.sleep(this.options.batchPauseMs);
          }
        }
      }
      if (this.stopped) {
        this.emitState({ status: 'stopped', endedAt: Date.now(), error: '清理已停止' });
      } else {
        this.emitState({ status: 'completed', endedAt: Date.now(), error: '', current: '' });
      }
    } catch (e) {
      if (this.stopped || (e && e.code === 'STOPPED')) {
        this.emitState({ status: 'stopped', endedAt: Date.now(), error: '清理已停止' });
      } else if (e && e.code === 'NEED_LOGIN') {
        this.emitState({ status: 'paused', endedAt: Date.now(), error: '登录已失效，清理已暂停。请重新连接账号。' });
      } else {
        this.emitState({ status: 'error', endedAt: Date.now(), error: (e && e.message) || '清理发生未知错误' });
      }
    } finally {
      this.running = false;
      this.releaseWaiters();
      const finalState = this.state;
      this.store.addCleanupRecord({
        id: 'cleanup_' + Date.now(),
        platform: this.platform,
        startedAt: finalState.startedAt,
        endedAt: finalState.endedAt || Date.now(),
        status: finalState.status,
        total: finalState.total,
        success: this.successCount,
        failed: this.failCount,
        results: this.results.slice(-2000),
        resultsTruncated: this.results.length > 2000,
        options: finalState.options
      });
      if (this.store.endBulk) this.store.endBulk();
      const publicFinal = Object.assign({}, finalState);
      delete publicFinal.queue;
      publicFinal.results = Array.isArray(finalState.results) ? finalState.results.slice(-200) : [];
      this.emit({ type: 'cleanup-end', platform: this.platform, state: publicFinal });
    }
    return this.state;
  }

  pause() {
    if (!this.running) return this.state;
    this.paused = true;
    const next = this.emitState({ status: 'paused', error: '' });
    if (this.store.flush) this.store.flush();
    return next;
  }

  resume() {
    if (this.running) {
      this.paused = false;
      this.releaseWaiters();
      return this.emitState({ status: 'running', error: '', autoPaused: false });
    }
    return null;
  }

  stop() {
    this.stopped = true;
    this.paused = false;
    this.releaseWaiters();
    if (this.store.flush) this.store.flush();
    if (!this.running) {
      return this.emitState({ status: 'stopped', endedAt: Date.now(), error: '清理已停止' });
    }
    return this.emitState({ status: 'stopping' });
  }
}

module.exports = { CleanupRunner };
