/* 厨房生活管家 · 纯逻辑工具库（周计划 / 买菜清单合并 / 备菜指南 / 反向搜索 / 带饭标签）
 * 浏览器挂 window.PRACTICAL；Node 可直接 require。
 * 数据约定：pools = { iddzz:[app菜谱], howToCook:[app菜谱], normal:[app菜谱] }（app 菜谱含 name/steps/ings 等字段）
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.PRACTICAL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

  // 确定性伪随机（同 seed 结果一致）
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* ================= 带饭友好度标签 ================= */
  var LUNCH_BAD = /刺身|生食|凉拌|沙拉|油炸|干炸|酥脆|脆皮|天妇罗|冰淇淋|雪糕|冰粉|冷饮|凉面|凉皮|绿叶|焦|炸酥/;
  var LUNCH_GOOD = /炖|焖|卤|红烧|咖喱|煲|烩|蒸|煮|汤|羹|粥|饭|肉|鸡|鱼|排骨|豆腐|蛋|土豆|番茄|菌菇|香菇|牛|羊|虾/;

  function lunchboxTag(recipe) {
    var r = recipe || {};
    var text = norm(r.name) + ' ' + norm((r.steps || []).join(' ')) + ' ' + norm((r.ings || []).join(' '));
    if (LUNCH_BAD.test(text)) {
      return { label: '⚠️ 不宜带饭', cls: 'lb-bad', tip: '绿叶/油炸/生食类适合现做现吃，隔夜口感大跌' };
    }
    if (LUNCH_GOOD.test(text)) {
      return { label: '✅ 微波加热不变味', cls: 'lb-good', tip: '微波中火 2~3 分钟，带饭首选' };
    }
    return { label: '🍱 适合第二天带饭', cls: 'lb-ok', tip: '密封冷藏，吃前热透即可' };
  }

  /* ================= 食材名解析：「洋葱 3 个」→「洋葱」 ================= */
  function ingNameOf(s) {
    var t = String(s || '');
    t = t.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');
    var m = t.match(/[\d０-９]/);
    if (m) t = t.slice(0, m.index);
    else {
      var sp = t.indexOf(' ');
      if (sp > 0) t = t.slice(0, sp);
    }
    return t.replace(/[，,、；;：:\s]+$/g, '').trim();
  }

  function poolAll(pools) {
    var out = [];
    var seen = {};
    ['iddzz', 'howToCook', 'normal'].forEach(function (k) {
      var arr = (pools && pools[k]) || [];
      arr.forEach(function (r) {
        if (!r || !r.name) return;
        var key = norm(r.name);
        if (seen[key]) return;
        seen[key] = 1;
        out.push(r);
      });
    });
    return out;
  }

  /* ================= 周计划（本地兜底）：7 天不重复，优先冰箱食材 ================= */
  function buildWeekPlanLocal(pools, fridgeNames, seed, fromDate) {
    var all = poolAll(pools);
    if (!all.length) return [];
    var names = (fridgeNames || []).map(norm).filter(Boolean);
    var base = fromDate ? new Date(fromDate) : new Date();
    var dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    function labelFor(offset) {
      var d = new Date(base.getTime() + offset * 86400000);
      var md = (d.getMonth() + 1) + '月' + d.getDate() + '日';
      return { dayLabel: offset === 0 ? '明天' : (offset === 1 ? '后天' : dayNames[d.getDay()]), dateLabel: md + ' ' + dayNames[d.getDay()] };
    }
    function overlap(r) {
      var rIngs = (r.ingNames || []).map(norm);
      if (!rIngs.length) rIngs = (r.ings || []).map(ingNameOf).map(norm);
      var n = 0;
      names.forEach(function (u) {
        if (rIngs.some(function (ri) { return ri.indexOf(u) >= 0 || u.indexOf(ri) >= 0; })) n++;
      });
      return n;
    }
    var rand = rng((seed || 1) + 7);
    var scored = all.map(function (r, i) {
      return { r: r, ov: overlap(r), rnd: rand() + i * 1e-9 };
    });
    scored.sort(function (a, b) {
      if (b.ov !== a.ov) return b.ov - a.ov;
      return a.rnd - b.rnd;
    });
    var picked = [];
    var used = {};
    scored.forEach(function (it) {
      if (picked.length >= 7) return;
      var key = norm(it.r.name);
      if (used[key]) return;
      used[key] = 1;
      picked.push(it.r);
    });
    return picked.slice(0, 7).map(function (r, i) {
      return { dayLabel: labelFor(i).dayLabel, dateLabel: labelFor(i).dateLabel, recipe: r, lunchbox: lunchboxTag(r) };
    });
  }

  /* ================= 买菜清单合并：同名计数去重，冰箱已有扣除 ================= */
  function mergeShoppingList(planRecipes, fridgeNames) {
    var counts = {};
    var display = {};
    var have = {};
    var fridgeSet = {};
    (fridgeNames || []).forEach(function (n) { if (n) fridgeSet[norm(n)] = 1; });
    (planRecipes || []).forEach(function (r) {
      var ings = (r && r.ings) || [];
      var seenInDish = {};
      ings.forEach(function (s) {
        var name = ingNameOf(s);
        if (!name) return;
        var key = norm(name);
        if (seenInDish[key]) return;
        seenInDish[key] = 1;
        counts[key] = (counts[key] || 0) + 1;
        if (!display[key]) display[key] = name;
        if (fridgeSet[key]) have[key] = 1;
      });
    });
    var out = [];
    Object.keys(counts).forEach(function (key) {
      var count = counts[key];
      if (have[key]) count = Math.max(0, count - 1);
      out.push({ name: display[key] || key, count: count, have: !!have[key] });
    });
    out.sort(function (a, b) { return b.count - a.count; });
    return out;
  }

  /* ================= 备菜指南（本地兜底）：按食材类别模板 ================= */
  var PREP_TEMPLATES = [
    { re: /鸡胸/, items: [
      { method: '切块腌制', storage: '冷冻', shelfLife: '7 天', recipeName: '宫保鸡丁', desc: '加料酒生抽腌 15 分钟后分装冷冻，解冻即炒' },
      { method: '手撕成丝', storage: '冷藏', shelfLife: '2 天', recipeName: '凉拌鸡丝', desc: '煮 8 分钟放凉撕丝，拌黄瓜或麻酱' },
      { method: '切片煎制', storage: '冷藏', shelfLife: '2 天', recipeName: '黑椒鸡胸', desc: '切片用黑胡椒盐腌好，平底锅少油煎' },
      { method: '剁碎成馅', storage: '冷冻', shelfLife: '5 天', recipeName: '鸡肉丸子', desc: '加蛋清淀粉搅上劲，挤丸子冷冻' }
    ]},
    { re: /鸡腿/, items: [
      { method: '去骨切块腌制', storage: '冷冻', shelfLife: '7 天', recipeName: '黄焖鸡', desc: '去骨切块，加生抽老抽腌好分装冷冻' },
      { method: '整腿腌制冷冻', storage: '冷冻', shelfLife: '7 天', recipeName: '烤鸡腿', desc: '奥尔良腌料抹匀后密封冷冻，烤前解冻' },
      { method: '煮熟拆丝', storage: '冷藏', shelfLife: '2 天', recipeName: '手撕鸡', desc: '葱姜水煮熟放凉拆丝，拌椒麻汁' }
    ]},
    { re: /五花肉|猪肉|排骨/, items: [
      { method: '切片分装', storage: '冷冻', shelfLife: '7 天', recipeName: '回锅肉', desc: '切薄片按份量分装，用时直接下锅' },
      { method: '切块焯水', storage: '冷冻', shelfLife: '7 天', recipeName: '红烧肉', desc: '切块冷水下锅焯水后冷冻，炖前解冻' },
      { method: '剁成肉末', storage: '冷冻', shelfLife: '5 天', recipeName: '肉末茄子', desc: '绞肉分装压扁冷冻，解冻更快' }
    ]},
    { re: /牛肉/, items: [
      { method: '切丝腌制', storage: '冷藏', shelfLife: '2 天', recipeName: '青椒炒牛肉', desc: '逆纹切丝，加生抽淀粉抓匀冷藏' },
      { method: '切块炖煮', storage: '冷冻', shelfLife: '7 天', recipeName: '番茄牛腩', desc: '切块焯水后冷冻，炖汤随时可用' },
      { method: '剁馅做丸', storage: '冷冻', shelfLife: '5 天', recipeName: '牛肉丸子', desc: '加洋葱蛋清搅上劲，挤丸冷冻' }
    ]},
    { re: /虾/, items: [
      { method: '去壳留尾', storage: '冷冻', shelfLife: '7 天', recipeName: '油焖大虾', desc: '去壳留尾去虾线，分装冷冻' },
      { method: '剥仁分装', storage: '冷冻', shelfLife: '7 天', recipeName: '虾仁滑蛋', desc: '剥成虾仁，用盐淀粉抓匀后冷冻' },
      { method: '整虾冷冻', storage: '冷冻', shelfLife: '7 天', recipeName: '白灼虾', desc: '洗净沥干直接冷冻，吃时白灼' }
    ]},
    { re: /土豆/, items: [
      { method: '切块冷冻', storage: '冷冻', shelfLife: '7 天', recipeName: '咖喱土豆', desc: '切块焯水 1 分钟沥干后冷冻' },
      { method: '切丝泡水', storage: '冷藏', shelfLife: '1 天', recipeName: '酸辣土豆丝', desc: '切丝泡水去淀粉，冷藏当天用完' },
      { method: '蒸熟压泥', storage: '冷藏', shelfLife: '2 天', recipeName: '土豆泥', desc: '蒸熟压泥调味，可做饼或焗菜' }
    ]},
    { re: /鸡蛋|蛋/, items: [
      { method: '煮好冷藏', storage: '冷藏', shelfLife: '4 天', recipeName: '茶叶蛋', desc: '煮 8 分钟过凉水，带壳冷藏' },
      { method: '打散分装', storage: '冷冻', shelfLife: '30 天', recipeName: '蒸蛋', desc: '蛋液加盐打散，密封冷冻，用时解冻' },
      { method: '煎成蛋饼', storage: '冷藏', shelfLife: '2 天', recipeName: '早餐蛋饼', desc: '煎成蛋饼卷好，早上微波加热' }
    ]},
    { re: /米饭|剩饭/, items: [
      { method: '分装冷冻', storage: '冷冻', shelfLife: '30 天', recipeName: '蛋炒饭', desc: '按一碗份量装袋压平冷冻，炒前无需解冻' },
      { method: '做成饭团', storage: '冷藏', shelfLife: '2 天', recipeName: '三角饭团', desc: '拌入肉松海苔捏成饭团，方便带饭' },
      { method: '煮成粥', storage: '冷藏', shelfLife: '2 天', recipeName: '皮蛋瘦肉粥', desc: '加高汤小火熬成粥，早餐加热即食' }
    ]}
  ];
  var PREP_GENERIC = [
    { method: '洗净切好', storage: '冷冻', shelfLife: '5 天', recipeName: '时蔬小炒', desc: '洗净切好按份量分装，用时直接下锅' },
    { method: '腌制入味', storage: '冷藏', shelfLife: '2 天', recipeName: '家常腌制', desc: '加生抽料酒腌好冷藏，随取随用' },
    { method: '焯水半熟', storage: '冷冻', shelfLife: '7 天', recipeName: '凉拌或快炒', desc: '焯水 30 秒过凉沥干，冷冻备用' },
    { method: '分份冷冻', storage: '冷冻', shelfLife: '7 天', recipeName: '快手家常菜', desc: '按每餐用量分装，解冻即烹' }
  ];

  function buildMealPrepLocal(pools, ingredient) {
    var ing = String(ingredient || '').trim();
    var tpl = null;
    for (var i = 0; i < PREP_TEMPLATES.length; i++) {
      if (PREP_TEMPLATES[i].re.test(ing)) { tpl = PREP_TEMPLATES[i].items; break; }
    }
    if (!tpl) tpl = PREP_GENERIC;
    var all = poolAll(pools);
    function findRecipe(nameKey) {
      var key = norm(nameKey);
      var fuzzy = null;
      for (var j = 0; j < all.length; j++) {
        var rn = norm(all[j].name);
        if (rn === key) return all[j];
        if (!fuzzy && rn.indexOf(key) >= 0) fuzzy = all[j];
      }
      return fuzzy || null;
    }
    return tpl.map(function (it) {
      var rec = findRecipe(it.recipeName);
      return {
        method: it.method,
        storage: it.storage,
        shelfLife: it.shelfLife,
        recipeName: rec ? rec.name : it.recipeName,
        recipe: rec || null,
        desc: it.desc
      };
    });
  }

  /* ================= 反向搜索（本地兜底）：想吃 X [但没 Y] → 平替 ================= */
  var SAUCE_PREFIX = /^(糖醋|鱼香|宫保|麻辣|香辣|辣子|可乐|红烧|清蒸|白灼|干煸|水煮|蒜蓉|黑椒|孜然|咖喱|番茄|酱爆|京酱|回锅|小炒|黄焖|粉蒸|酸菜|梅菜|葱油|椒盐|蜜汁|照烧|卤|炖|焖|烤|煎)/;

  function reverseSearchLocal(pools, text, fridgeNames) {
    var t = String(text || '').trim();
    var want = '';
    var missing = '';
    // 先按转折/缺失词切分：head=想吃的内容，tail=缺失说明
    var markers = ['但是', '可是', '不过', '就是', '但', '没有', '没', '缺'];
    var stopIdx = -1;
    for (var mi = 0; mi < markers.length; mi++) {
      var idx = t.indexOf(markers[mi]);
      if (idx >= 0 && (stopIdx < 0 || idx < stopIdx)) stopIdx = idx;
    }
    var head = stopIdx >= 0 ? t.slice(0, stopIdx) : t;
    var tail = stopIdx >= 0 ? t.slice(stopIdx) : '';
    var mW = head.match(/想(?:吃|尝尝?)?\s*([^\s，,。；;！!？?]+)/);
    if (mW) want = mW[1].trim();
    if (!want) {
      var mW2 = t.match(/想(?:吃|尝尝?)?\s*([^\s，,。；;！!？?]+)/);
      if (mW2) want = mW2[1].trim();
    }
    if (tail) {
      var mM = tail.match(/没(?:有)?\s*([^\s，,。；;！!？?]+)/) || tail.match(/缺\s*([^\s，,。；;！!？?]+)/);
      if (mM) missing = mM[1].trim();
    }
    want = want.replace(/了|的|菜|饭$/g, '').replace(/[，,。；;！!？?]+$/g, '').trim();
    missing = missing.replace(/了|的|材料|食材|配料|佐料$/g, '').trim();

    var all = poolAll(pools);
    function findWant() {
      var key = norm(want);
      var fuzzy = null;
      for (var i = 0; i < all.length; i++) {
        var rn = norm(all[i].name);
        if (rn === key) return all[i];
        if (!fuzzy && rn.indexOf(key) >= 0) fuzzy = all[i];
      }
      var core = want.replace(SAUCE_PREFIX, '');
      if (core && core !== want) {
        for (var j = 0; j < all.length; j++) {
          var rn2 = norm(all[j].name);
          if (!fuzzy && rn2.indexOf(core) >= 0) fuzzy = all[j];
        }
      }
      return fuzzy;
    }
    var recipe = findWant();
    var fridge = (fridgeNames || []).map(function (n) { return String(n).trim(); }).filter(Boolean);
    var substitute = fridge.length ? fridge[0] : '';
    var resultName = '';
    var tip = '';
    if (recipe) {
      if (missing && substitute) {
        var replaced = recipe.name.replace(missing, substitute);
        resultName = (replaced !== recipe.name) ? replaced : (recipe.name + '（' + substitute + '版）');
      } else {
        resultName = recipe.name;
      }
      tip = (missing && substitute)
        ? '没「' + missing + '」？用冰箱里的「' + substitute + '」做平替「' + resultName + '」'
        : '想吃就做！照着菜谱来一份';
    } else {
      resultName = want + (substitute ? '（用「' + substitute + '」做' + want + '风味）' : '（做法参考）');
      tip = substitute
        ? '冰箱里有「' + substitute + '」，可以试试' + substitute + '版「' + want + '」'
        : '冰箱里还没有可用食材，先去补点货吧';
    }
    return { want: want, missing: missing, substitute: substitute, resultName: resultName, recipe: recipe, tip: tip };
  }

  /* ================= 调味品用量规范化：统一为克(g)/毫升(ml) ================= */
  var COND_DEFAULTS = [
    { re: /盐/, unit: 'g', val: 3 },
    { re: /生抽|酱油/, unit: 'ml', val: 10 },
    { re: /老抽/, unit: 'ml', val: 5 },
    { re: /料酒/, unit: 'ml', val: 10 },
    { re: /醋/, unit: 'ml', val: 10 },
    { re: /蚝油/, unit: 'g', val: 10 },
    { re: /淀粉/, unit: 'g', val: 10 },
    { re: /豆瓣酱/, unit: 'g', val: 15 },
    { re: /番茄酱/, unit: 'g', val: 15 },
    { re: /甜面酱|黄豆酱/, unit: 'g', val: 15 },
    { re: /鸡精|味精/, unit: 'g', val: 2 },
    { re: /胡椒|花椒|孜然|五香粉|十三香|辣椒粉|咖喱粉/, unit: 'g', val: 2 },
    { re: /八角|桂皮|香叶|干辣椒|陈皮/, unit: 'g', val: 2 },
    { re: /香油|麻油|辣椒油|油泼辣子|花椒油/, unit: 'ml', val: 5 },
    { re: /食用油|植物油|菜籽油|橄榄油|花生油|色拉油/, unit: 'ml', val: 15 },
    { re: /蜂蜜/, unit: 'g', val: 10 },
    { re: /芝麻/, unit: 'g', val: 5 },
    { re: /糖|冰糖/, unit: 'g', val: 5 }
  ];
  var SPOON_ML = { '汤匙': 15, '大勺': 15, '大匙': 15, '小勺': 5, '小匙': 5, '茶匙': 5, '勺': 15, '匙': 5, '撮': 1, '捏': 1 };
  var CN_NUM = { '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '半': 0.5 };
  var VAGUE_AMOUNT = /适量|少许|少量|一点点|一点/;
  function condDefault(text) {
    for (var i = 0; i < COND_DEFAULTS.length; i++) {
      if (COND_DEFAULTS[i].re.test(text)) return COND_DEFAULTS[i];
    }
    return null;
  }
  function parseAmountNum(t) {
    t = String(t || '').trim();
    if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
    if (/^\d+\s*\/\s*\d+$/.test(t)) {
      var p = t.split('/');
      return parseFloat(p[0]) / parseFloat(p[1]);
    }
    if (CN_NUM[t] !== undefined) return CN_NUM[t];
    return null;
  }
  // 把调味品条目里的用量统一为克/毫升；非调味品或比例/可选类保持原样
  function normalizeAmount(text) {
    var s = String(text || '').trim();
    if (!s) return s;
    var d = condDefault(s);
    if (!d) return s;
    // 比例行（酱油 : 醋 : 油泼辣子 3 : 2 : 2）不换算
    if (/[:：]\s*\d/.test(s)) return s;
    // 已有数值 + 克/毫升/公斤：只规范化中文单位
    var has = s.match(/([\d０-９]+(?:\.[\d０-９]+)?)\s*(克|g|G|毫升|ml|mL|ML|公斤|kg)/);
    if (has) {
      var num = parseFloat(String(has[1]).replace(/[０-９]/g, function (ch) { return String('０１２３４５６７８９'.indexOf(ch)); }));
      var unit = /毫升|ml|mL|ML/.test(has[2]) ? 'ml' : (/公斤|kg/.test(has[2]) ? 'kg' : 'g');
      return s.replace(has[0], num + unit);
    }
    // 尾部带数量/勺/适量
    var amt = s.match(/(\d+(?:\.\d+)?|\d+\s*\/\s*\d+|半|一|两|二|三|四|五|六|七|八|九|十|适量|少许|少量|一点点|一点)\s*(汤匙|茶匙|大勺|小勺|大匙|小匙|勺|匙|撮|捏)?\s*$/);
    if (amt) {
      var n = parseAmountNum(amt[1]);
      var spoon = amt[2] || '';
      var val;
      if (n === null) val = d.val;
      else if (spoon) val = n * (SPOON_ML[spoon] || 15);
      else if (VAGUE_AMOUNT.test(amt[1])) val = d.val;
      else val = n;
      val = Math.max(1, Math.round(val));
      var namePart = s.slice(0, s.length - amt[0].length).replace(/[\s:：=]+$/g, '').trim();
      return namePart ? (namePart + ' ' + val + d.unit) : (val + d.unit);
    }
    if (VAGUE_AMOUNT.test(s)) return s.replace(VAGUE_AMOUNT, d.val + d.unit);
    // 可选/或/含逗号但无尾部数量：保持原样，避免破坏 "白糖 or 冰糖" / "[可选] 柠檬汁或白醋"
    if (/或|or|\[|\]|，|,/.test(s)) return s;
    // 纯名字无数量（"花椒"、"盐 g"）
    var bare = s.replace(/\b(g|G|克|ml|mL|ML|毫升)\b/g, '').replace(/[\s:：=]+$/g, '').trim();
    if (bare && bare.length <= 10) return bare + ' ' + d.val + d.unit;
    return s;
  }


  return {
    lunchboxTag: lunchboxTag,
    buildWeekPlanLocal: buildWeekPlanLocal,
    mergeShoppingList: mergeShoppingList,
    buildMealPrepLocal: buildMealPrepLocal,
    reverseSearchLocal: reverseSearchLocal,
    normalizeAmount: normalizeAmount
  };
});