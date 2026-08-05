/* 冰箱剩菜盲盒 · 网页版 */
(function () {
  'use strict';

  /* ===== 配置 ===== */
  var CLOUD_ENV_ID = 'a455-d3g2s3dt865d86640';   // 云开发环境 ID（已配置，换环境时修改）
  var CLOUD_REGION = 'ap-shanghai';   // 环境地域
  var isDemo = !CLOUD_ENV_ID || CLOUD_ENV_ID === 'YOUR_ENV_ID';

  var cloudApp = null;
var state = { recipe: null, recordId: '', rated: false, generating: false, styleId: 'classic', mode: 'weird', persona: 'youmo', player: null, styles: [], rankData: [], rankTag: '全部', posterSkin: 'normal', challengeId: '', detailRecipe: null, rankDetailRecipe: null, synthA: '', synthB: '' };

  function $(id) { return document.getElementById(id); }
  var els = {
    ingredients: $('ingredients'),
    charCount: $('charCount'),
    micBtn: $('micBtn'),
    micWave: $('micWave'),
    micHint: $('micHint'),
    genBtn: $('genBtn'),
    potLoading: $('potLoading'),
    potText: $('potText'),
    result: $('result'),
    dishName: $('dishName'),
    dishIngredients: $('dishIngredients'),
    steps: $('steps'),
    flipHint: $('flipHint'),
    stepsToggle: $('stepsToggle'),
    stepsWrap: $('stepsWrap'),
    warningToggle: $('warningToggle'),
    plating: $('plating'),
    warning: $('warning'),
    posterBtn: $('posterBtn'),
    shareBtn: $('shareBtn'),
    posterSection: $('posterSection'),
    posterCanvas: $('posterCanvas'),
    saveBtn: $('saveBtn'),
    sharePosterBtn: $('sharePosterBtn'),
    toast: $('toast'),
    rankList: $('rankList'),
    guideToggle: $('guideToggle'),
    guideBody: $('guideBody'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    rankModal: $('rankModal'),
    rankModalClose: $('rankModalClose'),
    rankModalEmoji: $('rankModalEmoji'),
    rankModalDish: $('rankModalDish'),
    rankModalTag: $('rankModalTag'),
    rankModalComment: $('rankModalComment'),
    rankDetailBtn: $('rankDetailBtn'),
    rankTabs: $('rankTabs'),
    challengeCard: $('challengeCard'),
    statStreak: $('statStreak'),
    statPoints: $('statPoints'),
    statBadges: $('statBadges'),
    badgeWall: $('badgeWall'),
    styleList: $('styleList'),
    pointsLine: $('pointsLine'),
    challengeBtn: $('challengeBtn'),
    challengeBanner: $('challengeBanner'),
    acceptChallengeBtn: $('acceptChallengeBtn'),
    libBadge: $('libBadge'),
    detailBtn: $('detailBtn'),
    detailModal: $('detailModal'),
    detailModalClose: $('detailModalClose'),
    detailBody: $('detailBody'),
    cameraBtn: $('cameraBtn'),
    cameraInput: $('cameraInput'),
    dailyCard: $('dailyCard'),
    dailyTitle: $('dailyTitle'),
    dailyDesc: $('dailyDesc'),
    dailyIngredients: $('dailyIngredients'),
    dailyUseBtn: $('dailyUseBtn'),
    darkScoreBox: $('darkScoreBox'),
    darkScoreEmoji: $('darkScoreEmoji'),
    darkScoreLabel: $('darkScoreLabel'),
    darkScoreTip: $('darkScoreTip'),
    darkScoreNum: $('darkScoreNum'),
    darkScoreFill: $('darkScoreFill'),
    dangerBox: $('dangerBox'),
    shoppingBox: $('shoppingBox'),
    shoppingList: $('shoppingList'),
    chefLoading: $('chefLoading'),
    chefResult: $('chefResult'),
    rankVoteUp: $('rankVoteUp'),
    rankVoteDown: $('rankVoteDown'),
    rankVoteUpNum: $('rankVoteUpNum'),
    rankVoteDownNum: $('rankVoteDownNum'),
    soundBtn: $('soundBtn'),
    personaBtns: document.querySelectorAll('.persona-btn'),
    synthCard: $('synthCard'),
    synthA: $('synthA'),
    synthB: $('synthB'),
    synthPool: $('synthPool'),
    synthGo: $('synthGo'),
    buyFab: $('buyFab'),
    buyModal: $('buyModal'),
    buyModalClose: $('buyModalClose'),
    duelBtn: $('duelBtn'),
    duelView: $('duelView'),
    duelClose: $('duelClose'),
    duelBody: $('duelBody'),
    eventBanner: $('eventBanner'),
    eggModal: $('eggModal'),
    eggOk: $('eggOk'),
    accountBtn: $('accountBtn'),
    loginModal: $('loginModal'),
    loginName: $('loginName'),
    loginErr: $('loginErr'),
    loginOk: $('loginOk'),
    fridgeToggle: $('fridgeToggle'),
    fridgeBody: $('fridgeBody'),
    fridgeName: $('fridgeName'),
    fridgeDays: $('fridgeDays'),
    fridgeAdd: $('fridgeAdd'),
    fridgeList: $('fridgeList'),
    fridgeCook: $('fridgeCook'),
    nutritionBox: $('nutritionBox'),
    nutritionBody: $('nutritionBody'),
    shopCopy: $('shopCopy'),
    shopExport: $('shopExport'),
    favBtn: $('favBtn'),
    favTabs: $('favTabs'),
    favList: $('favList'),
    videoBox: $('videoBox')
  };

  /* ===== 工具 ===== */
  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.add('hidden'); }, 2200);
  }

  /* ===== 音效（WebAudio 合成，无外部资源） ===== */
  var soundOn = localStorage.getItem('fridge_sound') !== 'off';
  var audioCtx = null;
  function ac() {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return null;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function tone(freq, dur, type, vol, when) {
    if (!soundOn) return;
    var ctx = ac();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var t0 = ctx.currentTime + (when || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function soundBubble() { tone(320 + Math.random() * 140, 0.12, 'triangle', 0.05); }
  function soundDing() { tone(660, 0.18, 'sine', 0.12); setTimeout(function () { tone(880, 0.22, 'sine', 0.1, 0.12); }, 120); }
  function soundAlarm() { tone(220, 0.2, 'sawtooth', 0.08); setTimeout(function () { tone(180, 0.25, 'sawtooth', 0.08, 0.18); }, 180); }
  function soundPop() { tone(520, 0.08, 'square', 0.07); }
  function setSound(on) {
    soundOn = on;
    localStorage.setItem('fridge_sound', on ? 'on' : 'off');
    els.soundBtn.textContent = on ? '🔊 音效：开' : '🔇 音效：关';
    els.soundBtn.classList.toggle('muted', !on);
  }
  els.soundBtn.addEventListener('click', function () { setSound(!soundOn); });

  /* ===== 买菜悬浮按钮 ===== */
  function openBuyModal() {
    els.buyModal.classList.remove('hidden');
    soundPop();
  }
  function closeBuyModal() {
    els.buyModal.classList.add('hidden');
  }
  els.buyFab.addEventListener('click', openBuyModal);
  els.buyModalClose.addEventListener('click', closeBuyModal);
  els.buyModal.addEventListener('click', function (e) {
    if (e.target === els.buyModal || e.target.classList.contains('buy-modal-backdrop')) closeBuyModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !els.buyModal.classList.contains('hidden')) closeBuyModal();
  });

  /* ===== 每日挑战（云 / 演示兜底） ===== */
  var DEMO_DAILY = { name: '老干妈奇袭', emoji: '🌶️', ingredients: ['老干妈', '巧克力', '剩米饭'] };
  function renderDaily(ch, done) {
    if (!ch) { els.dailyCard.classList.add('hidden'); return; }
    els.dailyCard.classList.remove('hidden');
    els.dailyTitle.textContent = (ch.emoji || '🍽️') + ' 今日挑战：' + (ch.name || '');
    els.dailyDesc.textContent = done ? '今天已打卡 ✅ 明天再来新食材' : '用下面 3 种食材开一盒盲盒，完成打卡 +5 分';
    els.dailyIngredients.textContent = '';
    (ch.ingredients || []).forEach(function (ing) {
      var chip = document.createElement('span');
      chip.className = 'daily-ing';
      chip.textContent = ing;
      els.dailyIngredients.appendChild(chip);
    });
    els.dailyUseBtn.disabled = !!done;
    els.dailyUseBtn.textContent = done ? '已打卡' : '一键填入';
  }
  function loadDaily() {
    if (isDemo || !cloudApp) { renderDaily(DEMO_DAILY, false); return; }
    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'dailyChallenge' } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success || !r.data) throw new Error((r && r.error) || '每日挑战加载失败');
        renderDaily(r.data.challenge, r.data.done);
      })
      .catch(function (e) { console.warn('dailyChallenge failed:', e); renderDaily(DEMO_DAILY, false); });
  }
  els.dailyUseBtn.addEventListener('click', function () {
    var ings = [];
    els.dailyIngredients.querySelectorAll('.daily-ing').forEach(function (el) { ings.push(el.textContent); });
    if (!ings.length) return;
    els.ingredients.value = ings.join('、');
    els.charCount.textContent = els.ingredients.value.length + '/200';
    toast('今日挑战食材已填入，召唤主厨吧！');
    els.ingredients.focus();
  });

  /* ===== 拍照识别食材 ===== */
  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var maxW = 960;
        var scale = Math.min(1, maxW / img.width);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = function () { cb(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }
  els.cameraBtn.addEventListener('click', function () { els.cameraInput.click(); });
  els.cameraInput.addEventListener('change', function () {
    var file = els.cameraInput.files && els.cameraInput.files[0];
    if (!file) return;
    els.cameraInput.value = '';
    toast('正在识别图片里的食材…');
    compressImage(file, function (dataUrl) {
      if (!dataUrl) { toast('图片处理失败，请换一张'); return; }
      if (isDemo || !cloudApp) { toast('演示模式不支持识别，请手输食材'); return; }
      cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'recognizeImage', image: dataUrl } })
        .then(function (res) {
          var r = res && res.result ? res.result : {};
          if (!r.success || !r.data || !r.data.ingredients || !r.data.ingredients.length) {
            throw new Error((r && r.error) || '没识别出食材，换张更清楚的图吧');
          }
          var prev = els.ingredients.value.trim();
          var next = prev ? prev + '、' + r.data.ingredients.join('、') : r.data.ingredients.join('、');
          els.ingredients.value = next.slice(0, 200);
          els.charCount.textContent = els.ingredients.value.length + '/200';
          toast('识别到 ' + r.data.ingredients.length + ' 种食材：' + r.data.ingredients.join('、'));
        })
        .catch(function (e) { toast((e && e.message) ? e.message : '识别失败，请手输食材'); });
    });
  });

  /* ===== 云初始化（尽力而为，失败自动进演示模式） ===== */
  // 返回 Promise：resolve(true) 表示已登录可用云能力，resolve(false) 表示走演示模式。
  // 必须先 await 匿名登录完成再调用云函数，否则会报 "you can't request without auth"。
  function initCloud() {
    if (isDemo || typeof cloudbase === 'undefined') return Promise.resolve(false);
    try {
      // timeout: 60s —— AI 生成（hy3 混元 / qwen3.5-flash）偶尔超过 SDK 默认 15s，避免请求被中断
      cloudApp = cloudbase.init({ env: CLOUD_ENV_ID, region: CLOUD_REGION, timeout: 60000 });
      var auth = cloudApp.auth();
      var signInPromise;
      if (auth && typeof auth.signInAnonymously === 'function') {
        // SDK 2.x 匿名登录 API
        signInPromise = auth.signInAnonymously();
      } else if (auth && auth.anonymousAuthProvider && typeof auth.anonymousAuthProvider === 'function') {
        // 旧版 SDK 兼容
        signInPromise = auth.anonymousAuthProvider().signIn();
      } else {
        signInPromise = Promise.resolve();
      }
      return signInPromise
        .then(function () { return true; })
        .catch(function (e) {
          console.warn('anonymous sign-in failed:', e);
          return false;
        });
    } catch (e) {
      console.warn('cloud init failed:', e);
      return Promise.resolve(false);
    }
  }

  /* ===== 游戏化：生存挑战 / 风格 / 投喂 ===== */
  function renderChallengeCard(player, styles) {
    if (!player) return;
    state.player = player;
    state.styles = styles || [];
    els.challengeCard.classList.remove('hidden');
    els.statStreak.textContent = player.streak || 0;
    els.statPoints.textContent = player.points || 0;
    els.statBadges.textContent = (player.badges || []).length;
    els.badgeWall.textContent = '';
    var allBadges = [
      { id: '暗黑料理大师', emoji: '👨‍🍳' },
      { id: '米其林在逃主厨', emoji: '🚑' },
      { id: '味蕾幸存者', emoji: '🫡' }
    ];
    allBadges.forEach(function (b) {
      var chip = document.createElement('span');
      chip.className = 'badge-chip' + ((player.badges || []).indexOf(b.id) >= 0 ? '' : ' locked');
      chip.textContent = b.emoji + ' ' + b.id;
      els.badgeWall.appendChild(chip);
    });
    renderStyles(styles || []);
  }
  function renderStyles(styles) {
    els.styleList.textContent = '';
    (styles || []).forEach(function (st) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'style-chip' + (st.unlocked ? '' : ' locked') + (st.id === state.styleId ? ' selected' : '');
      chip.textContent = st.name + (st.unlocked ? '' : ' 🔒' + st.cost);
      chip.addEventListener('click', function () {
        if (!st.unlocked) {
          if (cloudApp && state.player && state.player.points >= st.cost) { unlockStyle(st.id); }
          else { toast('积分不足，还差 ' + (st.cost - (state.player ? state.player.points : 0)) + ' 分'); }
          return;
        }
        state.styleId = st.id;
        renderStyles(state.styles);
      });
      els.styleList.appendChild(chip);
    });
  }
  function unlockStyle(styleId) {
    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'unlockStyle', styleId: styleId } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success) throw new Error(r.error || '解锁失败');
        state.styleId = styleId;
        var nm = '';
        (r.data.styles || []).forEach(function (st) { if (st.id === styleId) nm = st.name; });
        renderChallengeCard(r.data.player, r.data.styles);
        toast('已解锁：' + nm);
      })
      .catch(function (e) { toast((e && e.message) ? e.message : '解锁失败'); });
  }
  function loadPlayer() {
    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'getPlayer' } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success) throw new Error(r.error || '加载失败');
        renderChallengeCard(r.data.player, r.data.styles);
      })
      .catch(function (e) { console.warn('getPlayer failed:', e); });
  }
  function applyGameResult(d) {
    if (!d) return;
    if (typeof d.points_gained === 'number') {
      var parts = ['+' + d.points_gained + ' 生存积分'];
      if (d.streak) parts.push('🔥 连续 ' + d.streak + ' 天');
      els.pointsLine.textContent = parts.join(' · ');
      els.pointsLine.classList.remove('hidden');
    }
    if (d.badges_new && d.badges_new.length) { toast('🏅 解锁徽章：' + d.badges_new.join('、')); }
    if (d.player) renderChallengeCard(d.player, d.styles);
  }
  function getQuery(name) {
    var m = new RegExp('[?&]' + name + '=([^&]+)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function handleChallengeParam() {
    var id = getQuery('challenge');
    if (!id) return;
    els.challengeBanner.classList.remove('hidden');
    state.challengeId = id;
  }
  function acceptChallengeFlow() {
    if (!state.challengeId) return;
    els.challengeBanner.classList.add('hidden');
    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'acceptChallenge', challengeId: state.challengeId } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success) throw new Error(r.error || '接受挑战失败');
        var ch = r.data.challenge || {};
        state.recipe = ch.recipe || null;
        state.recordId = '';
        state.rated = false;
        state.posterSkin = 'normal';
        els.dishName.textContent = (ch.recipe && ch.recipe.name) || '神秘投喂';
        els.dishIngredients.textContent = ch.ingredients ? '食材：' + ch.ingredients : '';
        renderSteps(ch.recipe);
        els.plating.textContent = '“' + ((ch.recipe && ch.recipe.plating) || '') + '”';
        els.warning.textContent = (ch.recipe && ch.recipe.warning) || '';
        els.pointsLine.textContent = '+20 投喂奖励到账 · 快用同款食材开做吧！';
        els.pointsLine.classList.remove('hidden');
        els.result.classList.remove('hidden');
        els.result.scrollIntoView({ behavior: 'smooth' });
        if (r.data.player) renderChallengeCard(r.data.player, r.data.styles);
      })
      .catch(function (e) { toast((e && e.message) ? e.message : '接受挑战失败'); });
  }
  function copyLink(link) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { toast('挑战链接已复制，发给好友吧'); });
    } else {
      prompt('复制挑战链接发给好友：', link);
    }
  }
  els.challengeBtn.addEventListener('click', function () {
    if (!state.recordId) { toast('先生成一道菜再甩锅'); return; }
    if (isDemo || !cloudApp) { toast('演示模式暂不支持甩锅'); return; }
    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'createChallenge', recordId: state.recordId } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success) throw new Error(r.error || '甩锅失败');
        var link = location.origin + location.pathname + '?challenge=' + encodeURIComponent(r.data.challengeId);
        state.challengeLink = link;
        // 以「甩锅卡」图片形式甩锅：绘制海报 + 展示（可下载/分享）
        drawPoster(state.recipe, els.ingredients.value.trim(), 'buck');
        els.posterSection.classList.remove('hidden');
        els.posterSection.scrollIntoView({ behavior: 'smooth' });
        soundPop();
        toast('甩锅卡已生成，下载后发给好友吧！');
      })
      .catch(function (e) { toast((e && e.message) ? e.message : '甩锅失败'); });
  });
  els.acceptChallengeBtn.addEventListener('click', acceptChallengeFlow);

  /* ===== 玩法速览折叠 ===== */
  els.guideToggle.addEventListener('click', function () {
    var closed = els.guideBody.classList.toggle('hidden');
    els.guideToggle.classList.toggle('open', !closed);
  });

  /* ===== 菜谱口味模式切换 ===== */
  els.modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.mode = btn.getAttribute('data-mode');
      els.modeBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
    });
  });

  /* ===== 主厨人设 ===== */
  els.personaBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.persona = btn.getAttribute('data-persona');
      els.personaBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
    });
  });

  /* ===== 食材合成实验室 ===== */
  var SYNTH_POOL = ['米饭', '牛奶', '可乐', '雪碧', '老干妈', '鸡蛋', '泡面', '香蕉', '巧克力', '皮蛋', '酸奶', '土豆', '西瓜', '辣条'];
  function renderSynthPool() {
    els.synthPool.textContent = '';
    SYNTH_POOL.forEach(function (ing) {
      var chip = document.createElement('span');
      chip.className = 'synth-ing' + ((state.synthA === ing || state.synthB === ing) ? ' picked' : '');
      chip.textContent = ing;
      chip.addEventListener('click', function () { pickSynth(ing); });
      els.synthPool.appendChild(chip);
    });
  }
  function pickSynth(ing) {
    // 循环填 A → B → 取消
    if (state.synthA === ing) { state.synthA = ''; }
    else if (state.synthB === ing) { state.synthB = ''; }
    else if (!state.synthA) { state.synthA = ing; }
    else if (!state.synthB) { state.synthB = ing; }
    else { state.synthA = state.synthB; state.synthB = ing; }
    els.synthA.textContent = state.synthA || '食材A';
    els.synthB.textContent = state.synthB || '食材B';
    els.synthA.classList.toggle('picked', !!state.synthA);
    els.synthB.classList.toggle('picked', !!state.synthB);
    renderSynthPool();
  }
  els.synthA.addEventListener('click', function () { if (state.synthA) { state.synthA = ''; els.synthA.textContent = '食材A'; els.synthA.classList.remove('picked'); renderSynthPool(); } });
  els.synthB.addEventListener('click', function () { if (state.synthB) { state.synthB = ''; els.synthB.textContent = '食材B'; els.synthB.classList.remove('picked'); renderSynthPool(); } });
  els.synthGo.addEventListener('click', function () {
    if (!state.synthA || !state.synthB) { toast('先选两种食材'); return; }
    var text = state.synthA + ' + ' + state.synthB;
    els.ingredients.value = text;
    els.charCount.textContent = text.length + '/200';
    state.mode = 'synth';
    els.modeBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-mode') === 'synth'); });
    toast('开始炼金合成：' + text);
    generate();
  });

  /* ===== 输入 ===== */
  els.ingredients.addEventListener('input', function () {
    els.charCount.textContent = els.ingredients.value.length + '/200';
  });

  /* ===== 语音输入（浏览器 SpeechRecognition） ===== */
  var recognition = null;
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    els.micBtn.classList.remove('hidden');
    recognition = new SpeechRec();
    recognition.lang = 'zh-CN';
