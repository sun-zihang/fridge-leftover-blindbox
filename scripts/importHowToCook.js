'use strict';
/* HowToCook 菜谱导入脚本（仅开发期使用，Node 内置模块，无外部依赖）
 * 用法：node scripts/importHowToCook.js
 * 流程：下载 GitHub tarball（codeload）→ 解压出 dishes 下的全部 .md → 解析为标准菜谱 JSON
 *       → 与现有 iddzz/206 家常库按菜名去重 → 生成 web/howToCookRecipes.js 并同步到云函数。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const REPO_TARBALL = 'https://codeload.github.com/Anduin2017/HowToCook/tar.gz/refs/heads/master';
const COMMIT_API = 'https://api.github.com/repos/Anduin2017/HowToCook/commits/master';
const PINNED_COMMIT = 'c05758fa661ac4efa0361a987b700a351a22159b';

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(__dirname, '.howtocook-src-md');
const TAR_PATH = path.join(os.tmpdir(), 'htc-howtocook.tar.gz');
const WEB_OUT = path.join(ROOT, 'web', 'howToCookRecipes.js');
const CLOUD_OUT = path.join(ROOT, 'cloudfunctions', 'generateRecipe', 'howToCookRecipes.js');

const CAT = {
  aquatic: ['水产海鲜', '🐟'],
  breakfast: ['早餐', '🥣'],
  condiment: ['酱料调味', '🧂'],
  dessert: ['甜品', '🍰'],
  drink: ['饮品', '🥤'],
  meat_dish: ['肉类', '🍖'],
  'semi-finished': ['半成品', '🥡'],
  soup: ['汤羹', '🍲'],
  staple: ['主食', '🍚'],
  vegetable_dish: ['素菜', '🥬']
};
const DEFAULT_META = ['家常', '🍳'];

function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

function httpGet(url, maxRedirect) {
  return new Promise(function (resolve, reject) {
    const req = https.get(url, { headers: { 'User-Agent': 'codex-import' } }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if ((maxRedirect || 0) >= 5) return reject(new Error('too many redirects'));
        return resolve(httpGet(res.headers.location, (maxRedirect || 0) + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { resolve(Buffer.concat(chunks)); });
    });
    req.on('error', reject);
    req.setTimeout(60000, function () { req.destroy(new Error('timeout')); });
  });
}

/* 极简 tar.gz 解析：只取 dishes 下的 .md（排除 template），支持 PAX('x') 与 GNU('L') 长名 */
function extractMd(buf) {
  const data = zlib.gunzipSync(buf);
  const dec = new TextDecoder('utf-8');
  function readStr(b, start, len) {
    let end = start + len;
    while (end > start && b[end - 1] === 0) end--;
    return dec.decode(b.subarray(start, end));
  }
  const files = {};
  let pendingName = null, pendingSize = null, offset = 0;
  while (offset + 512 <= data.length) {
    const h = data.subarray(offset, offset + 512);
    let allZero = true;
    for (let i = 0; i < 512; i++) { if (h[i] !== 0) { allZero = false; break; } }
    if (allZero) break;
    let name = pendingName || readStr(h, 0, 100);
    pendingName = null;
    let size = pendingSize !== null ? pendingSize : parseInt(readStr(h, 124, 12).trim() || '0', 8);
    pendingSize = null;
    const type = String.fromCharCode(h[156]);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    const paddedEnd = dataStart + Math.ceil(size / 512) * 512;
    if (type === 'L') {
      pendingName = dec.decode(data.subarray(dataStart, dataEnd)).replace(/\0+$/, '');
    } else if (type === 'x') {
      const rec = dec.decode(data.subarray(dataStart, dataEnd));
      const re = /(\d+) ([^\n]+)\n/g;
      let m;
      while ((m = re.exec(rec))) {
        const kv = m[2];
        const eq = kv.indexOf('=');
        if (eq > 0) {
          const k = kv.slice(0, eq), v = kv.slice(eq + 1);
          if (k === 'path') pendingName = v;
          else if (k === 'size') pendingSize = parseInt(v, 10);
        }
      }
    } else if (type === '0' || type === '\0' || type === '') {
      if (/^HowToCook-master\/dishes\/.+\.md$/i.test(name) && !/\/template\//.test(name)) {
        files[name] = data.subarray(dataStart, dataEnd);
      }
    }
    offset = paddedEnd;
  }
  return files;
}

