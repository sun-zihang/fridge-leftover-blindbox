// 云函数：generateRecipe
// 功能：AI 生成创意菜谱（严格 JSON 输出并校验）+ 游戏化系统：
//       - players：生存挑战（每日打卡 / 连续天数 / 生存积分 / 徽章）
//       - styles：风格模板（积分解锁奇葩 Prompt）
//       - tags：症状标签（剩菜博物馆分类）
//       - challenges：好友投喂（甩锅接力，接受双方 +20 积分）
// 依赖：@cloudbase/node-sdk >= 3.16.0
// 注意：部署后把云函数超时时间设置为 60~120 秒。

const tcb = require('@cloudbase/node-sdk');
const {
  fallbackRecipe, normalFallbackRecipe, extractJson, normalizeRecipe,
  STYLES, STYLE_PROMPTS, guessTag, calcPoints,
  heuristicDarkScore, darkTier, findDangerWarnings, dailyChallenge, parseIngredients,
  maybeEvent, applyEventToRecipe, EX_RECIPE
} = require('./recipe');
const D = require('./duel');
const NR = require('./normalRecipes');
const HC = require('./howToCookRecipes');

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const ai = app.ai();
const db = app.database();

const MODEL = 'hy3'; // 腾讯混元（内置免费国产 AI，体验版默认启用，实测约 2~4s 返回）；备选 qwen3.5-flash（通义千问）
const VISION_MODEL = 'qwen3.5-plus'; // 多模态识别（图片输入），仅拍照识别食材时使用
const CHALLENGE_BONUS = 20;
const HTTP_TOKEN = 'fridge-blindbox-secret-2026'; // 小程序 HTTP 桥接共享密钥

// 徽章规则
const BADGES = {
  streak7: { id: '暗黑料理大师',   desc: '连续 7 天打卡成功' },
  hospital3: { id: '米其林在逃主厨', desc: '累计 3 次「已进医院」' },
  gens10: { id: '味蕾幸存者', desc: '累计生成 10 道菜' }
};

// 正常模式 Prompt：家常菜谱，克制、可复现
const NORMAL_PROMPT =
  '你是一位擅长家常菜的家庭大厨。用户给你冰箱里的食材，请给出一个正常、好做、能吃的菜谱。' +
  '要求：菜名正常靠谱，步骤清晰（3步左右），摆盘建议实用，一句贴心的小提示。' +
  '语气轻松自然即可，不要黑暗料理、不要夸张整活。' +
  '请严格以 JSON 格式输出：' +
  '{"name": "正常的菜名，不超过10个字",' +
  '"steps": ["步骤1", "步骤2", "步骤3"],' +
  '"plating": "简单实用的摆盘建议",' +
  '"warning": "一句贴心的注意事项",' +
  '"darkScore": 0到100之间的整数（0=家常正常，100=极端黑暗料理，正常家常菜一般在0-30）,' +
  '"shoppingList": ["还需要额外采购的调料或食材，没有则给空数组"]}';

const SYSTEM_PROMPT =
  '你是一位拥有米其林三星实力，但性格幽默、热爱互联网冲浪的"深夜食堂主厨"。' +
  '用户会给你几种冰箱里快过期的奇葩食材，你需要将它们组合成一道菜。' +
  '请严格以 JSON 格式输出，不要包含任何多余的解释文本。' +
  'JSON 结构如下：' +
  '{"name": "包含谐音梗或网络热词的菜名，不超过10个字",' +
  '"steps": ["步骤1（脱口秀语气）", "步骤2", "步骤3"],' +
  '"plating": "极其夸张或搞笑的摆盘建议",' +
  '"warning": "一句话提醒这道菜的风险或注意事项",' +
  '"darkScore": 0到100之间的整数（0=最安全，100=绝对生化武器，根据食材奇葩程度和翻车风险打分）,' +
  '"shoppingList": ["这道菜还需要额外采购的调料/食材，没有则给空数组"]}';

// 主厨人设：切换语气/画风（毒舌 / 戏精 / 温柔 / 幽默默认）
const PERSONA_PROMPTS = {
  dusha: '你的人设是「毒舌主厨」：吐槽毫不留情、句句扎心，但菜谱本身依然能吃。给菜名时要带上嘲讽，警告要狠一点。',
  xijing: '你的人设是「戏精主厨」：极度浮夸、把每道菜吹成米其林史诗，用词华丽到起鸡皮疙瘩。',
  wenrou: '你的人设是「温柔主厨」：语气温暖治愈，像深夜电台一样安抚每一份剩菜和每一个熬夜的人。',
  youmo: '' // 默认幽默深夜食堂主厨（SYSTEM_PROMPT 已含）
};

// 食材合成模式：炼金术合成大师，把两种基础食材合成一道菜
const SYNTH_PROMPT =
  '你是「食材炼金术士」，最擅长把两种看似毫不相干的基础食材合成出惊喜。' +
  '用户给你两种食材，请合成出一道有名字的料理，并给出做法、摆盘与警告。' +
  '请严格以 JSON 格式输出，不要输出多余文字：' +
  '{"name": "合成出的菜名（不超过10个字，要有梗）",' +
  '"steps": ["步骤1", "步骤2", "步骤3"],' +
  '"plating": "一句摆盘建议",' +
  '"warning": "一句温馨提示或吐槽",' +
  '"darkScore": 0到100之间的整数（0=安全好吃，100=生化武器）,' +
  '"shoppingList": ["额外需要的调料，没有给空数组"]}';

