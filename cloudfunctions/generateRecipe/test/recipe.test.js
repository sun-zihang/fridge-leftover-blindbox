// 云函数纯逻辑单元测试：node --test cloudfunctions/generateRecipe/test/
const test = require('node:test');
const assert = require('node:assert');
const { fallbackRecipe, extractJson, normalizeRecipe, STYLES, STYLE_PROMPTS, guessTag, calcPoints, heuristicDarkScore, darkTier, findDangerWarnings, dailyChallenge, parseIngredients } = require('../recipe');

const VALID_JSON =
  '{"name":"可乐泡面布丁","steps":["步骤1","步骤2","步骤3"],"plating":"摆盘","warning":"警告"}';

test('extractJson: 纯 JSON 直接解析', () => {
  const obj = extractJson(VALID_JSON);
  assert.ok(obj);
  assert.strictEqual(obj.name, '可乐泡面布丁');
  assert.strictEqual(obj.steps.length, 3);
});

test('extractJson: 带 ```json 代码块围栏', () => {
  const text = '```json\n' + VALID_JSON + '\n```';
  const obj = extractJson(text);
  assert.ok(obj);
  assert.strictEqual(obj.name, '可乐泡面布丁');
});

test('extractJson: 前后有多余文字', () => {
  const text = '好的，这是你要的菜谱：\n' + VALID_JSON + '\n祝用餐愉快！';
  const obj = extractJson(text);
  assert.ok(obj);
  assert.strictEqual(obj.name, '可乐泡面布丁');
});

test('extractJson: 非法输入返回 null', () => {
  assert.strictEqual(extractJson('这不是 JSON'), null);
  assert.strictEqual(extractJson(''), null);
  assert.strictEqual(extractJson(null), null);
  assert.strictEqual(extractJson(undefined), null);
  assert.strictEqual(extractJson('{"name": 未闭合'), null);
});

test('normalizeRecipe: 合法结构去空格规范化', () => {
  const obj = {
    name: ' 薯片煎蛋 ',
    steps: [' 步骤1 ', '步骤2', '步骤3'],
    plating: ' 摆盘 ',
    warning: ' 警告 '
  };
  assert.deepStrictEqual(normalizeRecipe(obj), {
    name: '薯片煎蛋',
    steps: ['步骤1', '步骤2', '步骤3'],
    plating: '摆盘',
    warning: '警告',
    darkScore: null,
    shoppingList: []
  });
});

test('normalizeRecipe: 缺字段/结构非法返回 null', () => {
  assert.strictEqual(normalizeRecipe(null), null);
  assert.strictEqual(normalizeRecipe(undefined), null);
  assert.strictEqual(normalizeRecipe({}), null);
  assert.strictEqual(normalizeRecipe({ name: 'A', steps: [], plating: 'p', warning: 'w' }), null);
  assert.strictEqual(normalizeRecipe({ name: 'A', steps: ['s'], plating: '', warning: 'w' }), null);
  assert.strictEqual(normalizeRecipe({ name: '', steps: ['s'], plating: 'p', warning: 'w' }), null);
});

test('normalizeRecipe: name 截断 20 字、steps 上限 6、过滤空步骤', () => {
  const obj = {
    name: '一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十',
    steps: ['s1', '  ', 's3', 's4', 's5', 's6', 's7', 's8'],
    plating: 'p',
    warning: 'w'
  };
  const r = normalizeRecipe(obj);
  assert.strictEqual(r.name.length, 20);
  assert.strictEqual(r.steps.length, 6);
  assert.ok(r.steps.indexOf('') === -1);
});

test('fallbackRecipe: 结构完整可兜底', () => {
  const r = fallbackRecipe();
  assert.ok(r.name);
  assert.ok(Array.isArray(r.steps) && r.steps.length > 0);
  assert.ok(r.plating);
  assert.ok(r.warning);
});


test('STYLES: 经典模板免费，其余按积分定价', () => {
  const classic = STYLES.find(function (x) { return x.id === 'classic'; });
  assert.ok(classic && classic.cost === 0);
  assert.ok(STYLES.length >= 4);
  assert.ok(STYLES.every(function (x) { return typeof x.cost === 'number' && x.name; }));
  assert.ok(STYLE_PROMPTS['jianzhi'] && STYLE_PROMPTS['xiangqin']);
});

