// 云函数纯逻辑：兜底菜谱 / JSON 提取 / 校验规范化
// 独立成模块以便本地单元测试（node --test），不依赖云环境。

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

module.exports = { fallbackRecipe: fallbackRecipe, extractJson: extractJson, normalizeRecipe: normalizeRecipe };
