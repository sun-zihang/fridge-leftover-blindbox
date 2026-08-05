// 双人盲盒对局纯状态机单元测试
const test = require('node:test');
const assert = require('node:assert');
const D = require('../duel');

const now = () => 1785920000000;

test('createState + join + 双方就绪 → 自动交换炸弹', () => {
  let s = D.createState('r1', '123456', 'A', '阿明', now());
  let r = D.join(s, 'B', '阿强', now());
  assert.ok(r.success);
  r = D.ready(s, 'A', ['鸡蛋', '番茄', '米饭'], now(), () => 0.5);
  assert.ok(r.success);
  assert.strictEqual(s.phase, 'lobby');
  r = D.ready(s, 'B', ['可乐', '泡面', '香蕉'], now(), () => 0.5);
  assert.ok(r.success);
  assert.strictEqual(s.phase, 'swap');
  assert.ok(s.exchange.AtoB && s.exchange.BtoA);
  // AtoB = A 的食材被塞给 B；BtoA = B 的食材被塞给 A
  assert.ok(s.players.A.ingredients.includes(s.exchange.AtoB));
  assert.ok(s.players.B.ingredients.includes(s.exchange.BtoA));
});

test('ready 少于 3 样食材报错', () => {
  let s = D.createState('r2', '123457', 'A', '阿明', now());
  D.join(s, 'B', '阿强', now());
  const r = D.ready(s, 'A', ['鸡蛋', '番茄'], now());
  assert.strictEqual(r.success, false);
  assert.ok(/至少输入 3 样/.test(r.error));
});

test('房间满/重名昵称拒绝', () => {
  let s = D.createState('r3', '123458', 'A', '阿明', now());
  assert.strictEqual(D.join(s, 'B', '阿明', now()).success, false); // 重名
  assert.ok(D.join(s, 'B', '阿强', now()).success);
  assert.strictEqual(D.join(s, 'C', '阿刚', now()).success, false); // 满
});

test('双方出菜 → judge → 互评 → 结算（离谱分高者胜）', () => {
  let s = D.createState('r4', '123459', 'A', '阿明', now());
  D.join(s, 'B', '阿强', now());
  D.ready(s, 'A', ['a', 'b', 'c'], now(), () => 0);
  D.ready(s, 'B', ['d', 'e', 'f'], now(), () => 0);
  // 手动从 swap 推进到 cook 并双方出菜
  D.cook(s, 'A', { name: 'A菜' }, now());
  D.cook(s, 'B', { name: 'B菜' }, now());
  assert.strictEqual(s.phase, 'judge');
  // A 给 B 打 90（B 更离谱），B 给 A 打 40
  D.vote(s, 'A', 90, now());
  assert.strictEqual(s.phase, 'judge');
  D.vote(s, 'B', 40, now());
  assert.strictEqual(s.phase, 'done');
  assert.strictEqual(s.winner, 'B'); // B 的菜更离谱 → B 赢
  assert.strictEqual(s.tie, false);
});

test('平票 → 平局', () => {
  let s = D.createState('r5', '123450', 'A', '阿明', now());
  D.join(s, 'B', '阿强', now());
  D.ready(s, 'A', ['a', 'b', 'c'], now(), () => 0);
  D.ready(s, 'B', ['d', 'e', 'f'], now(), () => 0);
  D.cook(s, 'A', { name: 'A菜' }, now());
  D.cook(s, 'B', { name: 'B菜' }, now());
  D.vote(s, 'A', 50, now());
  D.vote(s, 'B', 50, now());
  assert.strictEqual(s.phase, 'done');
  assert.strictEqual(s.tie, true);
  assert.strictEqual(s.winner, null);
});

test('vote 越界分数拒绝', () => {
  let s = D.createState('r6', '123451', 'A', '阿明', now());
  D.join(s, 'B', '阿强', now());
  D.ready(s, 'A', ['a', 'b', 'c'], now(), () => 0);
  D.ready(s, 'B', ['d', 'e', 'f'], now(), () => 0);
  D.cook(s, 'A', { name: 'A菜' }, now());
  D.cook(s, 'B', { name: 'B菜' }, now());
  assert.strictEqual(D.vote(s, 'A', 101, now()).success, false);
  assert.strictEqual(D.vote(s, 'A', 'abc', now()).success, false);
});

