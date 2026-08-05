// 云函数纯逻辑：兜底菜谱 / JSON 提取 / 校验规范化
// 独立成模块以便本地单元测试（node --test），不依赖云环境。

// 内置家常菜谱库（206 道，蒸馏自「厨房小课堂」）
const NR = require('./normalRecipes');

// 兜底菜谱：AI 彻底失败时返回，保证前端不崩溃
// 内置兜底菜谱池：AI 不可用时随机上一道（丰富度：6 套）
const FALLBACK_POOL = [
  {
    name: '主厨的倔强炒饭',
    steps: [
      '把冰箱里所有食材切成丁，假装它们本来就是一个团队。',
      '热锅凉油，倒入食材，翻炒到它们认命为止。',
      '出锅前撒一把葱花，主打一个“尽力了”。'
    ],
    plating: '用一个平时不敢用的盘子，凹出米其林三星的自信。',
    warning: '肠胃敏感者请酌情食用，厨房已尽力，后果自负。'
  },
  {
    name: '剩菜大乱炖·绝地求生版',
    steps: [
      '把所有食材倒进锅里，告诉它们“这是团队合作”。',
      '大火烧开转小火，让矛盾在汤汁里慢慢和解。',
      '出锅前尝一口，记住这个味道，别浪费。'
    ],
    plating: '直接端锅上桌，主打一个真诚。',
    warning: '本菜不承担任何“吃完想家”或“想给主厨打钱”的责任。'
  },
  {
    name: '冰箱盲盒·命运交响曲',
    steps: [
      '闭着眼把食材扔进锅，让命运做决定。',
      '翻一翻、搅一搅，假装自己很专业。',
      '盛出来那一刻，你就是深夜的米其林。'
    ],
    plating: '用最亮的盘子，衬托最野的菜。',
    warning: '如果味道太魔幻，请怪冰箱，别怪主厨。'
  },
  {
    name: '深夜泡面交响曲',
    steps: [
      '把泡面捏碎，像对待前任一样无情。',
      '热水一冲，香味立刻出卖了你的深夜。',
      '卧一个蛋，假装这是一顿正经的晚饭。'
    ],
    plating: '端到窗边就着夜色吃，仪式感拉满。',
    warning: '泡面虽好，别顿顿靠它续命，营养要跟上。'
  },
  {
    name: '勇者土豆泥堡垒',
    steps: [
      '土豆蒸熟压成泥，捏一座小山。',
      '淋上灵魂酱汁，撒一把葱花当旗帜。',
      '插一根勺子当剑，宣布堡垒建成。'
    ],
    plating: '用白盘衬托泥山的壮丽，拍照自带光环。',
    warning: '小心烫嘴，勇者也怕土豆泥的体温。'
  },
  {
    name: '昨日重现蛋包饭',
    steps: [
      '剩饭炒香，铺上金黄的蛋皮。',
      '挤上番茄酱，画一个笑脸。',
      '一口下去，仿佛回到了昨天的晚餐。'
    ],
    plating: '用铁盘装，蛋皮油亮，刀叉齐上。',
    warning: '蛋皮要趁热切开，冷了就凝固成遗憾。'
  }
];

function fallbackRecipe() {
  return FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)];
}

// 从模型输出中提取 JSON（兼容 markdown 代码块围栏 / 前后多余文字）
function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (err) {
    return null;
  }
}

// 校验并规范化菜谱结构（含可选的 darkScore / shoppingList，前端始终有这两个字段）
function normalizeRecipe(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 20) : '';
  const rawSteps = Array.isArray(obj.steps)
    ? obj.steps.filter(function (s) { return typeof s === 'string' && s.trim(); })
    : [];
  const steps = rawSteps.map(function (s) { return s.trim(); }).slice(0, 6);
  const plating = typeof obj.plating === 'string' ? obj.plating.trim() : '';
  const warning = typeof obj.warning === 'string' ? obj.warning.trim() : '';
  if (!name || !steps.length || !plating || !warning) return null;
  let darkScore = null;
  if (typeof obj.darkScore === 'number' && isFinite(obj.darkScore)) {
    darkScore = Math.max(0, Math.min(100, Math.round(obj.darkScore)));
  }
  const shoppingList = Array.isArray(obj.shoppingList)
    ? obj.shoppingList
        .filter(function (s) { return typeof s === 'string' && s.trim(); })
        .map(function (s) { return s.trim(); })
        .filter(function (s, i, arr) { return arr.indexOf(s) === i; })
        .slice(0, 8)
    : [];
  return { name: name, steps: steps, plating: plating, warning: warning, darkScore: darkScore, shoppingList: shoppingList };
}



