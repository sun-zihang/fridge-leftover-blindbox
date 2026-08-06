'use strict';
/* A-Bowl-of-Home 成品图下载脚本（仅开发期）
 * 把源站 imgs/*.webp（DISHES 有图的 577 张）下载到 web/abowl-imgs/，文件名 abowl_NNN.ext（ASCII 安全），
 * 并输出 web/abowl-imgs-map.json（菜名→本地文件名），供 importABowlRecipes.js 生成本地图片路径。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const vm = require('vm');

const SRC = path.join(os.tmpdir(), 'abowl-src');
const BASE = 'https://tuozhekongqi.github.io/A-Bowl-of-Home/';
const OUT_DIR = path.resolve(__dirname, '..', 'web', 'abowl-imgs');
const MAP_FILE = path.resolve(__dirname, '..', 'web', 'abowl-imgs-map.json');

function extract() {
  const files = ['data.js'];
  for (let i = 2; i <= 28; i++) files.push('data' + i + '.js');
  let code = '';
  for (const f of files) code += fs.readFileSync(path.join(SRC, f), 'utf8') + '\n;\n';
  code += ';globalThis.__EXPORT = { DISHES: DISHES };';
  const sandbox = { console: { log: function () {} }, Object: Object, Array: Array, Math: Math, JSON: JSON, Date: Date, Set: Set, Map: Map, String: String, Number: Number, Boolean: Boolean, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, RegExp: RegExp };
  sandbox.globalThis = sandbox; sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { timeout: 15000 });
  const photoCode = fs.readFileSync(path.join(SRC, 'photos.js'), 'utf8');
  const ps = { window: {} };
  vm.createContext(ps);
  vm.runInContext(photoCode, ps);
  return { dishes: sandbox.__EXPORT.DISHES || {}, photoMap: ps.window.PHOTO_MAP || {} };
}

function httpGetBuffer(url) {
  return new Promise(function (resolve, reject) {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' }, timeout: 45000 }, function (res) {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { resolve(Buffer.concat(chunks)); });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(new Error('timeout')); });
  });
}

async function downloadOne(url, outPath) {
  for (let t = 0; t < 3; t++) {
    try {
      const buf = await httpGetBuffer(url);
      if (!buf || buf.length < 100) throw new Error('too small');
      fs.writeFileSync(outPath, buf);
      return buf.length;
    } catch (e) {
      if (t === 2) throw e;
      await new Promise(function (r) { setTimeout(r, 1500); });
    }
  }
}

async function main() {
  console.log('[1/3] 提取 DISHES + PHOTO_MAP ...');
  const { dishes, photoMap } = extract();
  const names = Object.keys(dishes);
  const jobs = [];
  for (const n of names) {
    const p = photoMap[n];
    if (!p) continue;
    const ext = path.extname(p) || '.webp';
    jobs.push({ name: n, src: BASE + encodeURI(p), ext: ext });
  }
  console.log('    待下载图片：' + jobs.length);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('[2/3] 并发下载（8 并发，重试 3 次）...');
  const map = {};
  let ok = 0, fail = [];
  const queue = jobs.slice();
  async function worker() {
    while (queue.length) {
      const j = queue.shift();
      const idx = jobs.indexOf(j) + 1;
      const file = 'abowl_' + String(idx).padStart(3, '0') + j.ext;
      try {
        await downloadOne(j.src, path.join(OUT_DIR, file));
        map[j.name] = file;
        ok++;
        process.stdout.write('  ' + idx + '/' + jobs.length + ' ok\r');
      } catch (e) {
        fail.push(j.name);
        process.stdout.write('  ' + idx + ' FAIL ' + j.name + '\n');
      }
    }
  }
  const workers = [];
  for (let i = 0; i < 8; i++) workers.push(worker());
  await Promise.all(workers);
  console.log('\n    成功：' + ok + '，失败：' + fail.length);
  if (fail.length) console.log('    失败清单：' + fail.join('、'));
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 0), 'utf8');
  console.log('[3/3] 已写映射：' + MAP_FILE + '（' + Object.keys(map).length + ' 项）');
  let total = 0;
  const files = fs.readdirSync(OUT_DIR);
  for (const f of files) total += fs.statSync(path.join(OUT_DIR, f)).size;
  console.log('    图片目录：' + OUT_DIR + '，' + files.length + ' 个文件，' + Math.round(total / 1024 / 1024) + ' MB');
}

main().catch(function (e) { console.error(e); process.exit(1); });