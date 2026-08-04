/* 冰箱剩菜盲盒 · 网页版 */
(function () {
  'use strict';

  /* ===== 配置 ===== */
  var CLOUD_ENV_ID = 'a455-d3g2s3dt865d86640';   // 云开发环境 ID（已配置，换环境时修改）
  var CLOUD_REGION = 'ap-shanghai';   // 环境地域
  var isDemo = !CLOUD_ENV_ID || CLOUD_ENV_ID === 'YOUR_ENV_ID';

  var cloudApp = null;
  var state = { recipe: null, recordId: '', rated: false, generating: false };

  function $(id) { return document.getElementById(id); }
  var els = {
    ingredients: $('ingredients'),
    charCount: $('charCount'),
    micBtn: $('micBtn'),
    genBtn: $('genBtn'),
    potLoading: $('potLoading'),
    result: $('result'),
    dishName: $('dishName'),
    dishIngredients: $('dishIngredients'),
    steps: $('steps'),
    plating: $('plating'),
    warning: $('warning'),
    posterBtn: $('posterBtn'),
    shareBtn: $('shareBtn'),
    posterSection: $('posterSection'),
    posterCanvas: $('posterCanvas'),
    saveBtn: $('saveBtn'),
    sharePosterBtn: $('sharePosterBtn'),
    toast: $('toast'),
    rankList: $('rankList')
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
      cloudApp = cloudbase.init({ env: CLOUD_ENV_ID, region: CLOUD_REGION });
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
    recognition.interimResults = false;
    recognition.onresult = function (e) {
      var t = '';
      for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      appendVoice(t.trim());
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
    els.micBtn.textContent = on ? '⏹ 松手结束' : '🎙️ 语音输入';
    els.micBtn.classList.toggle('active', on);
  }
  function appendVoice(t) {
    if (!t) return;
    var prev = els.ingredients.value.trim();
    els.ingredients.value = prev ? prev + '、' + t : t;
    els.charCount.textContent = els.ingredients.value.length + '/200';
  }

  /* ===== 生成 ===== */
  els.genBtn.addEventListener('click', generate);

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

    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'generate', ingredients: text } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success) throw new Error(r.error || '生成失败');
        finishGenerate(text, r.data.recipe, r.data.recordId || '', !!r.data.fallback);
      })
      .catch(function (err) {
        state.generating = false;
        els.genBtn.disabled = false;
        els.genBtn.textContent = '召唤主厨 👨‍🍳';
        els.potLoading.classList.add('hidden');
        var msg = (err && err.message) ? err.message : '生成失败，请稍后重试';
        if (msg.indexOf('PERMISSION_DENIED') >= 0) {
          msg = '云函数权限未开启：请在控制台为 generateRecipe 开启「所有用户可调用」';
        } else if (msg.indexOf('without auth') >= 0) {
          msg = '未登录：请在云开发控制台开启「匿名登录」';
        }
        toast(msg);
      });
  }

  function finishGenerate(ingredients, recipe, recordId, isFallback) {
    state.generating = false;
    state.recipe = recipe;
    state.recordId = recordId || '';
    state.rated = false;
    els.genBtn.disabled = false;
    els.genBtn.textContent = '召唤主厨 👨‍🍳';
    els.potLoading.classList.add('hidden');

    els.dishName.textContent = recipe.name;
    els.dishIngredients.textContent = '食材：' + ingredients;
    els.steps.innerHTML = '';
    (recipe.steps || []).forEach(function (s, i) {
      var li = document.createElement('li');
      var num = document.createElement('span');
      num.className = 'step-num';
      num.textContent = i + 1;
      var txt = document.createElement('span');
      txt.textContent = s;
      li.appendChild(num);
      li.appendChild(txt);
      els.steps.appendChild(li);
    });
    els.plating.textContent = '“' + recipe.plating + '”';
    els.warning.textContent = recipe.warning;
    els.result.classList.remove('hidden');
    if (isFallback) toast('AI 暂时掉线，先上了一份主厨拿手菜');
    els.result.scrollIntoView({ behavior: 'smooth' });
  }

  /* ===== 演示模式兜底 ===== */
  function demoRecipe(ingredients) {
    return {
      name: '主厨的倔强炒饭',
      steps: [
        '把「' + ingredients + '」切成丁，假装它们本来就是一个团队。',
        '热锅凉油，倒入食材，翻炒到它们认命为止。',
        '出锅前撒一把葱花，主打一个“尽力了”。'
      ],
      plating: '用一个平时不敢用的盘子，凹出米其林三星的自信。',
      warning: '肠胃敏感者请酌情食用，厨房已尽力，后果自负。'
    };
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
        })
        .catch(function (e) { toast((e && e.message) ? e.message : '评价失败'); });
    });
  });

  /* ===== 海报 ===== */
  els.posterBtn.addEventListener('click', function () {
    if (!state.recipe) return;
    drawPoster(state.recipe, els.ingredients.value.trim());
    els.posterSection.classList.remove('hidden');
    els.posterSection.scrollIntoView({ behavior: 'smooth' });
  });

  function drawPoster(recipe, ingredients) {
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
    ctx.fillText('🍲 冰箱剩菜盲盒', W / 2, H - 100);
    ctx.fillStyle = '#6b7f9e';
    ctx.font = '22px sans-serif';
    ctx.fillText('长按保存 · 分享到朋友圈打卡', W / 2, H - 60);
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
  function randomRankItems(count) {
    return shuffleRank(RANK_DEMO).slice(0, count);
  }

  function loadRank(cloudReady) {
    if (isDemo || !cloudReady || !cloudApp) { renderRank(randomRankItems(RANK_MAX_ITEMS)); return; }
    cloudApp.callFunction({ name: 'generateRecipe', data: { action: 'listRank' } })
      .then(function (res) {
        var r = res && res.result ? res.result : {};
        if (!r.success || !Array.isArray(r.data)) throw new Error((r && r.error) || '红黑榜加载失败');
        var real = r.data.map(function (item) {
          return {
            emoji: item.rating === '已进医院' ? '🚑' : '😋',
            dish: item.name || '未命名料理',
            comment: item.warning || (item.ingredients ? '食材：' + item.ingredients : ''),
            rating: item.rating || '待评价'
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
      els.rankList.appendChild(card);
    });
  }

  initCloud().then(function (ready) {
    loadRank(ready);
  });
})();