// ===== 游戏化：风格模板（Prompt 模板，积分解锁） =====
const STYLES = [
  { id: 'classic',   name: '经典深夜食堂',      cost: 0,   tagline: '最原汁原味的作死配方' },
  { id: 'jianzhi',   name: '减脂期糊弄学',      cost: 50,  tagline: '骗自己说这顿不长肉' },
  { id: 'xiangqin',  name: '相亲对象最爱吃的菜', cost: 80,  tagline: '吃完立刻有理由买单走人' },
  { id: 'qiongren',  name: '月底吃土限定',      cost: 100, tagline: '把一块钱吃出五块钱的尊严' },
  { id: 'zaowu',     name: '养生（伪）硬核',     cost: 120, tagline: '红枣枸杞，主打一个心理安慰' }
];

// 风格对应的额外 Prompt（追加到 system prompt）
const STYLE_PROMPTS = {
  jianzhi: '这顿饭必须假装低卡：多用蔬菜和"热量极低"的说法，但味道要充满欺骗性。',
  xiangqin: '菜名要带点相亲饭局的心机：适合第一次见面，能让人记住你、又不好意思点太贵。',
  qiongren: '食材越便宜越好，菜名要透出"月底最后的倔强"，建议用泡面/馒头/鸡蛋。',
  zaowu: '往菜里硬塞养生元素（枸杞/红枣/黑芝麻），但做法完全朋克，反差越大越好。'
};

// 症状标签：按情绪/场景分类（红黑榜「剩菜博物馆」用）
function guessTag(recipe) {
  const text = String((recipe && (recipe.name + ' ' + (recipe.warning || ''))) || '').toLowerCase();
  if (/emo|孤独|深夜|眼泪|想家|失恋|分手/.test(text)) return '深夜emo必吃';
  if (/吃土|穷|月底|省钱|馒头|工资|老干妈/.test(text)) return '月底吃土首选';
  if (/前任|初恋|渣|心碎/.test(text)) return '前任看了想打人';
  if (/瘦|减脂|热量|卡路里|不长肉/.test(text)) return '吃完能瘦十斤（骗你的）';
  return '硬核养生';
}

// 生存积分结算：生成/打卡/评价的基础分
function calcPoints(parts) {
  // parts: { base: 10, streakBonus, rating: '真香'|'已进医院'|'', dailyBonus }
  let total = (parts && typeof parts.base === 'number') ? parts.base : 0;
  total += (parts && typeof parts.streakBonus === 'number') ? parts.streakBonus : 0;
  total += (parts && typeof parts.dailyBonus === 'number') ? parts.dailyBonus : 0;
  if (parts && parts.rating === '真香') total += 15;
  if (parts && parts.rating === '已进医院') total += 20;
  return total;
}

// 正常家常模式兜底：从内置菜谱库按食材匹配，无命中则随机上一道
// 返回带详细菜单字段的菜谱（ings/prep/tips/desc/scene/time/lib）
function normalFallbackRecipe(ingredients) {
  return NR.getNormalAppRecipe(ingredients);
}




// ===== 黑暗指数（0-100）与危险食材高亮 =====

// 启发式加分项：AI 没给分时兜底，保证演示/兜底数据也有黑暗指数
const DARK_RULES = [
  { re: /生|半生|未熟|发芽|变味|过期|腐烂|发霉|隔夜|馊/, score: 16 },
  { re: /皮蛋|榴莲|臭豆腐|螺蛳粉|酸菜|纳豆|秋葵|苦瓜|香菜/, score: 12 },
  { re: /老干妈|辣椒|辣|芥末|花椒|藤椒|蒜蓉/, score: 7 },
  { re: /可乐|雪碧|汽水|啤酒|红酒|白酒|咖啡|奶茶|巧克力|冰淇淋|酸奶|香蕉|西瓜|芒果|葡萄/, score: 9 },
  { re: /泡面|方便面|馒头|剩饭|隔夜饭|吐司/, score: 6 },
  { re: /皮|壳|核|籽|生吃|刺身/, score: 5 }
];
function heuristicDarkScore(ingredients, recipe, mode) {
  const text = String(ingredients || '') + ' ' +
    ((recipe && recipe.name) || '') + ' ' +
    ((recipe && recipe.warning) || '');
  let score = mode === 'normal' ? 25 : 42; // 正常家常基础分低
  DARK_RULES.forEach(function (k) { if (k.re.test(text)) score += k.score; });
  return Math.max(0, Math.min(100, score));
}

// 黑暗指数分级：越高越黑暗（前端也按此渲染，颜色/文案三端共用）
function darkTier(score) {
  const s = typeof score === 'number' ? score : 50;
  if (s <= 20) return { key: 'safe',  label: '家常安全',  emoji: '🍚', tip: '放心吃，主厨都夸你懂生活',         color: '#4ade80' };
  if (s < 60)  return { key: 'ok',    label: '家常凑合',  emoji: '🍽️', tip: '饿极了可以吃，味道看缘分',         color: '#ffd700' };
  if (s <= 80) return { key: 'risky', label: '黑暗料理',  emoji: '💀', tip: '能吃，但请做好心理建设',           color: '#ff7f27' };
  return { key: 'bio',   label: '生化武器',  emoji: '☣️', tip: '建议直接扔掉，别挑战生命极限', color: '#ff2d55' };
}