// 周计划管家 Prompt：AI 批量生成一周不重复菜谱
const WEEK_PLAN_PROMPT =
  '你是「冰箱剩菜盲盒」的周计划管家。根据用户冰箱里的食材，规划一周 7 天不重复的菜谱。' +
  '要求：每天一道菜，菜名互不相同；食材尽量用到冰箱现有食材；每天给出简短步骤（2-5 步）、' +
  '所需食材清单、一句菜色介绍、一句小贴士。' +
  '只输出 JSON 数组，不要输出任何多余文字，形如：' +
  '[{"name":"菜名","steps":["步骤1","步骤2"],"ings":["洋葱 1 个","鸡腿 2 个"],"desc":"一句介绍","tips":"一句贴士","time":"30分钟"}]。';

// 备菜指南 Prompt：批量食材的预处理方案
const MEAL_PREP_PROMPT =
  '你是「冰箱剩菜盲盒」的备菜管家。用户批量采购了一种食材，请给出 3-5 条备菜方案（meal prep）。' +
  '每条方案包含：method（怎么处理）、storage（冷藏/冷冻）、shelfLife（可保存多久）、recipeName（适合做哪道菜）、desc（一句说明）。' +
  '只输出 JSON 数组，不要输出多余文字：' +
  '[{"method":"切块腌制","storage":"冷冻","shelfLife":"7天","recipeName":"宫保鸡丁","desc":"..."}]。';

// 反向搜索 Prompt：想吃 X 但缺 Y → 平替
const REVERSE_PROMPT =
  '你是「冰箱剩菜盲盒」的平替主厨。用户会说“想吃某道菜，但缺某种食材”，请根据用户冰箱现有食材给出平替方案。' +
  '只输出 JSON 对象，不要输出多余文字：' +
  '{"want":"想吃的菜","missing":"缺的食材","substitute":"用来替代的冰箱食材","resultName":"平替菜名","recipe":{"name":"菜名","steps":["步骤1","步骤2"],"ings":["食材 1 个"],"desc":"一句介绍","tips":"一句贴士"},"tip":"一句平替说明"}。' +
  'recipe 给出一道可以直接做的平替菜谱（步骤 2-5 步）。';

// ---------- 工具 ----------

