const { callFn } = require('../../utils/cloud');
const app = getApp();

Page({
  data: {
    recipe: null,
    ingredients: '',
    recordId: '',
    pointsLine: '',
    stepsOpen: false,
    warningOpen: false,
    stepEmojis: ['🔪', '🔥', '🍳', '🧂', '✨', '🍜'],
    posterBtnText: '生成朋友圈打卡海报 📸',
    posterSkin: 'normal',
    challengeId: '',
    challengeBanner: false,
    rated: false
  },

  onLoad(options) {
    if (options && options.challenge) {
      // 从分享卡片进入：接受挑战
      this.setData({ challengeBanner: true });
      this._challengeId = options.challenge;
      return;
    }
    const g = app.globalData;
    if (g.recipe) {
      const meta = [];
      if (options && options.points) meta.push('+' + options.points + ' 生存积分');
      if (options && options.streak) meta.push('🔥 连续 ' + options.streak + ' 天');
      this.renderRecipe(g.recipe, g.ingredients || '', g.recordId || '', meta.join(' · '));
    }
  },

  renderRecipe(recipe, ingredients, recordId, pointsLine) {
    const steps = (recipe.steps || []).map((s) => ({ text: s, flipped: false }));
    this.setData({ recipe: recipe, ingredients: ingredients, recordId: recordId, pointsLine: pointsLine, steps: steps });
  },

  toggleSteps() { this.setData({ stepsOpen: !this.data.stepsOpen }); },
  toggleWarning() { this.setData({ warningOpen: !this.data.warningOpen }); },
  flipStep(e) {
    const idx = e.currentTarget.dataset.index;
    const steps = this.data.recipe.steps;
    steps[idx].flipped = !steps[idx].flipped;
    const patch = {};
    patch['recipe.steps[' + idx + '].flipped'] = steps[idx].flipped;
    this.setData(patch);
  },

  rate(e) {
    if (this.data.rated) return;
    const rating = e.currentTarget.dataset.rating;
    if (!this.data.recordId) { wx.showToast({ title: '先做饭再评价', icon: 'none' }); return; }
    callFn('generateRecipe', { action: 'rate', recordId: this.data.recordId, rating: rating }).then((r) => {
      if (!r.success) { wx.showToast({ title: r.error || '评价失败', icon: 'none' }); return; }
      const skin = rating === '真香' ? 'cert' : 'medical';
      const text = rating === '真香' ? '生成米其林认证书 🏆' : '生成急诊挂号单 🏥';
      const points = r.data && r.data.points_gained ? r.data.points_gained : 0;
      this.setData({ rated: true, posterSkin: skin, posterBtnText: text, pointsLine: '+' + points + ' 生存积分' });
      wx.showToast({ title: '评价成功 +' + points + ' 分', icon: 'success' });
    });
  },

  goPoster() {
    if (!this.data.recipe) return;
    const g = app.globalData;
    g.recipe = this.data.recipe;
    g.ingredients = this.data.ingredients;
    g.posterSkin = this.data.posterSkin;
    wx.navigateTo({ url: '/pages/poster/poster' });
  },

  // 甩锅：先创建挑战，再点"分享给好友"发出去
  makeChallenge() {
    if (!this.data.recordId) { wx.showToast({ title: '先生成一道菜再甩锅', icon: 'none' }); return; }
    wx.showLoading({ title: '正在打包投喂…', mask: true });
    callFn('generateRecipe', { action: 'createChallenge', recordId: this.data.recordId }).then((r) => {
      wx.hideLoading();
      if (!r.success) { wx.showToast({ title: r.error || '甩锅失败', icon: 'none' }); return; }
      this.setData({ challengeId: r.data.challengeId });
      wx.showToast({ title: '挑战已生成，点"分享给好友"甩出去', icon: 'none' });
    });
  },

  acceptChallenge() {
    if (!this._challengeId) return;
    this.setData({ challengeBanner: false });
    wx.showLoading({ title: '接受挑战中…', mask: true });
    callFn('generateRecipe', { action: 'acceptChallenge', challengeId: this._challengeId }).then((r) => {
      wx.hideLoading();
      if (!r.success) { wx.showToast({ title: r.error || '接受失败', icon: 'none' }); return; }
      const ch = r.data.challenge || {};
      this.renderRecipe(ch.recipe, ch.ingredients || '', '', '+20 投喂奖励到账 · 快用同款食材开做吧！');
    });
  },

  onShareAppMessage() {
    const title = this.data.recipe ? '我甩给你一道黑暗料理：' + this.data.recipe.name : '冰箱剩菜盲盒 · 深夜食堂';
    const path = this.data.challengeId ? '/pages/create/create?challenge=' + this.data.challengeId : '/pages/index/index';
    return { title: title, path: path };
  }
});