async function ensureSource() {
  if (fs.existsSync(path.join(SRC_DIR, 'dishes'))) {
    console.log('    使用本地已解压目录：' + SRC_DIR);
    return SRC_DIR;
  }
  console.log('    下载 tarball：' + REPO_TARBALL);
  if (!fs.existsSync(TAR_PATH) || fs.statSync(TAR_PATH).size === 0) {
    const buf = await httpGet(REPO_TARBALL);
    fs.writeFileSync(TAR_PATH, buf);
  }
  // 版本核对（软校验，失败仅告警）
  try {
    const meta = JSON.parse((await httpGet(COMMIT_API)).toString('utf8'));
    if (meta && meta.sha) {
      const sha = meta.sha;
      console.log('    当前 master commit：' + sha + (sha === PINNED_COMMIT ? '（与固定版本一致）' : '（【注意】与固定版本不一致！）'));
    }
  } catch (e) { console.warn('    版本核对失败（忽略）：' + e.message); }
  const map = extractMd(fs.readFileSync(TAR_PATH));
  fs.mkdirSync(SRC_DIR, { recursive: true });
  for (const p of Object.keys(map)) {
    const rel = p.replace(/^HowToCook-master\//, '');
    const out = path.join(SRC_DIR, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, map[p]);
  }
  console.log('    已解压 md 文件：' + Object.keys(map).length);
  return SRC_DIR;
}

function sectionOf(text, heading) {
  const re = new RegExp('^##\\s*' + heading + '\\s*$', 'm');
  const m = text.match(re);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const endIdx = rest.search(/^##\s/m);
  return endIdx === -1 ? rest : rest.slice(0, endIdx);
}

function bulletsOf(sec) {
  const out = [];
  for (const line of sec.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*+]\s+(.+?)\s*$/);
    if (m) {
      const t = m[1].trim();
      if (/^(每份|两份|三份|一人份|二人份|三人份|四人份|主料|辅料|调料)[：:]?\s*$/.test(t)) continue;
      out.push(t);
    }
  }
  return out;
}

function parseMd(text, category) {
  const title = text.match(/^\s*#\s+(.+?)\s*$/m);
  if (!title) return null;
  const name = title[1].replace(/的做法\s*$/, '').trim();
  if (!name) return null;

  const afterTitle = text.slice(title.index + title[0].length);
  const introEnd = afterTitle.search(/^##\s/m);
  let intro = (introEnd === -1 ? afterTitle : afterTitle.slice(0, introEnd)).trim();
  intro = intro.split(/\r?\n/).filter(function (l) { return !/^\s*!\[/.test(l); }).join(' ').replace(/\s+/g, ' ').trim();

  const star = text.match(/预估烹饪难度[：:]\s*(★+)/);
  const sn = star ? (star[1].match(/★/g) || []).length : 0;
  const difficulty = sn >= 4 ? 'hard' : (sn === 3 ? 'medium' : (sn >= 1 ? 'easy' : 'medium'));

  const cal = text.match(/预估卡路里[：:]\s*([\d.]+)\s*大卡/);
  const calories = cal ? Math.round(parseFloat(cal[1])) : 0;

  let time = '约30分钟';
  const tm = intro.match(/(?:全程大约|全程约|大约需要|大约|约)\s*([^。，；\n]+?)(?:[。，；]|$)/);
  if (tm) {
    let t = tm[1].trim();
    t = t.replace(/^(需要|约需|需|大约需要)\s*/, '').replace(/(即可完成|就能出锅|就可以|即可|左右|的样子)$/, '').trim();
    if (/[\d一二三四五六七八九十百]|小时|分钟/.test(t)) time = t;
  }

  const op = sectionOf(text, '操作');
  let steps = [];
  if (op) {
    for (const line of op.split(/\r?\n/)) {
      const m = line.match(/^\s*\d+[.、．]\s*(.+?)\s*$/);
      if (m) steps.push(m[1].trim());
    }
    if (!steps.length) {
      for (const line of op.split(/\r?\n/)) {
        const m = line.match(/^\s*[-*+]\s+(.+?)\s*$/);
        if (m) steps.push(m[1].trim());
      }
    }
  }
  if (!steps.length) return null;
  steps = steps.map(function (s) { return s.replace(/\*\*/g, '').trim(); }).filter(Boolean).slice(0, 10);

  const calcItems = bulletsOf(sectionOf(text, '计算'));
  const toolItems = bulletsOf(sectionOf(text, '必备原料和工具'));
  let ingRaw = calcItems.length ? calcItems : toolItems;
  if (!ingRaw.length) return null;
  ingRaw = ingRaw.slice(0, 12);

  const ings = [];
  const ingNames = [];
  for (const it of ingRaw) {
    let namePart = it, amountPart = '';
    const eq = it.indexOf('=');
    if (eq > 0) {
      namePart = it.slice(0, eq);
      amountPart = it.slice(eq + 1);
    } else {
      const dm = it.match(/[\d０-９]/);
      if (dm) {
        namePart = it.slice(0, dm.index);
        amountPart = it.slice(dm.index);
      } else {
        const sp = it.indexOf(' ');
        if (sp > 0) { namePart = it.slice(0, sp); amountPart = it.slice(sp + 1); }
      }
    }
    const cleanName = namePart.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/[，,、；;：:\s]+$/g, '').trim();
    if (!cleanName) continue;
    const amount = amountPart.replace(/（[^）]*）/g, '').trim();
    ings.push(amount ? cleanName + ' ' + amount : cleanName);
    ingNames.push(cleanName);
  }
  if (!ingNames.length) return null;

  const extra = sectionOf(text, '附加内容');
  let tips = '';
  if (extra) {
    tips = bulletsOf(extra).filter(function (s) {
      return !/\[.+\]\(.+\)/.test(s) && !/遵循本指南/.test(s) && !/提出\s*Issue/.test(s) && !/Pull\s*request/i.test(s);
    }).join('；').slice(0, 200);
  }

  let desc = intro;
  const cut = desc.search(/预估/);
  if (cut > -1) desc = desc.slice(0, cut).trim();
  if (!desc) desc = '经典家常菜，做法简单，营养均衡。';
  if (desc.length > 110) desc = desc.slice(0, 110).replace(/[，,、；;：:\s]+$/, '') + '…';

  const meta = CAT[category] || DEFAULT_META;
  return {
    id: '',
    name: name,
    region: category,
    scene: meta[0],
    difficulty: difficulty,
    time: time,
    desc: desc,
    tips: tips,
    emoji: meta[1],
    ings: ings,
    ingNames: ingNames,
    steps: steps,
    calories: calories,
    video: null
  };
}

function loadExistingNames() {
  const set = new Set();
  const files = [path.join(ROOT, 'web', 'iddzzRecipes.js'), path.join(ROOT, 'web', 'normalRecipes.js')];
  const re = /"name"\s*:\s*"([^"]+)"/g;
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(code))) set.add(norm(m[1]));
  }
  return set;
}

