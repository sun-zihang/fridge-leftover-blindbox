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
  STYLES, STYLE_PROMPTS, guessTag, calcPoints
} = require('./recipe');
const NR = require('./normalRecipes');

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const ai = app.ai();
const db = app.database();

const MODEL = 'qwen3.5-flash'; // 通义千问：体验版可启用（DeepSeek 需升级标准版）
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
  '"warning": "一句贴心的注意事项"}';

const SYSTEM_PROMPT =
  '你是一位拥有米其林三星实力，但性格幽默、热爱互联网冲浪的"深夜食堂主厨"。' +
  '用户会给你几种冰箱里快过期的奇葩食材，你需要将它们组合成一道菜。' +
  '请严格以 JSON 格式输出，不要包含任何多余的解释文本。' +
  'JSON 结构如下：' +
  '{"name": "包含谐音梗或网络热词的菜名，不超过10个字",' +
  '"steps": ["步骤1（脱口秀语气）", "步骤2", "步骤3"],' +
  '"plating": "极其夸张或搞笑的摆盘建议",' +
  '"warning": "一句话提醒这道菜的风险或注意事项"}';

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

async function generate(ingredients, style, mode) {
  // 正常家常模式：优先从内置菜谱库（206 道家常菜）按食材匹配，命中直接返回（含详细菜单字段）
  if (mode === 'normal') {
    const hit = NR.matchNormalRecipe(ingredients);
    if (hit) {
      return { recipe: NR.toAppRecipe(hit), fallback: false, fromLib: true, lastError: '' };
    }
  }
  const model = ai.createModel('cloudbase');
  let recipe = null;
  let lastError = '';
  const stylePrompt = (style && style.id !== 'classic') ? STYLE_PROMPTS[style.id] : '';
  const basePrompt = mode === 'normal' ? NORMAL_PROMPT : SYSTEM_PROMPT;

  for (let i = 0; i < 3; i++) {
    try {
      const messages = [
        { role: 'system', content: basePrompt },
        { role: 'user', content: '我的食材是：' + ingredients }
      ];
      if (stylePrompt) {
        messages.push({ role: 'user', content: '风格要求：' + stylePrompt });
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
    if (mode === 'normal') {
      return { recipe: normalFallbackRecipe(ingredients), fallback: true, fromLib: true, lastError: lastError };
    }
    return { recipe: fallbackRecipe(), fallback: true, lastError: lastError };
  }
  return { recipe: recipe, fallback: false, fromLib: false, lastError: lastError };
}

// ---------- 红黑榜 / 博物馆 ----------

async function listRank(tag) {
  const res = await db.collection('recipes')
    .limit(200)
    .get();
  const rated = (res.data || [])
    .map(function (r) { return wrap(r); })
    .filter(function (d) {
      return d.user_rating === '真香' || d.user_rating === '已进医院';
    })
    .filter(function (d) { return !tag || d.tag === tag; })
    .sort(function (a, b) {
      const ta = a.create_time ? new Date(a.create_time).getTime() : 0;
      const tb = b.create_time ? new Date(b.create_time).getTime() : 0;
      return tb - ta;
    });
  return rated.slice(0, 30).map(function (d) {
    const rd = d.recipe_data || {};
    return {
      recordId: typeof d._id === 'string' ? d._id : '',
      name: typeof rd.name === 'string' && rd.name ? rd.name : '未命名料理',
      rating: typeof d.user_rating === 'string' ? d.user_rating : '',
      warning: typeof rd.warning === 'string' ? rd.warning : '',
      ingredients: typeof d.ingredients === 'string' ? d.ingredients : '',
      tag: typeof d.tag === 'string' ? d.tag : '硬核养生',
      recipe_data: rd
    };
  });
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
      ensureCollection('challenges')
    ]);

    // 评价：更新评分 + 玩家积分/徽章
    if (action === 'rate') {
      const recordId = event.recordId;
      const rating = event.rating;
      if (!recordId || (rating !== '真香' && rating !== '已进医院')) {
        return { success: false, error: '参数不合法' };
      }
      await db.collection('recipes').doc(recordId).update({
        data: { user_rating: rating, rate_time: db.serverDate() }
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

    const mode = event.mode === 'normal' ? 'normal' : 'weird';
    const generated = await generate(ingredients, style, mode);
    const tag = guessTag(generated.recipe);

    const addRes = await db.collection('recipes').add({
      data: {
        ingredients: ingredients,
        recipe_data: generated.recipe,
        user_rating: '待评价',
        tag: tag,
        style: style.id,
        creator_uid: uid,
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
