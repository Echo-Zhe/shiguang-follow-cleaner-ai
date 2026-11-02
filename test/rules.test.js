'use strict';

const assert = require('assert');
const Rules = require('../src/shared/rules');

function account(overrides) {
  const now = Date.now();
  return Object.assign({
    id: '1001',
    platform: 'bili',
    name: '测试账号',
    following: true,
    avatar: 'https://i0.hdslb.com/bfs/face/abc.jpg',
    signature: '这是简介',
    followedAt: now - 400 * Rules.DAY,
    lastPostAt: now - 200 * Rules.DAY,
    videoCount: 0,
    videoCountVerified: true,
    mutual: false,
    special: false,
    accountStatus: 'normal',
    followerCount: 1234,
    level: 4,
    updateFrequencyDays: 10,
    whitelist: false
  }, overrides || {});
}

function testMetrics() {
  const metrics = Rules.getMetrics(account(), Date.now());
  assert.strictEqual(metrics.noAvatar, false);
  assert.strictEqual(metrics.emptyBio, false);
  assert.strictEqual(metrics.noWorks, true);
  const unknown = Rules.getMetrics(account({ videoCount: 2, videoCountVerified: false }), Date.now());
  assert.strictEqual(unknown.videoCount, null, 'unverified works count must not enter rules');
  assert.strictEqual(unknown.noWorks, false, 'unverified works count must not become noWorks');
  assert.strictEqual(metrics.accountBanned, false);
  assert.strictEqual(metrics.accountDeleted, false);
  assert.strictEqual(metrics.abnormalNickname, false);
  assert.strictEqual(metrics.notMutual, true);
  assert.ok(metrics.followDays >= 399);
  assert.ok(metrics.lastActiveDays >= 199);
}

function testDefaultEvaluation() {
  const rules = Rules.defaultRules('bili');
  const result = Rules.evaluate(account(), rules, Date.now());
  assert.ok(result.score > 0, 'score should be positive');
  assert.ok(result.reasons.some(r => r.field === 'followDays'));
  assert.ok(result.reasons.some(r => r.field === 'lastActiveDays'));
  assert.ok(result.reasons.some(r => r.field === 'notMutual'));
  assert.strictEqual(result.match, true);
  assert.strictEqual(result.suggested, true);
}

function testAndLogic() {
  const rules = Rules.defaultRules('bili');
  rules.logic = 'all';
  const result = Rules.evaluate(account(), rules, Date.now());
  // accountAbnormal is false, so AND cannot match.
  assert.strictEqual(result.match, false);
  rules.conditions = rules.conditions.filter(c => ['followDays', 'lastActiveDays'].includes(c.field));
  const result2 = Rules.evaluate(account(), rules, Date.now());
  assert.strictEqual(result2.match, true);
  assert.strictEqual(result2.score, 100);
}

function testWeights() {
  const rules = {
    logic: 'any', suggestThreshold: 55, highThreshold: 70, mediumThreshold: 40,
    conditions: [
      Rules.makeCondition('followDays', { op: 'gt', value: 365, weight: 1 }),
      Rules.makeCondition('accountAbnormal', { weight: 5, enabled: false })
    ]
  };
  const result = Rules.evaluate(account(), rules, Date.now());
  assert.strictEqual(result.weights.total, 1);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.risk, 'high');
}

function testWhitelistNotSuggested() {
  const rules = Rules.defaultRules('bili');
  const result = Rules.evaluate(account({ whitelist: true }), rules, Date.now());
  assert.strictEqual(result.suggested, false);
}

function testUnknownInteraction() {
  const rules = {
    logic: 'all', suggestThreshold: 55, highThreshold: 70, mediumThreshold: 40,
    conditions: [Rules.makeCondition('notMutual', { weight: 3 })]
  };
  const result = Rules.evaluate(account({ mutual: null }), rules, Date.now());
  assert.strictEqual(result.match, false);
  assert.strictEqual(result.confidence, 0);
}

function testNormalize() {
  const normalized = Rules.normalizeRules({
    logic: 'nonsense',
    suggestThreshold: 120,
    conditions: [{ field: 'videoCount', op: 'lt', value: 3, weight: 99, enabled: true }]
  }, 'douyin');
  assert.strictEqual(normalized.logic, 'any');
  assert.strictEqual(normalized.suggestThreshold, 100);
  assert.strictEqual(normalized.conditions.length, 1);
  assert.strictEqual(normalized.conditions[0].weight, 5);
}

function testBooleanAvatar() {
  const rules = Rules.defaultRules('bili');
  rules.logic = 'all';
  rules.conditions = [Rules.makeCondition('noAvatar', { weight: 2 })];
  let result = Rules.evaluate(account({ avatar: '' }), rules, Date.now());
  assert.strictEqual(result.match, true);
  result = Rules.evaluate(account({ avatar: '' , hasAvatar: false }), rules, Date.now());
  assert.strictEqual(result.risk, 'high');
}

