// 云函数：generateRecipe
// 功能：调用 CloudBase 托管大模型生成创意菜谱（严格 JSON 输出并校验），
//       写入 recipes 集合；提供 rate（评价）与 listRank（红黑榜查询）动作。
// 依赖：@cloudbase/node-sdk >= 3.16.0（云函数目录内 package.json 已声明）
// 注意：部署后在云函数配置中把超时时间设置为 60~120 秒。

const tcb = require('@cloudbase/node-sdk');
const { fallbackRecipe, extractJson, normalizeRecipe } = require('./recipe');

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const ai = app.ai();
const db = app.database();

// 模型 ID（需在云开发控制台 -> AI 模型 中启用；默认 deepseek-v4-flash）
const MODEL = 'deepseek-v4-flash';

// PRD 规定的 System Prompt
const SYSTEM_PROMPT =
  '你是一位拥有米其林三星实力，但性格幽默、热爱互联网冲浪的"深夜食堂主厨"。' +
  '用户会给你几种冰箱里快过期的奇葩食材，你需要将它们组合成一道菜。' +
  '请严格以 JSON 格式输出，不要包含任何多余的解释文本。' +
  'JSON 结构如下：' +
  '{"name": "包含谐音梗或网络热词的菜名，不超过10个字",' +
  '"steps": ["步骤1（脱口秀语气）", "步骤2", "步骤3"],' +
  '"plating": "极其夸张或搞笑的摆盘建议",' +
  '"warning": "一句话提醒这道菜的风险或注意事项"}';

// 调用大模型生成，失败/非法时最多重试两次（共 3 次尝试）
async function generate(ingredients) {
  const model = ai.createModel('cloudbase');
  let recipe = null;
  let lastError = '';

  for (let i = 0; i < 3; i++) {
    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: '我的食材是：' + ingredients }
      ];
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
    return { recipe: fallbackRecipe(), fallback: true, lastError: lastError };
  }
  return { recipe: recipe, fallback: false, lastError: lastError };
}

// 红黑榜：取最近 100 条，JS 端过滤已评价（真香 / 已进医院）并按 create_time 倒序取前 20 条。
// 说明：该环境 node-sdk 读取文档时返回 { _id, data: {...} }（字段未自动解包），
//       直接按顶层字段过滤/排序会拿到 undefined，因此这里先统一解包 data 再处理。
async function listRank() {
  const res = await db.collection('recipes')
    .limit(100)
    .get();

  const rated = (res.data || [])
    .map(function (r) {
      const d = r && r.data && typeof r.data === 'object' ? r.data : r;
      return d;
    })
    .filter(function (d) {
      return d.user_rating === '真香' || d.user_rating === '已进医院';
    })
    .sort(function (a, b) {
      const ta = a.create_time ? new Date(a.create_time).getTime() : 0;
      const tb = b.create_time ? new Date(b.create_time).getTime() : 0;
      return tb - ta;
    });

  return rated.slice(0, 20).map(function (d) {
    const rd = d.recipe_data || {};
    return {
      name: typeof rd.name === 'string' && rd.name ? rd.name : '未命名料理',
      rating: typeof d.user_rating === 'string' ? d.user_rating : '',
      warning: typeof rd.warning === 'string' ? rd.warning : '',
      ingredients: typeof d.ingredients === 'string' ? d.ingredients : ''
    };
  });
}

// 确保 recipes 集合存在（幂等：已存在时报错忽略，避免每次查询/写入前手动建集合）
async function ensureRecipesCollection() {
  try {
    await db.createCollection('recipes');
  } catch (err) {
    const msg = (err && err.message) ? String(err.message) : String(err);
    if (msg.indexOf('exist') < 0) {
      throw err;
    }
  }
}

exports.main = async (event) => {
  const action = event && event.action;
  try {
    // 动作：rate（评价）
    if (action === 'rate') {
      const recordId = event.recordId;
      const rating = event.rating;
      if (!recordId || (rating !== '真香' && rating !== '已进医院')) {
        return { success: false, error: '参数不合法' };
      }
      await db.collection('recipes').doc(recordId).update({
        data: { user_rating: rating, rate_time: db.serverDate() }
      });
      return { success: true, data: { recordId: recordId } };
    }

    // 动作：listRank（红黑榜查询）
    if (action === 'listRank') {
      await ensureRecipesCollection();
      const data = await listRank();
      return { success: true, data: data };
    }

    // 默认动作：generate（生成菜谱）
    const ingredients = String((event && event.ingredients) || '').trim();
    if (!ingredients) {
      return { success: false, error: '食材不能为空' };
    }

    await ensureRecipesCollection();

    const generated = await generate(ingredients);

    const addRes = await db.collection('recipes').add({
      data: {
        ingredients: ingredients,
        recipe_data: generated.recipe,
        user_rating: '待评价',
        create_time: db.serverDate()
      }
    });

    return {
      success: true,
      data: {
        recipe: generated.recipe,
        recordId: addRes.id || addRes._id || '',
        fallback: generated.fallback
      },
      warning: generated.lastError || ''
    };
  } catch (err) {
    console.error('generateRecipe error:', err);
    return { success: false, error: (err && err.message) ? err.message : '服务开小差了' };
  }
};