function buildJs(recipes) {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `// HowToCook 菜谱库（${recipes.length} 道家常菜，无演示视频）
// 数据来源：https://github.com/Anduin2017/HowToCook（Unlicense 公有领域许可）
// 导入时间：${dateStr}，固定 commit：${PINNED_COMMIT}
// 由 scripts/importHowToCook.js 生成，请勿手改；web 与 cloudfunctions 两份保持逐字节一致
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.HOWTOCOOK_RECIPES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var RECIPES = ${JSON.stringify(recipes)};

  function norm(s) { return String(s || '').replace(/\\s+/g, '').toLowerCase(); }

  // 按菜名精确匹配
  function matchByName(name) {
    if (!name) return null;
    var n = norm(name);
    for (var i = 0; i < RECIPES.length; i++) {
      if (norm(RECIPES[i].name) === n) return RECIPES[i];
    }
    return null;
  }

  // 按食材找相近菜：返回按重叠度排序的数组
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

  // 转成应用菜谱格式
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
      prep: [],
      time: r.time,
      scene: r.scene,
      desc: r.desc,
      tips: r.tips,
      video: r.video,
      emoji: r.emoji
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

function cleanup() {
  if (SRC_DIR.indexOf(__dirname) === 0 && fs.existsSync(SRC_DIR)) {
    fs.rmSync(SRC_DIR, { recursive: true, force: true });
    console.log('    已清理临时目录：' + SRC_DIR);
  }
}

async function main() {
  console.log('[1/4] 获取数据源...');
  const srcDir = await ensureSource();
  const mdFiles = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) mdFiles.push(p);
    }
  })(path.join(srcDir, 'dishes'));
  mdFiles.sort();
  console.log('    发现 md 文件：' + mdFiles.length);

  const existing = loadExistingNames();
  const parsed = [];
  const dupNames = [];
  const invalid = [];
  for (const f of mdFiles) {
    const rel = path.relative(path.join(srcDir, 'dishes'), f);
    const category = rel.split(path.sep)[0];
    const text = fs.readFileSync(f, 'utf8');
    const r = parseMd(text, category);
    if (!r) { invalid.push(rel); continue; }
    const key = norm(r.name);
    if (existing.has(key) || parsed.some(function (x) { return norm(x.name) === key; })) { dupNames.push(r.name); continue; }
    parsed.push(r);
  }
  parsed.forEach(function (r, i) { r.id = 'htc' + String(i + 1).padStart(3, '0'); });

  console.log('[2/4] 解析完成：净新增 ' + parsed.length + ' 道；菜名去重跳过 ' + dupNames.length + '；解析失败 ' + invalid.length);
  if (invalid.length) console.log('    解析失败清单：' + invalid.join('、'));
  if (dupNames.length) console.log('    去重跳过（前 20）：' + dupNames.slice(0, 20).join('、'));

  const js = buildJs(parsed);
  console.log('[3/4] 生成：' + WEB_OUT + '（' + Math.round(js.length / 1024) + ' KB，' + parsed.length + ' 道）');
  fs.writeFileSync(WEB_OUT, js, 'utf8');
  fs.copyFileSync(WEB_OUT, CLOUD_OUT);
  console.log('    同步：' + CLOUD_OUT);

  console.log('[4/4] 完成。示例菜名：' + parsed.slice(0, 8).map(function (r) { return r.name; }).join('、'));
  cleanup();
}

main().catch(function (e) { console.error(e); process.exit(1); });