function chinaToday() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function yesterdayOf(today) {
  const d = new Date(today + 'T00:00:00+08:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
// HTTP 网关（HTTP access -> SCF）事件：body 是 JSON 字符串；SDK callFunction 事件保持原样
function normalizeEvent(raw) {
  if (!raw) return {};
  if (raw.httpMethod || (raw.path && raw.headers)) {
    let body = {};
    try {
      if (raw.isBase64Encoded) {
        body = JSON.parse(Buffer.from(raw.body || '', 'base64').toString('utf8') || '{}');
      } else if (raw.body) {
        body = JSON.parse(raw.body);
      }
    } catch (e) { /* body 解析失败则用空对象 */ }
    return Object.assign({}, body, { __viaHttp: true });
  }
  return raw;
}
function getUid(event) {
  // 显式 uid（CLI/自动化测试用，加前缀避免与真实 uid 冲突）
  if (event && event.uid) return 'cli:' + event.uid;
  try {
    const info = app.auth().getUserInfo();
    if (info && info.uid) return info.uid;
  } catch (e) { /* 无调用者上下文（如未登录） */ }
  return 'anon';
}
function wrap(d) {
  return d && d.data && typeof d.data === 'object' ? d.data : d;
}
// 兼容不同 SDK 返回的 _id 形态（string / { $oid } / { oid }）
function recId(d) {
  if (!d) return '';
  if (typeof d._id === 'string' && d._id) return d._id;
  if (d._id && typeof d._id === 'object') {
    var o = d._id;
    if (typeof o.$oid === 'string') return o.$oid;
    if (typeof o.oid === 'string') return o.oid;
    if (typeof o._id === 'string') return o._id;
  }
  if (typeof d.id === 'string' && d.id) return d.id;
  return '';
}
async function ensureCollection(name) {
  try { await db.createCollection(name); }
  catch (err) {
    const msg = (err && err.message) ? String(err.message) : String(err);
    if (msg.indexOf('exist') < 0 && msg.indexOf('EXIST') < 0) throw err;
  }
}
async function findPlayer(uid) {
  const res = await db.collection('players').doc(uid).get();
  const list = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
  const p = list.length ? wrap(list[0]) : null;
  return p && p.uid ? p : null;
}
async function getOrCreatePlayer(uid) {
  let p = await findPlayer(uid);
  if (p) return p;
  const base = {
    uid: uid,
    streak: 0, best_streak: 0, last_daily: '',
    points: 0, total_generates: 0,
    hospital_count: 0, yummy_count: 0,
    badges: [], unlocked_styles: ['classic'],
    created_at: db.serverDate(), updated_at: db.serverDate()
  };
  await db.collection('players').doc(uid).set({ data: base });
  return base;
}
async function savePlayer(p) {
  p.updated_at = db.serverDate();
  await db.collection('players').doc(p.uid).set({ data: p });
}
function checkBadges(p) {
  const news = [];
  if (p.streak >= 7 && p.badges.indexOf(BADGES.streak7.id) < 0) news.push(BADGES.streak7.id);
  if (p.hospital_count >= 3 && p.badges.indexOf(BADGES.hospital3.id) < 0) news.push(BADGES.hospital3.id);
  if (p.total_generates >= 10 && p.badges.indexOf(BADGES.gens10.id) < 0) news.push(BADGES.gens10.id);
  return news;
}
function applyBadges(p) {
  const news = checkBadges(p);
  news.forEach(function (id) { p.badges.push(id); });
  return news;
}
function playerView(p) {
  return {
    uid: p.uid,
    streak: p.streak,
    best_streak: p.best_streak,
    points: p.points,
    total_generates: p.total_generates,
    hospital_count: p.hospital_count,
    yummy_count: p.yummy_count,
    badges: p.badges,
    unlocked_styles: p.unlocked_styles
  };
}
function stylesView(p) {
  return STYLES.map(function (s) {
    return {
      id: s.id, name: s.name, cost: s.cost, tagline: s.tagline,
      unlocked: (p.unlocked_styles || []).indexOf(s.id) >= 0
    };
  });
}

// ---------- AI 生成 ----------

async function generate(ingredients, style, mode, persona) {
  // 彩蛋：输入含「前任/礼物」→ 断舍离爆炒苦瓜
  if (/前任|礼物/.test(String(ingredients || ''))) {
    var ex = decorate(Object.assign({}, EX_RECIPE), ingredients, mode, false, false, '');
    ex.recipe.easterEgg = true;
    return ex;
  }
  // 随机事件：10% 触发「厨房突发事件」（normal 只允许灵感爆发）
  var evt = maybeEvent(null, mode);
  // 正常家常模式：优先从内置菜谱库（206 道家常菜 + HowToCook 298 道）按食材匹配，命中直接返回（含详细菜单字段）
  if (mode === 'normal') {
    const hit = NR.matchNormalRecipe(ingredients);
    if (hit) {
      var libR = NR.toAppRecipe(hit);
      if (evt && evt.id === 'inspiration') libR.event = evt;
      return { recipe: libR, fallback: false, fromLib: true, lastError: '' };
    }
    const hcHits = HC.matchByIngredients(ingredients);
    if (hcHits.length) {
      var libH = HC.toAppRecipe(hcHits[0].recipe);
      if (evt && evt.id === 'inspiration') libH.event = evt;
      return { recipe: libH, fallback: false, fromLib: true, lastError: '' };
    }
  }
  const model = ai.createModel('cloudbase');
  let recipe = null;
  let lastError = '';
  const stylePrompt = (style && style.id !== 'classic') ? STYLE_PROMPTS[style.id] : '';
  const personaPrompt = PERSONA_PROMPTS[persona] !== undefined ? PERSONA_PROMPTS[persona] : PERSONA_PROMPTS.youmo;
  const basePrompt = mode === 'normal' ? NORMAL_PROMPT
    : (mode === 'synth' ? SYNTH_PROMPT : SYSTEM_PROMPT);

  for (let i = 0; i < 3; i++) {
    try {
      const messages = [
        { role: 'system', content: basePrompt },
        { role: 'user', content: '我的食材是：' + ingredients }
      ];
      if (stylePrompt) {
        messages.push({ role: 'user', content: '风格要求：' + stylePrompt });
      }
      if (personaPrompt) {
        messages.push({ role: 'user', content: '人设要求：' + personaPrompt });
      }
      if (evt) {
        var evtPrompt = '';
        if (evt.id === 'power_off') evtPrompt = evt.prompt;
        else if (evt.id === 'cat_spice') evtPrompt = evt.prompt + '额外强制加入' + evt.spice + '。';
        if (evtPrompt) messages.push({ role: 'user', content: '突发事件：' + evtPrompt });
      }
      if (i > 0) {
        messages.push({
          role: 'user',
          content: '你上次的输出不是合法 JSON 或字段缺失，请只输出符合要求结构的 JSON。'
        });
      }
      const result = await model.generateText({ model: MODEL, messages: messages });
      recipe = normalizeRecipe(extractJson(result.text));
      if (recipe) break;
      lastError = 'AI 返回的 JSON 结构不合法';
    } catch (err) {
      lastError = (err && err.message) ? err.message : String(err);
    }
  }

  if (!recipe) {
    var fb = mode === 'normal'
      ? normalFallbackRecipe(ingredients)
      : fallbackRecipe();
    if (evt) fb = applyEventToRecipe(fb, evt);
    var deco = decorate(fb, ingredients, mode, true, mode === 'normal', lastError);
    if (evt) deco.recipe.event = evt;
    return deco;
  }
  if (evt) recipe.event = evt;
  return decorate(recipe, ingredients, mode, false, false, lastError);
}

// 给菜谱补齐黑暗指数/危险高亮/购物清单（AI 没给就用启发式兜底）
function decorate(recipe, ingredients, mode, fallback, fromLib, lastError) {
  var r = Object.assign({}, recipe);
  if (typeof r.darkScore !== 'number') {
    r.darkScore = heuristicDarkScore(ingredients, r, mode);
  }
  // 传说级料理彩蛋：极低概率（4%）把分数拉到 100，触发「神的旨意」
  if (r.darkScore !== 100 && Math.random() < 0.04) {
    r.darkScore = 100;
  }
  r.darkTier = darkTier(r.darkScore);
  r.dangerFlags = findDangerWarnings(ingredients, r);
  if (!Array.isArray(r.shoppingList)) r.shoppingList = [];
  return { recipe: r, fallback: fallback, fromLib: fromLib, lastError: lastError || '' };
}

// ---------- 厨房生活管家：周计划 / 备菜 / 反向搜索 ----------

async function aiJson(messages, attempts) {
  const model = ai.createModel('cloudbase');
  let lastErr = '';
  for (let i = 0; i < (attempts || 2); i++) {
    try {
      const msgs = messages.slice();
      if (i > 0) msgs.push({ role: 'user', content: '上次输出不符合要求，请只输出指定结构的 JSON。' });
      const result = await model.generateText({ model: MODEL, messages: msgs });
      return result.text;
    } catch (err) {
      lastErr = (err && err.message) || String(err);
    }
  }
  throw new Error(lastErr || 'AI 调用失败');
}

// 从模型输出提取 JSON 数组（兼容围栏 / 对象包裹 plan/list）
function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try { return JSON.parse(candidate.slice(start, end + 1)); } catch (e) { /* continue */ }
  }
  const obj = extractJson(candidate);
  if (obj && Array.isArray(obj.plan)) return obj.plan;
  if (obj && Array.isArray(obj.list)) return obj.list;
  return null;
}