recognition.interimResults = true;
    recognition.onresult = function (e) {
      var finalText = '';
      var interimText = '';
      for (var i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) { finalText += e.results[i][0].transcript; }
        else { interimText += e.results[i][0].transcript; }
      }
      if (interimText) {
        els.micHint.textContent = '正在听你说：' + interimText + voiceEmoji(interimText);
        els.micHint.classList.remove('hidden');
      } else if (finalText) {
        els.micHint.classList.add('hidden');
        appendVoice(finalText.trim());
      }
    };
    recognition.onerror = function (e) { toast('语音识别失败: ' + (e.error || 'unknown')); setMic(false); };
    recognition.onend = function () { setMic(false); };
    els.micBtn.addEventListener('click', function () {
      if (recognition.recognizing) { recognition.stop(); setMic(false); return; }
      try { recognition.start(); setMic(true); }
      catch (e) { toast('无法启动语音识别'); }
    });
  }
  var VOICE_EMOJI = [
    { re: /洋葱/, e: ' 😭' },
    { re: /可乐|雪碧|汽水/, e: ' 🥤' },
    { re: /泡面|方便面/, e: ' 🍜' },
    { re: /辣椒|老干妈|辣/, e: ' 🌶️' },
    { re: /鸡蛋/, e: ' 🥚' },
    { re: /土豆/, e: ' 🥔' },
    { re: /米饭|米/, e: ' 🍚' },
    { re: /牛奶|酸奶/, e: ' 🥛' },
    { re: /巧克力/, e: ' 🍫' },
    { re: /香蕉/, e: ' 🍌' },
    { re: /西瓜/, e: ' 🍉' },
    { re: /皮蛋/, e: ' 🥚' },
    { re: /肉/, e: ' 🥩' },
    { re: /鱼/, e: ' 🐟' },
    { re: /酒|啤酒/, e: ' 🍺' }
  ];
  function voiceEmoji(text) {
    var hit = VOICE_EMOJI.find(function (v) { return v.re.test(text); });
    return hit ? hit.e : '';
  }
  function setMic(on) {
    recognition.recognizing = on;
    els.micBtn.textContent = on ? '🔊 点击结束' : '🎙️ 语音输入';
    els.micBtn.classList.toggle('active', on);
    els.micWave.classList.toggle('hidden', !on);
    els.micHint.classList.toggle('hidden', !on);
    if (on) els.micHint.textContent = '正在聆听，说出你的剩菜…';
  }
  function appendVoice(t) {
    if (!t) return;
    var prev = els.ingredients.value.trim();
    els.ingredients.value = prev ? prev + '、' + t : t;
    els.charCount.textContent = els.ingredients.value.length + '/200';
  }

  /* ===== 生成 ===== */
  els.genBtn.addEventListener('click', generate);

  /* ===== 等待动画：趣味文案轮播 ===== */
  var LOADING_LINES = [
    'AI 主厨正在和泡面进行灵魂搏斗…',
    '可乐和洋葱的谈判进入了白热化阶段…',
    '正在为你的剩菜注入米其林灵魂…',
    '冰箱深处传来神秘的咕噜声…',
    '主厨决定让鸡蛋和酸奶先和解…',
    '正在把黑暗料理往“能吃”的方向硬拽…',
    '泡面已经就位，就差一个大胆的创意…',
    '洋葱哭了，但主厨说这是料理的一部分…',
    '主厨正在给剩菜们开动员大会…',
    '酱油和醋正在争夺今晚的 C 位…',
    '主厨把锅铲甩出了残影…',
    '剩菜们正在接受命运的安排…',
    '冰箱里传来一阵低语：“求你别放过我”…',
    '主厨深吸一口气，决定赌一把大的…',
    '调味料们正在举手表决今晚的菜名…',
    '锅已经热好，就差一个敢吃的人…'
  ];
  var potTimer = null;
  var typeTimer = null;
  function shuffleArr(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function typeLine(text) {
    if (typeTimer) clearInterval(typeTimer);
    els.potText.textContent = '';
    var k = 0;
    typeTimer = setInterval(function () {
      k++;
      els.potText.textContent = text.slice(0, k) + (k < text.length ? '▍' : '');
      if (k >= text.length) { clearInterval(typeTimer); typeTimer = null; }
    }, 45);
  }
  var bubbleTimer = null;
  function startPotShow() {
    els.potLoading.classList.remove('hidden');
    els.chefLoading.classList.remove('hidden');
    var queue = shuffleArr(LOADING_LINES);
    var idx = 0;
    typeLine(queue[0]);
    if (potTimer) clearInterval(potTimer);
    potTimer = setInterval(function () {
      idx = (idx + 1) % queue.length;
      typeLine(queue[idx]);
    }, 2300);
    if (bubbleTimer) clearInterval(bubbleTimer);
    bubbleTimer = setInterval(function () { soundBubble(); }, 620);
  }
  function stopPotShow() {
    if (potTimer) { clearInterval(potTimer); potTimer = null; }
    if (bubbleTimer) { clearInterval(bubbleTimer); bubbleTimer = null; }
    els.potLoading.classList.add('hidden');
  }


  function generate() {
    var text = els.ingredients.value.trim();
    if (!text) { toast('先告诉我冰箱里有什么'); return; }
    // 彩蛋：鸡蛋+番茄连续 3 次 → 主厨拒绝（本地规则，不调 AI）
    if (/(鸡蛋|蛋)/.test(text) && /(番茄|西红柿)/.test(text)) {
      var etCount = parseInt(localStorage.getItem('fridge_egg_tomato') || '0', 10) + 1;
      localStorage.setItem('fridge_egg_tomato', String(etCount));
      if (etCount >= 3) {
        localStorage.setItem('fridge_egg_tomato', '0');
        openEggModal();
        return;
      }
    } else {
      localStorage.setItem('fridge_egg_tomato', '0');
    }
    // 彩蛋：前任/礼物 → 断舍离爆炒苦瓜（本地直接出菜，云函数侧同样处理）
    if (/前任|礼物/.test(text)) {
      finishGenerate(text, Object.assign({}, EX_RECIPE_WEB), '', true);
      toast('💔 彩蛋触发：断舍离爆炒苦瓜');
      return;
    }
    if (state.generating) return;
    state.generating = true;
    els.genBtn.disabled = true;
    els.genBtn.textContent = '锅中冒泡中…';
    els.potLoading.classList.remove('hidden');
    els.result.classList.add('hidden');
    els.posterSection.classList.add('hidden');

    if (isDemo || !cloudApp) {
      setTimeout(function () {
        finishGenerate(text, demoEventRecipe(demoRecipe(text)), '', true);
      }, 1200);
      return;
    }

    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'generate', ingredients: text, style: state.styleId, mode: state.mode, persona: state.persona } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success) throw new Error(r.error || '生成失败');
        finishGenerate(text, r.data.recipe, r.data.recordId || '', !!r.data.fallback);
        applyGameResult(r.data);
      })
      .catch(function (err) {
        state.generating = false;
        els.genBtn.disabled = false;
        els.genBtn.textContent = '召唤主厨 👨‍🍳';
        stopPotShow();
        var msg = (err && err.message) ? err.message : '生成失败，请稍后重试';
        if (msg.indexOf('PERMISSION_DENIED') >= 0) {
          msg = '云函数权限未开启：请在控制台为 generateRecipe 开启「所有用户可调用」';
        } else if (msg.indexOf('without auth') >= 0) {
          msg = '未登录：请在云开发控制台开启「匿名登录」';
        }
        toast(msg);
      });
  }

  function renderSteps(recipe) {
    els.steps.innerHTML = '';
    var stepEmojis = ['🔪', '🔥', '🍳', '🧂', '✨', '🍜'];
    (recipe.steps || []).forEach(function (s, i) {
      var li = document.createElement('li');
      li.className = 'step-card';
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', '步骤 ' + (i + 1) + '，点击翻面');

      var inner = document.createElement('div');
      inner.className = 'step-inner';

      var front = document.createElement('div');
      front.className = 'step-face step-front';
      var num = document.createElement('span');
      num.className = 'step-num';
      num.textContent = i + 1;
      var emoji = document.createElement('span');
      emoji.className = 'step-emoji';
      emoji.textContent = stepEmojis[i % stepEmojis.length];
      var hint = document.createElement('span');
      hint.className = 'step-flip-hint';
      hint.textContent = '轻触翻面';
      front.appendChild(num);
      front.appendChild(emoji);
      front.appendChild(hint);

      var back = document.createElement('div');
      back.className = 'step-face step-back';
      back.textContent = s;

      inner.appendChild(front);
      inner.appendChild(back);
      li.appendChild(inner);
      li.addEventListener('click', function () { li.classList.toggle('flipped'); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.classList.toggle('flipped'); }
      });
      els.steps.appendChild(li);
    });
  }

  function finishGenerate(ingredients, recipe, recordId, isFallback) {
    state.generating = false;
    state.recipe = recipe;
    state.recordId = recordId || '';
    state.rated = false;
    state.posterSkin = 'normal';
    els.pointsLine.classList.add('hidden');
    els.posterBtn.textContent = '生成朋友圈打卡海报 📸';
    els.genBtn.disabled = false;
    els.genBtn.textContent = '召唤主厨 👨‍🍳';
    els.potLoading.classList.add('hidden');

    // 随机事件横幅 + 音效
    var ev = recipe.event || null;
    if (ev) {
      els.eventBanner.classList.remove('hidden');
      els.eventBanner.className = 'event-banner' + (ev.id === 'inspiration' ? ' ev-inspiration' : '');
      els.eventBanner.innerHTML = '';
      var evEmoji = document.createElement('span');
      evEmoji.className = 'ev-emoji';
      evEmoji.textContent = ev.emoji || '🎲';
      var evTxt = document.createElement('span');
      var evName = document.createElement('b');
      evName.className = 'ev-name';
      evName.textContent = '『' + (ev.name || '突发事件') + '』 ';
      evTxt.appendChild(evName);
      evTxt.appendChild(document.createTextNode(ev.line || ''));
      els.eventBanner.appendChild(evEmoji);
      els.eventBanner.appendChild(evTxt);
      if (ev.id === 'inspiration') soundInspiration();
      else if (ev.id === 'cat_spice') soundCat();
      else if (ev.id === 'power_off') soundFlicker();
      els.result.classList.add('ev-inspiration-glow');
    } else {
      els.eventBanner.classList.add('hidden');
      els.result.classList.remove('ev-inspiration-glow');
    }
    els.dishName.textContent = recipe.name;
    els.result.classList.remove('skin-gold', 'skin-sick');
    els.stepsWrap.classList.add('hidden');
    els.warning.classList.add('hidden');
    els.stepsToggle.classList.remove('open');
    els.warningToggle.classList.remove('open');
    renderNutrition(ingredients, recipe);
    renderVideoRecommend(ingredients, recipe);
    state.lastIngredients = ingredients;
    updateFavBtn();
    renderDarkScore(recipe);
    renderDanger(recipe);
    renderShopping(recipe);
    renderChef(recipe);
    els.dishIngredients.textContent = '食材：' + ingredients;
    els.libBadge.classList.toggle('hidden', !recipe.lib);
    state.detailRecipe = recipe;
    els.detailBtn.classList.toggle('hidden', false);
    renderSteps(recipe);
    els.plating.textContent = '“' + recipe.plating + '”';
    els.warning.textContent = recipe.warning;
    els.result.classList.remove('hidden');
    if (isFallback) toast('AI 暂时掉线，先上了一份主厨拿手菜');
    soundDing();
    var hasDanger = (recipe.dangerFlags && recipe.dangerFlags.length) || (recipe.darkScore && recipe.darkScore > 80);
    if (hasDanger) soundAlarm();
    if (recipe.darkScore >= 100) toast('🙇 传说级料理！这是神的旨意！');
    els.result.scrollIntoView({ behavior: 'smooth' });
  }

  /* ===== 黑暗指数 / 危险高亮 / 购物清单 / 主厨状态 ===== */
  var DARK_RULES = [
    { re: /生|半生|未熟|发芽|变味|过期|腐烂|发霉|隔夜|馊/, score: 16 },
    { re: /皮蛋|榴莲|臭豆腐|螺蛳粉|酸菜|纳豆|秋葵|苦瓜|香菜/, score: 12 },
    { re: /老干妈|辣椒|辣|芥末|花椒|藤椒/, score: 7 },
    { re: /可乐|雪碧|汽水|啤酒|红酒|白酒|咖啡|奶茶|巧克力|冰淇淋|酸奶|香蕉|西瓜|芒果/, score: 9 },
    { re: /泡面|方便面|馒头|剩饭|隔夜饭/, score: 6 }
  ];
  function heuristicWeb(ings, mode) {
    var score = mode === 'normal' ? 25 : 42;
    DARK_RULES.forEach(function (k) { if (k.re.test(ings)) score += k.score; });
    return Math.max(0, Math.min(100, score));
  }
  var DEMO_DANGER = [
    { re: /发芽土豆|土豆发芽|变绿/, msg: '⚠️ 发芽/变绿的土豆含龙葵碱，千万别吃！' },
    { re: /河豚/, msg: '⚠️ 河豚含剧毒，家庭厨房千万别碰！' },
    { re: /生四季豆|生豆角|未熟豆角/, msg: '⚠️ 四季豆/豆角必须彻底煮熟！' },
    { re: /野生蘑菇/, msg: '⚠️ 无法辨别的野生蘑菇可能致命！' },
    { re: /发霉|长毛|腐烂|馊/, msg: '⚠️ 发霉变质的食材建议直接扔掉！' }
  ];
  function dangerWeb(ings, recipe) {
    var text = ings + ' ' + ((recipe && recipe.name) || '') + ' ' + ((recipe && recipe.warning) || '');
    return DEMO_DANGER.filter(function (r) { return r.re.test(text); }).map(function (r) { return { msg: r.msg, level: 'danger' }; });
  }
  function renderDarkScore(recipe) {
    var score = (typeof recipe.darkScore === 'number') ? recipe.darkScore : heuristicWeb(els.ingredients.value.trim(), state.mode);
    if (typeof recipe.darkScore !== 'number' && Math.random() < 0.04) score = 100;
    var tier = recipe.darkTier || darkTierOf(score);
    els.darkScoreBox.classList.remove('hidden');
    els.darkScoreEmoji.textContent = tier.emoji;
    els.darkScoreLabel.textContent = tier.label;
    els.darkScoreLabel.style.color = tier.color;
    els.darkScoreTip.textContent = tier.tip;
    els.darkScoreNum.textContent = score;
    els.darkScoreNum.style.color = tier.color;
    setTimeout(function () { els.darkScoreFill.style.width = score + '%'; }, 30);
  }
  function darkTierOf(score) {
    if (score >= 100) return { key: 'legend', label: '传说级料理', emoji: '🙇', tip: '这是神的旨意！请收下我的膝盖！', color: '#ffd700' };
    if (score <= 30) return { key: 'ok', label: '家常凑合', emoji: '🍚', tip: '饿不死，但也没灵魂', color: '#8ea2c8' };
    if (score <= 70) return { key: 'risky', label: '猎奇整活', emoji: '🎢', tip: '有点意思，肠胃准备接受挑战吧', color: '#ff7f27' };
    return { key: 'bio', label: '生化武器', emoji: '☣️', tip: '建议购买巨额保险后再尝试，你已触发「厨房毁灭者」成就！', color: '#ff2d55' };
  }
  function renderDanger(recipe) {
    els.dangerBox.textContent = '';
    var flags = recipe.dangerFlags || dangerWeb(els.ingredients.value.trim(), recipe);
    if (flags.length) {
      flags.forEach(function (f) {
        var item = document.createElement('div');
        item.className = 'danger-item';
        item.textContent = (typeof f === 'string' ? f : (f && f.msg)) || '';
        els.dangerBox.appendChild(item);
      });
      els.dangerBox.classList.remove('hidden');
    } else {
      els.dangerBox.classList.add('hidden');
    }
  }
  function renderShopping(recipe) {
    state.shoppingList = recipe.shoppingList || [];
    els.shoppingList.textContent = '';
    var list = recipe.shoppingList || [];
    if (list.length) {
      list.forEach(function (item) {
        var chip = document.createElement('span');
        chip.className = 'shopping-item';
        chip.textContent = '☐ ' + item;
        chip.addEventListener('click', function () {
          var checked = chip.classList.toggle('checked');
          chip.textContent = (checked ? '☑ ' : '☐ ') + item;
          soundPop();
        });
        els.shoppingList.appendChild(chip);
      });
      els.shoppingBox.classList.remove('hidden');
    } else {
      els.shoppingBox.classList.add('hidden');
    }
  }
  function renderChef(recipe) {
    var score = (typeof recipe.darkScore === 'number') ? recipe.darkScore : 50;
    els.chefResult.classList.remove('sweat', 'cool');
    if (score >= 100) {
      els.chefResult.textContent = '🙇';
      els.chefResult.classList.add('cool');
    } else if (score > 70) {
      els.chefResult.textContent = '🥴';
      els.chefResult.classList.add('sweat');
    } else if (score <= 30) {
      els.chefResult.textContent = '😎';
      els.chefResult.classList.add('cool');
    } else {
      els.chefResult.textContent = '👨‍🍳';
    }
  }

  /* ===== 演示模式兜底 ===== */
  function demoRecipe(ingredients) {
    // 正常家常模式：优先从内置菜谱库（206 道家常菜）出菜
    // 正常家常模式：优先用 iddzz 家常菜库（带演示视频），没有再退回内置 206 道库
    if (state.mode === 'normal') {
      if (window.IDDZZ_RECIPES) {
        var dm = window.IDDZZ_RECIPES.matchByIngredients(ingredients);
        if (dm.length) return window.IDDZZ_RECIPES.toAppRecipe(dm[0].recipe);
      }
      if (window.HOWTOCOOK_RECIPES) {
        var hm = window.HOWTOCOOK_RECIPES.matchByIngredients(ingredients);
        if (hm.length) return window.HOWTOCOOK_RECIPES.toAppRecipe(hm[0].recipe);
      }
      if (window.NORMAL_RECIPES) return window.NORMAL_RECIPES.getNormalAppRecipe(ingredients);
    }
    var pool = [
      {
        name: '主厨的倔强炒饭',
        steps: [
          '把“' + ingredients + '”切成丁，假装它们本来就是一个团队。',
          '热锅凉油，倒入食材，翻炒到它们认命为止。',
          '出锅前撒一把葱花，主打一个“尽力了”。'
        ],
        plating: '用一个平时不敢用的盘子，凹出米其林三星的自信。',
        warning: '肠胃敏感者请酌情食用，厨房已尽力，后果自负。'
      },
      {
        name: '剩菜大乱炖·绝地求生版',
        steps: [
          '把所有食材倒进锅里，告诉它们“这是团队合作”。',
          '大火烧开转小火，让矛盾在汤汁里慢慢和解。',
          '出锅前尝一口，记住这个味道，别浪费。'
        ],
        plating: '直接端锅上桌，主打一个真诚。',
        warning: '本菜不承担任何“吃完想家”或“想给主厨打钱”的责任。'
      },
      {
        name: '冰箱盲盒·命运交响曲',
        steps: [
          '闭着眼把食材扔进锅，让命运做决定。',
          '翻一翻、搅一搅，假装自己很专业。',
          '盛出来那一刻，你就是深夜的米其林。'
        ],
        plating: '用最亮的盘子，衬托最野的菜。',
        warning: '如果味道太魔幻，请怪冰箱，别怪主厨。'
      },
      {
        name: '深夜泡面交响曲',
        steps: [
          '把“' + ingredients + '”和泡面一起下锅，像对待前任一样无情。',
          '热水一冲，香味立刻出卖了你的深夜。',
          '卧一个蛋，假装这是一顿正经的晚饭。'
        ],
        plating: '端到窗边就着夜色吃，仪式感拉满。',
        warning: '泡面虽好，别顿顿靠它续命，营养要跟上。'
      },
      {
        name: '勇者土豆泥堡垒',
        steps: [
          '把“' + ingredients + '”处理干净，和土豆一起压成泥。',
          '捏一座小山，淋上灵魂酱汁。',
          '插一根勺子当剑，宣布堡垒建成。'
        ],
        plating: '用白盘衬托泥山的壮丽，拍照自带光环。',
        warning: '小心烫嘴，勇者也怕土豆泥的体温。'
      },
      {
        name: '昨日重现蛋包饭',
        steps: [
          '把“' + ingredients + '”和剩饭炒香，铺上金黄的蛋皮。',
          '挤上番茄酱，画一个笑脸。',
          '一口下去，仿佛回到了昨天的晚餐。'
        ],
        plating: '用铁盘装，蛋皮油亮，刀叉齐上。',
        warning: '蛋皮要趁热切开，冷了就凝固成遗憾。'
      }

    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ===== 评价 ===== */
  document.querySelectorAll('.rate-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var rating = btn.getAttribute('data-rating');
      if (state.rated) return;
      if (isDemo || !cloudApp) {
        state.rated = true;
        els.result.classList.remove('skin-gold', 'skin-sick');
        els.result.classList.add(rating === '真香' ? 'skin-gold' : 'skin-sick');
        if (rating === '已进医院') { soundSiren(); soundGlass(); } else { soundCheer(); }
        toast('演示模式：已评价 ' + rating);
        return;
      }
      if (!state.recordId) return;
      cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'rate', recordId: state.recordId, rating: rating, nickname: accountName } })
        .then(function (res) {
          var r = res && res.result ? res.result : {};
          if (!r.success) throw new Error(r.error || '评价失败');
          state.rated = true;
          els.result.classList.remove('skin-gold', 'skin-sick');
          els.result.classList.add(rating === '真香' ? 'skin-gold' : 'skin-sick');
          if (rating === '已进医院') { soundSiren(); soundGlass(); } else { soundCheer(); }
          toast('评价成功');
          state.posterSkin = rating === '真香' ? 'cert' : 'medical';
          els.posterBtn.textContent = rating === '真香' ? '生成米其林认证书 🏆' : '生成急诊挂号单 🏥';
          var gained = (r.data && r.data.points_gained) ? r.data.points_gained : 0;
          toast('评价成功 +' + gained + ' 积分');
          if (r.data) applyGameResult(r.data);
        })
        .catch(function (e) { toast((e && e.message) ? e.message : '评价失败'); });
    });
  });

  /* ===== 海报 ===== */
  /* ===== 开盲盒：做法 / 主厨警告 折叠面板 ===== */
  els.stepsToggle.addEventListener('click', function () {
    var closed = els.stepsWrap.classList.toggle('hidden');
    els.stepsToggle.classList.toggle('open', !closed);
  });
  els.warningToggle.addEventListener('click', function () {
    var closed = els.warning.classList.toggle('hidden');
    els.warningToggle.classList.toggle('open', !closed);
  });

  els.posterBtn.addEventListener('click', function () {
    if (!state.recipe) return;
    drawPoster(state.recipe, els.ingredients.value.trim(), state.posterSkin);
    els.posterSection.classList.remove('hidden');
    els.posterSection.scrollIntoView({ behavior: 'smooth' });
  });

  function drawPoster(recipe, ingredients, skin) {
    if (skin === 'cert') return drawCertPoster(recipe, ingredients);
    if (skin === 'medical') return drawMedicalPoster(recipe, ingredients);
    if (skin === 'buck') return drawBuckPoster(recipe, ingredients);
    var canvas = els.posterCanvas;
    var ctx = canvas.getContext('2d');
    var W = 750, H = 1200;
    ctx.clearRect(0, 0, W, H);

    // 背景渐变
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#150a3a');
    bg.addColorStop(0.5, '#0d1230');
    bg.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 赛博网格
    ctx.strokeStyle = 'rgba(0,240,255,0.12)';
    ctx.lineWidth = 2;
    for (var x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // 霓虹边框
    ctx.strokeStyle = 'rgba(0,240,255,0.8)';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    // 徽标 / 标题 / 菜名
    ctx.fillStyle = '#00f0ff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AI 深夜食堂 · 今日盲盒菜谱', W / 2, 96);
    glowText(ctx, '冰箱剩菜盲盒', W / 2, 170, '56px sans-serif', '#00f0ff', 24);
    // 社交引导语：激发好奇心
    ctx.fillStyle = '#ffe600';
    ctx.font = 'italic 26px sans-serif';
    ctx.textAlign = 'center';
    var TEASERS = [
      '“我让 AI 用冰箱剩菜做了顿饭，结果…”',
      '“剩菜也能整活？主厨表示有被冒犯到…”',
      '“深夜食堂今日盲盒，敢不敢试一口？”',
      '“冰箱里只剩这些？那就交给命运吧…”',
      '“米其林看了沉默，主厨看了落泪…”'
    ];
    ctx.fillText(TEASERS[Math.floor(Math.random() * TEASERS.length)], W / 2, 235);
    drawQrCode(ctx, W - 190, 112, 120);
    glowText(ctx, recipe.name, W / 2, 300, 'bold 64px sans-serif', '#ff2d78', 30);

    // 内容区流式布局：逐段往下排，超长截断；空间不足则跳过段落，绝不压到页脚（H-200 以下）
    var contentMax = H - 200;
    var yy = 360;
    if (ingredients) {
      ctx.fillStyle = '#8ea2c8';
      ctx.font = '28px sans-serif';
      yy = wrapText(ctx, '食材：' + shortenText(ingredients, 60), 60, yy + 34, W - 120, 40, 'center') + 12;
    } else {
      yy += 70;
    }

    // 做法（最多到 contentMax-90，给摆盘/警告留位）
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🧑‍🍳 做法', 70, yy);
    yy += 56;
    (recipe.steps || []).forEach(function (s, i) {
      if (yy > contentMax - 90) return;
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(String(i + 1), 80, yy);
      ctx.fillStyle = '#dceaff';
      ctx.font = '28px sans-serif';
      yy = wrapText(ctx, shortenText(s, 70), 130, yy, W - 210, 38, 'left') + 12;
    });

    // 摆盘建议（空间不足跳过）
    yy += 12;
    if (yy < contentMax - 90) {
      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('🍽️ 摆盘建议', 70, yy);
      yy = wrapText(ctx, '“' + shortenText(recipe.plating || '', 50) + '”', 70, yy + 38, W - 140, 36, 'left') + 10;
    }

    // 主厨警告（空间不足跳过）
    yy += 10;
    if (yy < contentMax - 50) {
      ctx.fillStyle = '#ff4d4f';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('⚠️ 主厨警告', 70, yy);
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '26px sans-serif';
      wrapText(ctx, shortenText(recipe.warning || '', 40), 70, yy + 34, W - 140, 32, 'left');
    }

    // 底部
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(70, H - 150);
    ctx.lineTo(W - 70, H - 150);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍲 冰箱剩菜盲盒 · AI 深夜食堂', W / 2, H - 118);
    ctx.fillStyle = '#00f0a0';
    ctx.font = 'italic 26px sans-serif';
    ctx.fillText('围观更多黑暗料理战报，一起整活', W / 2, H - 78);
    ctx.fillStyle = '#6b7f9e';
    ctx.font = '22px sans-serif';
    ctx.fillText('长按保存 · 分享到朋友圈打卡', W / 2, H - 42);
  }



  /* ===== 海报皮肤：米其林三星认证书 ===== */
  function drawCertPoster(recipe, ingredients) {
    var canvas = els.posterCanvas;
    var ctx = canvas.getContext('2d');
    var W = 750, H = 1200;
    ctx.clearRect(0, 0, W, H);
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1026');
    bg.addColorStop(1, '#1a0f2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, W - 92, H - 92);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('⭐ 米其林三星认证书 ⭐', W / 2, 170);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#c9b98a';
    ctx.fillText('MICHELIN STAR CERTIFICATE (AI VERIFIED)', W / 2, 210);
    ctx.strokeStyle = '#d4af37';
    ctx.beginPath();
    ctx.moveTo(150, 240);
    ctx.lineTo(W - 150, 240);
    ctx.stroke();
    ctx.fillStyle = '#e8e0c8';
    ctx.font = '28px sans-serif';
    ctx.fillText('兹授予以下菜品「深夜食堂三星认证」：', W / 2, 300);
    glowText(ctx, recipe.name, W / 2, 430, 'bold 72px sans-serif', '#ffd700', 36);
    if (ingredients) {
      ctx.fillStyle = '#8ea2c8';
      ctx.font = '28px sans-serif';
      wrapText(ctx, '食材：' + shortenText(ingredients, 50), 90, 500, W - 180, 42, 'center');
    }
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('评审委员会意见', W / 2, 640);
    ctx.fillStyle = '#e8e0c8';
    ctx.font = '28px sans-serif';
    wrapText(ctx, '“' + shortenText(recipe.plating || '', 50) + '”', 90, 700, W - 180, 44, 'center');
    ctx.fillStyle = '#b98a5a';
    wrapText(ctx, '摆盘大胆，风味狂野，堪称黑暗料理界的清流。', 90, 820, W - 180, 40, 'center');
    ctx.fillStyle = '#d4af37';
    ctx.font = 'italic 32px sans-serif';
    ctx.fillText('—— 深夜食堂 AI 主厨 亲笔', W / 2, 980);
    ctx.save();
    ctx.translate(W - 170, 950);
    ctx.rotate(-0.3);
    ctx.strokeStyle = 'rgba(255,45,78,0.8)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,45,78,0.8)';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('三星认证', 0, 6);
    ctx.restore();
    ctx.fillStyle = '#6b7f9e';
    ctx.font = '24px sans-serif';
    ctx.fillText('冰箱剩菜盲盒 · 深夜食堂', W / 2, 1110);
  }

  /* ===== 海报皮肤：三甲医院急诊挂号单 ===== */
  function drawMedicalPoster(recipe, ingredients) {
    var canvas = els.posterCanvas;
    var ctx = canvas.getContext('2d');
    var W = 750, H = 1200;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f7f7f2';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(0, 0, W, 26);
    ctx.fillRect(0, H - 26, W, 26);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8102e';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('🏥 急诊挂号单', W / 2, 130);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText('三甲医院（深夜食堂分院）· AI 会诊记录', W / 2, 175);
    function row(label, value, y, color) {
      ctx.font = '30px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#333';
      ctx.fillText(label, 80, y);
      ctx.fillStyle = color || '#111';
      wrapText(ctx, value || '', 260, y, W - 360, 42, 'left');
    }
    row('科    室：', '黑暗料理科', 270);
    row('就诊人：', '勇敢的剩菜勇士', 340);
    row('主    诉：', '“我让 AI 用冰箱剩菜做了顿饭”', 410);
    row('诊    断：', recipe.name, 500, '#c8102e');
    row('食    材：', shortenText(ingredients, 40), 580);
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#333';
    ctx.fillText('医    嘱：', 80, 700);
    ctx.fillStyle = '#c8102e';
    wrapText(ctx, shortenText(recipe.warning || '', 60), 260, 700, W - 360, 44, 'left');
    ctx.fillStyle = '#333';
    wrapText(ctx, '建议：多喝热水，别让朋友知道，下次别这样了。', 260, 830, W - 360, 40, 'left');
    ctx.save();
    ctx.translate(W - 160, 950);
    ctx.rotate(-0.35);
    ctx.strokeStyle = '#c8102e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c8102e';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('急诊', 0, 2);
    ctx.fillText('抢救中', 0, 36);
    ctx.restore();
    ctx.fillStyle = '#888';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('冰箱剩菜盲盒 · 深夜食堂出品', W / 2, 1110);
  }

  /* ===== 海报皮肤：甩锅卡（图片形式甩锅给好友） ===== */
  function drawBuckPoster(recipe, ingredients) {
    var canvas = els.posterCanvas;
    var ctx = canvas.getContext('2d');
    var W = 750, H = 1200;
    ctx.clearRect(0, 0, W, H);
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2a0a12');
    bg.addColorStop(0.6, '#14070f');
    bg.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // 警示边框
    ctx.strokeStyle = '#ff2d55';
    ctx.lineWidth = 10;
    ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.strokeStyle = 'rgba(255,45,85,.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(42, 42, W - 84, H - 84);
    // 标题
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('🔥 甩锅卡 · 锅从天上来', W / 2, 110);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '26px sans-serif';
    ctx.fillText('甩锅给好友 · 要死一起死', W / 2, 158);
    // 分割线
    ctx.strokeStyle = 'rgba(255,45,85,.5)';
    ctx.beginPath(); ctx.moveTo(120, 200); ctx.lineTo(W - 120, 200); ctx.stroke();
    // 菜名
    ctx.fillStyle = '#ff6b81';
    ctx.font = '30px sans-serif';
    ctx.fillText('这道「', W / 2, 270);
    var buckName = recipe.name || '';
    var buckFont = buckName.length > 8 ? 'bold 52px sans-serif' : 'bold 76px sans-serif';
    glowText(ctx, shortenText(buckName, 10), W / 2, 360, buckFont, '#ff2d55', 32);
    ctx.fillStyle = '#ff6b81';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('是 TA 让我做的！', W / 2, 440);
    // 食材
    if (ingredients) {
      ctx.fillStyle = '#c9a0b0';
      ctx.font = '28px sans-serif';
      wrapText(ctx, '罪证食材：' + shortenText(ingredients, 40), 90, 520, W - 180, 40, 'center');
    }
    // 主厨警告
    ctx.fillStyle = '#ff9aa8';
    ctx.font = '26px sans-serif';
    wrapText(ctx, '主厨警告：' + shortenText(recipe.warning || '', 60), 90, 600, W - 180, 38, 'center');
    // 二维码：扫了直接接锅
    var link = state.challengeLink || location.href;
    drawQrCode(ctx, W - 190, 740, 140, link);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('📱 扫码接锅', 90, 800);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '24px sans-serif';
    wrapText(ctx, 'TA 把这口锅甩给你了！扫码打开，敢不敢接下这道「' + recipe.name + '」？', 90, 850, W - 320, 36, 'left');
    // 底部
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(70, H - 150); ctx.lineTo(W - 70, H - 150); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍲 冰箱剩菜盲盒 · 深夜食堂', W / 2, H - 110);
    ctx.fillStyle = '#9a7b88';
    ctx.font = '24px sans-serif';
    ctx.fillText('接下挑战，双方各 +20 生存积分', W / 2, H - 72);
    ctx.fillStyle = '#6b5b66';
    ctx.font = '20px sans-serif';
    ctx.fillText('长按保存 · 甩给「幸运」好友', W / 2, H - 40);
  }

  function drawQrCode(ctx, x, y, size, url) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size, size);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📱', x + size / 2, y + size / 2 - 4);
    ctx.font = '16px sans-serif';
    ctx.fillText('扫码开盲盒', x + size / 2, y + size / 2 + 22);
    ctx.restore();
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, size, size);
      ctx.drawImage(img, x, y, size, size);
    };
    img.onerror = function () { /* 保留占位 */ };
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(url || location.href);
  }

  function glowText(ctx, text, x, y, font, color, blur) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function shortenText(text, max) {
    if (!text) return '';
    var s = String(text);
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, align) {
    if (!text) return y;
    // align='center' ???????????? x????????????????/??
    var isCenter = align === 'center';
    ctx.textAlign = isCenter ? 'center' : (align || 'left');
    if (isCenter) x = x + maxWidth / 2;
    var chars = String(text).split('');
    var line = '';
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = chars[i];
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lineHeight; }
    return y;
  }

  /* ===== 保存 / 分享海报 ===== */
  els.saveBtn.addEventListener('click', function () {
    var dataUrl = els.posterCanvas.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = dataUrl;
    var skinName = state.posterSkin === 'buck' ? '甩锅卡' : '冰箱剩菜盲盒';
    a.download = skinName + '_' + ((state.recipe && state.recipe.name) || '海报') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('海报已下载');
  });

  els.sharePosterBtn.addEventListener('click', function () {
    var dataUrl = els.posterCanvas.toDataURL('image/png');
    if (navigator.share && navigator.canShare) {
      try {
        var f = dataUrlToFile(dataUrl);
        if (navigator.canShare({ files: [f] })) {
          navigator.share({ files: [f], title: '冰箱剩菜盲盒' }).catch(function () {});
          return;
        }
      } catch (e) { /* fall through */ }
    }
    toast('当前浏览器不支持分享文件，可长按图片保存后发送');
  });

  function dataUrlToFile(dataUrl) {
    var arr = dataUrl.split(',');
    var mime = arr[0].match(/:(.*?);/)[1];
    var bstr = atob(arr[1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    for (var i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], 'poster.png', { type: mime });
  }

  /* ===== 分享文字 ===== */
  els.shareBtn.addEventListener('click', function () {
    var title = state.recipe
      ? '我把「' + state.recipe.name + '」做出来了，你敢挑战吗？'
      : '冰箱剩菜盲盒：AI 主厨整活中';
    if (navigator.share) {
      navigator.share({ title: title, text: title, url: location.href }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(function () { toast('链接已复制'); });
    } else {
      toast('长按地址栏复制链接分享');
    }
  });

  /* ===== 红黑榜（数据库无数据/失败时回退演示数据；随机抽取+洗牌增加多样性与随机性） ===== */
  var RANK_MAX_ITEMS = 10;

  // 演示菜池：每次加载随机抽取展示，保证刷新后榜单不固定
  var RANK_DEMO = [
    { emoji: '🤯', dish: '可乐泡面布丁', comment: '吃完我的脑子开始唱RAP，医院的WiFi还不错。', rating: '已进医院' },
    { emoji: '😋', dish: '酸奶炸鸡', comment: '本来以为是黑暗料理，结果吃出了米其林的错觉。', rating: '真香' },
    { emoji: '🚑', dish: '老干妈西瓜汤', comment: '人生建议：西瓜和辣椒酱是前任关系，别复合。', rating: '已进医院' },
    { emoji: '✨', dish: '香蕉咖喱炒饭', comment: '甜咸永动机，一碗下去直接通宵改论文。', rating: '真香' },
    { emoji: '💀', dish: '抹茶螺蛳粉', comment: '颜色很治愈，味道很致郁。', rating: '已进医院' },
    { emoji: '🔥', dish: '薯片煎蛋', comment: '脆脆的像在吃黄金，就是有点费下巴。', rating: '真香' },
    { emoji: '🧀', dish: '芝士泡面披萨', comment: '拉丝能拉一公里，吃完拉链也拉不上。', rating: '真香' },
    { emoji: '🍌', dish: '巧克力香蕉汤', comment: '甜到牙疼，却有种初恋的心动。', rating: '真香' },
    { emoji: '🥤', dish: '雪碧拍黄瓜', comment: '气泡在嘴里炸开，像极了人生的起起落落。', rating: '真香' },
    { emoji: '🍇', dish: '葡萄酒卤蛋', comment: '卤蛋都有微醺感了，你还在清醒地上班。', rating: '已进医院' },
    { emoji: '🥜', dish: '花生酱拌豆腐', comment: '口感诡异但上头，吃完想给厨师鼓掌。', rating: '真香' },
    { emoji: '🍵', dish: '茉莉花茶泡饭', comment: '清淡到怀疑人生，适合给钱包和胃同时减负。', rating: '真香' },
    { emoji: '🍊', dish: '橘子皮炒肉', comment: '吃出了黑暗料理界的米其林，也吃出了牙酸。', rating: '已进医院' },
    { emoji: '🧊', dish: '冰可乐煮汤圆', comment: '汤圆在可乐里泡澡，甜到糖尿病预警。', rating: '已进医院' },
    { emoji: '🥚', dish: '皮蛋拌酸奶', comment: '视觉上像灾难片，味觉上是科幻片。', rating: '已进医院' },
    { emoji: '🍜', dish: '老坛酸菜泡面布丁', comment: '酸爽到灵魂出窍，医院的床很软。', rating: '已进医院' },
    { emoji: '🥔', dish: '土豆泥奶茶', comment: '奶茶里喝出淀粉，口感像极了人生。', rating: '真香' },
    { emoji: '🍯', dish: '蜂蜜芥末炸鸡', comment: '甜辣交织，比前任的心情还复杂。', rating: '真香' }
  ];

  // Fisher-Yates 洗牌
  function shuffleRank(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // 从演示菜池随机抽取 count 条
  var RANK_TAGS = ['深夜emo必吃', '月底吃土首选', '前任看了想打人', '吃完能瘦十斤（骗你的）', '硬核养生'];
  function tagForDemo() { return RANK_TAGS[Math.floor(Math.random() * RANK_TAGS.length)]; }
  // 演示菜的「制作过程」：用菜名即兴编一段搞笑做法
  function recipeForDemo(it) {
    return {
      name: it.dish,
      steps: [
        '把「' + it.dish + '」的所有原料倒进锅里，告诉它们：今天要么成菜，要么成仁。',
        '大火烧开转小火，让它们在汤汁里互相说服，谁先投降谁先入味。',
        '出锅前凭手感撒一把调料，主打一个「米其林盲盒」。',
        '盛出来那一刻闭眼深呼吸——是惊喜还是惊吓，吃了才知道。'
      ],
      plating: it.rating === '已进医院' ? '用你最喜欢的盘子，纪念这顿英勇就义的晚餐。' : '认真摆个盘，证明黑暗料理也可以有仪式感。',
      warning: it.comment
    };
  }
  // 从演示菜池随机抽取 count 条（含随机症状标签）
  function randomRankItems(count) {
    return shuffleRank(RANK_DEMO).slice(0, count).map(function (it) {
      var copy = {};
      for (var k in it) { if (Object.prototype.hasOwnProperty.call(it, k)) copy[k] = it[k]; }
      copy.tag = copy.tag || tagForDemo();
      copy.user = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];
      copy.recipe = recipeForDemo(it);
      return copy;
    });
  }
  function loadRank(cloudReady) {
    if (isDemo || !cloudReady || !cloudApp) { state.rankData = randomRankItems(RANK_MAX_ITEMS); renderRankTabs(); renderRank(state.rankData); return; }
    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'listRank' } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success || !Array.isArray(r.data)) throw new Error((r && r.error) || '红黑榜加载失败');
        var real = r.data.map(function (item) {
          return {
            emoji: item.rating === '已进医院' ? '🚑' : '😋',
            dish: item.name || '未命名料理',
            comment: item.warning || (item.ingredients ? '食材：' + item.ingredients : ''),
            rating: item.rating || '待评价',
            tag: item.tag || '硬核养生',
            user: item.user_name || '',
            recipe_data: item.recipe_data || null,
            recordId: item.recordId || '',
            votes: item.votes || { up: 0, down: 0, net: 0 },
            darkScore: item.darkScore,
            dangerFlags: item.dangerFlags || []
          };
        });
        var items;
        if (real.length >= RANK_MAX_ITEMS) {
          // 真实评价足够多：随机洗牌后取前 N 条
          items = shuffleRank(real).slice(0, RANK_MAX_ITEMS);
        } else {
          // 真实评价不足：用演示数据随机补足，榜单每次都不同
          items = shuffleRank(real.concat(randomRankItems(RANK_MAX_ITEMS - real.length)));
        }
        state.rankData = items;
        renderRankTabs();
        renderRank(items);
      })
      .catch(function (err) {
        console.warn('listRank failed:', err);
        renderRank(randomRankItems(RANK_MAX_ITEMS));
      });
  }
  function renderRank(items) {
    els.rankList.textContent = '';
    items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'rank-item';

      var emoji = document.createElement('div');
      emoji.className = 'rank-emoji';
      emoji.textContent = item.emoji;

      var dish = document.createElement('div');
      dish.className = 'rank-dish';
      dish.textContent = item.dish;

      var user = document.createElement('div');
      user.className = 'rank-user';
      user.textContent = item.user ? '\uD83D\uDC64 ' + item.user : '';
      card.appendChild(user);
      var comment = document.createElement('div');
      comment.className = 'rank-comment';
      comment.textContent = item.comment || '';

      var tag = document.createElement('span');
      tag.className = 'rank-tag ' + (item.rating === '已进医院' ? 'tag-bad' : 'tag-good');
      tag.textContent = item.rating;

      card.appendChild(emoji);
      card.appendChild(dish);
      card.appendChild(user);
      card.appendChild(comment);
      card.appendChild(tag);

      var mini = document.createElement('span');
      mini.className = 'rank-tag-mini';
      mini.textContent = item.tag || '硬核养生';
      card.appendChild(mini);
      els.rankList.appendChild(card);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('data-recordid', item.recordId || '');
      card.addEventListener('click', function () { openRankModal(item); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRankModal(item); }
      });
    });
  }

  /* ===== 红黑榜：点击看大图 ===== */
  function openRankModal(item) {
    if (!item) return;
    state.rankModalItem = item;
    els.rankModalEmoji.textContent = item.emoji || '🍽️';
    els.rankModalDish.textContent = item.dish || '';
    els.rankModalTag.textContent = item.rating || '';
    els.rankModalTag.className = 'rank-modal-tag ' + (item.rating === '已进医院' ? 'tag-bad' : 'tag-good');
    els.rankModalComment.textContent = (item.user ? '\uD83D\uDC64 ' + item.user + '  \u00B7  ' : '') + (item.comment || '');
    var rd = item.recipe_data || item.recipe || null;
    var hasRecipe = !!(rd && Array.isArray(rd.steps) && rd.steps.length);
    state.rankDetailRecipe = hasRecipe ? rd : null;
    els.rankDetailBtn.classList.toggle('hidden', !hasRecipe);
    renderRankVotes(item.votes || { up: 0, down: 0, net: 0 });
    els.rankModal.classList.remove('hidden');
  }
  function renderRankVotes(votes) {
    votes = votes || { up: 0, down: 0 };
    els.rankVoteUpNum.textContent = votes.up || 0;
    els.rankVoteDownNum.textContent = votes.down || 0;
  }
  function castVote(direction) {
    var item = state.rankModalItem;
    if (!item || !item.recordId) { toast('演示数据暂不能投票'); return; }
    if (isDemo || !cloudApp) { toast('演示模式暂不能投票'); return; }
    var btn = direction === 'up' ? els.rankVoteUp : els.rankVoteDown;
    btn.disabled = true;
    soundPop();
    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'vote', recordId: item.recordId, direction: direction } })
      .then(function (res) {
        btn.disabled = false;
        var r = res && res.result ? res.result : {};
        if (!r.success) throw new Error(r.error || '投票失败');
        renderRankVotes(r.data.votes);
        if (item.votes) item.votes = r.data.votes;
        toast(direction === 'up' ? '👍 真香票 +1' : '🤢 送医票 +1');
        loadRank(true); // 刷新榜单让置顶生效
      })
      .catch(function (e) { btn.disabled = false; toast((e && e.message) ? e.message : '投票失败'); });
  }
  els.rankVoteUp.addEventListener('click', function () { castVote('up'); });
  els.rankVoteDown.addEventListener('click', function () { castVote('down'); });
  function closeRankModal() {
    els.rankModal.classList.add('hidden');
  }
  els.rankModalClose.addEventListener('click', closeRankModal);
  els.rankModal.addEventListener('click', function (e) {
    if (e.target === els.rankModal || e.target.classList.contains('rank-modal-backdrop')) closeRankModal();
  });
  // 红黑榜：查看制作过程 → 复用详细菜单弹层
  els.rankDetailBtn.addEventListener('click', function () {
    renderDetail(state.rankDetailRecipe || state.recipe);
  });

  /* ===== 详细菜单制作界面（内置菜谱库） ===== */
  function secTitle(text) {
    var h = document.createElement('h4');
    h.className = 'detail-sec-title';
    h.textContent = text;
    return h;
  }
  function renderDetail(recipe) {
    if (!recipe) return;
    els.detailBody.textContent = '';

    var head = document.createElement('div');
    head.className = 'detail-head';
    var dn = document.createElement('div');
    dn.className = 'detail-name';
    dn.textContent = recipe.name;
    var dm = document.createElement('div');
    dm.className = 'detail-meta';
    dm.textContent = [recipe.scene, recipe.time ? '⏱️ 约 ' + recipe.time + ' 分钟' : '', recipe.desc].filter(Boolean).join(' · ');
    head.appendChild(dn);
    head.appendChild(dm);
    var info = document.createElement('div');
    info.className = 'detail-info';
    var mins = recipe.time ? parseInt(recipe.time, 10) : ((recipe.steps || []).length * 6 + 10);
    var diff = (recipe.steps || []).length <= 3 ? '简单' : ((recipe.steps || []).length <= 5 ? '中等' : '有挑战');
    info.textContent = '⏱️ 约 ' + mins + ' 分钟 · 🍳 难度：' + diff + ' · 👥 2 人份';
    head.appendChild(info);
    els.detailBody.appendChild(head);

    if (Array.isArray(recipe.ings) && recipe.ings.length) {
      var sec = document.createElement('div');
      sec.className = 'detail-sec';
      sec.appendChild(secTitle('🧺 食材清单'));
      var ul = document.createElement('ul');
      ul.className = 'detail-ings';
      recipe.ings.forEach(function (ing) {
        var li = document.createElement('li');
        li.textContent = ing;
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      els.detailBody.appendChild(sec);
    }

    if (Array.isArray(recipe.prep) && recipe.prep.length) {
      var sec2 = document.createElement('div');
      sec2.className = 'detail-sec';
      sec2.appendChild(secTitle('🔪 备菜准备'));
      var ul2 = document.createElement('ul');
      ul2.className = 'detail-prep';
      recipe.prep.forEach(function (p) {
        var li = document.createElement('li');
        li.textContent = p;
        ul2.appendChild(li);
      });
      sec2.appendChild(ul2);
      els.detailBody.appendChild(sec2);
    }

    if (Array.isArray(recipe.steps) && recipe.steps.length) {
      var sec3 = document.createElement('div');
      sec3.className = 'detail-sec';
      sec3.appendChild(secTitle('👨‍🍳 分步做法'));
      var ol = document.createElement('ol');
      ol.className = 'detail-steps';
      recipe.steps.forEach(function (s) {
        var li = document.createElement('li');
        var fh = fireHint(s);
        li.textContent = (fh ? fh + ' ' : '') + s;
        ol.appendChild(li);
      });
      sec3.appendChild(ol);
      els.detailBody.appendChild(sec3);
    }

    if (recipe.plating) {
      var secP = document.createElement('div');
      secP.className = 'detail-sec';
      secP.appendChild(secTitle('🍽️ 摆盘建议'));
      var pp = document.createElement('p');
      pp.className = 'detail-tips';
      pp.textContent = recipe.plating;
      secP.appendChild(pp);
      els.detailBody.appendChild(secP);
    }

    if (recipe.warning) {
      var secW = document.createElement('div');
      secW.className = 'detail-sec';
      secW.appendChild(secTitle('⚠️ 主厨警告'));
      var pw = document.createElement('p');
      pw.className = 'detail-tips';
      pw.textContent = recipe.warning;
      secW.appendChild(pw);
      els.detailBody.appendChild(secW);
    }

    if (Array.isArray(recipe.shoppingList) && recipe.shoppingList.length) {
      var secS = document.createElement('div');
      secS.className = 'detail-sec';
      secS.appendChild(secTitle('🛒 采购清单'));
      var ulS = document.createElement('ul');
      ulS.className = 'detail-ings';
      recipe.shoppingList.forEach(function (s) {
        var li = document.createElement('li');
        li.textContent = s;
        ulS.appendChild(li);
      });
      secS.appendChild(ulS);
      els.detailBody.appendChild(secS);
    }    if (recipe.tips) {
      var sec4 = document.createElement('div');
      sec4.className = 'detail-sec';
      sec4.appendChild(secTitle('💡 主厨小贴士'));
      var tips = document.createElement('p');
      tips.className = 'detail-tips';
      tips.textContent = recipe.tips;
      sec4.appendChild(tips);
      els.detailBody.appendChild(sec4);
    }

    els.detailModal.classList.remove('hidden');
  }
  function closeDetailModal() {
    els.detailModal.classList.add('hidden');
  }
  els.detailBtn.addEventListener('click', function () {
    renderDetail(state.detailRecipe || state.recipe);
  });
  els.detailModalClose.addEventListener('click', closeDetailModal);
  els.detailModal.addEventListener('click', function (e) {
    if (e.target === els.detailModal || e.target.classList.contains('detail-modal-backdrop')) closeDetailModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !els.detailModal.classList.contains('hidden')) closeDetailModal();
  });

  function renderRankTabs() {
    els.rankTabs.textContent = '';
    var tags = ['全部'];
    state.rankData.forEach(function (it) {
      if (it.tag && tags.indexOf(it.tag) < 0) tags.push(it.tag);
    });
    tags.forEach(function (t) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'rank-tab' + (t === state.rankTag ? ' active' : '');
      tab.textContent = t;
      tab.addEventListener('click', function () {
        state.rankTag = t;
        renderRankTabs();
        renderRank(state.rankTag === '全部' ? state.rankData : state.rankData.filter(function (it) { return it.tag === state.rankTag; }));
      });
      els.rankTabs.appendChild(tab);
    });
  }

  initCloud().then(function (ready) {
    loadRank(ready);
    loadDaily();
    renderSynthPool();
    startDanmaku();
    ensureLogin();
    if (!isDemo && cloudApp) {
      loadPlayer();
      handleChallengeParam();
      initDuelLink();
    }
  });

  /* ===== 新增：彩蛋 / 随机事件 / 弹幕 / 双人对局（网页版） ===== */

  /* ---- 输入框占位符轮换（贱萌文案） ---- */
  var PLACEHOLDERS = [
    '别光盯着屏幕，去翻翻冰箱底儿！',
    '把冰箱里快过期的玩意儿都报上来',
    '洋葱、泡面、可乐？越离谱越好',
    '大胆点，把能找到的都扔进锅里',
    '上次用辣条炖汤的那位，现在还健在吗',
    '报菜名！剩下什么就报什么，别害羞'
  ];
  var phIdx = 0;
  function rotatePlaceholder() {
    phIdx = (phIdx + 1) % PLACEHOLDERS.length;
    if (els.ingredients && document.activeElement !== els.ingredients) {
      els.ingredients.placeholder = PLACEHOLDERS[phIdx];
    }
  }
  els.ingredients.placeholder = PLACEHOLDERS[0];
  setInterval(rotatePlaceholder, 8000);

  /* ---- 彩蛋：断舍离爆炒苦瓜（本地兜底，云函数同样处理） ---- */
  var EX_RECIPE_WEB = {
    name: '断舍离爆炒苦瓜',
    steps: [
      '把苦瓜对半剖开，去瓤切片，就像清空和前任有关的缓存。',
      '猛火爆炒，撒一把干辣椒，让眼泪和苦味一起断舍离。',
      '装盘前把锅铲往桌上一拍：旧的不去，新的不来。'
    ],
    plating: '用纯白盘子盛出，苦瓜摆成"再见"两个字。',
    warning: '感情债还不上，但苦瓜的苦，今晚必须咽下去。',
    darkScore: 55,
    darkTier: { label: '猎奇整活', emoji: '🤪', tip: '有点意思，肠胃准备接受挑战吧' },
    easterEgg: true
  };

  /* ---- 随机事件（演示模式本地触发） ---- */
  var WEB_EVENTS = [
    { id: 'power_off', name: '停电了', emoji: '🕯️', line: '主厨被迫盲做：纯靠嗅觉来一道凉拌菜！' },
    { id: 'cat_spice', name: '猫打翻了调料', emoji: '🐱', line: '猫主子打翻了调料罐，强制加入一味神秘香料！' },
    { id: 'inspiration', name: '灵感爆发', emoji: '✨', line: '主厨灵光乍现，这道菜自带 BGM！' }
  ];
  function demoEventRecipe(recipe) {
    if (Math.random() >= 0.1) return recipe;
    var pool = state.mode === 'normal'
      ? WEB_EVENTS.filter(function (e) { return e.id === 'inspiration'; })
      : WEB_EVENTS;
    var evt = pool[Math.floor(Math.random() * pool.length)];
    var r = Object.assign({}, recipe);
    r.event = evt;
    if (evt.id === 'power_off') {
      r.name = (r.name || '盲盒菜') + '·盲拌版';
      r.steps = [
        '把所有食材洗净切丝，全程不开火（停电了）。',
        '闭着眼凭嗅觉撒盐、淋醋、拌香油。',
        '装盘时默念：黑暗里也能吃上饭，这就是生活。'
      ];
      r.warning = '纯凉拌，停电夜限定，请确认食材生吃安全。';
    } else if (evt.id === 'cat_spice') {
      evt.spice = ['芥末', '花椒', '肉桂', '老干妈', '五香粉', '孜然'][Math.floor(Math.random() * 6)];
      r.steps = (r.steps || []).concat(['临出锅前被猫打翻调料罐，猛撒一把' + evt.spice + '，认命吧。']);
      r.warning = '这味道里有猫主子的倔强，请做好心理建设。';
    }
    return r;
  }

  /* ---- 主厨拒绝弹层（鸡蛋+番茄彩蛋） ---- */
  function openEggModal() {
    var m = document.getElementById('eggModal');
    if (m) { m.classList.remove('hidden'); soundAlarm(); }
  }
  function closeEggModal() {
    var m = document.getElementById('eggModal');
    if (m) m.classList.add('hidden');
  }
  els.eggOk.addEventListener('click', closeEggModal);
  els.eggModal.addEventListener('click', function (e) {
    if (e.target === els.eggModal || e.target.classList.contains('egg-backdrop')) closeEggModal();
  });

  /* ---- 新音效（真香欢呼 / 救护车 / 玻璃碎 / 炸弹 / 灵感旋律） ---- */
  function soundCheer() {
    if (!soundOn) return;
    soundDing();
    [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.25, 'triangle', 0.09); }, 160 + i * 90); });
  }
  function soundSiren() {
    if (!soundOn) return;
    [880, 660, 880, 660, 880, 660].forEach(function (f, i) { setTimeout(function () { tone(f, 0.32, 'square', 0.06); }, i * 260); });
  }
  function soundGlass() {
    if (!soundOn) return;
    var ctx = ac(); if (!ctx) return;
    var t0 = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * 0.4);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
    }
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain(); g.gain.value = 0.08;
    var filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 1800;
    src.connect(filt); filt.connect(g); g.connect(ctx.destination);
    src.start(t0);
  }
  function soundBoom() { tone(90, 0.5, 'sine', 0.3); tone(55, 0.6, 'triangle', 0.25, 0.02); }
  function soundInspiration() {
    [659, 784, 880, 1047, 880, 1047, 1319].forEach(function (f, i) { setTimeout(function () { tone(f, 0.2, 'sine', 0.08); }, i * 110); });
  }
  function soundCat() { [600, 900, 700, 500].forEach(function (f, i) { setTimeout(function () { tone(f, 0.12, 'triangle', 0.08); }, i * 70); }); }
  function soundFlicker() { [180, 260, 160, 220].forEach(function (f, i) { setTimeout(function () { tone(f, 0.1, 'sawtooth', 0.04); }, i * 120); }); }

  /* ---- 伪社交弹幕（本地假数据） ---- */
  var DANMAKU_USERS = ['用户8848', '吃瓜群众', '深夜干饭人', '冰箱战神', '米其林在逃', '打工人', '干饭魂', '幸运锦鲤', '饿死鬼投胎', '厨房刺客', '隔壁老王', '减肥失败者'];
  var DANMAKU_TEXTS = [
    '刚刚用辣条做出了红烧肉，已进医院 🚑',
    '成功复刻了仰望星空派 😱',
    '用可乐炖了排骨，真香 😋',
    '把剩米饭炒出了米其林的感觉 ✨',
    '连吃三天同一道菜，这是爱吗 🥹',
    '老干妈拌香蕉，我错了 🫠',
    '冰箱见底，主厨说还能救 💪',
    '把酸奶煮成了豆腐脑，味道居然还行',
    '今天也要把冰箱吃空！',
    'AI 让我把泡面煮进咖啡，我不信邪……',
    '这道菜吃完，我感觉自己是实验品 🧪',
    '主厨说我家的冰箱能开博物馆 🏛️'
  ];
  function startDanmaku() {
    if (window.__danmakuStarted) return;
    window.__danmakuStarted = true;
    function spawn() {
      var box = document.getElementById('danmaku');
      if (!box) return;
      var item = document.createElement('div');
      item.className = 'danmaku-item';
      var user = DANMAKU_USERS[Math.floor(Math.random() * DANMAKU_USERS.length)];
      var text = DANMAKU_TEXTS[Math.floor(Math.random() * DANMAKU_TEXTS.length)];
      item.textContent = user + '：' + text;
      item.style.bottom = (Math.random() * 16) + 'px';
      var dur = 7000 + Math.random() * 5000;
      item.style.animationDuration = dur + 'ms';
      box.appendChild(item);
      while (box.children.length > 20) box.removeChild(box.firstChild);
      setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, dur + 300);
    }
    function loop() { spawn(); setTimeout(loop, 4000 + Math.random() * 2000); }
    loop();
  }

  /* ---- 工具 ---- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch(function () { fallbackCopy(t); });
    } else fallbackCopy(t);
  }
  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---- 双人盲盒对局 ---- */
  var duel = {
    roomId: '', code: '', nick: '', myUid: '', isHost: false, joinRoomId: '',
    players: {}, exchange: {}, phase: '', winner: '', tie: false,
    penaltyDouble: false, timeoutLoser: '', deadline: 0,
    myRecipe: null, bomb: '', score: 50,
    watcher: null, pollTimer: null, hbTimer: null, countTimer: null, swapTimer: null,
    opened: false, submitting: false, penaltyChosen: false, swapDone: false
  };

  function openDuel() {
    if (isDemo || !cloudApp) {
      toast('双人对局需要连接云开发环境，请部署后在线上使用');
      return;
    }
    duel.opened = true;
    els.duelView.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderDuel();
  }
  function closeDuel() {
    duel.opened = false;
    els.duelView.classList.add('hidden');
    document.body.style.overflow = '';
    stopDuelLoops();
    duel.roomId = ''; duel.code = ''; duel.players = {}; duel.phase = '';
    duel.myRecipe = null; duel.bomb = ''; duel.swapDone = false; duel.joinRoomId = '';
    duel.winner = ''; duel.tie = false; duel.penaltyDouble = false; duel.timeoutLoser = '';
  }

  function stopDuelLoops() {
    if (duel.watcher && duel.watcher.close) { try { duel.watcher.close(); } catch (e) {} }
    duel.watcher = null;
    if (duel.pollTimer) clearInterval(duel.pollTimer); duel.pollTimer = null;
    if (duel.hbTimer) clearInterval(duel.hbTimer); duel.hbTimer = null;
    if (duel.countTimer) clearInterval(duel.countTimer); duel.countTimer = null;
    if (duel.swapTimer) clearTimeout(duel.swapTimer); duel.swapTimer = null;
  }

  function callDuel(data, ok, fail) {
    if (!cloudApp) { toast('云环境不可用'); return; }
    cloudApp.callFunction({ name: 'generateRecipe', data: data })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success) throw new Error(r.error || '操作失败');
      if (ok) ok(r.data);
      })
      .catch(function (err) {
        var msg = (err && err.message) ? err.message : '对局操作失败';
      if (fail) fail(msg); else toast(msg);
      });
  }

  function renderDuel() {
    if (!duel.opened) return;
    var b = els.duelBody;
    b.innerHTML = '';
    if (!duel.roomId) { renderDuelHome(b); return; }
    if (duel.phase === 'lobby') renderDuelLobby(b);
    else if (duel.phase === 'swap') renderDuelSwap(b);
    else if (duel.phase === 'cook') renderDuelCook(b);
    else if (duel.phase === 'judge') renderDuelJudge(b);
    else if (duel.phase === 'done') renderDuelDone(b);
    else renderDuelHome(b);
  }

  function renderDuelHome(b) {
    b.appendChild(el('p', 'duel-hint', '拉上一位好友，各自报出冰箱里的剩菜，交换一颗「炸弹食材」，同时出菜互相审判！'));
    var nickRow = el('div', 'duel-nick-row');
    var nickInput = el('input', 'duel-nick', null);
    nickInput.type = 'text'; nickInput.maxLength = 12;
    nickInput.placeholder = '你的昵称（默认玩家A）';
    nickInput.value = accountName || duel.nick || '';
    nickRow.appendChild(nickInput);
    b.appendChild(nickRow);

    if (duel.joinRoomId) {
      var jh = el('p', 'duel-hint', '你收到了一份「双人对局」挑战！输入昵称后加入：');
      b.appendChild(jh);
      var jb = el('button', 'duel-primary', '⚔️ 接受挑战，加入对局');
      jb.type = 'button';
      jb.addEventListener('click', function () {
        var nick = (nickInput.value || '').trim() || '玩家B';
        callDuel({ action: 'joinDuel', nick: nick, roomId: duel.joinRoomId }, function (d) {
          joinDuelSuccess(d, nick);
        });
      });
      b.appendChild(jb);
      var back = el('button', 'duel-ghost', '← 返回');
      back.type = 'button';
      back.style.marginTop = '10px';
      back.addEventListener('click', function () { duel.joinRoomId = ''; renderDuelHome(b); });
      b.appendChild(back);
      return;
    }

    var createBtn = el('button', 'duel-primary', '创建房间，等好友加入');
    createBtn.type = 'button';
    createBtn.addEventListener('click', function () {
      var nick = (nickInput.value || '').trim() || '玩家A';
      callDuel({ action: 'createDuel', nick: nick }, function (d) {
        duel.roomId = d.roomId; duel.code = d.code; duel.myUid = d.myUid; duel.isHost = true;
        duel.nick = nick; duel.players = d.players || {}; duel.phase = d.phase || 'lobby';
        duel.deadline = d.deadline || 0;
        startDuelSync();
        renderDuel();
      });
    });
    b.appendChild(createBtn);

    b.appendChild(el('p', 'duel-hint', '—— 或者 ——')).style.textAlign = 'center';

    var joinRow = el('div', 'duel-nick-row');
    var codeInput = el('input', 'duel-nick', null);
    codeInput.type = 'text'; codeInput.maxLength = 6;
    codeInput.placeholder = '6 位房间码';
    joinRow.appendChild(codeInput);
    b.appendChild(joinRow);

    var joinBtn = el('button', 'duel-secondary', '用房间码加入');
    joinBtn.type = 'button';
    joinBtn.addEventListener('click', function () {
      var nick = (nickInput.value || '').trim() || '玩家B';
      var code = (codeInput.value || '').trim();
      if (!/^\d{6}$/.test(code)) { toast('请输入 6 位数字房间码'); return; }
      callDuel({ action: 'joinDuel', nick: nick, code: code }, function (d) {
        joinDuelSuccess(d, nick);
      });
    });
    b.appendChild(joinBtn);
  }

  function joinDuelSuccess(d, nick) {
    duel.roomId = d.roomId; duel.code = d.code; duel.myUid = d.myUid; duel.isHost = false;
    duel.nick = nick; duel.players = d.players || {}; duel.phase = d.phase || 'lobby';
    duel.deadline = d.deadline || 0;
    startDuelSync();
    renderDuel();
  }

  function opponent() {
    if (!duel.players) return null;
    var us = Object.keys(duel.players);
    for (var i = 0; i < us.length; i++) {
      if (us[i] !== duel.myUid) return duel.players[us[i]];
    }
    return null;
  }
  function playerCard(p, isMe) {
    var card = el('div', 'duel-player' + (isMe ? ' me' : '') + (p && p.online === false ? ' offline' : ''));
    var name = el('div', 'dp-name', (p ? p.nick : '等待…') + (isMe ? '（你）' : ''));
    var status = el('div', 'dp-status', statusText(p));
    card.appendChild(name); card.appendChild(status);
    if (p && (p.progress > 0 || p.cooked)) {
      var bar = el('div', 'duel-progress');
      var fill = document.createElement('i');
      fill.style.width = (p.cooked ? 100 : (p.progress || 0)) + '%';
      bar.appendChild(fill);
      card.appendChild(bar);
    }
    return card;
  }
  function statusText(p) {
    if (!p) return '未加入';
    if (duel.phase === 'lobby') return p.ready ? '✅ 已就绪' : '⏳ 正在报食材…';
    if (duel.phase === 'swap') return '💣 交换炸弹中…';
    if (duel.phase === 'cook') return p.cooked ? '🍳 已出锅' : '🍳 烹饪中…';
    if (duel.phase === 'judge') return p.score !== null ? '🗳️ 已评分' : '🗳️ 评分中…';
    if (duel.phase === 'done') return p.score !== null ? '离谱分 ' + p.score : '';
    return '';
  }

  function renderDuelLobby(b) {
    var me = duel.players[duel.myUid];
    var timer = el('div', 'duel-timer', '30'); timer.id = 'duelCount'; b.appendChild(timer);
    var codeBox = el('div', 'duel-code-box');
    codeBox.appendChild(el('p', 'duel-hint', '把房间码发给好友：'));
    codeBox.appendChild(el('div', 'duel-code', duel.code || ''));
    var link = location.origin + location.pathname + '?duel=' + encodeURIComponent(duel.roomId);
    codeBox.appendChild(el('div', 'duel-link', '邀请链接：' + link));
    var copyBtn = el('button', 'duel-ghost duel-copy-btn', '复制邀请链接');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', function () { copyText(link); toast('邀请链接已复制'); soundPop(); });
    codeBox.appendChild(copyBtn);
    b.appendChild(codeBox);

    var playersRow = el('div', 'duel-players');
    playersRow.appendChild(playerCard(me, true));
    playersRow.appendChild(playerCard(opponent(), false));
    b.appendChild(playersRow);

    if (me && !me.ready) {
      b.appendChild(el('p', 'duel-hint', '报出你冰箱里至少 3 样食材，双方就绪后自动交换炸弹！'));
      var ta = document.createElement('textarea');
      ta.className = 'duel-input'; ta.maxLength = 120; ta.rows = 2;
      ta.value = duel.draft || '';
      ta.placeholder = '例如：半个洋葱、两包泡面、一瓶可乐';
      b.appendChild(ta);
      ta.addEventListener('input', function () { duel.draft = ta.value; });
      var readyBtn = el('button', 'duel-primary', '✅ 就绪，等待交换炸弹');
      readyBtn.type = 'button';
      readyBtn.addEventListener('click', function () {
        var ings = (ta.value || '').trim();
        if (ings.split(/[、,，;；]/).filter(Boolean).length < 3) { toast('至少输入 3 样食材'); return; }
        duel.draft = '';
        callDuel({ action: 'duelReady', roomId: duel.roomId, ingredients: ings }, function (d) { applyDuelData(d); });
      });
      b.appendChild(readyBtn);
    } else {
      b.appendChild(el('p', 'duel-hint', '已就绪，等待对方报食材…（30 秒倒计时）'));
    }
  }

  function renderDuelSwap(b) {
    if (duel.swapDone) { renderDuelCook(b); return; }
    var sc = el('div', 'duel-swap-scene');
    sc.appendChild(el('span', 'duel-bomb from-a', '💣'));
    sc.appendChild(el('span', 'duel-bomb from-b', '🧨'));
    sc.appendChild(el('span', 'duel-boom', '💥'));
    b.appendChild(sc);
    var lines = el('p', 'duel-swap-lines', '交换炸弹中…');
    b.appendChild(lines);
    var players = duel.players || {};
    var us = Object.keys(players);
    if (us.length === 2) {
      var a = players[us[0]], bb = players[us[1]];
      lines.textContent = a.nick + ' 的炸弹 → ' + bb.nick + '；' + bb.nick + ' 的炸弹 → ' + a.nick;
    }
    if (!duel.swapTimer) {
      soundBoom();
      duel.swapTimer = setTimeout(function () { duel.swapDone = true; renderDuel(); }, 3200);
    }
  }

  function renderDuelCook(b) {
    var me = duel.players[duel.myUid];
    var opp = opponent();
    var timer = el('div', 'duel-timer', '60'); timer.id = 'duelCount'; b.appendChild(timer);
    var playersRow = el('div', 'duel-players');
    playersRow.appendChild(playerCard(me, true));
    playersRow.appendChild(playerCard(opp, false));
    b.appendChild(playersRow);
    b.appendChild(el('p', 'duel-hint', '你的食材：' + ((me && me.ingredients) || []).join('、') + (duel.bomb ? '　＋炸弹：' + duel.bomb : '')));
    if (me && !me.cooked) {
      var cookBtn = el('button', 'duel-primary', '🔥 开整！让 AI 出菜');
      cookBtn.type = 'button';
      cookBtn.addEventListener('click', duelCookNow);
      b.appendChild(cookBtn);
      b.appendChild(el('p', 'duel-hint', 'AI 正在爆炒你的剩菜 + 对方的炸弹，约 3~8 秒。双方出锅后一起揭晓！'));
    } else {
      b.appendChild(el('p', 'duel-hint', '你的菜已出锅（审判阶段揭晓），等待对方…'));
    }
  }

  function duelCookNow() {
    if (duel.submitting) return;
    duel.submitting = true;
    var btn = document.querySelector('#duelBody button.duel-primary');
    if (btn) { btn.disabled = true; btn.textContent = '\uD83C\uDF72 AI \u7206\u7092\u4E2D\u2026'; }
    callDuel({ action: 'duelCook', roomId: duel.roomId }, function (d) {
      duel.submitting = false;
      if (d.myRecipe) duel.myRecipe = d.myRecipe;
      if (d.bomb) duel.bomb = d.bomb;
      applyDuelData(d);
    }, function () { duel.submitting = false; });
  }

  function recipeCard(p, label) {
    var card = el('div', 'duel-r-card');
    var r = p && p.recipe ? p.recipe : null;
    card.appendChild(el('div', 'rc-name', r ? r.name : '还在锅里…'));
    card.appendChild(el('div', 'rc-owner', p ? p.nick + '（' + label + '）' : label));
    if (r) {
      card.appendChild(el('div', 'rc-meta', '黑暗指数 ' + (r.darkScore != null ? r.darkScore : '?') + ' · ' + (r.plating || '')));
      var ul = document.createElement('ul');
      ul.className = 'rc-steps';
      (r.steps || []).forEach(function (s) { var li = document.createElement('li'); li.textContent = s; ul.appendChild(li); });
      card.appendChild(ul);
      if (r.warning) card.appendChild(el('div', 'rc-warn', '⚠️ ' + r.warning));
      if (r.event) card.appendChild(el('div', 'rc-warn', (r.event.emoji || '🎲') + ' 随机事件：' + (r.event.name || '')));
    }
    return card;
  }

  function renderDuelJudge(b) {
    var me = duel.players[duel.myUid];
    var opp = opponent();
    var timer = el('div', 'duel-timer', '60'); timer.id = 'duelCount'; b.appendChild(timer);
    var judge = el('div', 'duel-judge');
    judge.appendChild(recipeCard(opp, '对手'));
    judge.appendChild(recipeCard(me, '你'));
    b.appendChild(judge);

    if (me && me.score === null && opp && opp.recipe) {
      var vb = el('div', 'duel-vote-box');
      vb.appendChild(el('p', 'duel-hint', '给对手的菜打离谱分（0-100），谁被对方打的分更高谁赢！'));
      var row = el('div', 'duel-vote-row');
      var range = document.createElement('input');
      range.type = 'range'; range.min = 0; range.max = 100; range.value = 50;
      range.className = 'duel-vote-range';
      var num = el('span', 'duel-vote-num', '50');
      range.addEventListener('input', function () { num.textContent = range.value; duel.score = Number(range.value); });
      row.appendChild(range); row.appendChild(num);
      vb.appendChild(row);
      var voteBtn = el('button', 'duel-primary', '🗳️ 投出离谱分');
      voteBtn.type = 'button';
      voteBtn.addEventListener('click', function () {
        callDuel({ action: 'duelVote', roomId: duel.roomId, score: duel.score }, function (d) { applyDuelData(d); });
      });
      vb.appendChild(voteBtn);
      b.appendChild(vb);
    } else if (me && me.score !== null) {
      b.appendChild(el('p', 'duel-hint', '已评分，等待对手投票…'));
    } else if (me && me.score === null && !(opp && opp.recipe)) {
      b.appendChild(el('p', 'duel-hint', '对方还在炒菜…'));
    }
  }

  function scoreCard(p, isMe) {
    var card = el('div', 'duel-player' + (isMe ? ' me' : ''));
    card.appendChild(el('div', 'dp-name', p.nick + (isMe ? '（你）' : '')));
    card.appendChild(el('div', 'dp-status', '离谱分：' + (p.score != null ? p.score : '-')));
    return card;
  }
  function randomAvatarEmoji() { var l = ['😹', '🤡', '🐷', '🦆', '🐸', '🫠', '😵‍💫']; return l[Math.floor(Math.random() * l.length)]; }
  function winnerIngredient() {
    var w = duel.winner ? duel.players[duel.winner] : null;
    if (w && w.ingredients && w.ingredients.length) return w.ingredients[0];
    if (duel.bomb) return duel.bomb;
    return '';
  }
  function penaltyPanel(winnerNick) {
    var box = el('div', 'duel-penalty');
    box.appendChild(el('div', 'pn-title', '😵 惩罚时间' + (duel.penaltyDouble ? '（惩罚翻倍！）' : '') + '——输给 ' + winnerNick + '，选一个执行：'));
    var opp = opponent();
    var dish = opp && opp.recipe ? '「' + opp.recipe.name + '」' : '（神秘料理）';
    var opts = [
      { emoji: '📱', text: '发一条指定文案的朋友圈/动态', value: '我在「冰箱剩菜盲盒」双人对局中输给了 ' + winnerNick + '，按约定公开处刑：这道菜' + dish + '，你敢挑战吗？' },
      { emoji: '😅', text: '把头像换成赢家指定的表情包，保持 1 小时', value: '惩罚：我把头像换成了 ' + randomAvatarEmoji() + ' 一小时（赢家 ' + winnerNick + ' 指定）。' },
      { emoji: '🥬', text: '下一局必须用赢家指定的一种食材开局', value: '惩罚：下一局开局食材必须带上「' + (winnerIngredient() || '神秘食材') + '」（赢家 ' + winnerNick + ' 指定）。' }
    ];
    opts.forEach(function (o) {
      var opt = el('div', 'pn-opt');
      opt.tabIndex = 0; opt.setAttribute('role', 'button');
      opt.appendChild(el('span', 'pn-emoji', o.emoji));
      opt.appendChild(el('span', 'pn-text', o.text));
      opt.appendChild(el('span', 'pn-copy', '复制文案'));
      opt.addEventListener('click', function () {
        copyText(o.value);
        duel.penaltyChosen = true;
        toast('已复制，记得真的执行哦 😈');
        soundPop();
      });
      opt.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click(); } });
      box.appendChild(opt);
    });
    return box;
  }

  function renderDuelDone(b) {
    var me = duel.players[duel.myUid];
    var opp = opponent();
    var winner = duel.winner ? duel.players[duel.winner] : null;
    var wrap = el('div', 'duel-settle');
    var banner = el('div', 'duel-winner-banner' + (duel.tie ? ' tie' : ''));
    if (duel.tie) {
      banner.textContent = duel.timeoutLoser === 'both' ? '⏰ 双方超时，双双判负，惩罚翻倍！' : '🤝 平局！谁也没输，谁也没赢';
    } else if (winner) {
      var isMe = me && winner.nick === me.nick;
      banner.textContent = isMe ? '🎉 你赢了！' : '💀 ' + (winner.nick || '对手') + ' 赢了！';
    }
    wrap.appendChild(banner);

    var playersRow = el('div', 'duel-players');
    if (me) playersRow.appendChild(scoreCard(me, true));
    if (opp) playersRow.appendChild(scoreCard(opp, false));
    wrap.appendChild(playersRow);

    var iLost = me && duel.winner && winner && me.nick !== winner.nick && !duel.tie;
    if (iLost && winner) wrap.appendChild(penaltyPanel(winner.nick || '对手'));

    var actions = el('div', 'duel-actions');
    var again = el('button', 'duel-primary', '⚔️ 再来一局');
    again.type = 'button';
    again.addEventListener('click', function () {
      callDuel({ action: 'duelRematch', roomId: duel.roomId }, function (d) {
        duel.myRecipe = null; duel.bomb = ''; duel.swapDone = false; duel.penaltyChosen = false;
        applyDuelData(d);
      });
    });
    actions.appendChild(again);
    var exit = el('button', 'duel-secondary', '退出对局');
    exit.type = 'button';
    exit.addEventListener('click', closeDuel);
    actions.appendChild(exit);
    wrap.appendChild(actions);
    b.appendChild(wrap);
  }

  function startDuelSync() {
    stopDuelLoops();
    var started = false;
    try {
      var db = cloudApp.database();
      var doc = db.collection('rooms').doc(duel.roomId);
      if (doc && typeof doc.watch === 'function') {
        duel.watcher = doc.watch({
          onChange: function (snapshot) { applyDuelSnapshot(snapshot); },
          onError: function (err) { console.warn('duel watch error:', err); startDuelPoll(); }
        });
        started = true;
      }
    } catch (e) { console.warn('duel watch init failed:', e); }
    if (!started) startDuelPoll();
    duel.hbTimer = setInterval(function () {
      callDuel({ action: 'duelHeartbeat', roomId: duel.roomId }, function () {});
    }, 10000);
    startDuelCountdown();
  }

  function startDuelPoll() {
    if (duel.pollTimer) return;
    duel.pollTimer = setInterval(function () {
      callDuel({ action: 'duelGet', roomId: duel.roomId }, function (d) { applyDuelData(d); });
    }, 1500);
  }

  function applyDuelSnapshot(snapshot) {
    var doc = null;
    var list = null;
    if (snapshot) {
      if (snapshot.docs && snapshot.docs.length) list = snapshot.docs;
      else if (snapshot.docChanges && snapshot.docChanges.length) list = snapshot.docChanges.map(function (ch) { return ch.doc; });
    }
    if (!list || !list.length) return;
    var first = list[0];
    doc = (first && first.data && typeof first.data === 'object') ? first.data
      : (first && first._data && typeof first._data === 'object') ? first._data
      : first;
    if (!doc || !doc.phase) return;
    applyDuelData(normalizeDuel(doc));
  }

  function normalizeDuel(d) {
    if (!d) return null;
    return {
      roomId: d.roomId || duel.roomId, code: d.code || '', phase: d.phase || '',
      players: d.players || {}, exchange: d.exchange || {}, winner: d.winner || '',
      tie: !!d.tie, penaltyDouble: !!d.penaltyDouble, timeoutLoser: d.timeoutLoser || '',
      deadline: d.deadline || 0, myUid: duel.myUid
    };
  }

  function applyDuelData(d) {
    if (!d) return;
    var prevPhase = duel.phase;
    duel.roomId = d.roomId || duel.roomId;
    duel.code = d.code || duel.code;
    duel.players = d.players || duel.players;
    duel.exchange = d.exchange || {};
    duel.winner = d.winner || '';
    duel.tie = !!d.tie;
    duel.penaltyDouble = !!d.penaltyDouble;
    duel.timeoutLoser = d.timeoutLoser || '';
    duel.deadline = d.deadline || 0;
    duel.phase = d.phase || duel.phase;
    if (prevPhase !== duel.phase) {
      if (duel.phase === 'swap') runSwapScene();
      if (duel.phase === 'judge') soundDing();
      if (duel.phase === 'done') onDuelSettled();
      startDuelCountdown();
    }
    renderDuel();
  }

  function runSwapScene() {
    if (duel.swapTimer) clearTimeout(duel.swapTimer);
    duel.swapTimer = setTimeout(function () { duel.swapDone = true; renderDuel(); }, 3200);
  }

  function startDuelCountdown() {
    if (duel.countTimer) clearInterval(duel.countTimer);
    duel.countTimer = setInterval(function () {
      if (!duel.roomId || duel.phase === '' || duel.phase === 'done') return;
      if (!duel.deadline) {
        var secEl0 = document.getElementById('duelCount');
        if (secEl0) secEl0.textContent = '--';
        return;
      }
      var remain = Math.max(0, (duel.deadline || 0) - Date.now());
      var secEl = document.getElementById('duelCount');
      if (secEl) {
        var sec = Math.ceil(remain / 1000);
        secEl.textContent = sec;
        secEl.classList.toggle('warn', sec <= 10);
      }
      if (remain <= 0) {
        clearInterval(duel.countTimer);
        handleDuelTimeout();
      }
    }, 500);
  }

  function handleDuelTimeout() {
    var me = duel.players[duel.myUid];
    if (!me) return;
    if (Object.keys(duel.players || {}).length < 2) return; // waiting for opponent
    if (duel.phase === 'swap') return; // 交换阶段超时交给服务器 tick 判定（心跳兜底）
    if (duel.submitting && duel.phase === 'cook') return; // AI in-flight: do not self-penalize
    var pending = (duel.phase === 'lobby' && !me.ready) ||
                  (duel.phase === 'cook' && !me.cooked) ||
                  (duel.phase === 'judge' && me.score === null);
    if (pending) {
      toast('⏰ 超时判负，惩罚翻倍！');
      callDuel({ action: 'duelTimeout', roomId: duel.roomId }, function (d) { applyDuelData(d); });
    }
  }

  function onDuelSettled() {
    if (duel.winner) soundCheer(); else soundDing();
  }

  /* 邀请链接自动加入 */
  function initDuelLink() {
    var dq = getQuery('duel');
    if (!dq) return;
    if (isDemo || !cloudApp) { toast('双人对局需要连接云开发环境'); return; }
    duel.joinRoomId = dq;
    openDuel();
  }

  els.duelBtn.addEventListener('click', openDuel);
  els.duelClose.addEventListener('click', closeDuel);
  els.duelView.addEventListener('click', function (e) {
    if (e.target === els.duelView || e.target.classList.contains('duel-backdrop')) closeDuel();
  });

  var DEMO_USERS = ['深夜干饭人', '冰箱战神', '打工人阿伟', '米其林在逃', '吃瓜群众', '用户8848', '干饭魂', '减肥失败者'];

  /* ===== 登录账号名 ===== */
  var ACCOUNT_KEY = 'fridge_account_name';
  var accountName = localStorage.getItem(ACCOUNT_KEY) || '';
  function getAccountName() { return accountName || ''; }
  function renderAccountBtn() {
    els.accountBtn.textContent = accountName ? '\uD83D\uDC64 ' + accountName : '\uD83D\uDC64 \u672A\u767B\u5F55';
    els.accountBtn.classList.toggle('not-logged', !accountName);
  }
  function openLoginModal() {
    els.loginModal.classList.remove('hidden');
    els.loginName.value = accountName || '';
    els.loginName.classList.remove('error');
    if (els.loginErr) els.loginErr.classList.add('hidden');
    setTimeout(function () { els.loginName.focus(); }, 60);
  }
  function closeLoginModal() { els.loginModal.classList.add('hidden'); }
  function saveLogin() {
    var n = els.loginName.value.trim().slice(0, 12);
    if (!n) {
      if (els.loginErr) els.loginErr.classList.remove('hidden');
      els.loginName.classList.add('error');
      toast('\u8BF7\u8F93\u5165\u8D26\u53F7\u540D');
      return;
    }
    if (els.loginErr) els.loginErr.classList.add('hidden');
    els.loginName.classList.remove('error');
    accountName = n;
    localStorage.setItem(ACCOUNT_KEY, n);
    renderAccountBtn();
    closeLoginModal();
    soundDing();
    toast('\u6B22\u8FCE\uFF0C' + n + '\uFF01');
  }
  function ensureLogin() { if (!accountName) openLoginModal(); }
  els.accountBtn.addEventListener('click', openLoginModal);
  els.loginOk.addEventListener('click', saveLogin);
  els.loginName.addEventListener('input', function () {
    els.loginName.classList.remove('error');
    if (els.loginErr) els.loginErr.classList.add('hidden');
  });
  els.loginName.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveLogin(); });
  els.loginModal.addEventListener('click', function (e) {
    if (e.target === els.loginModal || e.target.classList.contains('login-backdrop')) closeLoginModal();
  });
  renderAccountBtn();

  /* ===== 实用向：我的冰箱 / 营养估算 / 清单工具 / 收藏 ===== */

  /* ---- 我的冰箱（食材管理，localStorage） ---- */
  var FRIDGE_KEY = 'fridge_inventory';
  var fridgeItems = [];
  function loadFridge() {
    try { fridgeItems = JSON.parse(localStorage.getItem(FRIDGE_KEY) || '[]'); } catch (e) { fridgeItems = []; }
    if (!Array.isArray(fridgeItems)) fridgeItems = [];
  }
  function saveFridge() { localStorage.setItem(FRIDGE_KEY, JSON.stringify(fridgeItems)); }
  function daysLeft(it) { return Math.ceil(((it.addedAt || Date.now()) + (it.days || 5) * 86400000 - Date.now()) / 86400000); }
  function renderFridge() {
    els.fridgeList.textContent = '';
    if (!fridgeItems.length) {
      els.fridgeList.appendChild(el('p', 'fridge-empty', '冰箱空空的，把食材记下来吧～'));
    }
    fridgeItems.forEach(function (it, idx) {
      var d = daysLeft(it);
      var chip = document.createElement('span');
      chip.className = 'fridge-item' + (d <= 0 ? ' expired' : (d <= 2 ? ' expiring' : ''));
      var nm = document.createElement('span'); nm.textContent = it.name;
      chip.appendChild(nm);
      var days = document.createElement('span'); days.className = 'fi-days';
      days.textContent = d <= 0 ? '已过期' : (d <= 2 ? '剩' + d + '天' : (it.days || 5) + '天');
      chip.appendChild(days);
      var del = document.createElement('button'); del.className = 'fi-del'; del.textContent = '×';
      del.addEventListener('click', function () { fridgeItems.splice(idx, 1); saveFridge(); renderFridge(); });
      chip.appendChild(del);
      els.fridgeList.appendChild(chip);
    });
  }
  function addFridgeItem() {
    var n = els.fridgeName.value.trim();
    if (!n) { toast('先输入食材名'); return; }
    var days = parseInt(els.fridgeDays.value, 10) || 5;
    fridgeItems.push({ name: n, days: days, addedAt: Date.now() });
    saveFridge(); renderFridge();
    els.fridgeName.value = '';
    soundPop();
    toast('已记下 ' + n);
  }
  function fridgeToIngredients() {
    var alive = fridgeItems.filter(function (it) { return daysLeft(it) > 0; });
    if (!alive.length) { toast('冰箱里没有能吃的了，先加点食材'); return; }
    alive.sort(function (a, b) { return daysLeft(a) - daysLeft(b); });
    var text = alive.map(function (it) { return it.name; }).slice(0, 6).join('、');
    els.ingredients.value = text;
    els.charCount.textContent = text.length + '/200';
    var urgent = alive.filter(function (it) { return daysLeft(it) <= 2; });
    if (urgent.length) toast('优先吃掉快过期的：' + urgent.map(function (it) { return it.name; }).join('、'));
    else toast('已填入冰箱食材，开整吧！');
  }
  els.fridgeToggle.addEventListener('click', function () {
    var open = els.fridgeBody.classList.toggle('hidden');
    els.fridgeToggle.classList.toggle('open', !open);
  });
  els.fridgeAdd.addEventListener('click', addFridgeItem);
  els.fridgeName.addEventListener('keydown', function (e) { if (e.key === 'Enter') addFridgeItem(); });
  els.fridgeCook.addEventListener('click', fridgeToIngredients);

  /* ---- 营养估算（启发式，图个心里有数） ---- */
  function estimateNutrition(ingsText, recipe) {
    var t = String(ingsText || '') + ' ' + ((recipe && recipe.name) || '');
    var count = String(ingsText || '').split(/[、,，;；+＋]/).filter(Boolean).length || 2;
    var kcal = 300 + count * 35;
    var protein = 10 + count * 3;
    var carbs = 28 + count * 4;
    if (/饭|面|粉|土豆|馒头|饼|米|面包/.test(t)) kcal += 90;
    if (/肉|鸡|牛|猪|鱼|虾|蛋|豆腐|奶/.test(t)) { protein += 14; kcal += 70; }
    if (/油|炸|煎|肥|芝士|奶油/.test(t)) kcal += 110;
    if (/可乐|糖|甜|巧克力|冰淇淋|汽水/.test(t)) kcal += 90;
    if (/菜|瓜|叶|菇|笋/.test(t)) { carbs += 6; protein += 2; }
    return {
      kcal: Math.round(kcal * 0.92) + '-' + Math.round(kcal * 1.08),
      protein: protein + '-' + (protein + 7) + 'g',
      carbs: carbs + '-' + (carbs + 12) + 'g'
    };
  }
  function renderNutrition(ings, recipe) {
    var n = estimateNutrition(ings, recipe);
    els.nutritionBox.classList.remove('hidden');
    els.nutritionBody.textContent = '';
    [
      { v: n.kcal, l: '千卡' },
      { v: n.protein, l: '蛋白质' },
      { v: n.carbs, l: '碳水' }
    ].forEach(function (it) {
      var d = document.createElement('div'); d.className = 'nutrition-item';
      var b = document.createElement('b'); b.textContent = it.v;
      var s = document.createElement('span'); s.textContent = it.l;
      d.appendChild(b); d.appendChild(s);
      els.nutritionBody.appendChild(d);
    });
  }

  /* ---- 购物清单：复制 / 导出 ---- */
  function currentShoppingText() {
    var list = state.shoppingList || [];
    var head = '【' + ((state.recipe && state.recipe.name) || '菜谱') + '】采购清单\n';
    if (!list.length) return head + '（无需额外采购）';
    return head + list.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n');
  }
  els.shopCopy.addEventListener('click', function () {
    copyText(currentShoppingText());
    toast('清单已复制，去外卖 App 下单吧');
  });
  els.shopExport.addEventListener('click', function () {
    var txt = currentShoppingText();
    var blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ((state.recipe && state.recipe.name) || '菜谱') + '-采购清单.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    toast('清单已导出');
  });

  /* ---- 收藏（localStorage，按分类） ---- */
  var FAV_KEY = 'fridge_favorites';
  var favItems = [];
  var favCat = '全部';
  function loadFavs() { try { favItems = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { favItems = []; } if (!Array.isArray(favItems)) favItems = []; }
  function saveFavs() { localStorage.setItem(FAV_KEY, JSON.stringify(favItems)); }
  function favCatOf(recipe) {
    if (state.mode === 'weird') return '黑暗收藏';
    var n = (recipe.steps || []).length;
    return n >= 5 ? '周末大菜' : '快手菜';
  }
  function isFaved(recipe) { return favItems.some(function (f) { return f.name === recipe.name; }); }
  function toggleFav() {
    var r = state.recipe; if (!r) return;
    var idx = -1;
    for (var i = 0; i < favItems.length; i++) { if (favItems[i].name === r.name) { idx = i; break; } }
    if (idx >= 0) { favItems.splice(idx, 1); toast('已取消收藏'); }
    else {
      favItems.unshift({ name: r.name, ingredients: state.lastIngredients || '', recipe: r, cat: favCatOf(r), date: new Date().toLocaleDateString() });
      toast('已收藏到「' + favCatOf(r) + '」');
    }
    saveFavs(); updateFavBtn(); renderFavs();
  }
  function updateFavBtn() {
    var r = state.recipe;
    var faved = r && isFaved(r);
    els.favBtn.classList.toggle('hidden', !r);
    els.favBtn.classList.toggle('faved', !!faved);
    els.favBtn.textContent = faved ? '⭐ 已收藏' : '⭐ 收藏菜谱';
  }
  function renderFavTabs() {
    var cats = ['全部', '快手菜', '周末大菜', '黑暗收藏'];
    els.favTabs.textContent = '';
    cats.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'fav-tab' + (c === favCat ? ' active' : '');
      b.textContent = c;
      b.addEventListener('click', function () { favCat = c; renderFavTabs(); renderFavs(); });
      els.favTabs.appendChild(b);
    });
  }
  function renderFavs() {
    els.favList.textContent = '';
    var list = favCat === '全部' ? favItems : favItems.filter(function (f) { return f.cat === favCat; });
    if (!list.length) {
      els.favList.appendChild(el('p', 'fav-empty', favCat === '全部' ? '还没有收藏，生成菜谱后点「⭐ 收藏菜谱」' : '这个分类还没有收藏'));
      return;
    }
    list.forEach(function (f, i) {
      var card = document.createElement('div'); card.className = 'fav-item';
      var em = el('span', 'fi-emoji', f.cat === '周末大菜' ? '🍲' : (f.cat === '快手菜' ? '⚡' : '💀'));
      var main = el('div', 'fi-main');
      main.appendChild(el('div', 'fi-name', f.name));
      main.appendChild(el('div', 'fi-meta', f.cat + ' · ' + f.date));
      var del = document.createElement('button'); del.className = 'fi-del'; del.textContent = '×';
      del.addEventListener('click', function (ev) { ev.stopPropagation(); favItems.splice(i, 1); saveFavs(); renderFavs(); });
      card.appendChild(em); card.appendChild(main); card.appendChild(del);
      card.addEventListener('click', function () { renderDetail(f.recipe); els.detailModal.classList.remove('hidden'); });
      els.favList.appendChild(card);
    });
  }
  els.favBtn.addEventListener('click', toggleFav);

  /* ---- 做菜指导增强：火候/用时提示 ---- */
  function fireHint(s) {
    if (!s) return '';
    var map = { '大火': '🔥', '中火': '🔥', '小火': '♨️', '煎': '🍳', '炸': '🍤', '焯': '💧', '焖': '🍲', '炖': '🍲', '烤': '🔥', '蒸': '♨️', '煮': '♨️' };
    for (var k in map) { if (s.indexOf(k) >= 0) return map[k]; }
    return '';
  }

  /* ---- 初始化：渲染冰箱 + 收藏 ---- */
  loadFridge(); renderFridge();
  loadFavs(); renderFavTabs(); renderFavs();

  /* ===== 演示视频推荐（iddzz 菜谱库，bilibili 链接） ===== */
  function renderVideoRecommend(ings, recipe) {
    if (!window.IDDZZ_RECIPES) { els.videoBox.classList.add('hidden'); return; }
    var list = [];
    if (recipe && recipe.video) {
      list.push({ title: recipe.video.title || recipe.name + ' 家常做法', url: recipe.video.url, name: recipe.name, direct: true });
    } else {
      var matches = window.IDDZZ_RECIPES.matchByIngredients(ings);
      for (var i = 0; i < matches.length && list.length < 2; i++) {
        var r = matches[i].recipe;
        if (r.video) list.push({ title: r.video.title || r.name + ' 家常做法', url: r.video.url, name: r.name, direct: false });
      }
    }
    if (!list.length) { els.videoBox.classList.add('hidden'); return; }
    els.videoBox.classList.remove('hidden');
    els.videoBox.textContent = '';
    list.forEach(function (v) {
      var card = document.createElement('div'); card.className = 'video-item';
      var info = document.createElement('div'); info.className = 'video-info';
      var t = document.createElement('b');
      t.textContent = v.direct ? '🎬 ' + v.name + ' 演示视频' : '🎬 相近菜：' + v.name;
      var sub = document.createElement('span');
      sub.textContent = v.direct ? '跟着视频一步步做，翻车率更低' : '这道菜 B 站有完整教程，照着做更稳';
      info.appendChild(t); info.appendChild(sub);
      var btn = document.createElement('a'); btn.className = 'video-play'; btn.textContent = '▶ 播放';
      btn.href = v.url; btn.target = '_blank'; btn.rel = 'noopener noreferrer';
      card.appendChild(info); card.appendChild(btn);
      els.videoBox.appendChild(card);
    });
  }
})();