function testPriorityDetection() {
  let p = Rules.getPriority({ name: '正常账号', accountStatus: 'banned', videoCount: 0, avatar: 'https://x/a.jpg', signature: 'x' });
  assert.strictEqual(p.banned, true, 'platform banned should be detected');
  assert.strictEqual(p.zeroWorks, true, 'known zero works should be detected');
  assert.ok(p.hits.includes('banned') && p.hits.includes('zeroWorks'));

  p = Rules.getPriority({ name: '用户12345678', accountStatus: 'normal', videoCount: 2, avatar: 'https://x/a.jpg', signature: 'x' });
  assert.strictEqual(p.abnormalNickname, true, '用户+数字 should be abnormal');
  assert.strictEqual(p.deleted, false, 'abnormal nickname alone is not deleted');

  p = Rules.getPriority({ name: '账号已封禁', accountStatus: 'normal', videoCount: 3, avatar: 'https://x/a.jpg', signature: 'x' });
  assert.strictEqual(p.banned, true, 'banned nickname should classify banned');
  assert.strictEqual(p.deleted, false, 'banned nickname must not classify deleted');

  p = Rules.getPriority({ name: '注销用户123', accountStatus: 'normal', videoCount: 3, avatar: 'https://x/a.jpg', signature: 'x' });
  assert.strictEqual(p.deleted, true, 'deleted nickname should be classified as deleted');
  assert.strictEqual(p.abnormalNickname, true, 'deleted nickname is also abnormal');
  assert.ok(p.hits.includes('deleted') && p.hits.includes('abnormalNickname'));

  p = Rules.getPriority({ name: '12345678', accountStatus: 'normal', videoCount: 2, avatar: 'https://x/a.jpg', signature: '正常简介', mutual: true });
  assert.strictEqual(p.abnormalNickname, false, 'numeric name alone must not be abnormal');
  p = Rules.getPriority({ name: '12345678', accountStatus: 'normal', videoCount: 2, avatar: '', signature: '', mutual: false });
  assert.strictEqual(p.abnormalNickname, true, 'numeric name with multiple weak signals can be abnormal');

  p = Rules.getPriority({ name: '正常账号', accountStatus: 'normal', videoCount: null, avatar: 'https://x/a.jpg', signature: 'x' });
  assert.strictEqual(p.zeroWorks, false, 'unknown work count must not be zero');

  p = Rules.getPriority({ name: '正常账号', accountStatus: 'deleted', videoCount: 0, avatar: 'https://x/a.jpg', signature: 'x' });
  assert.strictEqual(p.deleted, true);
  assert.strictEqual(p.zeroWorks, true);

  const evaluated = Rules.evaluate(account({ name: '用户12345678', videoCount: 0 }), Rules.defaultRules('bili'), Date.now());
  assert.ok(evaluated.priority && evaluated.priority.abnormalNickname);

  const p1 = Rules.getPriority({ name: '用户12345678', accountStatus: 'normal', videoCount: 0, avatar: '', signature: '', mutual: false });
  const p2 = Rules.getPriority({ name: '普通昵称', accountStatus: 'normal', videoCount: 0, avatar: 'https://x/a.jpg', signature: '简介', mutual: true });
  const p3 = Rules.getPriority({ name: '用户99999999', accountStatus: 'normal', videoCount: 2, avatar: 'https://x/a.jpg', signature: '简介', mutual: true });
  assert.strictEqual(Rules.matchesPriority(p1, ['zeroWorks', 'abnormalNickname'], 'all'), true, 'account matching both should pass AND');
  assert.strictEqual(Rules.matchesPriority(p2, ['zeroWorks', 'abnormalNickname'], 'all'), false, 'account matching only one should fail AND');
  assert.strictEqual(Rules.matchesPriority(p2, ['zeroWorks', 'abnormalNickname'], 'any'), true, 'account matching one should pass OR');
  assert.strictEqual(Rules.matchesPriority(p3, ['zeroWorks', 'abnormalNickname'], 'any'), true, 'abnormal nickname alone should pass OR');
  assert.strictEqual(Rules.matchesPriority(p3, ['zeroWorks', 'abnormalNickname'], 'all'), false, 'zero works must be required in AND');

  const counts = Rules.getPriorityCounts([
    { name: '用户12345678', accountStatus: 'normal', videoCount: 0, avatar: 'https://x/a.jpg', signature: 'x', _eval: { priority: Rules.getPriority({ name: '用户12345678', accountStatus: 'normal', videoCount: 0, avatar: 'https://x/a.jpg', signature: 'x' }) } },
    { name: '正常', accountStatus: 'banned', videoCount: 2, avatar: 'https://x/a.jpg', signature: 'x', _eval: { priority: Rules.getPriority({ name: '正常', accountStatus: 'banned', videoCount: 2, avatar: 'https://x/a.jpg', signature: 'x' }) } }
  ]);
  assert.strictEqual(counts.abnormalNickname, 1);
  assert.strictEqual(counts.banned, 1);
  assert.strictEqual(counts.zeroWorks, 1);
}

function testPriorityRuleVariables() {
  const accountData = account({ name: '用户12345678', accountStatus: 'banned', videoCount: 0, avatar: '', signature: '', mutual: false });
  const rules = {
    logic: 'all', suggestThreshold: 55, highThreshold: 70, mediumThreshold: 40,
    conditions: [
      Rules.makeCondition('accountBanned', { weight: 5 }),
      Rules.makeCondition('abnormalNickname', { weight: 3 }),
      Rules.makeCondition('noWorks', { weight: 2 })
    ]
  };
  const result = Rules.evaluate(accountData, rules, Date.now());
  assert.strictEqual(result.match, true, 'priority variables should be usable as hard conditions');
  assert.strictEqual(result.results.every(r => r.matched), true);
  rules.conditions = [Rules.makeCondition('accountDeleted', { weight: 5 })];
  assert.strictEqual(Rules.evaluate(accountData, rules, Date.now()).match, false, 'deleted must not match a banned account');
}

testMetrics();
testDefaultEvaluation();
testAndLogic();
testWeights();
testWhitelistNotSuggested();
testUnknownInteraction();
testNormalize();
testBooleanAvatar();
testPriorityDetection();
testPriorityRuleVariables();
console.log('rules.test.js: all assertions passed');
