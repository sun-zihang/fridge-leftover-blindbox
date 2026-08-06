'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const P = require(path.join(ROOT, 'web', 'practical.js'));
const ID = require(path.join(ROOT, 'web', 'iddzzRecipes.js'));
const HC = require(path.join(ROOT, 'web', 'howToCookRecipes.js'));
const NR = require(path.join(ROOT, 'web', 'normalRecipes.js'));

function pools() {
  return {
    iddzz: ID.RECIPES.map((r) => ID.toAppRecipe(r)),
    howToCook: HC.RECIPES.map((r) => HC.toAppRecipe(r)),
    normal: NR.RECIPES.map((r) => NR.toAppRecipe(r))
  };
}

test('lunchboxTag 带饭友好度分类', () => {
  assert.match(P.lunchboxTag({}).label, /🍱/);
  assert.ok(P.lunchboxTag({}).cls, '默认标签应有 cls');
  // 炖菜/焖菜应判为适合带饭
  const stew = NR.RECIPES.find((r) => /炖|焖|红烧/.test((r.name || '') + (r.steps || []).join('')));
  assert.ok(stew, '家常库里应有炖/焖/红烧类菜谱');
  const good = P.lunchboxTag(NR.toAppRecipe(stew));
  assert.ok(!/⚠️/.test(good.label), '炖煮类不应判为不宜带饭: ' + stew.name + ' => ' + good.label);
  // 凉拌/生食应判为不宜带饭
  const liang = ID.matchByName('凉拌鸡丝');
  if (liang) {
    const bad = P.lunchboxTag(ID.toAppRecipe(liang));
    assert.match(bad.label, /⚠️/);
  }
});

test('buildWeekPlanLocal 生成 7 天不重复、优先冰箱食材、seed 换样', () => {
  const wp1 = P.buildWeekPlanLocal(pools(), ['鸡腿', '香菇', '青椒'], 1, '2026-08-06');
  const wp2 = P.buildWeekPlanLocal(pools(), ['鸡腿', '香菇', '青椒'], 2, '2026-08-06');
  assert.strictEqual(wp1.length, 7);
  const names = wp1.map((x) => x.recipe.name);
  assert.strictEqual(new Set(names).size, 7, '7 天不应重复');
  assert.strictEqual(wp1[0].dayLabel, '明天');
  assert.ok(wp1[0].dateLabel, '应有日期标注');
  // 冰箱食材应优先：第一道菜至少命中一个冰箱食材
  const fridgeNorms = ['鸡腿', '香菇', '青椒'].map(norm);
  const firstIngs = (wp1[0].recipe.ings || []).map(ingNorm);
  const hit = firstIngs.some((ri) => fridgeNorms.some((u) => ri.indexOf(u) >= 0 || u.indexOf(ri) >= 0));
  assert.ok(hit, '首日菜谱应命中冰箱食材: ' + wp1[0].recipe.name + ' ing=' + firstIngs.join(','));
  assert.notStrictEqual(JSON.stringify(names), JSON.stringify(wp2.map((x) => x.recipe.name)), '不同 seed 应换样');
  function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }
  function ingNorm(s) {
    let t = String(s || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');
    const m = t.match(/[\d０-９]/);
    if (m) t = t.slice(0, m.index);
    else { const sp = t.indexOf(' '); if (sp > 0) t = t.slice(0, sp); }
    return t.replace(/[，,、；;：:\s]+$/g, '').trim();
  }
});

test('mergeShoppingList 同名计数去重 + 冰箱已有扣除', () => {
  const plan = [
    { name: 'A', ings: ['洋葱 3 个', '鸡腿 2 个'] },
    { name: 'B', ings: ['洋葱 2 个', '土豆 1 个'] },
    { name: 'C', ings: ['洋葱 1 个', '鸡蛋 2 个'] }
  ];
  const noFridge = P.mergeShoppingList(plan, []);
  const onion = noFridge.find((x) => x.name === '洋葱');
  assert.strictEqual(onion.count, 3);
  const withFridge = P.mergeShoppingList(plan, ['洋葱']);
  const onion2 = withFridge.find((x) => x.name === '洋葱');
  assert.strictEqual(onion2.count, 2);
  assert.strictEqual(onion2.have, true);
  const egg = withFridge.find((x) => x.name === '鸡蛋');
  assert.strictEqual(egg.count, 1);
});

