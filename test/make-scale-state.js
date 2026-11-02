'use strict';

const fs = require('fs');
const path = require('path');
const { Store } = require('../src/main/store');
const Rules = require('../src/shared/rules');

const root = path.join(__dirname, '..', 'scale-data');
const dataDir = path.join(root, 'data');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
const store = new Store(dataDir);
store.init();

const now = Date.now();
const categories = ['影视', '游戏', '生活', '数码', '美食', '知识', '音乐', '旅行'];
const accounts = [];
for (let i = 0; i < 10000; i += 1) {
  const followDays = 30 + (i * 37) % 2200;
  const videoCount = i % 7 === 0 ? 0 : (i % 120);
  const lastPostDays = i % 11 === 0 ? 500 + (i % 300) : 1 + (i % 240);
  accounts.push({
    id: String(100000000 + i),
    mid: String(100000000 + i),
    platform: 'bili',
    name: '规模测试账号 ' + String(i + 1).padStart(5, '0'),
    avatar: i % 13 === 0 ? '' : 'https://i0.hdslb.com/bfs/face/scale-test-' + i + '.jpg',
    hasAvatar: i % 13 !== 0,
    signature: i % 9 === 0 ? '' : '这是第 ' + i + ' 个规模测试账号的简介。',
    uniqueId: 'scale_' + i,
    followedAt: now - followDays * 86400000,
    mutual: i % 5 === 0,
    special: i % 17 === 0,
    followerCount: (i * 91) % 900000,
    videoCount: videoCount,
    lastPostAt: videoCount === 0 ? null : now - lastPostDays * 86400000,
    lastDynamicAt: null,
    lastActiveAt: videoCount === 0 ? null : now - lastPostDays * 86400000,
    updateFrequencyDays: videoCount > 1 ? (i % 40) + 1 : null,
    level: (i % 6) + 1,
    category: categories[i % categories.length],
    accountStatus: i % 499 === 0 ? 'deleted' : (i % 701 === 0 ? 'banned' : 'normal'),
    accountStatusNote: '',
    official: i % 211 === 0 ? '测试认证' : '',
    following: true,
    whitelist: i % 331 === 0,
    starred: false,
    note: '',
    interactionKnown: false,
    relationshipKnown: true,
    source: 'scale-test',
    enrichedAt: now - Math.floor(Math.random() * 7) * 86400000
  });
}
store.upsertAccounts('bili', accounts);
store.setConnection('bili', { id: '90000001', mid: '90000001', platform: 'bili', name: '规模测试账号', avatar: '', connectedAt: now });
const rules = Rules.defaultRules('bili');
store.setRules('bili', rules);
store.setScan('bili', {
  status: 'completed', phase: 'done', startedAt: now - 3600000, endedAt: now - 1800000,
  total: 10000, scanned: 10000, enriched: 9990, enrichTotal: 10000, failed: 10,
  page: 200, listDone: true, current: '', error: '', mode: 'activity', seenCount: 10000
});
store.setLastSummary('bili', { added: 240, removed: 80, total: 10000, scanned: 10000, enriched: 9990, failed: 10, finishedAt: now - 1800000 });
store.flush();
const size = fs.statSync(path.join(dataDir, 'app-state.json')).size;
console.log('scale state created', dataDir, 'accounts=10000', 'jsonMB=' + (size / 1048576).toFixed(2));
