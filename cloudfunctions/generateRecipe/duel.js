// 双人盲盒对局：纯状态机（不依赖云环境，可 node:test 单测）
// 阶段：lobby(输入) → swap(交换炸弹) → cook(各自出菜) → judge(互评离谱分) → done(结算)
// 规则：输入 30s / 烹饪 60s / 评分 60s，任一超时判负并惩罚翻倍；断线由心跳判定
const INPUT_SECONDS = 30;
const SWAP_MS = 3000;          // 交换炸弹动画时长（客户端用）
const COOK_SECONDS = 60;
const JUDGE_SECONDS = 60;
const HEARTBEAT_SECONDS = 10;  // 心跳间隔
const OFFLINE_MS = HEARTBEAT_SECONDS * 4 * 1000; // 超过 4 个心跳周期视为掉线

function mkPlayer(nick) {
  return {
    nick: nick || '玩家',
    ingredients: [],
    ready: false,
    recipe: null,
    cooked: false,
    progress: 0,
    score: null,          // 给对方菜打的离谱分 0-100
    voted: false,
    online: true,
    lastSeen: 0
  };
}

function createState(roomId, code, uid, nick, now) {
  var players = {};
  players[uid] = mkPlayer(nick);
  return {
    roomId: roomId,
    code: code,
    phase: 'lobby',
    players: players,
    exchange: { AtoB: '', BtoA: '' },
    winner: null,          // 赢家 uid
    tie: false,
    penaltyDouble: false,  // 是否因超时/掉线翻倍
    timeoutLoser: null,    // 因超时判负的一方 uid（或 'both'）
    deadline: 0,           // two players joined -> 30s input timer
    created_at: now,
    updated_at: now
  };
}

function ok(state) { return { success: true, state: state }; }
function err(msg) { return { success: false, error: msg }; }
function otherUid(state, uid) {
  var us = Object.keys(state.players);
  return us.find(function (u) { return u !== uid; }) || null;
}
function both(state, fn) {
  var us = Object.keys(state.players);
  return us.length === 2 && us.every(fn);
}
function touch(state, now) { state.updated_at = now; }

// 懒超时：每次操作前调用，检查当前阶段是否有人超时
function tick(state, now) {
  if (state.phase === 'done') return state;
  if (now <= (state.deadline || 0)) return state;
  var pending;
  if (state.phase === 'swap') {
    // swap：deadline 已含动画 3s + 烹饪 60s；超时仍无人出菜 → 双方判负
    state.phase = 'done';
    state.tie = true;
    state.penaltyDouble = true;
    state.timeoutLoser = 'both';
    return state;
  }
  if (state.phase === 'lobby') {
    if (Object.keys(state.players).length < 2) return state;
    pending = Object.keys(state.players).filter(function (u) { return !state.players[u].ready; });
  } else if (state.phase === 'cook') {
    pending = Object.keys(state.players).filter(function (u) { return !state.players[u].cooked; });
  } else if (state.phase === 'judge') {
    pending = Object.keys(state.players).filter(function (u) { return state.players[u].score === null; });
  } else {
    return state;
  }
  if (pending.length === 1) {
    state.phase = 'done';
    state.winner = otherUid(state, pending[0]);
    state.timeoutLoser = pending[0];
    state.penaltyDouble = true;
  } else if (pending.length === 2) {
    state.phase = 'done';
    state.tie = true;
    state.penaltyDouble = true;
    state.timeoutLoser = 'both';
  }
  return state;
}

function join(state, uid, nick, now) {
  if (state.phase !== 'lobby') return err('对局已开始，无法加入');
  if (Object.keys(state.players).length >= 2) return err('房间已满');
  var other = otherUid(state, uid);
  if (other && state.players[other].nick === nick) return err('昵称不能与对手相同');
  state.players[uid] = mkPlayer(nick);
  if (Object.keys(state.players).length === 2) {
    state.deadline = now + INPUT_SECONDS * 1000;
  }
  touch(state, now);
  return ok(state);
}

function ready(state, uid, ingredients, now, rng) {
  var p = state.players[uid];
  if (!p) return err('你不在这个房间');
  if (state.phase !== 'lobby') return err('当前阶段不能输入食材');
  var list = (Array.isArray(ingredients) ? ingredients : String(ingredients || '').split(/[、,，;；]/))
    .map(function (s) { return String(s).trim(); })
    .filter(Boolean);
  if (list.length < 3) return err('至少输入 3 样食材');
  p.ingredients = list.slice(0, 12);
  p.ready = true;
  touch(state, now);
  if (both(state, function (u) { return state.players[u].ready; })) {
    startSwap(state, now, rng || Math.random);
  }
  return ok(state);
}

function startSwap(state, now, rand) {
  var us = Object.keys(state.players);
  if (us.length !== 2) return;
  var a = us[0], b = us[1];
  var pick = function (arr) { return arr[Math.floor(rand() * arr.length)]; };
  state.exchange.AtoB = pick(state.players[a].ingredients); // A 的炸弹 → B
  state.exchange.BtoA = pick(state.players[b].ingredients); // B 的炸弹 → A
  state.phase = 'swap';
  state.deadline = now + SWAP_MS + COOK_SECONDS * 1000; // 动画 3s + 烹饪 60s
  touch(state, now);
}

