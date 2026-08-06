'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const AB = require(path.join(ROOT, 'web', 'abowlRecipes.js'));
const ID = require(path.join(ROOT, 'web', 'iddzzRecipes.js'));
const HC = require(path.join(ROOT, 'web', 'howToCookRecipes.js'));
const NR = require(path.join(ROOT, 'web', 'normalRecipes.js'));

function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

test('A-Bowl-of-Home 菜谱库已导入且规模足够', () => {
  assert.ok(Array.isArray(AB.RECIPES) && AB.RECIPES.length >= 300,
    'RECIPES.length = ' + AB.RECIPES.length);
});

test('每条菜谱字段完整且合法', () => {
  const ids = new Set();
  const seen = new Set();
  for (const r of AB.RECIPES) {
    assert.ok(/^ab\d{3}$/.test(r.id), 'id 格式: ' + r.id);
    assert.ok(!ids.has(r.id), 'id 重复: ' + r.id);
    ids.add(r.id);
    assert.ok(r.name && r.name.trim(), '空菜名');
    const key = norm(r.name);
    assert.ok(!seen.has(key), '文件内菜名重复: ' + r.name);
    seen.add(key);
    assert.ok(Array.isArray(r.steps) && r.steps.length >= 1 && r.steps.length <= 8, 'steps 数量: ' + r.name);
    assert.ok(Array.isArray(r.ings) && r.ings.length > 0, 'ings 为空: ' + r.name);
    assert.ok(Array.isArray(r.ingNames) && r.ingNames.length > 0, 'ingNames 为空: ' + r.name);
    assert.ok(r.time && r.time.trim(), 'time 为空: ' + r.name);
    assert.ok(['easy', 'medium', 'hard'].includes(r.difficulty), 'difficulty: ' + r.name);
    assert.ok(r.scene && r.scene.trim(), 'scene 为空: ' + r.name);
    assert.ok(r.emoji, 'emoji 为空: ' + r.name);
    assert.ok(r.video && typeof r.video.url === 'string' && /bilibili/.test(r.video.url), 'video 缺失: ' + r.name);
    assert.ok(r.image === null || typeof r.image === 'string', 'image 类型: ' + r.name);
  }
});

test('与现有 iddzz / HowToCook / 家常库无菜名重复（去重生效）', () => {
  const existing = new Set();
  [ID.RECIPES, HC.RECIPES, NR.RECIPES].forEach((arr) => arr.forEach((x) => existing.add(norm(x.name))));
  const dup = AB.RECIPES.filter((r) => existing.has(norm(r.name)));
  assert.strictEqual(dup.length, 0, '与现有库重名: ' + dup.map((r) => r.name).join('、'));
});

test('matchByName / matchByIngredients 可用', () => {
  const first = AB.RECIPES[0];
  assert.strictEqual(AB.matchByName(first.name), first);
  const res = AB.matchByIngredients('鲫鱼 面条 姜');
  assert.ok(Array.isArray(res) && res.length > 0 && res[0].overlap >= 1);
  for (let i = 1; i < res.length; i++) assert.ok(res[i - 1].overlap >= res[i].overlap);
});

test('toAppRecipe 含 image/video/shoppingList，图片为源站直链', () => {
  const app = AB.toAppRecipe(AB.RECIPES[0]);
  for (const k of ['name', 'steps', 'ings', 'time', 'scene', 'desc', 'tips', 'video', 'image', 'shoppingList', 'prep']) {
    assert.ok(k in app, '缺少字段: ' + k);
  }
  assert.ok(app.video && /bilibili/.test(app.video.url));
  const withImg = AB.RECIPES.filter((r) => r.image);
  assert.ok(withImg.length > 100, '带图数量应较多: ' + withImg.length);
  assert.ok(withImg[0].image.indexOf('./abowl-imgs/') === 0, '图片应指向本地 abowl-imgs/');
  const fs2 = require('node:fs');
  const p2 = path.join(ROOT, 'web', 'abowl-imgs', path.basename(withImg[0].image));
  assert.ok(fs2.existsSync(p2), '本地图片文件应存在: ' + p2);
});

test('生成文件保持 ES5（剥离字符串后无箭头/模板字符串/const-let）', () => {
  const text = fs.readFileSync(path.join(ROOT, 'web', 'abowlRecipes.js'), 'utf8');
  const codeOnly = text.replace(/"([^"\\]|\\.)*"/g, '""');
  assert.ok(!codeOnly.includes('=>'), '代码部分包含箭头函数');
  assert.ok(!codeOnly.includes(String.fromCharCode(96)), '代码部分包含模板字符串');
  assert.ok(!/^\s*(const|let)\s/m.test(codeOnly), '代码部分包含 const/let');
});