test('guessTag: 按症状关键词分类', () => {
  assert.strictEqual(guessTag({ name: '深夜emo拌饭', warning: '越吃越孤独' }), '深夜emo必吃');
  assert.strictEqual(guessTag({ name: '月底泡面', warning: '工资还没到' }), '月底吃土首选');
  assert.strictEqual(guessTag({ name: '前任番茄', warning: '想起前任' }), '前任看了想打人');
  assert.strictEqual(guessTag({ name: '减脂沙拉', warning: '热量极低' }), '吃完能瘦十斤（骗你的）');
  assert.strictEqual(guessTag({ name: '随便一道菜', warning: '普普通通' }), '硬核养生');
});

test('calcPoints: 基础分+连续打卡+评价加成', () => {
  assert.strictEqual(calcPoints({ base: 10, streakBonus: 4, dailyBonus: 5, rating: '真香' }), 34);
  assert.strictEqual(calcPoints({ base: 10, rating: '已进医院' }), 30);
  assert.strictEqual(calcPoints({ base: 10 }), 10);
});

test('normalizeRecipe: darkScore 夹取 0-100、shoppingList 过滤去重', () => {
  const r = normalizeRecipe({
    name: 'A', steps: ['s1'], plating: 'p', warning: 'w',
    darkScore: 150, shoppingList: ['酱油', '  ', '咖喱块', '咖喱块']
  });
  assert.strictEqual(r.darkScore, 100);
  assert.deepStrictEqual(r.shoppingList, ['酱油', '咖喱块']);
});

test('heuristicDarkScore: 猎奇高、家常低、范围 0-100', () => {
  assert.ok(heuristicDarkScore('老干妈、香蕉、皮蛋、可乐', null, 'weird') > 60);
  assert.ok(heuristicDarkScore('土豆、鸡蛋、胡萝卜', null, 'normal') < 50);
  assert.ok(heuristicDarkScore('', null, 'normal') >= 0 && heuristicDarkScore('', null, 'weird') <= 100);
});

test('darkTier: 新分级（家常凑合/猎奇整活/生化武器/传说级）', () => {
  assert.strictEqual(darkTier(10).key, 'ok');
  assert.strictEqual(darkTier(10).label, '家常凑合');
  assert.strictEqual(darkTier(50).key, 'risky');
  assert.strictEqual(darkTier(50).label, '猎奇整活');
  assert.strictEqual(darkTier(71).key, 'bio');
  assert.strictEqual(darkTier(95).label, '生化武器');
  assert.strictEqual(darkTier(100).key, 'legend');
  assert.strictEqual(darkTier(100).label, '传说级料理');
  assert.strictEqual(darkTier(100).legendary, true);
});

test('findDangerWarnings: 命中危险规则', () => {
  const d = findDangerWarnings('发芽土豆、河豚', null);
  assert.ok(d.length >= 2);
  assert.ok(d.some(function (x) { return x.level === 'danger'; }));
  assert.strictEqual(findDangerWarnings('鸡蛋、米饭', null).length, 0);
});

test('dailyChallenge: 按日期确定性轮换', () => {
  const a = dailyChallenge('2026-08-05');
  const b = dailyChallenge('2026-08-05');
  const c = dailyChallenge('2026-08-06');
  assert.deepStrictEqual(a, b);
  assert.ok(a.ingredients.length === 3);
  assert.ok(a.name && a.emoji);
  assert.notDeepStrictEqual(a, c);
});

test('parseIngredients: JSON 数组与分隔符文本', () => {
  assert.deepStrictEqual(parseIngredients('["鸡蛋"," 剩米饭 "," 3. 番茄"]'), ['鸡蛋', '剩米饭', '番茄']);
  assert.deepStrictEqual(parseIngredients('鸡蛋、土豆\n番茄，洋葱'), ['鸡蛋', '土豆', '番茄', '洋葱']);
  assert.deepStrictEqual(parseIngredients(''), []);
});
