'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store } = require('../src/main/store');
const Rules = require('../src/shared/rules');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-store-test-'));
const dataDir = path.join(tempRoot, 'data');

function makeAccount(id, name, overrides) {
  return Object.assign({
    id: id,
    platform: 'bili',
    name: name,
    following: true,
    followedAt: Date.now() - 100 * Rules.DAY,
    videoCount: 4,
    enrichedAt: Date.now(),
    accountStatus: 'normal'
  }, overrides || {});
}

try {
  const store = new Store(dataDir);
  store.init();
  assert.strictEqual(store.platform('bili').scan.status, 'idle');
  assert.ok(store.getSettings().bili.requestDelayMs >= 500);

  store.upsertAccounts('bili', [makeAccount('1', '甲'), makeAccount('2', '乙', { accountStatus: 'deleted' })]);
  assert.strictEqual(store.getAccounts('bili').length, 2);
  assert.strictEqual(store.stats('bili').total, 2);

  store.setWhitelist('bili', ['2'], true);
  assert.strictEqual(store.getAccount('bili', '2').whitelist, true);
  store.patchAccount('bili', '1', { note: '留着', starred: true });
  assert.strictEqual(store.getAccount('bili', '1').note, '留着');
  assert.strictEqual(store.getAccount('bili', '1').whitelist, true, 'starred account must be whitelisted');

  // A re-scan must preserve local-only fields.
  store.upsertAccounts('bili', [makeAccount('1', '甲改名'), makeAccount('3', '丙')]);
  assert.strictEqual(store.getAccount('bili', '1').whitelist, true, 'auto whitelist must survive rescan');
  assert.strictEqual(store.getAccount('bili', '1').note, '留着');
  assert.strictEqual(store.getAccount('bili', '1').name, '甲改名');
  assert.strictEqual(store.getAccount('bili', '2').whitelist, true);
  assert.strictEqual(store.stats('bili').total, 3);

  const missing = store.markMissing('bili', ['1', '3'], Date.now());
  assert.strictEqual(missing, 1);
  assert.strictEqual(store.getAccount('bili', '2').following, false);
  assert.ok(store.getAccount('bili', '2').unfollowedAt > 0);

  const rules = Rules.defaultRules('bili');
  rules.suggestThreshold = 61;
  const savedRules = store.setRules('bili', rules);
  assert.strictEqual(savedRules.suggestThreshold, 61);

  store.addScanRecord({ id: 'scan_1', platform: 'bili', startedAt: Date.now(), scanned: 3 });
  store.addCleanupRecord({ id: 'cleanup_1', platform: 'bili', total: 1, success: 1 });
  assert.strictEqual(store.getHistory().scans.length, 1);
  assert.strictEqual(store.getHistory().cleanups.length, 1);
  store.flush();

  const reloaded = new Store(dataDir);
  reloaded.init();
  assert.strictEqual(reloaded.getAccounts('bili').length, 3);
  assert.strictEqual(reloaded.getAccount('bili', '1').note, '留着');
  assert.strictEqual(reloaded.getAccount('bili', '2').following, false);
  assert.strictEqual(reloaded.platform('bili').rules.suggestThreshold, 61);
  assert.strictEqual(reloaded.getHistory().scans.length, 1);
  console.log('store.test.js: all assertions passed');
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}
