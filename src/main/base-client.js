'use strict';

const { emptyScan } = require('./store');

class PlatformError extends Error {
  constructor(code, message, detail) {
    super(message || code);
    this.name = 'PlatformError';
    this.code = code;
    this.detail = detail || null;
  }
}

class BaseClient {
  constructor(opts) {
    this.platform = opts.platform;
    this.store = opts.store;
    this.session = opts.session;
    this.emit = opts.emit || function () {};
    this.getMainWindow = opts.getMainWindow || function () { return null; };
    this.scanRunning = false;
    this.scanPaused = false;
    this.scanStopped = false;
    this.scanWaiters = [];
    this.scanOptions = null;
    this.loginWindow = null;
    this.loginPromise = null;
    this.verifyWindow = null;
  }

  get scanState() { return this.store.platform(this.platform).scan; }

  publicScan(scan) {
    const publicState = Object.assign({}, scan || this.scanState);
    publicState.seenCount = (scan && scan.seenIds ? scan.seenIds.length : this.scanState.seenIds ? this.scanState.seenIds.length : 0);
    publicState.queueCount = (scan && scan.enrichQueue ? scan.enrichQueue.length : this.scanState.enrichQueue ? this.scanState.enrichQueue.length : 0);
    delete publicState.seenIds;
    delete publicState.enrichQueue;
    return publicState;
  }

  emitScan(patch) {
    const scan = Object.assign({}, this.scanState, patch || {});
    scan.updatedAt = Date.now();
    this.store.setScan(this.platform, scan);
    this.emit({ type: 'scan', platform: this.platform, state: this.publicScan(scan) });
    return scan;
  }

  emitCleanup(patch) {
    const cleanup = Object.assign({}, this.store.platform(this.platform).cleanup, patch || {});
    cleanup.updatedAt = Date.now();
    this.store.setCleanup(this.platform, cleanup);
    this.emit({ type: 'cleanup', platform: this.platform, state: cleanup });
    return cleanup;
  }

  emitToast(message, level) {
    this.emit({ type: 'toast', platform: this.platform, message: message, level: level || 'info' });
  }

  async startScan(options) {
    if (this.scanRunning) {
      throw new PlatformError('BUSY', '扫描任务已在运行中');
    }
    options = options || {};
    const existing = this.scanState;
    const resume = !!options.resume && existing && existing.phase !== 'idle' && existing.status === 'paused';
    this.scanOptions = {
      enrichMode: (function (requested) { return requested === 'none' ? 'activity' : (requested || 'activity'); })(options.enrichMode || (this.store.getSettings()[this.platform] || {}).enrichMode),
      requestDelayMs: Math.max(180, Number(options.requestDelayMs || (this.store.getSettings()[this.platform] || {}).requestDelayMs || 600)),
      forceEnrich: !!options.forceEnrich
    };
    let scan;
    if (resume) {
      scan = Object.assign({}, existing, {
        status: 'scanning', error: '', endedAt: null, riskPaused: false
      });
    } else {
      scan = Object.assign(emptyScan(), {
        status: 'scanning',
        phase: 'list',
        startedAt: Date.now(),
        mode: this.scanOptions.enrichMode,
        seenIds: [],
        enrichQueue: [],
        enrichIndex: 0,
        page: 0,
        scanned: 0,
        failed: 0,
        enriched: 0,
        total: null,
        listDone: false
      });
    }
    this.scanPaused = false;
    this.scanStopped = false;
    this.scanRunning = true;
    this.store.setScan(this.platform, scan);
    this.store.beginBulk ? this.store.beginBulk() : null;
    this.emit({ type: 'scan', platform: this.platform, state: this.publicScan(scan) });
    this.emit({ type: 'scan-start', platform: this.platform, state: this.publicScan(scan) });
    try {
      const result = await this.performScan(scan, this.scanOptions);
      if (this.scanStopped) {
        scan.status = 'stopped';
        scan.endedAt = Date.now();
        scan.error = '扫描已停止';
      } else {
        scan.status = 'completed';
        scan.phase = 'done';
        scan.endedAt = Date.now();
        scan.error = '';
        scan.current = '';
        this.store.setLastSummary(this.platform, result || {});
        this.store.addScanRecord({
          id: 'scan_' + Date.now(),
          platform: this.platform,
          startedAt: scan.startedAt,
          endedAt: scan.endedAt,
          total: scan.total,
          scanned: scan.scanned,
          enriched: scan.enriched,
          failed: scan.failed,
          mode: scan.mode,
          added: result ? result.added : 0,
          removed: result ? result.removed : 0,
          status: 'completed'
        });
      }
      this.store.setScan(this.platform, scan);
      this.emit({ type: 'scan', platform: this.platform, state: this.publicScan(scan) });
      this.emit({ type: 'scan-end', platform: this.platform, state: this.publicScan(scan) });
      return scan;
    } catch (e) {
      scan.endedAt = Date.now();
      if (this.scanStopped || (e && e.code === 'STOPPED')) {
        scan.status = 'stopped';
        scan.error = '扫描已停止';
      } else if (e && (e.code === 'RISK' || e.code === 'RISK_CONTROL')) {
        scan.status = 'paused';
        scan.riskPaused = true;
        scan.error = e.message || '平台要求安全验证，任务已自动暂停';
        this.scanPaused = true;
        this.showVerificationWindow(e.detail);
      } else if (e && e.code === 'NEED_LOGIN') {
        scan.status = 'error';
        scan.error = '登录已失效，请重新连接账号';
      } else {
        scan.status = 'error';
        scan.error = (e && e.message) || '扫描发生未知错误';
      }
      this.store.setScan(this.platform, scan);
      this.emit({ type: 'scan', platform: this.platform, state: this.publicScan(scan) });
      this.emit({ type: 'scan-end', platform: this.platform, state: this.publicScan(scan) });
      if (scan.status === 'error') {
        this.emit({ type: 'scan-error', platform: this.platform, state: scan, error: scan.error });
      }
      return scan;
    } finally {
      this.scanRunning = false;
      this.releaseScanWaiters();
      this.scanOptions = null;
      if (this.store.endBulk) this.store.endBulk();
    }
  }

