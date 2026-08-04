// 云函数：generateRecipe
// 功能：调用 CloudBase 托管大模型生成创意菜谱（严格 JSON 输出并校验），
//       写入 recipes 集合；同时提供 rate（评价）动作。
// 依赖：@cloudbase/node-sdk >= 3.16.0（云函数目录内 package.json 已声明）
// 注意：部署后在云函数配置中把超时时间设置为 60~120 秒。

const tcb = require('@cloudbase/node-sdk');

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

// 兜底菜谱：AI 彻底失败时返回，保证前端不崩溃
function fallbackRecipe() {
  return {
    name: '主厨的倔强炒饭',
    steps: [
      '把冰箱里所有食材切成丁，假装它们本来就是一个团队。',
      '热锅凉油，倒入食材，翻炒到它们认命为止。',
      '出锅前撒一把葱花，主打一个"尽力了"。'
    ],
    plating: '用一个平时不敢用的盘子，凹出米其林三星的自信。',
    warning: '肠胃敏感者请酌情食用，厨房已尽力，后果自负。'
  };
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

// 调用大模型生成，失败/非法时重试一次
async function generate(ingredients) {
  const model = ai.createModel('cloudbase');
  let recipe = null;
  let lastError = '';

  for (let i = 0; i < 2; i++) {
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

    // 默认动作：generate（生成菜谱）
    const ingredients = String((event && event.ingredients) || '').trim();
    if (!ingredients) {
      return { success: false, error: '食材不能为空' };
    }

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