test('主动 timeout → 对方赢 + 惩罚翻倍', () => {
  let s = D.createState('r7', '123452', 'A', '阿明', now());
  D.join(s, 'B', '阿强', now());
  const r = D.timeout(s, 'A', now());
  assert.ok(r.success);
  assert.strictEqual(s.phase, 'done');
  assert.strictEqual(s.winner, 'B');
  assert.strictEqual(s.penaltyDouble, true);
});

test('tick 懒超时：lobby 超时未就绪 → 判负翻倍', () => {
  let s = D.createState('r8', '123453', 'A', '阿明', now());
  D.join(s, 'B', '阿强', now());
  D.ready(s, 'A', ['a', 'b', 'c'], now(), () => 0);
  D.tick(s, now() + D.INPUT_SECONDS * 1000 + 100);
  assert.strictEqual(s.phase, 'done');
  assert.strictEqual(s.winner, 'A'); // B 超时 → A 赢
  assert.strictEqual(s.penaltyDouble, true);
});

test('heartbeat：对手掉线且未完成动作 → 判对手输', () => {
  let s = D.createState('r9', '123454', 'A', '阿明', now());
  D.join(s, 'B', '阿强', now());
  D.ready(s, 'A', ['a', 'b', 'c'], now(), () => 0);
  D.ready(s, 'B', ['d', 'e', 'f'], now(), () => 0); // swap 后进入 cook 前
  D.cook(s, 'A', { name: 'A菜' }, now()); // A 已出菜，B 未出
  // B 长时间无心跳
  const r = D.heartbeat(s, 'A', now() + D.OFFLINE_MS + 1000);
  assert.ok(r.success);
  assert.strictEqual(s.phase, 'done');
  assert.strictEqual(s.winner, 'A');
  assert.strictEqual(s.penaltyDouble, true);
});

test('tick：swap 阶段超时自动推进语义（deadline 覆盖动画+烹饪）', () => {
  let s = D.createState('r10', '123455', 'A', '阿明', now());
  D.join(s, 'B', '阿强', now());
  D.ready(s, 'A', ['a', 'b', 'c'], now(), () => 0);
  D.ready(s, 'B', ['d', 'e', 'f'], now(), () => 0);
  assert.strictEqual(s.phase, 'swap');
  // 超过 deadline（动画+烹饪）仍无人出菜 → 双判负/平局
  D.tick(s, now() + D.SWAP_MS + D.COOK_SECONDS * 1000 + 100);
  assert.strictEqual(s.phase, 'done');
  assert.strictEqual(s.tie, true);
});

test('rematch：对局结束后回到 lobby 并保留双方玩家', function () {
  const s = D.createState('r1', '123456', 'a', '玩家A', 1000);
  D.join(s, 'b', '玩家B', 1100);
  D.ready(s, 'a', ['鸡蛋', '番茄', '泡面'], 1200, () => 0.5);
  D.ready(s, 'b', ['可乐', '米饭', '洋葱'], 1300, () => 0.5);
  D.cook(s, 'a', { name: 'A菜' }, 2000);
  D.cook(s, 'b', { name: 'B菜' }, 2100);
  D.vote(s, 'a', 80, 3000);
  D.vote(s, 'b', 50, 3100);
  assert.strictEqual(s.phase, 'done');
  const r = D.rematch(s, 4000);
  assert.strictEqual(r.success, true);
  assert.strictEqual(s.phase, 'lobby');
  assert.strictEqual(Object.keys(s.players).length, 2);
  assert.strictEqual(s.players.a.ready, false);
  assert.strictEqual(s.players.a.recipe, null);
  assert.strictEqual(s.winner, null);
  assert.ok(s.deadline > 4000);
});

test('等人阶段：房主独处超时不判负，双人进房才开始 30s 倒计时', () => {
  let s = D.createState('r11', '123460', 'A', '阿明', now());
  assert.strictEqual(s.deadline, 0); // 初始不倒数
  D.tick(s, now() + D.INPUT_SECONDS * 1000 + 999);
  assert.strictEqual(s.phase, 'lobby'); // 不足 2 人，不判负
  D.join(s, 'B', '阿强', now());
  assert.ok(s.deadline > now()); // 双人到齐，开始倒计时
  D.tick(s, now() + D.INPUT_SECONDS * 1000 + 100);
  assert.strictEqual(s.phase, 'done'); // 双人且都未就绪 → 平局判负
  assert.strictEqual(s.tie, true);
});
