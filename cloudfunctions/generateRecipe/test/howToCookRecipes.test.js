'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const HC = require('../howToCookRecipes');
const NR = require('../normalRecipes');
const IDDZZ = require(path.join(ROOT, 'web', 'iddzzRecipes.js'));

function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

test('HowToCook 菜谱库已导入且规模足够', () => {
  assert.ok(Array.isArray(HC.RECIPES) && HC.RECIPES.length >= 280,
    'RECIPES.length = ' + HC.RECIPES.length);
});

test('每条菜谱字段完整且合法', () => {
  const ids = new Set();
  const seen = new Set();
  for (const r of HC.RECIPES) {
    assert.ok(/^htc\d{3}$/.test(r.id), 'id 格式: ' + r.id);
    assert.ok(!ids.has(r.id), 'id 重复: ' + r.id);
    ids.add(r.id);
    assert.ok(r.name && r.name.trim(), '空菜名');
    const key = norm(r.name);
    assert.ok(!seen.has(key), '文件内菜名重复: ' + r.name);
    seen.add(key);
    assert.ok(Array.isArray(r.steps) && r.steps.length >= 1 && r.steps.length <= 10,
      'steps 数量异常: ' + r.name + ' = ' + (r.steps && r.steps.length));
    assert.ok(Array.isArray(r.ings) && r.ings.length > 0, 'ings 为空: ' + r.name);
    assert.ok(Array.isArray(r.ingNames) && r.ingNames.length > 0, 'ingNames 为空: ' + r.name);
    assert.ok(['easy', 'medium', 'hard'].includes(r.difficulty), 'difficulty 异常: ' + r.name + ' = ' + r.difficulty);
    assert.ok(r.time && r.time.trim(), 'time 为空: ' + r.name);
    assert.ok(r.scene && r.scene.trim(), 'scene 为空: ' + r.name);
    assert.ok(r.emoji && r.emoji.trim(), 'emoji 为空: ' + r.name);
    assert.ok(typeof r.calories === 'number' && r.calories >= 0, 'calories 异常: ' + r.name);
  }
});

test('与现有 iddzz / 206 家常库无菜名重复（去重生效）', () => {
  const existing = new Set();
  [NR.RECIPES, IDDZZ.RECIPES].forEach((arr) => (arr || []).forEach((x) => existing.add(norm(x.name))));
  const dup = HC.RECIPES.filter((r) => existing.has(norm(r.name)));
  assert.strictEqual(dup.length, 0, '与现有库重名: ' + dup.map((r) => r.name).join('、'));
});

test('matchByName 精确命中', () => {
  const first = HC.RECIPES[0];
  assert.strictEqual(HC.matchByName(first.name), first);
  assert.strictEqual(HC.matchByName('不存在的菜名XYZ123'), null);
});

test('matchByIngredients 按重叠度降序返回', () => {
  const res = HC.matchByIngredients('鸡腿 香菇 青椒');
  assert.ok(Array.isArray(res) && res.length > 0, '无匹配结果');
  assert.ok(res[0].overlap >= 1, '首条应至少重叠 1');
  for (let i = 1; i < res.length; i++) {
    assert.ok(res[i - 1].overlap >= res[i].overlap, '排序非降序 @' + i);
  }
});

test('toAppRecipe 转应用格式（含 video:null）', () => {
  const app = HC.toAppRecipe(HC.RECIPES[0]);
  for (const k of ['name', 'steps', 'warning', 'darkScore', 'darkTier', 'lib', 'ings', 'time', 'scene', 'desc', 'tips', 'video', 'emoji']) {
    assert.ok(k in app, '缺少字段: ' + k);
  }
  assert.strictEqual(app.video, null);
  assert.strictEqual(app.lib, true);
});

test('生成文件保持 ES5（无箭头函数/模板字符串/解构等），web 与云函数两份逐字节一致', () => {
  const text = fs.readFileSync(path.join(ROOT, 'cloudfunctions', 'generateRecipe', 'howToCookRecipes.js'), 'utf8');
  // 剥掉 JSON 字符串值（数据里允许出现 => 等字符），只校验代码部分
  const codeOnly = text.replace(/"([^"\\]|\\.)*"/g, '""');
  assert.ok(!codeOnly.includes('=>'), '代码部分包含箭头函数');
  assert.ok(!codeOnly.includes(String.fromCharCode(96)), '代码部分包含模板字符串');
  assert.ok(!codeOnly.includes('\\u{'), '代码部分包含 ES6 码点转义');
  assert.ok(!/^\s*(const|let)\s/m.test(codeOnly), '代码部分包含 const/let');
  const web = fs.readFileSync(path.join(ROOT, 'web', 'howToCookRecipes.js'));
  const cloud = fs.readFileSync(path.join(ROOT, 'cloudfunctions', 'generateRecipe', 'howToCookRecipes.js'));
  assert.strictEqual(Buffer.compare(web, cloud), 0, 'web 与云函数两份不一致');
});