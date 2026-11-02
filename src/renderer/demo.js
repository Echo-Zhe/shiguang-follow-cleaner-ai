(function (global) {
  'use strict';

  const NOW = Date.now();
  const DAY = 86400000;
  const BILI_NAMES = [
    '深夜放映厅', '阿岚的厨房', '老周聊数码', '林间有风', '胶片研究所', '用户84736291',
    '量子布丁', '注销用户12345', '13749205', '白噪音档案', '半糖去冰', '木木手作',
    '城南旧事', '甜品试验室', '猫叔钓鱼', '像素诗人', '慢速公路', '一页设计',
    '山与海', '星期六乐队', '小满Vlog', '橘猫观察局', '宇宙便利店', '纸飞机电台',
    '雨停之后', '野草计划', '旧城Walk', '一颗青梅', '空白频道', '路过的厨师'
  ];
  const DY_NAMES = [
    '楼下小馆', '阿哲不加班', '一只阿圆', '老陈修表', '用户59201837', '八点档剧场',
    '小北的相机', '木星便利店', '周末去哪', '阿梨的衣柜', '大橘为重', '深夜面条',
    '南风知我意', '程序员老K', '小城咖啡', '阿布旅行', '赵师傅说车', '一只咸鱼',
    '晴天收纳', '球场老六', '天天想下班', '飞盘俱乐部', '慢慢读书', '小鹿穿搭',
    '阿汤跑步', '老物件收藏'
  ];
  const TAGS = ['影视', '美食', '数码', '生活', '摄影', '旅行', '游戏', '读书', '音乐', '手工', '萌宠', '设计', '运动', '汽车', '穿搭'];
  const BIOS = [
    '把喜欢的故事慢慢讲完。',
    '一人食，也要认真吃饭。',
    '不追热点，只聊好用的东西。',
    '记录风经过的地方。',
    '胶片、咖啡和下午四点。',
    '普通生活里的微小闪光。',
    '做饭、拍照、发一点呆。',
    '不定期更新，随缘相见。',
    '一个认真生活的人。',
    '',
    '在城市的缝隙里散步。',
    '分享让我开心的东西。',
    '安静地做点小东西。',
    '今天也要好好休息。',
    '偶尔上线，偶尔消失。'
  ];
  const OFFICIALS = ['', '', '', '', '知名UP主', '', '', 'bilibili 认证用户', '', ''];

  const FOLLOW_DAYS = [820, 540, 1300, 70, 400, 980, 210, 1500, 45, 700, 360, 980, 88, 1150, 620, 290, 75, 510, 860, 1800, 140, 430, 760, 330, 1050, 55, 690, 240, 1120, 470];
  const LAST_POST_DAYS = [260, 12, 610, 3, 95, 420, 45, 800, 1, 180, 20, 365, 4, 500, 15, 230, 2, 90, 300, 950, 7, 60, 140, 30, 420, 10, 270, 5, 380, 21];
  const VIDEO_COUNTS = [0, 1, 12, 86, 3, 0, 5, 0, 142, 9, 45, 2, 68, 0, 33, 7, 120, 16, 4, 0, 58, 11, 22, 6, 0, 75, 3, 18, 1, 40];
  const NO_AVATAR = new Set([2, 4, 8, 9, 17, 23, 27]);
  const NO_BIO = new Set([3, 4, 8, 9, 12, 17, 23, 28]);
  const MUTUAL = new Set([2, 6, 13, 21, 25]);
  const SPECIAL = new Set([2, 13, 20, 25]);
  const WHITELIST = new Set([4, 16]);
  const STARRED = new Set([2, 13]);
  const ABNORMAL = { 7: 'deleted', 18: 'inaccessible', 27: 'banned', 10: 'inaccessible' };
  const STATUS_NOTES = {
    deleted: '账号已注销或空间不存在',
    inaccessible: '账号空间暂时无法访问',
    banned: '账号处于封禁或限制状态'
  };

  function hueFor(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return hash % 360;
  }

  function makeAvatar(name, hue) {
    const ch = name.slice(0, 1);
    const h2 = (hue + 38) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hue} 55% 56%)"/>
        <stop offset="1" stop-color="hsl(${h2} 48% 35%)"/>
      </linearGradient></defs>
      <rect width="120" height="120" fill="url(#g)"/>
      <circle cx="96" cy="22" r="32" fill="rgba(255,255,255,.12)"/>
      <circle cx="18" cy="105" r="24" fill="rgba(0,0,0,.10)"/>
      <text x="60" y="76" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="46" font-weight="600" fill="rgba(255,255,255,.94)">${ch}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function buildAccounts(platform) {
    const names = platform === 'bili' ? BILI_NAMES : DY_NAMES;
    const accounts = [];
    names.forEach(function (name, index) {
      const hue = hueFor(name + platform);
      const followDays = FOLLOW_DAYS[index % FOLLOW_DAYS.length];
      const lastPostDays = LAST_POST_DAYS[index % LAST_POST_DAYS.length];
      const videoCount = VIDEO_COUNTS[index % VIDEO_COUNTS.length];
      const status = ABNORMAL[index] || 'normal';
      const abnormal = status !== 'normal';
      const noAvatar = NO_AVATAR.has(index);
      const noBio = NO_BIO.has(index);
      const lastPostAt = videoCount > 0 && !abnormal ? NOW - lastPostDays * DAY : (videoCount === 0 ? null : NOW - lastPostDays * DAY);
      const dynamicDays = platform === 'bili' && !abnormal && index % 4 !== 0 ? Math.max(1, lastPostDays - (5 + (index % 17))) : null;
      const lastDynamicAt = dynamicDays ? NOW - dynamicDays * DAY : null;
      const lastActiveAt = Math.max(lastPostAt || 0, lastDynamicAt || 0) || null;
      const id = platform === 'bili' ? String(1000000 + index * 137 + 42) : 'MS4wLjABAAAA' + (index < 10 ? '0' : '') + (index + 3) + '_demo_' + name.length + '_' + (index * 97 + 18);
      accounts.push({
        id: id,
        platform: platform,
        mid: platform === 'bili' ? id : undefined,
        secUid: platform === 'douyin' ? id : undefined,
        uid: platform === 'douyin' ? String(800000000000000 + index * 913) : undefined,
        name: name,
        avatar: noAvatar ? '' : makeAvatar(name, hue),
        hasAvatar: !noAvatar,
        signature: noBio ? '' : (BIOS[index % BIOS.length] || BIOS[0]),
        uniqueId: platform === 'bili' ? ('bili_' + (1000 + index)) : ('dy_' + (88200 + index * 17)),
        followedAt: NOW - followDays * DAY,
        followDays: followDays,
        mutual: abnormal ? false : MUTUAL.has(index),
        special: SPECIAL.has(index),
        relationshipKnown: true,
        interactionKnown: false,
        interactionNote: platform === 'bili' ? 'B站未提供逐账号互动明细，仅能识别互关和特别关注' : '抖音未提供逐账号互动明细，仅能识别互相关注等公开关系',
        followerCount: abnormal ? 0 : 320 + ((index * 893) % 86000),
        videoCount: abnormal ? 0 : videoCount,
        videoCountVerified: true,
        videoCountSource: 'demo',
        lastPostAt: lastPostAt,
        lastDynamicAt: lastDynamicAt,
        lastActiveAt: abnormal ? null : (lastActiveAt || (index % 7 === 0 ? NOW - (lastPostDays + 20) * DAY : null)),
        updateFrequencyDays: videoCount > 1 && !abnormal ? 3 + (index * 7) % 46 : null,
        level: platform === 'bili' ? Math.max(1, 6 - (index % 6)) : null,
        category: TAGS[index % TAGS.length],
        accountStatus: status,
        accountStatusNote: STATUS_NOTES[status] || '',
        official: OFFICIALS[index % OFFICIALS.length] || '',
        vip: platform === 'bili' && index % 9 === 0,
        liveStatus: platform === 'douyin' ? (index % 11 === 0 ? 1 : 0) : undefined,
        ipLocation: platform === 'douyin' ? 'IP属地：上海' : '',
        following: true,
        whitelist: WHITELIST.has(index) || (abnormal ? false : MUTUAL.has(index)) || SPECIAL.has(index) || STARRED.has(index),
        whitelistAuto: (!WHITELIST.has(index)) && ((abnormal ? false : MUTUAL.has(index)) || SPECIAL.has(index) || STARRED.has(index)),
        whitelistReason: [MUTUAL.has(index) ? '互相关注' : '', SPECIAL.has(index) ? '特别关注' : '', STARRED.has(index) ? '已收藏' : ''].filter(Boolean).join('、'),
        starred: STARRED.has(index),
        note: index === 4 ? '常看的摄影教程，先留着' : '',
        firstSeenAt: NOW - followDays * DAY,
        lastSeenAt: NOW - 2 * DAY,
        enrichedAt: NOW - 2 * DAY,
        source: 'demo',
        fetchedAt: NOW - 2 * DAY
      });
    });
    // A few already-unfollowed accounts make the history and comparison views realistic.
    accounts.forEach(function (account, index) {
      if (index >= names.length - 3) {
        account.following = false;
        account.unfollowedAt = NOW - (index - (names.length - 3) + 4) * 7 * DAY;
      }
    });
    return accounts;
  }

  function build(platform) {
    const accounts = buildAccounts(platform);
    const following = accounts.filter(function (a) { return a.following; });
    const unfollowedCount = accounts.filter(function (a) { return a.following === false; }).length;
    const account = {
      id: platform === 'bili' ? '90000001' : 'MS4wLjABAAAA_demo_self',
      platform: platform,
      name: platform === 'bili' ? '青柠气泡水' : '晚风收集者',
      avatar: makeAvatar(platform === 'bili' ? '青柠气泡水' : '晚风收集者', platform === 'bili' ? 152 : 210),
      uniqueId: platform === 'bili' ? 'qingning_2026' : 'dy_10086',
      connectedAt: NOW - 14 * DAY
    };
    const rules = global.SH.Rules.defaultRules(platform);
    return {
      platform: platform,
      account: account,
      accounts: accounts,
      rules: rules,
      scan: {
        status: 'completed', phase: 'done',
        startedAt: NOW - 2 * DAY,
        endedAt: NOW - 2 * DAY + 6 * 60000,
        total: following.length, scanned: following.length, enriched: following.length - 2, enrichTotal: following.length,
        failed: 2, page: 1, listDone: true, current: '', error: '', mode: 'activity',
        seenIds: following.map(function (a) { return a.id; }), enrichQueue: [], enrichIndex: following.length
      },
      cleanup: {
        status: 'idle', startedAt: null, endedAt: null, total: 0, done: 0, success: 0, failed: 0,
        current: '', error: '', results: [], options: null
      },
      stats: { total: following.length, all: accounts.length, whitelist: following.filter(function (a) { return a.whitelist; }).length, unfollowed: unfollowedCount, enriched: following.length - 2, abnormal: following.filter(function (a) { return ['banned', 'deleted', 'inaccessible'].includes(a.accountStatus); }).length },
      lastSummary: { added: 3, removed: 2, total: following.length, scanned: following.length, enriched: following.length - 2, failed: 2, finishedAt: NOW - 2 * DAY }
    };
  }

  function history(platform) {
    const p = build(platform);
    const following = p.accounts;
    const first = following.slice(0, 4);
    const second = following.slice(4, 10);
    return {
      cleanups: [
        {
          id: 'demo_cleanup_1', platform: platform, startedAt: NOW - 4 * DAY, endedAt: NOW - 4 * DAY + 96000,
          status: 'completed', total: 8, success: 7, failed: 1,
          results: first.concat(second).slice(0, 8).map(function (a, i) {
            return { id: a.id, name: a.name, avatar: a.avatar, ok: i !== 5, error: i === 5 ? '平台提示操作频繁' : '', at: NOW - 4 * DAY + i * 12000 };
          }),
          options: { intervalMs: 2200, batchSize: 20, batchPauseMs: 8000, maxConsecutiveFailures: 2 }
        },
        {
          id: 'demo_cleanup_2', platform: platform, startedAt: NOW - 18 * DAY, endedAt: NOW - 18 * DAY + 42000,
          status: 'completed', total: 3, success: 3, failed: 0,
          results: second.slice(0, 3).map(function (a, i) {
            return { id: a.id, name: a.name, avatar: a.avatar, ok: true, error: '', at: NOW - 18 * DAY + i * 13000 };
          }),
          options: { intervalMs: 2200, batchSize: 20, batchPauseMs: 8000, maxConsecutiveFailures: 2 }
        }
      ],
      scans: [
        {
          id: 'demo_scan_1', platform: platform, startedAt: NOW - 2 * DAY, endedAt: NOW - 2 * DAY + 6 * 60000,
          total: following.length, scanned: following.length, enriched: following.length - 2, failed: 2,
          mode: 'activity', added: 3, removed: 2, status: 'completed'
        },
        {
          id: 'demo_scan_2', platform: platform, startedAt: NOW - 9 * DAY, endedAt: NOW - 9 * DAY + 5 * 60000,
          total: following.length - 3, scanned: following.length - 3, enriched: following.length - 6, failed: 1,
          mode: 'activity', added: 1, removed: 4, status: 'completed'
        }
      ]
    };
  }

  global.SHDemo = { build: build, history: history, makeAvatar: makeAvatar };
})(window);