test('buildMealPrepLocal 鸡胸肉/未知食材都有方案', () => {
  const mp = P.buildMealPrepLocal(pools(), '鸡胸肉');
  assert.ok(mp.length >= 3 && mp.length <= 5);
  for (const it of mp) {
    assert.ok(it.method && it.storage && it.shelfLife && it.recipeName, '方案字段完整');
  }
  const generic = P.buildMealPrepLocal(pools(), '太空泥');
  assert.ok(generic.length >= 3, '未知食材走通用模板');
});

test('reverseSearchLocal 解析「想吃X但没Y」并给出平替', () => {
  const rs = P.reverseSearchLocal(pools(), '想吃糖醋里脊，但没里脊了', ['鸡腿肉', '洋葱']);
  assert.strictEqual(rs.want, '糖醋里脊');
  assert.strictEqual(rs.missing, '里脊');
  assert.strictEqual(rs.substitute, '鸡腿肉');
  assert.ok(rs.resultName.indexOf('鸡腿') >= 0, '平替名应含替代食材: ' + rs.resultName);
  assert.ok(rs.recipe && rs.recipe.name, '应给出推荐菜谱');
  // 无转折词句式
  const rs2 = P.reverseSearchLocal(pools(), '想吃可乐鸡翅', ['鸡腿']);
  assert.strictEqual(rs2.want, '可乐鸡翅');
  // 解析不到菜名时给通用提示
  const rs3 = P.reverseSearchLocal(pools(), '想吃飞天意面', []);
  assert.ok(rs3.resultName, '应有兜底结果');
});

test('normalizeAmount 调味品统一为克/毫升', () => {
  assert.strictEqual(P.normalizeAmount('盐 适量'), '盐 3g');
  assert.strictEqual(P.normalizeAmount('白糖 2 汤匙'), '白糖 30g');
  assert.strictEqual(P.normalizeAmount('白糖 半汤匙'), '白糖 8g');
  assert.strictEqual(P.normalizeAmount('生抽 1/2 茶匙'), '生抽 3ml');
  assert.strictEqual(P.normalizeAmount('盐 1/4 茶匙'), '盐 1g');
  assert.strictEqual(P.normalizeAmount('料酒 1勺'), '料酒 15ml');
  assert.strictEqual(P.normalizeAmount('生抽 3 汤匙'), '生抽 45ml');
  assert.strictEqual(P.normalizeAmount('白糖 30克'), '白糖 30g');
  assert.strictEqual(P.normalizeAmount('盐量 10 克 * 份数'), '盐量 10g * 份数');
  assert.strictEqual(P.normalizeAmount('花椒'), '花椒 2g');
  assert.strictEqual(P.normalizeAmount('盐 g'), '盐 3g');
  assert.strictEqual(P.normalizeAmount('酱油 : 醋 : 油泼辣子 3 : 2 : 2'), '酱油 : 醋 : 油泼辣子 3 : 2 : 2');
  assert.strictEqual(P.normalizeAmount('白糖 or 冰糖'), '白糖 or 冰糖');
  assert.strictEqual(P.normalizeAmount('鸡腿 2 个'), '鸡腿 2 个');
  assert.strictEqual(P.normalizeAmount('葱一根，姜四片，料酒'), '葱一根，姜四片，料酒');
});

test('videoFor 无视频菜谱也能补全 B 站视频链接', () => {
  const v = P.videoFor('麻婆豆腐');
  assert.ok(v && /bilibili/.test(v.url), '应返回 bilibili 链接');
  assert.ok(v.url.indexOf('麻婆豆腐') >= 0 || v.url.indexOf(encodeURIComponent('麻婆豆腐')) >= 0, '链接应含菜名关键词');
  assert.ok(v.title === '麻婆豆腐 家常做法');
  assert.strictEqual(P.videoFor(''), null);
  assert.strictEqual(P.videoFor(null), null);
});