  async performScan() {
    throw new Error('performScan must be implemented');
  }

  async runCleanup() {
    throw new Error('runCleanup must be implemented');
  }

  pauseScan() {
    if (!this.scanRunning) return this.scanState;
    this.scanPaused = true;
    const scan = this.emitScan({ status: 'paused', current: this.scanState.current });
    if (this.store.flush) this.store.flush();
    return scan;
  }

  async resumeScan() {
    if (this.scanRunning) {
      this.scanPaused = false;
      this.releaseScanWaiters();
      return this.emitScan({ status: 'scanning', error: '', riskPaused: false });
    }
    return this.startScan({ resume: true });
  }

  stopScan() {
    this.scanStopped = true;
    this.scanPaused = false;
    this.releaseScanWaiters();
    if (this.store.flush) this.store.flush();
    if (!this.scanRunning) {
      return this.emitScan({ status: 'stopped', error: '扫描已停止', endedAt: Date.now() });
    }
    return this.emitScan({ status: 'stopping' });
  }

  releaseScanWaiters() {
    const waiters = this.scanWaiters.splice(0);
    waiters.forEach(function (resolve) { resolve(); });
  }

  async waitIfPaused() {
    if (this.scanStopped) throw new PlatformError('STOPPED', '扫描已停止');
    if (!this.scanPaused) return;
    await new Promise((resolve) => { this.scanWaiters.push(resolve); });
    if (this.scanStopped) throw new PlatformError('STOPPED', '扫描已停止');
  }

  async sleep(ms) {
    if (this.scanStopped) throw new PlatformError('STOPPED', '扫描已停止');
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        if (this.scanStopped) return resolve();
        if (Date.now() - start >= ms) return resolve();
        this._sleepTimer = setTimeout(tick, Math.min(120, ms));
      };
      tick();
    });
  }

  showVerificationWindow() {
    // Platform clients may override this with a visible window.
  }

  async closeLoginWindow() {
    if (this.loginWindow && !this.loginWindow.isDestroyed()) {
      this.loginWindow.close();
    }
    this.loginWindow = null;
    this.loginPromise = null;
  }
}

module.exports = { BaseClient, PlatformError };
