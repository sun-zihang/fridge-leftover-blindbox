const app = getApp();

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
  if (line) { ctx.fillText(line, x, y); y += lineHeight; }
  return y;
}

function drawNormal(ctx, W, H, recipe, ingredients) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#150a3a'); bg.addColorStop(0.5, '#0d1230'); bg.addColorStop(1, '#0a0e1a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,240,255,0.12)'; ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,240,255,0.8)'; ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.fillStyle = '#00f0ff'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('AI 深夜食堂 · 今日盲盒菜谱', W / 2, 96);
  glowText(ctx, '冰箱剩菜盲盒', W / 2, 170, '56px sans-serif', '#00f0ff', 24);
  ctx.fillStyle = '#ffe600'; ctx.font = 'italic 26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('“我让 AI 用冰箱剩菜做了顿饭，结果…”', W / 2, 235);
  glowText(ctx, recipe.name, W / 2, 300, 'bold 64px sans-serif', '#ff2d78', 30);
  if (ingredients) {
    ctx.fillStyle = '#8ea2c8'; ctx.font = '28px sans-serif';
    wrapText(ctx, '食材：' + ingredients, 60, 360, W - 120, 40, 'center');
  }
  let yy = 470;
  ctx.fillStyle = '#ffe600'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('👨‍🍳 做法', 70, yy); yy += 60;
  (recipe.steps || []).forEach(function (s, i) {
    if (yy > 820) return;
    const text = typeof s === 'string' ? s : (s && s.text ? s.text : '');
    if (!text) return;
    ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText(String(i + 1), 80, yy);
    ctx.fillStyle = '#dceaff'; ctx.font = '28px sans-serif';
    yy = wrapText(ctx, text, 130, yy, W - 210, 42, 'left') + 26;
  });
  yy += 10;
  ctx.fillStyle = '#ffe600'; ctx.font = 'bold 34px sans-serif';
  ctx.fillText('🍽️ 摆盘建议', 70, yy);
  ctx.fillStyle = '#ffe600'; ctx.font = 'italic 30px sans-serif';
  yy = wrapText(ctx, '“' + (recipe.plating || '') + '”', 70, yy + 40, W - 140, 42, 'left') + 26;
  yy += 10;
  ctx.fillStyle = '#ff4d4f'; ctx.font = 'bold 34px sans-serif';
  ctx.fillText('⚠️ 主厨警告', 70, yy);
  ctx.fillStyle = '#ff6b6b'; ctx.font = '28px sans-serif';
  wrapText(ctx, recipe.warning || '', 70, yy + 40, W - 140, 40, 'left');
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.moveTo(70, H - 150); ctx.lineTo(W - 70, H - 150); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🍲 冰箱剩菜盲盒 · AI 深夜食堂', W / 2, H - 118);
  ctx.fillStyle = '#00f0a0'; ctx.font = 'italic 26px sans-serif';
  ctx.fillText('围观更多黑暗料理战报，一起整活', W / 2, H - 78);
  ctx.fillStyle = '#6b7f9e'; ctx.font = '22px sans-serif';
  ctx.fillText('长按保存 · 分享到朋友圈打卡', W / 2, H - 42);
}

function drawCert(ctx, W, H, recipe, ingredients) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1026'); bg.addColorStop(1, '#1a0f2e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 10; ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.lineWidth = 3; ctx.strokeRect(46, 46, W - 92, H - 92);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4af37'; ctx.font = 'bold 46px sans-serif';
  ctx.fillText('⭐ 米其林三星认证书 ⭐', W / 2, 170);
  ctx.font = '24px sans-serif'; ctx.fillStyle = '#c9b98a';
  ctx.fillText('MICHELIN STAR CERTIFICATE (AI VERIFIED)', W / 2, 210);
  ctx.strokeStyle = '#d4af37'; ctx.beginPath(); ctx.moveTo(150, 240); ctx.lineTo(W - 150, 240); ctx.stroke();
  ctx.fillStyle = '#e8e0c8'; ctx.font = '28px sans-serif';
  ctx.fillText('兹授予以下菜品「深夜食堂三星认证」：', W / 2, 300);
  glowText(ctx, recipe.name, W / 2, 430, 'bold 72px sans-serif', '#ffd700', 36);
  if (ingredients) {
    ctx.fillStyle = '#8ea2c8'; ctx.font = '28px sans-serif';
    wrapText(ctx, '食材：' + ingredients, 90, 500, W - 180, 42, 'center');
  }
  ctx.fillStyle = '#d4af37'; ctx.font = 'bold 32px sans-serif';
  ctx.fillText('评审委员会意见', W / 2, 640);
  ctx.fillStyle = '#e8e0c8'; ctx.font = '28px sans-serif';
  wrapText(ctx, '“' + (recipe.plating || '') + '”', 90, 700, W - 180, 44, 'center');
  ctx.fillStyle = '#b98a5a';
  wrapText(ctx, '摆盘大胆，风味狂野，堪称黑暗料理界的清流。', 90, 820, W - 180, 40, 'center');
  ctx.fillStyle = '#d4af37'; ctx.font = 'italic 32px sans-serif';
  ctx.fillText('—— 深夜食堂 AI 主厨 亲笔', W / 2, 980);
  ctx.save(); ctx.translate(W - 170, 950); ctx.rotate(-0.3);
  ctx.strokeStyle = 'rgba(255,45,78,0.8)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,45,78,0.8)'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('三星认证', 0, 6); ctx.restore();
  ctx.fillStyle = '#6b7f9e'; ctx.font = '24px sans-serif';
  ctx.fillText('冰箱剩菜盲盒 · 深夜食堂', W / 2, 1110);
}

