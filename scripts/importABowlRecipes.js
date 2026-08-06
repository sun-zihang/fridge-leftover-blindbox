'use strict';
/* A-Bowl-of-Home（厨房小课堂）菜谱导入脚本（仅开发期，Node 内置模块）
 * 来源：https://github.com/tuozhekongqi/A-Bowl-of-Home（GitHub Pages：tuozhekongqi.github.io/A-Bowl-of-Home）
 * 流程：下载 data*.js / photos.js → vm 合并执行提取 DISHES（593 道）→ 与现有三库按菜名去重
 *       → 生成 web/abowlRecipes.js（UMD/ES5，含图片直链与 B 站搜索视频）
 * 注意：图片用源站直链（imgs/xxx.webp，共约 29MB，不打包进本仓库）；视频沿用 B 站搜索链接。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const vm = require('vm');

const SRC = path.join(os.tmpdir(), 'abowl-src');
const OUT = path.resolve(__dirname, '..', 'web', 'abowlRecipes.js');
const BASE = 'https://tuozhekongqi.github.io/A-Bowl-of-Home/';
const ROOT = path.resolve(__dirname, '..');

const SCENE_EMOJI = { '早餐': '🥣', '午餐·晚餐': '🍲', '夜宵': '🌙', '甜品': '🍰' };

function httpGet(url) {
  return new Promise(function (resolve, reject) {
    const req = https.get(url, { headers: { 'User-Agent': 'codex-import', 'Accept': 'application/vnd.github.raw' }, timeout: 45000 }, function (res) {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { resolve(Buffer.concat(chunks)); });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(new Error('timeout')); });
  });
}

async function ensureSource() {
  if (fs.existsSync(path.join(SRC, 'data.js'))) {
    console.log('    使用本地已下载目录：' + SRC);
    return;
  }
  console.log('    下载 data*.js / photos.js ...');
  fs.mkdirSync(SRC, { recursive: true });
  const files = ['data.js', 'photos.js'];
  for (let i = 2; i <= 28; i++) files.push('data' + i + '.js');
  let ok = 0;
  for (const f of files) {
    for (let t = 0; t < 4; t++) {
      try {
        const buf = await httpGet('https://api.github.com/repos/tuozhekongqi/A-Bowl-of-Home/contents/' + f);
        fs.writeFileSync(path.join(SRC, f), buf);
        ok++; break;
      } catch (e) { if (t === 3) throw new Error('下载失败：' + f); await new Promise(function (r) { setTimeout(r, 3000); }); }
    }
  }
  console.log('    已下载 ' + ok + ' 个文件');
}

function extract() {
  const files = ['data.js'];
  for (let i = 2; i <= 28; i++) files.push('data' + i + '.js');
  let code = '';
  for (const f of files) code += fs.readFileSync(path.join(SRC, f), 'utf8') + '\n;\n';
  code += ';globalThis.__EXPORT = { DISHES: DISHES };';
  const sandbox = { console: { log: function () {} }, Object: Object, Array: Array, Math: Math, JSON: JSON, Date: Date, Set: Set, Map: Map, String: String, Number: Number, Boolean: Boolean, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, RegExp: RegExp };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { timeout: 15000 });
  const dishes = sandbox.__EXPORT.DISHES || {};
  // PHOTO_MAP
  const photoCode = fs.readFileSync(path.join(SRC, 'photos.js'), 'utf8');
  const ps = { window: {} };
  vm.createContext(ps);
  vm.runInContext(photoCode, ps);
  const photoMap = ps.window.PHOTO_MAP || {};
  return { dishes: dishes, photoMap: photoMap };
}

function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

function loadExistingNames() {
  const set = new Set();
  const files = [path.join(ROOT, 'web', 'iddzzRecipes.js'), path.join(ROOT, 'web', 'howToCookRecipes.js'), path.join(ROOT, 'web', 'normalRecipes.js')];
  const re = /"name"\s*:\s*"([^"]+)"/g;
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(code))) set.add(norm(m[1]));
  }
  return set;
}

function fmtTime(totalMin) {
  if (totalMin < 60) return '约 ' + (totalMin || 1) + ' 分钟';
  const h = Math.round(totalMin / 60);
  if (h >= 48) return '约 ' + h + ' 小时（长时炖煮）';
  return '约 ' + h + ' 小时';
}

function stripName(n) {
  return String(n || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/[，,、；;：:\s]+$/g, '').trim();
}

function buildRecipes(dishes, photoMap, existing, localMap) {
  const names = Object.keys(dishes);
  const out = [];
  const seen = {};
  let dup = 0, noIng = 0;
  for (const name of names) {
    const d = dishes[name] || {};
    if (existing.has(norm(name)) || seen[norm(name)]) { dup++; continue; }
    seen[norm(name)] = 1;
    const ingArr = Array.isArray(d.ingredients) ? d.ingredients : [];
    const stepArr = Array.isArray(d.steps) ? d.steps : [];
    if (!ingArr.length || !stepArr.length) { noIng++; continue; }
    const ings = ingArr.slice(0, 12).map(function (i) {
      const per = (typeof i.per === 'number' && i.per > 0) ? i.per : 0;
      return per > 0 ? (i.n + ' ' + per + (i.u || '')) : (i.n + ' ' + (i.u || '适量'));
    });
    const ingNames = ingArr.slice(0, 12).map(function (i) { return stripName(i.n); }).filter(Boolean);
    const steps = stepArr.map(function (s) { return String(s.t || '').trim(); }).filter(Boolean).slice(0, 8);
    if (!steps.length) { noIng++; continue; }
    const totalMin = stepArr.reduce(function (a, s) { return a + (typeof s.time === 'number' ? s.time : 0); }, 0) / 60;
    const tipsRaw = d.tips;
    const tips = Array.isArray(tipsRaw) ? tipsRaw.join('；') : (typeof tipsRaw === 'string' ? tipsRaw : '');
    const where = typeof d.where === 'string' ? d.where : '';
    const scene = typeof d.scene === 'string' ? d.scene : '';
    const photo = localMap[name] ? ('./abowl-imgs/' + localMap[name]) : (photoMap[name] ? (BASE + photoMap[name]) : null);
    out.push({
      id: 'ab' + String(out.length + 1).padStart(3, '0'),
      name: name,
      region: where,
      scene: scene,
      difficulty: steps.length <= 3 ? 'easy' : (steps.length <= 5 ? 'medium' : 'hard'),
      time: fmtTime(Math.round(totalMin)),
      desc: typeof d.desc === 'string' ? d.desc.trim().slice(0, 120) : '',
      tips: tips.slice(0, 200),
      emoji: SCENE_EMOJI[scene] || '🍳',
      ings: ings,
      ingNames: ingNames,
      prep: Array.isArray(d.prep) ? d.prep.slice(0, 6) : [],
      shoppingList: Array.isArray(d.shopping) ? d.shopping.slice(0, 6) : [],
      steps: steps,
      video: { url: 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(name + ' 家常做法'), title: name + ' 家常做法' },
      image: photo
    });
  }
  return { recipes: out, dup: dup, noIng: noIng };
}

function buildJs(recipes) {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `// A-Bowl-of-Home（厨房小课堂）菜谱库（${recipes.length} 道家常菜）
// 数据来源：https://github.com/tuozhekongqi/A-Bowl-of-Home（图片已本地化至 web/abowl-imgs/）
// 导入时间：${dateStr}；图片为本地 abowl-imgs/（下载自源站，已部署进静态托管；缺图回退源站直链）；视频为 B 站搜索链接
// 由 scripts/importABowlRecipes.js 生成，请勿手改（web 端使用，与 iddzz 同为带图/视频演示库）
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.ABOWL_RECIPES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var RECIPES = ${JSON.stringify(recipes)};

  function norm(s) { return String(s || '').replace(/\\s+/g, '').toLowerCase(); }

  function matchByName(name) {
    if (!name) return null;
    var n = norm(name);
    for (var i = 0; i < RECIPES.length; i++) {
      if (norm(RECIPES[i].name) === n) return RECIPES[i];
    }
    return null;
  }

  function matchByIngredients(ingsText) {
    var userIngs = String(ingsText || '').split(/[，,、；;\\s]+/).map(norm).filter(Boolean);
    if (!userIngs.length) return [];
    var scored = [];
    RECIPES.forEach(function (r) {
      var rIngs = (r.ingNames || []).map(norm);
      var overlap = userIngs.filter(function (u) {
        return rIngs.some(function (ri) { return ri.indexOf(u) >= 0 || u.indexOf(ri) >= 0; });
      }).length;
      if (overlap > 0) scored.push({ recipe: r, overlap: overlap });
    });
    scored.sort(function (a, b) { return b.overlap - a.overlap; });
    return scored;
  }

  function toAppRecipe(r) {
    return {
      name: r.name,
      steps: r.steps,
      plating: '',
      warning: r.tips || '照着色香味俱全的步骤做，翻车率更低。',
      darkScore: 20,
      darkTier: { label: '家常靠谱', emoji: '🍽', tip: '正经家常菜' },
      lib: true,
      ings: r.ings,
      prep: r.prep,
      time: r.time,
      scene: r.scene,
      desc: r.desc,
      tips: r.tips,
      video: r.video,
      emoji: r.emoji,
      image: r.image,
      shoppingList: r.shoppingList
    };
  }

  return {
    RECIPES: RECIPES,
    matchByName: matchByName,
    matchByIngredients: matchByIngredients,
    toAppRecipe: toAppRecipe
  };
});
`;
}

async function main() {
  console.log('[1/4] 获取数据源...');
  await ensureSource();
  const { dishes, photoMap } = extract();
  const names = Object.keys(dishes);
  console.log('    源菜谱：' + names.length + ' 道');
  console.log('[2/4] 构建并去重...');
  const existing = loadExistingNames();
  let localMap = {};
  try { localMap = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'web', 'abowl-imgs-map.json'), 'utf8')); } catch (e) { console.log('    未找到本地图片映射，回退源站直链'); }
  const { recipes, dup, noIng } = buildRecipes(dishes, photoMap, existing, localMap);
  console.log('    去重跳过：' + dup + '；缺食材/步骤跳过：' + noIng + '；净新增：' + recipes.length);
  const withImg = recipes.filter(function (r) { return !!r.image; }).length;
  console.log('    带图：' + withImg + '/' + recipes.length);
  console.log('[3/4] 生成 ' + OUT + ' ...');
  const js = buildJs(recipes);
  fs.writeFileSync(OUT, js, 'utf8');
  console.log('    ' + Math.round(js.length / 1024) + ' KB');
  console.log('[4/4] 完成。示例：' + recipes.slice(0, 6).map(function (r) { return r.name; }).join('、'));
}

main().catch(function (e) { console.error(e); process.exit(1); });