// 周计划条目 / 平替菜谱的统一轻量规范化（要求 name + steps）
function normalizePlanItem(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 20) : '';
  const steps = Array.isArray(obj.steps)
    ? obj.steps.filter(function (s) { return typeof s === 'string' && s.trim(); }).map(function (s) { return s.trim(); }).slice(0, 8)
    : [];
  if (!name || !steps.length) return null;
  const ings = Array.isArray(obj.ings)
    ? obj.ings.filter(function (s) { return typeof s === 'string' && s.trim(); }).map(function (s) { return s.trim(); }).slice(0, 12)
    : [];
  return {
    name: name,
    steps: steps,
    ings: ings,
    desc: typeof obj.desc === 'string' ? obj.desc.trim().slice(0, 120) : '',
    tips: typeof obj.tips === 'string' ? obj.tips.trim().slice(0, 200) : '',
    time: (typeof obj.time === 'string' && obj.time.trim()) ? obj.time.trim() : '约30分钟',
    scene: (typeof obj.scene === 'string' && obj.scene.trim()) ? obj.scene.trim() : '家常',
    plating: typeof obj.plating === 'string' ? obj.plating.trim() : '',
    warning: typeof obj.warning === 'string' ? obj.warning.trim() : '',
    darkScore: 20,
    lib: false,
    emoji: '🍳',
    video: null
  };
}

async function aiGeneratePlan(ings, count) {
  try {
    const text = await aiJson([
      { role: 'system', content: WEEK_PLAN_PROMPT },
      { role: 'user', content: '我的冰箱食材：' + ings + '\n请规划 ' + count + ' 道不重复的菜。' }
    ], 2);
    const arr = extractJsonArray(text);
    if (!arr || !arr.length) return null;
    const out = [];
    const seen = new Set();
    for (const it of arr) {
      const n = normalizePlanItem(it);
      if (n && !seen.has(n.name)) { seen.add(n.name); out.push(n); }
      if (out.length >= count) break;
    }
    return out.length >= Math.min(count, 5) ? out : null;
  } catch (e) {
    return null;
  }
}

async function aiMealPrep(ingredient) {
  try {
    const text = await aiJson([
      { role: 'system', content: MEAL_PREP_PROMPT },
      { role: 'user', content: '批量采购的食材：' + ingredient }
    ], 2);
    const arr = extractJsonArray(text);
    if (!arr || !arr.length) return null;
    const out = [];
    for (const it of arr) {
      if (!it || typeof it !== 'object') continue;
      const method = typeof it.method === 'string' ? it.method.trim() : '';
      if (!method) continue;
      out.push({
        method: method.slice(0, 20),
        storage: typeof it.storage === 'string' ? it.storage.trim().slice(0, 10) : '',
        shelfLife: typeof it.shelfLife === 'string' ? it.shelfLife.trim().slice(0, 10) : '',
        recipeName: typeof it.recipeName === 'string' ? it.recipeName.trim().slice(0, 20) : '',
        desc: typeof it.desc === 'string' ? it.desc.trim().slice(0, 120) : ''
      });
      if (out.length >= 5) break;
    }
    return out.length ? out : null;
  } catch (e) {
    return null;
  }
}

async function aiReverse(text, ings) {
  try {
    const raw = await aiJson([
      { role: 'system', content: REVERSE_PROMPT },
      { role: 'user', content: '用户说："' + text + '"。冰箱现有食材：' + (ings || '（未知）') }
    ], 2);
    const obj = extractJson(raw);
    if (!obj || typeof obj !== 'object') return null;
    const resultName = typeof obj.resultName === 'string' ? obj.resultName.trim().slice(0, 30) : '';
    if (!resultName) return null;
    return {
      want: typeof obj.want === 'string' ? obj.want.trim().slice(0, 20) : '',
      missing: typeof obj.missing === 'string' ? obj.missing.trim().slice(0, 20) : '',
      substitute: typeof obj.substitute === 'string' ? obj.substitute.trim().slice(0, 20) : '',
      resultName: resultName,
      recipe: normalizePlanItem(obj.recipe),
      tip: typeof obj.tip === 'string' ? obj.tip.trim().slice(0, 200) : ''
    };
  } catch (e) {
    return null;
  }
}