// 危险食材红色高亮规则：命中即前端红色警告条
const DANGER_RULES = [
  { re: /发芽土豆|土豆发芽|变绿|青皮土豆/, msg: '⚠️ 发芽/变绿的土豆含龙葵碱，千万别吃！', level: 'danger' },
  { re: /生四季豆|生豆角|未熟豆角|生扁豆/, msg: '⚠️ 四季豆/豆角必须彻底煮熟，生吃会中毒！', level: 'danger' },
  { re: /河豚/, msg: '⚠️ 河豚含剧毒，家庭厨房千万别碰！', level: 'danger' },
  { re: /野生蘑菇|毒蘑菇|陌生蘑菇/, msg: '⚠️ 无法辨别的野生蘑菇可能致命，直接扔掉！', level: 'danger' },
  { re: /苦杏仁|白果|银杏|鲜黄花菜/, msg: '⚠️ 苦杏仁/白果/鲜黄花菜含天然毒素，别生吃！', level: 'danger' },
  { re: /发霉|长毛|腐烂|馊了|变质/, msg: '⚠️ 发霉变质的食材建议直接扔掉，别冒险！', level: 'danger' },
  { re: /生鸡蛋|溏心蛋|半熟蛋/, msg: '⚠️ 生/半熟蛋有沙门氏菌风险，老人小孩慎吃', level: 'warn' },
  { re: /生肉|生鱼|刺身|生蚝/, msg: '⚠️ 生食肉类/水产需确保来源卫生、现买现吃', level: 'warn' }
];
function findDangerWarnings(ingredients, recipe) {
  const text = String(ingredients || '') + ' ' +
    ((recipe && recipe.name) || '') + ' ' +
    ((recipe && recipe.warning) || '');
  return DANGER_RULES
    .filter(function (r) { return r.re.test(text); })
    .map(function (r) { return { msg: r.msg, level: r.level }; });
}

// ===== 每日挑战（按日期确定性轮换：系统指定 3 种奇怪食材） =====
const DAILY_CHALLENGE_POOL = [
  { name: '老干妈奇袭',    emoji: '🌶️', ingredients: ['老干妈', '巧克力', '剩米饭'] },
  { name: '可乐皮蛋局',    emoji: '🥤', ingredients: ['可乐', '皮蛋', '泡面'] },
  { name: '香蕉酸奶陷阱',  emoji: '🍌', ingredients: ['香蕉', '午餐肉', '酸奶'] },
  { name: '榴莲辣条风暴',  emoji: '🥭', ingredients: ['榴莲', '辣条', '鸡蛋'] },
  { name: '螺蛳粉芝士火山', emoji: '🍜', ingredients: ['螺蛳粉', '芝士', '西瓜'] },
  { name: '咖啡土豆炼乳',  emoji: '☕', ingredients: ['咖啡', '土豆', '炼乳'] },
  { name: '雪碧黄瓜花生',  emoji: '🥒', ingredients: ['雪碧', '黄瓜', '花生酱'] },
  { name: '饼干老干妈白粥', emoji: '🍪', ingredients: ['饼干', '老干妈', '白粥'] },
  { name: '秋葵芝士泡面',  emoji: '🧀', ingredients: ['秋葵', '芝士', '方便面'] },
  { name: '芒果酱油鸡',    emoji: '🥭', ingredients: ['芒果', '酱油', '鸡肉'] }
];
// dateStr: 'YYYY-MM-DD'（中国时区）；确定性取模轮换
function dailyChallenge(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00+08:00') : new Date(Date.now() + 8 * 3600 * 1000);
  const dayIndex = Math.floor(d.getTime() / 86400000);
  const idx = ((dayIndex % DAILY_CHALLENGE_POOL.length) + DAILY_CHALLENGE_POOL.length) % DAILY_CHALLENGE_POOL.length;
  const c = DAILY_CHALLENGE_POOL[idx];
  return { name: c.name, emoji: c.emoji, ingredients: c.ingredients.slice() };
}

// 图片识别结果解析：优先 JSON 数组，失败则按分隔符切分
function parseIngredients(text) {
  if (!text || typeof text !== 'string') return [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  let arr = null;
  if (start >= 0 && end > start) {
    try { arr = JSON.parse(candidate.slice(start, end + 1)); } catch (e) { arr = null; }
  }
  if (Array.isArray(arr)) {
    return arr.filter(function (s) { return typeof s === 'string' && s.trim(); })
      .map(function (s) { return s.trim().replace(/^[0-9]+[.、、]\s*/, ''); })
      .slice(0, 20);
  }
  return String(candidate)
    .split(/[、，,;；\n]+/)
    .map(function (s) { return s.trim().replace(/^[0-9]+[.、、]\s*/, ''); })
    .filter(Boolean)
    .slice(0, 20);
}


module.exports = {
  fallbackRecipe, normalFallbackRecipe, extractJson, normalizeRecipe,
  STYLES, STYLE_PROMPTS, guessTag, calcPoints,
  heuristicDarkScore, darkTier, findDangerWarnings, dailyChallenge, parseIngredients
};
