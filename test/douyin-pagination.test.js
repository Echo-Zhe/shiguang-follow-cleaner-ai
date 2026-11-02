"use strict";

const assert = require('assert');
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') {
    return { app: { getPath: function () { return ''; } }, BrowserWindow: function () {}, session: { fromPartition: function () { return null; } } };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { DouyinClient } = require('../src/main/douyin');

function makeAccount(index, followTime) {
  const suffix = String(index).padStart(6, '0');
  return {
    user: {
      sec_uid: 'MS4wLjABAAAAtest' + suffix,
      uid: String(100000 + index),
      nickname: index % 7 === 0 ? '用户' + (80000000 + index) : '测试账号 ' + index,
      signature: '测试简介',
      avatar_thumb: { url_list: ['https://example.com/a.jpg'] },
      aweme_count: index % 5 === 0 ? 0 : index,
      follower_status: 0
    },
    follow_time: followTime,
    is_ban: false
  };
}

function makeStore() {
  const accounts = new Map();
  return {
    accounts,
    getSettings() { return { douyin: { pageSize: 20 } }; },
    setConnection() {},
    getAccounts() { return Array.from(accounts.values()); },
    getAccount(platform, id) { return accounts.get(id) || null; },
    upsertAccounts(platform, items) {
      let added = 0;
      items.forEach(function (item) {
        if (!accounts.has(item.id)) added += 1;
        accounts.set(item.id, Object.assign({}, accounts.get(item.id) || {}, item));
      });
      return { added: added, updated: items.length - added };
    },
    patchAccount(platform, id, patch) {
      if (accounts.has(id)) accounts.set(id, Object.assign({}, accounts.get(id), patch));
    },
    markMissing() { return 0; },
    platform() { return { scan: this._scan || null, cleanup: {} }; },
    setScan(platform, scan) { this._scan = scan; },
    setCleanup() {}
  };
}

async function runPages(pages, label) {
  const store = makeStore();
  const calls = [];
  const client = new DouyinClient({ platform: 'douyin', store: store, emit: function () {}, session: null });
  client.getIdentity = async function () { return { secUid: 'MS4wLjABAAAAtest', uid: '1' }; };
  client.fetchFollowingPage = async function (options) {
    calls.push(Object.assign({}, options));
    const page = pages[calls.length - 1];
    if (!page) throw new Error(label + ': unexpected extra request ' + calls.length);
    return page;
  };
  const scan = { startedAt: Date.now(), status: 'scanning', phase: 'list', seenIds: [], scanned: 0, page: 0, failed: 0, enriched: 0, enrichQueue: [], enrichIndex: 0, enrichTotal: 0 };
  store._scan = scan;
  await client.performScan(scan, { enrichMode: 'none', requestDelayMs: 0, forceEnrich: false });
  return { scan: scan, calls: calls, store: store };
}

async function testContinuesBeyond21() {
  const pages = [
    { list: Array.from({ length: 20 }, function (_, i) { return makeAccount(i, 1700000000 - i); }), hasMore: true, total: 46, offset: 20, minTime: 1699999980 },
    { list: [makeAccount(20, 1699999979)], hasMore: true, total: 46, offset: 21, minTime: 1699999979 },
    { list: Array.from({ length: 20 }, function (_, i) { return makeAccount(21 + i, 1699999950 - i); }), hasMore: true, total: 46, offset: 41, minTime: 1699999930 },
    { list: Array.from({ length: 5 }, function (_, i) { return makeAccount(41 + i, 1699999900 - i); }), hasMore: false, total: 46, offset: 46, minTime: 1699999895 }
  ];
  const out = await runPages(pages, 'beyond21');
  assert.strictEqual(out.scan.seenIds.length, 46, 'should continue past account 21');
  assert.strictEqual(out.store.accounts.size, 46, 'all 46 accounts should be stored');
  assert.strictEqual(new Set(out.scan.seenIds).size, 46, 'no duplicate account ids');
  assert.strictEqual(out.scan.listDone, true, 'list should be marked complete');
  assert.strictEqual(out.calls[0].sourceType, 4, 'first request should use source_type 4');
  assert.strictEqual(out.calls[0].offset, 0, 'first request offset should be 0');
  assert.strictEqual(out.calls[1].offset, 20, 'second request should use returned cursor 20');
  assert.strictEqual(out.calls[2].offset, 21, 'third request should use returned cursor 21');
  assert.strictEqual(out.calls.length, 4, 'should make exactly four page requests');
  console.log('douyin-pagination.test.js: continues beyond 21 passed (' + out.scan.seenIds.length + ' accounts)');
}

async function testFullPageWithFalseHasMore() {
  const pages = [
    { list: Array.from({ length: 20 }, function (_, i) { return makeAccount(i, 1700000000 - i); }), hasMore: false, total: 40, offset: 20, minTime: 1699999980 },
    { list: Array.from({ length: 20 }, function (_, i) { return makeAccount(20 + i, 1699999970 - i); }), hasMore: false, total: 40, offset: 40, minTime: 1699999950 }
  ];
  const out = await runPages(pages, 'falseHasMore');
  assert.strictEqual(out.scan.seenIds.length, 40, 'full page with has_more=false should be rechecked and completed');
  assert.strictEqual(out.store.accounts.size, 40, 'all 40 accounts should be stored');
  assert.strictEqual(out.scan.listDone, true, 'list should be complete');
  console.log('douyin-pagination.test.js: full page with false has_more passed (' + out.scan.seenIds.length + ' accounts)');
}

async function testRequestParameters() {
  const client = new DouyinClient({ platform: 'douyin', store: makeStore(), emit: function () {}, session: null });
  client.getIdentity = async function () { return { secUid: 'MS4wLjABAAAAtest', uid: '1' }; };
  let captured = null;
  client.apiGet = async function (path, params) {
    captured = { path: path, params: params };
    return { json: { status_code: 0, followings: [], has_more: 0, offset: 20, total: 0 } };
  };
  const page = await client.fetchFollowingPage({ offset: 20, count: 20, sourceType: 4, maxTime: 0, minTime: 0 });
  assert.strictEqual(captured.path, '/aweme/v1/web/user/following/list/');
  assert.strictEqual(captured.params.source_type, 4, 'request must set source_type=4');
  assert.strictEqual(captured.params.offset, 20, 'request must send the cursor offset');
  assert.strictEqual(captured.params.count, 20, 'request must use page size 20');
  assert.strictEqual(captured.params.max_time, 0, 'offset mode should use max_time=0');
  assert.strictEqual(page.offset, 20);
  assert.strictEqual(page.hasMore, false);
  console.log('douyin-pagination.test.js: request parameters passed');
}

(async function () {
  await testContinuesBeyond21();
  await testRequestParameters();
  await testFullPageWithFalseHasMore();
  console.log('douyin-pagination.test.js: all assertions passed');
})().catch(function (error) {
  console.error(error);
  process.exit(1);
});
