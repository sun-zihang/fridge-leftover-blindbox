// 与云函数 generateRecipe 对齐的常量（纯逻辑，便于页面使用）
const STYLES = [
  { id: 'classic',   name: '经典深夜食堂',      cost: 0,   tagline: '最原汁原味的作死配方' },
  { id: 'jianzhi',   name: '减脂期糊弄学',      cost: 50,  tagline: '骗自己说这顿不长肉' },
  { id: 'xiangqin',  name: '相亲对象最爱吃的菜', cost: 80,  tagline: '吃完立刻有理由买单走人' },
  { id: 'qiongren',  name: '月底吃土限定',      cost: 100, tagline: '把一块钱吃出五块钱的尊严' },
  { id: 'zaowu',     name: '养生（伪）硬核',     cost: 120, tagline: '红枣枸杞，主打一个心理安慰' }
];
const RANK_TAGS = ['深夜emo必吃', '月底吃土首选', '前任看了想打人', '吃完能瘦十斤（骗你的）', '硬核养生'];
const BADGES = [
  { id: '暗黑料理大师',   emoji: '👨‍🍳' },
  { id: '米其林在逃主厨', emoji: '🚑' },
  { id: '味蕾幸存者',     emoji: '🫡' }
];
const LOADING_LINES = [
  'AI 主厨正在和泡面进行灵魂搏斗…',
  '可乐和洋葱的谈判进入了白热化阶段…',
  '正在为你的剩菜注入米其林灵魂…',
  '冰箱深处传来神秘的咕噜声…',
  '主厨决定让鸡蛋和酸奶先和解…',
  '正在把黑暗料理往“能吃”的方向硬拽…',
  '泡面已经就位，就差一个大胆的创意…',
  '洋葱哭了，但主厨说这是料理的一部分…',
  '主厨正在给剩菜们开动员大会…',
  '酱油和醋正在争夺今晚的 C 位…',
  '主厨把锅铲甩出了残影…',
  '剩菜们正在接受命运的安排…',
  '冰箱里传来一阵低语：“求你别放过我”…',
  '主厨深吸一口气，决定赌一把大的…',
  '调味料们正在举手表决今晚的菜名…',
  '锅已经热好，就差一个敢吃的人…'
];
function demoRecipe(ingredients) {
  return {
    name: '主厨的倔强炒饭',
    steps: [
      '把“' + (ingredients || '剩菜') + '”切成丁，假装它们本来就是一个团队。',
      '热锅凉油，倒入食材，翻炒到它们认命为止。',
      '出锅前撒一把葱花，主打一个“尽力了”。'
    ],
    plating: '用一个平时不敢用的盘子，凹出米其林三星的自信。',
    warning: '肠胃敏感者请酌情食用，厨房已尽力，后果自负。'
  };
}
module.exports = { STYLES, RANK_TAGS, BADGES, LOADING_LINES, demoRecipe };
