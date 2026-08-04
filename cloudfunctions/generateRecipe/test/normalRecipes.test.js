// 内置家常菜谱库 + 正常模式兜底逻辑单测（node --test，零依赖）
const test = require('node:test');
const assert = require('node:assert');
const NR = require('../normalRecipes');
const { normalFallbackRecipe } = require('../recipe');

test('菜谱库：收录 150+ 道家常菜且结构完整', function () {
  assert.ok(NR.RECIPES.length >= 150, 'recipes count=' + NR.RECIPES.length);
  NR.RECIPES.forEach(function (r) {
    assert.ok(r.name && r.name.length > 0, 'name missing');
    assert.ok(Array.isArray(r.ings) && r.ings.length > 0, r.name + ' ings missing');
    assert.ok(Array.isArray(r.steps) && r.steps.length > 0, r.name + ' steps missing');
    assert.ok(Array.isArray(r.tags) && r.tags.length > 0, r.name + ' tags missing');
  });
});

test('matchNormalRecipe：西红柿+鸡蛋 命中西红柿类菜', function () {
  const hit = NR.matchNormalRecipe('西红柿、鸡蛋');
  assert.ok(hit, 'should match');
  assert.ok(['西红柿炒蛋', '西红柿鸡蛋汤', '番茄蛋汤'].indexOf(hit.name) >= 0, 'got ' + hit.name);
});

test('matchNormalRecipe：五花肉+冰糖 命中红烧类菜', function () {
  const hit = NR.matchNormalRecipe('五花肉、冰糖');
  assert.ok(hit, 'should match');
  assert.ok(hit.name.indexOf('肉') >= 0, 'got ' + hit.name);
});

test('matchNormalRecipe：完全不存在的食材返回 null', function () {
  const hit = NR.matchNormalRecipe('量子纠缠素、暗物质酱');
  assert.strictEqual(hit, null);
});

test('getNormalRecipe：永远能拿到一道菜（命中或随机）', function () {
  for (let i = 0; i < 20; i++) {
    const r = NR.getNormalRecipe('乱七八糟' + i + '号食材');
    assert.ok(r && r.name, 'should always return');
  }
});

test('getNormalAppRecipe：返回带详细菜单字段的菜谱', function () {
  const r = NR.getNormalAppRecipe('西红柿、鸡蛋');
  assert.ok(['西红柿炒蛋', '西红柿鸡蛋汤', '番茄蛋汤'].indexOf(r.name) >= 0, 'got ' + r.name);
  assert.ok(Array.isArray(r.steps) && r.steps.length > 0);
  assert.ok(Array.isArray(r.ings) && r.ings.length > 0);
  assert.ok(Array.isArray(r.prep));
  assert.ok(typeof r.plating === 'string' && r.plating.length > 0);
  assert.ok(typeof r.warning === 'string' && r.warning.length > 0);
  assert.strictEqual(r.lib, true);
});

test('normalFallbackRecipe：与菜谱库格式一致（云函数兜底入口）', function () {
  const r = normalFallbackRecipe('土豆、青椒');
  assert.ok(r && r.name);
  assert.ok(Array.isArray(r.steps) && r.steps.length > 0);
  assert.ok(r.lib === true);
});
