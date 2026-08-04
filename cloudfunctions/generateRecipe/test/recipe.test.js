// 云函数纯逻辑单元测试：node --test cloudfunctions/generateRecipe/test/
const test = require('node:test');
const assert = require('node:assert');
const { fallbackRecipe, extractJson, normalizeRecipe } = require('../recipe');

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
    warning: '警告'
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