// ---------- 红黑榜 / 博物馆 ----------

async function listRank(tag) {
  const res = await db.collection('recipes')
    .limit(200)
    .get();
  const rated = (res.data || [])
    .map(function (r) {
      // 文档结构为 { _id, data:{...} }，wrap 会取出 data，需把 _id 补回
      var w = wrap(r);
      if (w) {
        if (!w._id && r) w._id = r._id || r.id || '';
        if (w.user_rating === undefined && r && r.data && r.data.user_rating !== undefined) {
          w.user_rating = r.data.user_rating;
        }
        if (w.user_name === undefined && r && r.data && r.data.user_name !== undefined) {
          w.user_name = r.data.user_name;
        }
      }
      return w;
    })
    .filter(function (d) {
      return d.user_rating === '真香' || d.user_rating === '已进医院';
    })
    .filter(function (d) { return !tag || d.tag === tag; })
    .sort(function (a, b) {
      // 投票置顶：票数越高越靠前（带随机扰动保持榜单多样性），同票按时间倒序
      const va = voteNet(a), vb = voteNet(b);
      const sa = vb - va;
      if (sa !== 0) return sa;
      const ta = a.create_time ? new Date(a.create_time).getTime() : 0;
      const tb = b.create_time ? new Date(b.create_time).getTime() : 0;
      return tb - ta;
    })
    .map(function (d, i) {
      const rd = d.recipe_data || {};
      return {
        recordId: recId(d),
        user_name: typeof d.user_name === 'string' ? d.user_name : '',
        name: typeof rd.name === 'string' && rd.name ? rd.name : '未命名料理',
        rating: typeof d.user_rating === 'string' ? d.user_rating : '',
        warning: typeof rd.warning === 'string' ? rd.warning : '',
        ingredients: typeof d.ingredients === 'string' ? d.ingredients : '',
        tag: typeof d.tag === 'string' ? d.tag : '硬核养生',
        recipe_data: rd,
        votes: { up: d.votes_up || 0, down: d.votes_down || 0, net: voteNet(d) },
        darkScore: typeof rd.darkScore === 'number' ? rd.darkScore : null,
        dangerFlags: Array.isArray(rd.dangerFlags) ? rd.dangerFlags : []
      };
    });
  // 随机扰动：同票段内洗一下，避免榜单每刷新都一样
  var shuffled = [];
  var bucket = [];
  rated.forEach(function (it) {
    if (bucket.length && bucket[0].votes.net !== it.votes.net) {
      shuffled = shuffled.concat(shuffleRank(bucket));
      bucket = [];
    }
    bucket.push(it);
  });
  shuffled = shuffled.concat(shuffleRank(bucket));
  return shuffled.slice(0, 30);
}
async function voteCounts(recordId) {
  const res = await db.collection('recipes').doc(recordId).get().catch(function () { return { data: null }; });
  const list = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
  const rec = list.length ? wrap(list[0]) : null;
  const up = rec && typeof rec.votes_up === 'number' ? rec.votes_up : 0;
  const down = rec && typeof rec.votes_down === 'number' ? rec.votes_down : 0;
  return { up: up, down: down, net: up - down };
}
function voteNet(d) {
  return (d.votes_up || 0) - (d.votes_down || 0);
}
function shuffleRank(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// ---------- 主入口 ----------

exports.main = async (rawEvent) => {
  const event = normalizeEvent(rawEvent);
  const action = event && event.action;
  try {
    if (event.__viaHttp && event.token !== HTTP_TOKEN) {
      return { success: false, error: 'unauthorized' };
    }
    const uid = getUid(event);
    await Promise.all([
      ensureCollection('recipes'),
      ensureCollection('players'),
      ensureCollection('challenges'),
      ensureCollection('rooms')
    ]);

    // 评价：更新评分 + 玩家积分/徽章
    if (action === 'rate') {
      const recordId = event.recordId;
      const rating = event.rating;
      if (!recordId || (rating !== '真香' && rating !== '已进医院')) {
        return { success: false, error: '参数不合法' };
      }
      await db.collection('recipes').doc(recordId).update({
        data: { user_rating: rating, rate_time: db.serverDate(), user_name: String(event.nickname || '').slice(0, 12) }
      });
      const p = await getOrCreatePlayer(uid);
      if (rating === '真香') { p.yummy_count += 1; p.points += 15; }
      if (rating === '已进医院') { p.hospital_count += 1; p.points += 20; }
      const badgesNew = applyBadges(p);
      await savePlayer(p);
      return {
        success: true,
        data: { recordId: recordId, points_gained: rating === '真香' ? 15 : 20, badges_new: badgesNew, player: playerView(p) }
      };
    }

    // 红黑榜 / 剩菜博物馆
    if (action === 'listRank') {
      const data = await listRank(event.tag);
      return { success: true, data: data };
    }

    // 每日挑战：系统指定 3 种奇怪食材（按日期确定性轮换）
    if (action === 'dailyChallenge') {
      const today = chinaToday();
      const ch = dailyChallenge(today);
      const p = await getOrCreatePlayer(uid);
      const done = p.last_daily === today;
      return { success: true, data: { date: today, challenge: ch, done: done } };
    }

    // 给榜单菜谱投票：direction = 'up'（真香）| 'down'（送医），每人每菜一票、可改票
    if (action === 'vote') {
      const recordId = event.recordId;
      const direction = event.direction;
      if (!recordId || (direction !== 'up' && direction !== 'down')) {
        return { success: false, error: '参数不合法' };
      }
      const value = direction === 'up' ? 1 : -1;
      const voteId = recordId + ':' + uid;
      const existed = await db.collection('votes').doc(voteId).get().catch(function () { return { data: null }; });
      const exList = Array.isArray(existed.data) ? existed.data : (existed.data ? [existed.data] : []);
      const prev = exList.length ? wrap(exList[0]) : null;
      let upDelta = 0, downDelta = 0;
      if (prev && prev.value === value) {
        return { success: true, data: { votes: await voteCounts(recordId), changed: false } };
      }
      if (prev) {
        if (prev.value === 1) upDelta = -1; else downDelta = -1;
        await db.collection('votes').doc(voteId).update({ data: { value: value, update_time: db.serverDate() } });
      } else {
        await db.collection('votes').doc(voteId).set({ data: { recordId: recordId, uid: uid, value: value, create_time: db.serverDate() } });
      }
      if (value === 1) upDelta += 1; else downDelta += 1;
      const patch = {};
      if (upDelta) patch.votes_up = db.command.inc(upDelta);
      if (downDelta) patch.votes_down = db.command.inc(downDelta);
      await db.collection('recipes').doc(recordId).update({ data: patch });
      const counts = await voteCounts(recordId);
      return { success: true, data: { votes: counts, changed: true } };
    }

    // 拍照识别食材：多模态模型 qwen3.5-plus（hy3 不支持图片输入）
    if (action === 'recognizeImage') {
      const image = String((event && event.image) || '');
      if (!image) return { success: false, error: '缺少图片' };
      if (image.length > 6.5 * 1024 * 1024) {
        return { success: false, error: '图片太大，请上传小于 4MB 的图片' };
      }
      const model = ai.createModel('cloudbase');
      let ingredients = [];
      let errMsg = '';
      for (let i = 0; i < 2; i++) {
        try {
          const result = await model.generateText({
            model: VISION_MODEL,
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: '你是冰箱剩菜识别助手。请识别这张图片里所有可辨认的食材，只输出一个 JSON 字符串数组，例如 ["鸡蛋","剩米饭","番茄"]，不要输出任何解释文字。' },
                { type: 'image_url', image_url: { url: image } }
              ]
            }]
          });
          ingredients = parseIngredients(result.text);
          if (ingredients.length) break;
        } catch (e) {
          errMsg = (e && e.message) ? e.message : String(e);
        }
      }
      if (!ingredients.length) {
        return { success: false, error: errMsg || '识别失败，请换一张更清晰的图或手输食材' };
      }
      return { success: true, data: { ingredients: ingredients } };
    }

    // 玩家状态 + 风格模板列表
    if (action === 'getPlayer') {
      const p = await getOrCreatePlayer(uid);
      return { success: true, data: { player: playerView(p), styles: stylesView(p) } };
    }

    // 解锁风格模板
    if (action === 'unlockStyle') {
      const style = STYLES.find(function (s) { return s.id === event.styleId; });
      if (!style) return { success: false, error: '风格不存在' };
      const p = await getOrCreatePlayer(uid);
      if ((p.unlocked_styles || []).indexOf(style.id) >= 0) {
        return { success: true, data: { player: playerView(p), styles: stylesView(p) } };
      }
      if (p.points < style.cost) return { success: false, error: '积分不足' };
      p.points -= style.cost;
      p.unlocked_styles.push(style.id);
      await savePlayer(p);
      return { success: true, data: { player: playerView(p), styles: stylesView(p) } };
    }

    // 甩锅给好友：基于某条已生成的菜谱创建挑战
    if (action === 'createChallenge') {
      const recordId = event.recordId;
      if (!recordId) return { success: false, error: '缺少菜谱' };
      const res = await db.collection('recipes').doc(recordId).get();
      const list = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      const rec = list.length ? wrap(list[0]) : null;
      if (!rec || !rec.recipe_data) return { success: false, error: '菜谱不存在' };
      const addRes = await db.collection('challenges').add({
        data: {
          from_uid: uid,
          recipe: rec.recipe_data,
          ingredients: rec.ingredients || '',
          tag: rec.tag || guessTag(rec.recipe_data),
          status: 'pending',
          bonus: CHALLENGE_BONUS,
          create_time: db.serverDate()
        }
      });
      return { success: true, data: { challengeId: addRes.id || addRes._id || '' } };
    }

    // 接受挑战：双方 +20 积分
    if (action === 'acceptChallenge') {
      const challengeId = event.challengeId;
      if (!challengeId) return { success: false, error: '缺少挑战 ID' };
      const res = await db.collection('challenges').doc(challengeId).get();
      const list = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      const ch = list.length ? wrap(list[0]) : null;
      if (!ch) return { success: false, error: '挑战不存在或已失效' };
      if (ch.status !== 'pending') return { success: false, error: '挑战已被接受' };
      if (ch.from_uid === uid) return { success: false, error: '不能接受自己甩的锅' };

      await db.collection('challenges').doc(challengeId).update({
        data: { status: 'accepted', accepted_uid: uid, accept_time: db.serverDate() }
      });
      // 双方 +bonus
      const pa = await getOrCreatePlayer(uid);
      pa.points += (ch.bonus || CHALLENGE_BONUS);
      const badgesA = applyBadges(pa);
      await savePlayer(pa);
      if (ch.from_uid) {
        const pf = await findPlayer(ch.from_uid);
        if (pf) { pf.points += (ch.bonus || CHALLENGE_BONUS); await savePlayer(pf); }
      }
      return {
        success: true,
        data: {
          challenge: { recipe: ch.recipe, ingredients: ch.ingredients || '', tag: ch.tag || '硬核养生' },
          points_gained: ch.bonus || CHALLENGE_BONUS,
          badges_new: badgesA,
          player: playerView(pa)
        }
      };
    }

    // ===== 双人盲盒对局 =====
    function roomStateOf(raw) {
      const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      const first = list.length ? wrap(list[0]) : null;
      return first;
    }
    async function getRoom(roomId) {
      if (!roomId) return null;
      const res = await db.collection('rooms').doc(roomId).get();
      return roomStateOf(res.data);
    }
    async function saveRoom(room) {
      await db.collection('rooms').doc(room.roomId).set({ data: room });
    }
    function duelView(room, myUid) {
      return {
        roomId: room.roomId, code: room.code, phase: room.phase,
        players: room.players, exchange: room.exchange,
        winner: room.winner, tie: room.tie, penaltyDouble: room.penaltyDouble,
        timeoutLoser: room.timeoutLoser, deadline: room.deadline, myUid: myUid
      };
    }

    if (action === 'createDuel') {
      const nick = String(event.nick || '玩家A').slice(0, 12);
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const st = D.createState('', code, uid, nick, Date.now());
      const addRes = await db.collection('rooms').add({ data: st });
      st.roomId = addRes.id || addRes._id || '';
      await db.collection('rooms').doc(st.roomId).update({ data: { roomId: st.roomId } });
      return { success: true, data: duelView(st, uid) };
    }

    if (action === 'joinDuel') {
      const nick = String(event.nick || '玩家B').slice(0, 12);
      const roomId = String(event.roomId || '');
      const code = String(event.code || '');
      let room = null;
      if (roomId) room = await getRoom(roomId);
      else if (code) {
        const res = await db.collection('rooms').where({ code: code }).limit(1).get();
        room = roomStateOf(res.data);
      }
      if (!room) return { success: false, error: '房间不存在，请检查房间码' };
      if (room.players && room.players[uid]) {
        if (nick) room.players[uid].nick = nick;
        await saveRoom(room);
        return { success: true, data: duelView(room, uid) };
      }
      const rj = D.join(room, uid, nick, Date.now());
      if (!rj.success) return { success: false, error: rj.error };
      await saveRoom(room);
      return { success: true, data: duelView(room, uid) };
    }

    if (action === 'duelReady') {
      const room = await getRoom(String(event.roomId || ''));
      if (!room) return { success: false, error: '房间不存在' };
      D.tick(room, Date.now());
      const rr = D.ready(room, uid, event.ingredients, Date.now());
      if (!rr.success) return { success: false, error: rr.error };
      await saveRoom(room);
      return { success: true, data: duelView(room, uid) };
    }

    if (action === 'duelSwap') {
      const room = await getRoom(String(event.roomId || ''));
      if (!room) return { success: false, error: '房间不存在' };
      const rs = D.swap(room, uid, Date.now());
      if (!rs.success) return { success: false, error: rs.error };
      await saveRoom(room);
      return { success: true, data: duelView(room, uid) };
    }

    if (action === 'duelCook') {
      const room = await getRoom(String(event.roomId || ''));
      if (!room) return { success: false, error: '房间不存在' };
      D.tick(room, Date.now());
      // 点「开整」才算开始烹饪：给该玩家一个完整的 60s 烹饪窗口
      if (room.phase === 'swap' || room.phase === 'cook') {
        room.deadline = Math.max(room.deadline || 0, Date.now() + D.COOK_SECONDS * 1000);
      }
      const p = room.players[uid];
      if (!p) return { success: false, error: '你不在这个房间' };
      const firstUid = Object.keys(room.players)[0];
      const bomb = uid === firstUid ? (room.exchange.BtoA || '') : (room.exchange.AtoB || '');
      const list = (p.ingredients || []).slice();
      if (bomb && list.indexOf(bomb) < 0) list.push(bomb);
      const generated = await generate(list.join('、'), STYLES[0], 'weird', 'youmo');
      const rc = D.cook(room, uid, generated.recipe, Date.now());
      if (!rc.success) return { success: false, error: rc.error };
      await saveRoom(room);
      return { success: true, data: Object.assign(duelView(room, uid), { myRecipe: generated.recipe, bomb: bomb }) };
    }

    if (action === 'duelVote') {
      const room = await getRoom(String(event.roomId || ''));
      if (!room) return { success: false, error: '房间不存在' };
      D.tick(room, Date.now());
      const rv = D.vote(room, uid, Number(event.score), Date.now());
      if (!rv.success) return { success: false, error: rv.error };
      await saveRoom(room);
      return { success: true, data: duelView(room, uid) };
    }

    if (action === 'duelTimeout') {
      const room = await getRoom(String(event.roomId || ''));
      if (!room) return { success: false, error: '房间不存在' };
      const rt = D.timeout(room, uid, Date.now());
      if (!rt.success) return { success: false, error: rt.error };
      await saveRoom(room);
      return { success: true, data: duelView(room, uid) };
    }

    if (action === 'duelHeartbeat') {
      const room = await getRoom(String(event.roomId || ''));
      if (!room) return { success: false, error: '房间不存在' };
      D.tick(room, Date.now());
      const rh = D.heartbeat(room, uid, Date.now());
      if (!rh.success) return { success: false, error: rh.error };
      await saveRoom(room);
      return { success: true, data: duelView(room, uid) };
    }

    if (action === 'duelGet') {
      const room = await getRoom(String(event.roomId || ''));
      if (!room) return { success: false, error: '房间不存在' };
      const before = room.phase + '|' + (room.winner || '') + '|' + (room.tie ? '1' : '0');
      D.tick(room, Date.now());
      const after = room.phase + '|' + (room.winner || '') + '|' + (room.tie ? '1' : '0');
      if (before !== after) await saveRoom(room);
      return { success: true, data: duelView(room, uid) };
    }

    if (action === 'duelRematch') {
      const room = await getRoom(String(event.roomId || ''));
      if (!room) return { success: false, error: '房间不存在' };
      const rr = D.rematch(room, Date.now());
      if (!rr.success) return { success: false, error: rr.error };
      await saveRoom(room);
      return { success: true, data: duelView(room, uid) };
    }

    // 周计划管家：AI 批量生成一周不重复菜谱
    if (action === 'weekPlan') {
      const ingList = Array.isArray(event.ingredients)
        ? event.ingredients.filter(function (s) { return typeof s === 'string' && s.trim(); }).join('、')
        : String(event.ingredients || '').trim();
      const count = Math.min(Math.max(parseInt(event.count, 10) || 7, 1), 14);
      if (!ingList) return { success: false, error: '请先填写冰箱食材' };
      const plan = await aiGeneratePlan(ingList, count);
      if (!plan) return { success: false, error: 'AI 生成失败，请稍后再试' };
      return { success: true, data: { plan: plan } };
    }

    // 备菜指南：AI 生成批量食材预处理方案
    if (action === 'mealPrep') {
      const ingredient = String(event.ingredient || '').trim();
      if (!ingredient) return { success: false, error: '食材不能为空' };
      const plan = await aiMealPrep(ingredient);
      if (!plan) return { success: false, error: 'AI 生成失败，请稍后再试' };
      return { success: true, data: { ingredient: ingredient, plan: plan } };
    }

    // 反向搜索：想吃 X 但缺 Y → 冰箱食材平替
    if (action === 'reverseSearch') {
      const text = String(event.text || '').trim();
      if (!text) return { success: false, error: '请输入想吃的内容' };
      const ings = String(event.ingredients || '').trim();
      const res = await aiReverse(text, ings);
      if (!res) return { success: false, error: 'AI 生成失败，请稍后再试' };
      return { success: true, data: res };
    }

    // 默认动作：generate（生成菜谱 + 生存挑战打卡/积分）
    const ingredients = String((event && event.ingredients) || '').trim();
    if (!ingredients) {
      return { success: false, error: '食材不能为空' };
    }
    const style = STYLES.find(function (s) { return s.id === event.style; }) || STYLES[0];
    const p = await getOrCreatePlayer(uid);
    if (style.cost > 0 && (p.unlocked_styles || []).indexOf(style.id) < 0) {
      return { success: false, error: '该风格尚未解锁，先去攒积分吧' };
    }

    const mode = (event.mode === 'normal' || event.mode === 'synth') ? event.mode : 'weird';
    const generated = await generate(ingredients, style, mode, event.persona);
    const tag = guessTag(generated.recipe);

    const addRes = await db.collection('recipes').add({
      data: {
        ingredients: ingredients,
        recipe_data: generated.recipe,
        user_rating: '待评价',
        tag: tag,
        style: style.id,
        creator_uid: uid,
        dark_score: generated.recipe.darkScore || 0,
        danger_flags: generated.recipe.dangerFlags || [],
        shopping_list: generated.recipe.shoppingList || [],
        votes_up: 0,
        votes_down: 0,
        create_time: db.serverDate()
      }
    });

    // 每日打卡 + 积分结算
    const today = chinaToday();
    let dailyBonus = 0;
    let streakBonus = 0;
    if (p.last_daily !== today) {
      if (p.last_daily === yesterdayOf(today)) { p.streak += 1; } else { p.streak = 1; }
      p.last_daily = today;
      if (p.streak > p.best_streak) p.best_streak = p.streak;
      dailyBonus = 5;
      streakBonus = (p.streak - 1) * 2;
    }
    p.total_generates += 1;
    const pointsGained = calcPoints({ base: 10, streakBonus: streakBonus, dailyBonus: dailyBonus });
    p.points += pointsGained;
    const badgesNew = applyBadges(p);
    await savePlayer(p);

    return {
      success: true,
      data: {
        recipe: generated.recipe,
        recordId: addRes.id || addRes._id || '',
        fallback: generated.fallback,
        fromLib: generated.fromLib || false,
        tag: tag,
        style: style.id,
        points_gained: pointsGained,
        streak: p.streak,
        badges_new: badgesNew,
        player: playerView(p),
        styles: stylesView(p)
      },
      warning: generated.lastError || ''
    };
  } catch (err) {
    console.error('generateRecipe error:', err);
    return { success: false, error: (err && err.message) ? err.message : '服务开小差了' };
  }
};
