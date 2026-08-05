/* 冰箱剩菜盲盒 · 网页版 */
(function () {
  'use strict';

  /* ===== 配置 ===== */
  var CLOUD_ENV_ID = 'a455-d3g2s3dt865d86640';   // 云开发环境 ID（已配置，换环境时修改）
  var CLOUD_REGION = 'ap-shanghai';   // 环境地域
  var isDemo = !CLOUD_ENV_ID || CLOUD_ENV_ID === 'YOUR_ENV_ID';

  var cloudApp = null;
var state = { recipe: null, recordId: '', rated: false, generating: false, styleId: 'classic', mode: 'weird', player: null, styles: [], rankData: [], rankTag: '全部', posterSkin: 'normal', challengeId: '', detailRecipe: null, rankDetailRecipe: null };

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
    detailBody: $('detailBody')
  };

  /* ===== 工具 ===== */
  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.add('hidden'); }, 2200);
  }

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
        if (navigator.share) {
          navigator.share({ title: '冰箱剩菜盲盒 · 好友投喂', text: '我甩给你一道黑暗料理，敢接受挑战吗？', url: link }).catch(function () { copyLink(link); });
        } else { copyLink(link); }
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
        els.micHint.textContent = '正在听你说：' + interimText;
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
  function startPotShow() {
    els.potLoading.classList.remove('hidden');
    var queue = shuffleArr(LOADING_LINES);
    var idx = 0;
    typeLine(queue[0]);
    if (potTimer) clearInterval(potTimer);
    potTimer = setInterval(function () {
      idx = (idx + 1) % queue.length;
      typeLine(queue[idx]);
    }, 2300);
  }
  function stopPotShow() {
    if (potTimer) { clearInterval(potTimer); potTimer = null; }
    els.potLoading.classList.add('hidden');
  }


  function generate() {
    var text = els.ingredients.value.trim();
    if (!text) { toast('先告诉我冰箱里有什么'); return; }
    if (state.generating) return;
    state.generating = true;
    els.genBtn.disabled = true;
    els.genBtn.textContent = '锅中冒泡中…';
    els.potLoading.classList.remove('hidden');
    els.result.classList.add('hidden');
    els.posterSection.classList.add('hidden');

    if (isDemo || !cloudApp) {
      setTimeout(function () {
        finishGenerate(text, demoRecipe(text), '', true);
      }, 1200);
      return;
    }

    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'generate', ingredients: text, style: state.styleId, mode: state.mode } })
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

    els.dishName.textContent = recipe.name;
    els.stepsWrap.classList.add('hidden');
    els.warning.classList.add('hidden');
    els.stepsToggle.classList.remove('open');
    els.warningToggle.classList.remove('open');
    els.dishIngredients.textContent = '食材：' + ingredients;
    var hasDetail = recipe.lib || (Array.isArray(recipe.ings) && recipe.ings.length);
    els.libBadge.classList.toggle('hidden', !recipe.lib);
    els.detailBtn.classList.toggle('hidden', !hasDetail);
    if (hasDetail) state.detailRecipe = recipe;
    renderSteps(recipe);
    els.plating.textContent = '“' + recipe.plating + '”';
    els.warning.textContent = recipe.warning;
    els.result.classList.remove('hidden');
    if (isFallback) toast('AI 暂时掉线，先上了一份主厨拿手菜');
    els.result.scrollIntoView({ behavior: 'smooth' });
  }

  /* ===== 演示模式兜底 ===== */
  function demoRecipe(ingredients) {
    // 正常家常模式：优先从内置菜谱库（206 道家常菜）出菜
    if (state.mode === 'normal' && window.NORMAL_RECIPES) {
      return window.NORMAL_RECIPES.getNormalAppRecipe(ingredients);
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
        toast('演示模式：已评价 ' + rating);
        return;
      }
      if (!state.recordId) return;
      cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'rate', recordId: state.recordId, rating: rating } })
        .then(function (res) {
          var r = res && res.result ? res.result : {};
          if (!r.success) throw new Error(r.error || '评价失败');
          state.rated = true;
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
    glowText(ctx, recipe.name, W / 2, 300, 'bold 64px sans-serif', '#ff2d78', 30);

    if (ingredients) {
      ctx.fillStyle = '#8ea2c8';
      ctx.font = '28px sans-serif';
      wrapText(ctx, '食材：' + ingredients, 60, 360, W - 120, 40, 'center');
    }

    // 做法
    var yy = 470;
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🧑‍🍳 做法', 70, yy);
    yy += 60;
    (recipe.steps || []).forEach(function (s, i) {
      if (yy > 820) return;
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(String(i + 1), 80, yy);
      ctx.fillStyle = '#dceaff';
      ctx.font = '28px sans-serif';
      yy = wrapText(ctx, s, 130, yy, W - 210, 42, 'left') + 26;
    });

    // 摆盘建议
    yy += 10;
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('🍽️ 摆盘建议', 70, yy);
    ctx.fillStyle = '#ffe600';
    ctx.font = 'italic 30px sans-serif';
    yy = wrapText(ctx, '“' + (recipe.plating || '') + '”', 70, yy + 40, W - 140, 42, 'left') + 26;

    // 主厨警告
    yy += 10;
    ctx.fillStyle = '#ff4d4f';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('⚠️ 主厨警告', 70, yy);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '28px sans-serif';
    wrapText(ctx, recipe.warning || '', 70, yy + 40, W - 140, 40, 'left');

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
      wrapText(ctx, '食材：' + ingredients, 90, 500, W - 180, 42, 'center');
    }
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('评审委员会意见', W / 2, 640);
    ctx.fillStyle = '#e8e0c8';
    ctx.font = '28px sans-serif';
    wrapText(ctx, '“' + (recipe.plating || '') + '”', 90, 700, W - 180, 44, 'center');
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
    row('食    材：', ingredients, 580);
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#333';
    ctx.fillText('医    嘱：', 80, 700);
    ctx.fillStyle = '#c8102e';
    wrapText(ctx, recipe.warning || '', 260, 700, W - 360, 44, 'left');
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

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, align) {
    if (!text) return y;
    ctx.textAlign = align || 'left';
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
    a.download = '冰箱剩菜盲盒_' + ((state.recipe && state.recipe.name) || '海报') + '.png';
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
            recipe_data: item.recipe_data || null
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

      var comment = document.createElement('div');
      comment.className = 'rank-comment';
      comment.textContent = item.comment || '';

      var tag = document.createElement('span');
      tag.className = 'rank-tag ' + (item.rating === '已进医院' ? 'tag-bad' : 'tag-good');
      tag.textContent = item.rating;

      card.appendChild(emoji);
      card.appendChild(dish);
      card.appendChild(comment);
      card.appendChild(tag);

      var mini = document.createElement('span');
      mini.className = 'rank-tag-mini';
      mini.textContent = item.tag || '硬核养生';
      card.appendChild(mini);
      els.rankList.appendChild(card);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('click', function () { openRankModal(item); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRankModal(item); }
      });
    });
  }

  /* ===== 红黑榜：点击看大图 ===== */
  function openRankModal(item) {
    if (!item) return;
    els.rankModalEmoji.textContent = item.emoji || '🍽️';
    els.rankModalDish.textContent = item.dish || '';
    els.rankModalTag.textContent = item.rating || '';
    els.rankModalTag.className = 'rank-modal-tag ' + (item.rating === '已进医院' ? 'tag-bad' : 'tag-good');
    els.rankModalComment.textContent = item.comment || '';
    var rd = item.recipe_data || item.recipe || null;
    var hasRecipe = !!(rd && Array.isArray(rd.steps) && rd.steps.length);
    state.rankDetailRecipe = hasRecipe ? rd : null;
    els.rankDetailBtn.classList.toggle('hidden', !hasRecipe);
    els.rankModal.classList.remove('hidden');
  }
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
        li.textContent = s;
        ol.appendChild(li);
      });
      sec3.appendChild(ol);
      els.detailBody.appendChild(sec3);
    }

    if (recipe.tips) {
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
    if (!isDemo && cloudApp) {
      loadPlayer();
      handleChallengeParam();
    }
  });
})();
