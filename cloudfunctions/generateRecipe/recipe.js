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

// 校验并规范化菜谱结构
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
  return { name: name, steps: steps, plating: plating, warning: warning };
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


module.exports = { fallbackRecipe: fallbackRecipe, normalFallbackRecipe: normalFallbackRecipe, extractJson: extractJson, normalizeRecipe: normalizeRecipe, STYLES: STYLES, STYLE_PROMPTS: STYLE_PROMPTS, guessTag: guessTag, calcPoints: calcPoints };
