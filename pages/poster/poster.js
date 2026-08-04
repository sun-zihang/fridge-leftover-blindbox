// pages/poster/poster.js
const DEMO_RECIPE = {
  name: '主厨的倔强炒饭',
  steps: [
    '把冰箱里所有食材切成丁，假装它们本来就是一个团队。',
    '热锅凉油，倒入食材，翻炒到它们认命为止。',
    '出锅前撒一把葱花，主打一个"尽力了"。'
  ],
  plating: '用一个平时不敢用的盘子，凹出米其林三星的自信。',
  warning: '肠胃敏感者请酌情食用，厨房已尽力，后果自负。'
};

// 画布逻辑尺寸（px）
const POSTER_W = 750;
const POSTER_H = 1200;

Page({
  data: {
    recipe: null,
    ingredients: '',
    saving: false,
    canvasStyle: ''
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const scale = sys.windowWidth / 750;
    const cssW = Math.round(750 * scale);
    const cssH = Math.round(POSTER_H * scale);
    this.setData({ canvasStyle: 'width:' + cssW + 'px;height:' + cssH + 'px;' });

    const channel = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null;
    if (channel && channel.on) {
      channel.on('recipe', (data) => {
        const recipe = (data && data.recipe) || DEMO_RECIPE;
        this.setData(
          { recipe: recipe, ingredients: (data && data.ingredients) || '' },
          () => this.drawPoster()
        );
      });
    }
  },

  onReady() {
    // 直接进入海报页（如从分享卡片打开）时使用演示菜谱
    if (!this.data.recipe) {
      this.setData({ recipe: DEMO_RECIPE }, () => this.drawPoster());
    }
  },

  // ========== 绘制海报（Canvas 2D，多端兼容） ==========
  drawPoster() {
    const recipe = this.data.recipe;
    if (!recipe) return;

    wx.createSelectorQuery()
      .in(this)
      .select('#posterCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          wx.showToast({ title: '画布初始化失败', icon: 'none' });
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = POSTER_W * dpr;
        canvas.height = POSTER_H * dpr;
        ctx.scale(dpr, dpr);

        // 背景渐变
        const bg = ctx.createLinearGradient(0, 0, 0, POSTER_H);
        bg.addColorStop(0, '#150a3a');
        bg.addColorStop(0.5, '#0d1230');
        bg.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, POSTER_W, POSTER_H);

        // 赛博网格装饰
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 2;
        for (let x = 0; x <= POSTER_W; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, POSTER_H);
          ctx.stroke();
        }
        for (let y = 0; y <= POSTER_H; y += 60) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(POSTER_W, y);
          ctx.stroke();
        }

        // 霓虹边框
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.lineWidth = 6;
        ctx.strokeRect(24, 24, POSTER_W - 48, POSTER_H - 48);

        // 顶部小徽标
        ctx.fillStyle = '#00f0ff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AI 深夜食堂 · 今日盲盒菜谱', POSTER_W / 2, 96);

        // 主标题
        this.drawGlowText(ctx, '冰箱剩菜盲盒', POSTER_W / 2, 170, '56px sans-serif', '#00f0ff', 24);

        // 菜名（霓虹粉）
        this.drawGlowText(ctx, recipe.name, POSTER_W / 2, 300, 'bold 64px sans-serif', '#ff2d78', 30);

        // 食材
        if (this.data.ingredients) {
          ctx.fillStyle = '#8ea2c8';
          ctx.font = '28px sans-serif';
          this.wrapText(ctx, '食材：' + this.data.ingredients, 60, 360, POSTER_W - 120, 40, 'center');
        }

        // 做法
        let y = 470;
        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🧑‍🍳 做法', 70, y);
        y += 60;
        const steps = recipe.steps || [];
        for (let i = 0; i < steps.length; i++) {
          if (y > 820) break;
          ctx.fillStyle = '#00f0ff';
          ctx.font = 'bold 30px sans-serif';
          ctx.fillText(String(i + 1), 80, y);
          ctx.fillStyle = '#dceaff';
          ctx.font = '28px sans-serif';
          y = this.wrapText(ctx, steps[i], 130, y, POSTER_W - 210, 42, 'left') + 26;
        }

        // 摆盘建议
        y += 10;
        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText('🍽️ 摆盘建议', 70, y);
        ctx.fillStyle = '#ffe600';
        ctx.font = 'italic 30px sans-serif';
        y = this.wrapText(ctx, '“' + (recipe.plating || '') + '”', 70, y + 40, POSTER_W - 140, 42, 'left') + 26;

        // 主厨警告
        y += 10;
        ctx.fillStyle = '#ff4d4f';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText('⚠️ 主厨警告', 70, y);
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '28px sans-serif';
        y = this.wrapText(ctx, recipe.warning || '', 70, y + 40, POSTER_W - 140, 40, 'left');

        // 底部
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(70, POSTER_H - 150);
        ctx.lineTo(POSTER_W - 70, POSTER_H - 150);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🍲 冰箱剩菜盲盒', POSTER_W / 2, POSTER_H - 100);
        ctx.fillStyle = '#6b7f9e';
        ctx.font = '22px sans-serif';
        ctx.fillText('长按保存 · 分享到朋友圈打卡', POSTER_W / 2, POSTER_H - 60);
      });
  },

  // 霓虹发光文字
  drawGlowText(ctx, text, x, y, font, color, blur) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  // 自动换行，返回下一行 y 坐标
  wrapText(ctx, text, x, y, maxWidth, lineHeight, align) {
    if (!text) return y;
    ctx.textAlign = align || 'left';
    const chars = String(text).split('');
    let line = '';
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = chars[i];
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  },

  // ========== 保存到相册 ==========
  saveToAlbum() {
    if (this.data.saving) return;
    this.setData({ saving: true });

    wx.createSelectorQuery()
      .in(this)
      .select('#posterCanvas')
      .fields({ node: true })
      .exec((res) => {
        const canvas = res && res[0] && res[0].node;
        if (!canvas) {
          this.setData({ saving: false });
          wx.showToast({ title: '画布不存在', icon: 'none' });
          return;
        }
        wx.canvasToTempFilePath({
          canvas: canvas,
          fileType: 'png',
          success: (r) => {
            wx.saveImageToPhotosAlbum({
              filePath: r.tempFilePath,
              success: () => {
                this.setData({ saving: false });
                wx.showToast({ title: '已保存到相册', icon: 'success' });
              },
              fail: (err) => {
                this.setData({ saving: false });
                if (err && err.errMsg && err.errMsg.indexOf('auth deny') >= 0) {
                  wx.showModal({
                    title: '需要相册权限',
                    content: '请在设置中开启「保存到相册」权限',
                    confirmText: '去设置',
                    success: (m) => {
                      if (m.confirm) wx.openSetting();
                    }
                  });
                } else {
                  wx.showToast({ title: '保存失败', icon: 'none' });
                }
              }
            });
          },
          fail: () => {
            this.setData({ saving: false });
            wx.showToast({ title: '生成图片失败', icon: 'none' });
          }
        });
      });
  },

  onShareAppMessage() {
    const recipe = this.data.recipe;
    return {
      title: recipe
        ? '我把「' + recipe.name + '」做成了海报，你敢来挑战吗？'
        : '冰箱剩菜盲盒：AI 主厨整活中',
      path: '/pages/index/index'
    };
  }
});
