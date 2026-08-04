// 内置家常菜谱库（206 道，蒸馏自「厨房小课堂」）
const NR = require('./normalRecipes');

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
  '锅已经热好，就差一个敢吃的人…',
  '主厨正在给剩菜们传授“最后一课”…',
  '锅底的火苗已经按捺不住了…',
  '主厨对着食材说：要么好吃，要么成仁…',
  '香气还没出来，悬念先拉满了…',
  '调味料们开始内卷，纷纷抢着出风头…',
  '主厨偷偷给这道菜加了亿点心意…',
  '食材们正在接受命运的终极审判…',
  '再等一等，黑暗料理马上闪亮登场…'
];
function demoRecipe(ingredients) {
  const ing = ingredients || '剩菜';
  const pool = [
    {
      name: '主厨的倔强炒饭',
      steps: [
        '把“' + ing + '”切成丁，假装它们本来就是一个团队。',
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
        '把“' + ing + '”和泡面一起下锅，像对待前任一样无情。',
        '热水一冲，香味立刻出卖了你的深夜。',
        '卧一个蛋，假装这是一顿正经的晚饭。'
      ],
      plating: '端到窗边就着夜色吃，仪式感拉满。',
      warning: '泡面虽好，别顿顿靠它续命，营养要跟上。'
    },
    {
      name: '勇者土豆泥堡垒',
      steps: [
        '把“' + ing + '”处理干净，和土豆一起压成泥。',
        '捏一座小山，淋上灵魂酱汁。',
        '插一根勺子当剑，宣布堡垒建成。'
      ],
      plating: '用白盘衬托泥山的壮丽，拍照自带光环。',
      warning: '小心烫嘴，勇者也怕土豆泥的体温。'
    },
    {
      name: '昨日重现蛋包饭',
      steps: [
        '把“' + ing + '”和剩饭炒香，铺上金黄的蛋皮。',
        '挤上番茄酱，画一个笑脸。',
        '一口下去，仿佛回到了昨天的晚餐。'
      ],
      plating: '用铁盘装，蛋皮油亮，刀叉齐上。',
      warning: '蛋皮要趁热切开，冷了就凝固成遗憾。'
    }
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}


// 正常家常模式演示/兜底：从内置菜谱库按食材出菜（带详细菜单字段）
function demoNormalRecipe(ingredients) {
  return NR.getNormalAppRecipe(ingredients);
}



// ===== 食材识别：让动画/文案更贴合用户输入的菜 =====
const INGREDIENT_EMOJI = {
  '洋葱':'🧅','泡面':'🍜','面':'🍜','面条':'🍜','可乐':'🥤','汽水':'🥤','雪碧':'🥤','土豆':'🥔','番茄':'🍅','西红柿':'🍅','鸡蛋':'🥚','蛋':'🥚','香蕉':'🍌','牛奶':'🥛','酸奶':'🥛','芝士':'🧀','奶酪':'🧀','肉':'🥩','五花肉':'🥓','鸡':'🍗','鸭':'🦆','鱼':'🐟','虾':'🦐','蟹':'🦀','米饭':'🍚','饭':'🍚','青菜':'🥬','白菜':'🥬','萝卜':'🥕','胡萝卜':'🥕','玉米':'🌽','黄瓜':'🥒','茄子':'🍆','辣椒':'🌶️','蒜':'🧄','花生':'🥜','苹果':'🍎','梨':'🍐','橙':'🍊','芒果':'🥭','草莓':'🍓','西瓜':'🍉','葡萄':'🍇','桃':'🍑','柠檬':'🍋','菠萝':'🍍','椰':'🥥','茶':'🍵','咖啡':'☕','啤酒':'🍺','汤圆':'🍡','饺子':'🥟','面包':'🍞','汉堡':'🍔','披萨':'🍕','薯条':'🍟','蛋糕':'🍰','巧克力':'🍫','冰淇淋':'🍦','年糕':'','馒头':'','包子':'','豆腐':'','海带':'','木耳':'','蘑菇':'🍄','西兰花':'🥦','南瓜':'🎃','红薯':'🍠','山药':''
};
const GENERIC_EMOJI = ['🥬','🥕','🌽','🍅','🥔','🍄','🥦','🍆'];

// 动态文案模板：{0}{1}{2} 对应前几个食材
const DYNAMIC_TEMPLATES = [
  '主厨正在和「{0}」进行灵魂搏斗…',
  '「{0}」和「{1}」的谈判进入了白热化阶段…',
  '正在给「{0}」注入米其林灵魂…',
  '「{0}」已经在锅里认命了…',
  '主厨决定让「{0}」和「{1}」先和解…',
  '「{0}」发出了一声绝望的咕噜…',
  '主厨正在为「{0}」安排一场体面的出场…',
  '「{1}」表示愿意为这顿饭牺牲自己…',
  '主厨对着「{0}」说：要么好吃，要么成仁…',
  '「{0}」和「{2}」正在争夺今晚的 C 位…'
];

// 从输入文本提取食材词（去掉数量词/虚词）
function parseIngredients(text) {
  const parts = String(text || '').split(/[、，,;；\s和及与]+/);
  const noiseRe = new RegExp('半个|一包|一点|少许|一根|两颗|三只|两块|一片|一些|剩下的|剩的|刚|的|半|个|包|根|片|块|只|把|勺|碗|瓶|杯|盒|袋|条|两|一|二|三|四|五|六|七|八|九|十', 'g');
  const out = [];
  parts.forEach(function (raw) {
    const t = String(raw || '').trim().replace(noiseRe, '');
    if (t && t.length >= 1 && out.indexOf(t) < 0) out.push(t);
  });
  return out.slice(0, 4);
}

function emojiFor(text) {
  for (const k in INGREDIENT_EMOJI) {
    if (String(text).indexOf(k) >= 0 && INGREDIENT_EMOJI[k]) return INGREDIENT_EMOJI[k];
  }
  return GENERIC_EMOJI[Math.floor(Math.random() * GENERIC_EMOJI.length)];
}

// 生成贴合食材的加载文案列表（动态 + 通用混合，随机打乱）
function buildLoadingLines(ingredientsText) {
  const parts = parseIngredients(ingredientsText);
  const lines = LOADING_LINES.slice();
  if (parts.length >= 1) {
    DYNAMIC_TEMPLATES.forEach(function (tpl, i) {
      const a = parts[0] || '剩菜';
      const b = parts[1] || parts[0] || '调味料';
      const c = parts[2] || parts[0] || '锅';
      lines.push(tpl.replace('{0}', a).replace('{1}', b).replace('{2}', c));
    });
  }
  // 洗牌
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = lines[i]; lines[i] = lines[j]; lines[j] = t;
  }
  return lines;
}

// 根据食材生成"满天飞"的 emoji 列表
function flyingEmojis(ingredientsText) {
  const parts = parseIngredients(ingredientsText);
  const list = [];
  const used = parts.map(function (t) { return emojiFor(t); });
  if (used.length < 2) { used.push('✨', '🔥'); }
  used.slice(0, 5).forEach(function (e, i) {
    list.push({
      emoji: e,
      left: 30 + Math.random() * 200,
      delay: (i * 400) + Math.floor(Math.random() * 300),
      dur: 2200 + Math.floor(Math.random() * 1200),
      size: 30 + Math.floor(Math.random() * 14)
    });
  });
  return list;
}


module.exports = { STYLES, RANK_TAGS, BADGES, LOADING_LINES, demoRecipe, demoNormalRecipe, NORMAL_RECIPES: NR, matchNormalRecipe: NR.matchNormalRecipe, getNormalAppRecipe: NR.getNormalAppRecipe, parseIngredients, buildLoadingLines, flyingEmojis };