function drawMedical(ctx, W, H, recipe, ingredients) {
  ctx.fillStyle = '#f7f7f2'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#c8102e'; ctx.fillRect(0, 0, W, 26); ctx.fillRect(0, H - 26, W, 26);
  ctx.textAlign = 'center'; ctx.fillStyle = '#c8102e'; ctx.font = 'bold 52px sans-serif';
  ctx.fillText('🏥 急诊挂号单', W / 2, 130);
  ctx.font = '24px sans-serif'; ctx.fillStyle = '#555';
  ctx.fillText('三甲医院（深夜食堂分院）· AI 会诊记录', W / 2, 175);
  function row(label, value, y, color) {
    ctx.font = '30px sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = '#333'; ctx.fillText(label, 80, y);
    ctx.fillStyle = color || '#111';
    wrapText(ctx, value || '', 260, y, W - 360, 42, 'left');
  }
  row('科    室：', '黑暗料理科', 270);
  row('就诊人：', '勇敢的剩菜勇士', 340);
  row('主    诉：', '“我让 AI 用冰箱剩菜做了顿饭”', 410);
  row('诊    断：', recipe.name, 500, '#c8102e');
  row('食    材：', ingredients, 580);
  ctx.font = '30px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#333';
  ctx.fillText('医    嘱：', 80, 700);
  ctx.fillStyle = '#c8102e';
  wrapText(ctx, recipe.warning || '', 260, 700, W - 360, 44, 'left');
  ctx.fillStyle = '#333';
  wrapText(ctx, '建议：多喝热水，别让朋友知道，下次别这样了。', 260, 830, W - 360, 40, 'left');
  ctx.save(); ctx.translate(W - 160, 950); ctx.rotate(-0.35);
  ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 78, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 66, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c8102e'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('急诊', 0, 2); ctx.fillText('抢救中', 0, 36); ctx.restore();
  ctx.fillStyle = '#888'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('冰箱剩菜盲盒 · 深夜食堂出品', W / 2, 1110);
}

Page({
  data: { skinLabel: '深夜食堂打卡海报' },
  onLoad() {
    const g = app.globalData;
    this._recipe = g.recipe || null;
    this._ingredients = g.ingredients || '';
    this._skin = g.posterSkin || 'normal';
    const labels = { normal: '深夜食堂打卡海报', cert: '米其林三星认证书', medical: '三甲医院急诊挂号单' };
    this.setData({ skinLabel: labels[this._skin] || '深夜食堂打卡海报' });
    if (!this._recipe) { wx.showToast({ title: '没有菜谱，先去做一道', icon: 'none' }); return; }
    this.draw();
  },
  onReady() { if (this._recipe) this.draw(); },
  draw() {
    wx.createSelectorQuery().select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res && res[0] && res[0].node;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio || 2;
      canvas.width = 750 * dpr;
      canvas.height = 1200 * dpr;
      ctx.scale(dpr, dpr);
      this._canvas = canvas;
      const W = 750, H = 1200;
      ctx.clearRect(0, 0, W, H);
      if (this._skin === 'cert') drawCert(ctx, W, H, this._recipe, this._ingredients);
      else if (this._skin === 'medical') drawMedical(ctx, W, H, this._recipe, this._ingredients);
      else drawNormal(ctx, W, H, this._recipe, this._ingredients);
    });
  },
  savePoster() {
    if (!this._canvas) { wx.showToast({ title: '海报还没画好', icon: 'none' }); return; }
    wx.canvasToTempFilePath({
      canvas: this._canvas,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: () => wx.showToast({ title: '保存失败，请授权相册权限', icon: 'none' })
        });
      },
      fail: () => wx.showToast({ title: '生成图片失败', icon: 'none' })
    });
  },
  onShareAppMessage() {
    const name = (this._recipe && this._recipe.name) || '黑暗料理';
    return { title: '我让 AI 用冰箱剩菜做了顿饭，结果…' + name, path: '/pages/create/create' };
  }
});