// 手动触发交换（客户端兜底，正常由双方就绪自动触发）
function swap(state, uid, now, rng) {
  if (state.phase !== 'lobby') return err('当前阶段不能交换');
  if (!both(state, function (u) { return state.players[u].ready; })) return err('双方都就绪后才能交换');
  startSwap(state, now, rng || Math.random);
  return ok(state);
}

// 玩家提交自己的菜谱（服务端在 duelCook 里生成后调用）
function cook(state, uid, recipe, now) {
  var p = state.players[uid];
  if (!p) return err('你不在这个房间');
  if (state.phase !== 'swap' && state.phase !== 'cook') return err('当前阶段不能烹饪');
  if (state.phase === 'swap') state.phase = 'cook'; // 对方先提交则推进
  p.recipe = recipe;
  p.cooked = true;
  p.progress = 100;
  touch(state, now);
  if (both(state, function (u) { return state.players[u].cooked; })) {
    state.phase = 'judge';
    state.deadline = now + JUDGE_SECONDS * 1000;
  }
  return ok(state);
}

// 给对方的菜打离谱分（0-100），双方都打完则结算
function vote(state, uid, score, now) {
  var p = state.players[uid];
  if (!p) return err('你不在这个房间');
  if (state.phase !== 'judge') return err('当前阶段不能评分');
  var sc = Number(score);
  if (!isFinite(sc) || sc < 0 || sc > 100) return err('离谱分需在 0-100 之间');
  p.score = Math.round(sc);
  p.voted = true;
  touch(state, now);
  if (both(state, function (u) { return state.players[u].score !== null; })) {
    settle(state);
  }
  return ok(state);
}

function settle(state) {
  var us = Object.keys(state.players);
  var a = us[0], b = us[1];
  var sa = state.players[a].score; // A 给 B 的菜打分
  var sb = state.players[b].score; // B 给 A 的菜打分
  state.phase = 'done';
  state.deadline = 0;
  if (sa === sb) {
    state.tie = true;
    state.winner = null;
  } else {
    // 谁被对方打的分更高（更离谱）谁赢
    state.winner = sa > sb ? b : a;
  }
  touch(state, Date.now());
}

// 主动认输/超时（客户端倒计时到 0 时调用）
function timeout(state, uid, now) {
  var p = state.players[uid];
  if (!p) return err('你不在这个房间');
  if (state.phase === 'done') return ok(state);
  state.phase = 'done';
  state.winner = otherUid(state, uid);
  state.timeoutLoser = uid;
  state.penaltyDouble = true;
  state.deadline = 0;
  touch(state, now);
  return ok(state);
}

// 心跳：更新在线状态；检测对手掉线则直接判对方输（仅限对方尚未完成当前阶段动作时）
function heartbeat(state, uid, now) {
  var p = state.players[uid];
  if (!p) return err('你不在这个房间');
  p.online = true;
  p.lastSeen = now;
  var opp = otherUid(state, uid);
  if (opp) {
    var o = state.players[opp];
    if (o && now - (o.lastSeen || 0) > OFFLINE_MS) {
      o.online = false;
      var pending = (state.phase === 'lobby' && !o.ready) ||
                    (state.phase === 'cook' && !o.cooked) ||
                    (state.phase === 'judge' && o.score === null);
      if (pending && state.phase !== 'done') {
        state.phase = 'done';
        state.winner = uid;
        state.timeoutLoser = opp;
        state.penaltyDouble = true;
        state.deadline = 0;
      }
    }
  }
  touch(state, now);
  return ok(state);
}

// 查看状态（含基本鉴权：只能看自己在的房间）
function view(state, uid) {
  if (!state.players[uid]) return null;
  return state;
}

// 再来一局：保留双方玩家，清空对局状态回到 lobby
function rematch(state, now) {
  if (state.phase !== 'done') return err('对局尚未结束');
  var us = Object.keys(state.players);
  us.forEach(function (u) {
    var p = state.players[u];
    p.ingredients = [];
    p.ready = false;
    p.recipe = null;
    p.cooked = false;
    p.progress = 0;
    p.score = null;
    p.voted = false;
    p.online = true;
  });
  state.phase = 'lobby';
  state.exchange = { AtoB: '', BtoA: '' };
  state.winner = null;
  state.tie = false;
  state.penaltyDouble = false;
  state.timeoutLoser = null;
  state.deadline = now + INPUT_SECONDS * 1000;
  touch(state, now);
  return ok(state);
}
module.exports = {
  INPUT_SECONDS: INPUT_SECONDS, SWAP_MS: SWAP_MS, COOK_SECONDS: COOK_SECONDS,
  JUDGE_SECONDS: JUDGE_SECONDS, HEARTBEAT_SECONDS: HEARTBEAT_SECONDS, OFFLINE_MS: OFFLINE_MS,
  createState: createState, join: join, ready: ready, swap: swap, cook: cook,
  vote: vote, timeout: timeout, heartbeat: heartbeat, tick: tick, view: view,
  settle: settle, otherUid: otherUid, rematch: rematch
};
