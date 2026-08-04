const { callFn } = require('../../utils/cloud');
const { BADGES, buildLoadingLines, flyingEmojis } = require('../../utils/game');
const app = getApp();

Page({
  data: {
    ingredients: '',
    charCount: '0/200',
    player: null,
    styles: [],
    styleId: 'classic',
    rankData: [],
    rankTabs: ['全部'],
    rankTag: '全部',
    badges: BADGES,
    micReady: false,
    micOn: false,
    micText: '',
    generating: false,
    potText: '',
    flyEmojis: [],
    showGuide: false
  },

  onLoad() {
    this.initMic();
    this.loadPlayer();
    this.loadRank();
  },

  // 烹饪文案轮播
  startPotText(ingredientsText) {
    const queue = buildLoadingLines(ingredientsText || '');
    this.setData({ flyEmojis: flyingEmojis(ingredientsText || '') });
    let idx = 0;
    this.setData({ potText: queue[0] });
    if (this._potTimer) clearInterval(this._potTimer);
    this._potTimer = setInterval(() => {
      idx = (idx + 1) % queue.length;
      this.setData({ potText: queue[idx] });
    }, 1800);
  },
  stopPotText() {
    if (this._potTimer) { clearInterval(this._potTimer); this._potTimer = null; }
  },
  onUnload() { this.stopPotText(); },

  openGuide() { this.setData({ showGuide: true }); },
  closeGuide() { this.setData({ showGuide: false }); },
  noop() {},

  onInput(e) {
    const v = e.detail.value;
    this.setData({ ingredients: v, charCount: v.length + '/200' });
  },

  // ----- 语音（微信同声传译插件，未配置/失败时自动隐藏） -----
  initMic() {
    let plugin = null;
    try { plugin = requirePlugin('WechatSI'); } catch (e) { return; }
    if (!plugin || !plugin.getRecordRecognitionManager) return;
    const manager = plugin.getRecordRecognitionManager();
    manager.onRecognize = (res) => { this.setData({ micText: res.result || '正在听…' }); };
    manager.onStop = (res) => {
      this.setData({ micOn: false, micText: '' });
      if (res && res.result) {
        const prev = this.data.ingredients.trim();
        const next = prev ? prev + '、' + res.result : res.result;
        this.setData({ ingredients: next, charCount: next.length + '/200' });
      }
    };
    manager.onError = () => { this.setData({ micOn: false, micText: '' }); wx.showToast({ title: '语音识别失败', icon: 'none' }); };
    this._micManager = manager;
    this.setData({ micReady: true });
  },
  toggleMic() {
    if (!this._micManager) return;
    if (this.data.micOn) { this._micManager.stop(); this.setData({ micOn: false }); return; }
    this.setData({ micOn: true, micText: '正在聆听，说出你的剩菜…' });
    this._micManager.start({ lang: 'zh_CN' });
  },

  // ----- 玩家 / 挑战 -----
  loadPlayer() {
    callFn('generateRecipe', { action: 'getPlayer' }).then((r) => {
      if (r.success) this.setData({ player: r.data.player, styles: r.data.styles });
    });
  },
  selectStyle(e) {
    const id = e.currentTarget.dataset.id;
    const st = (this.data.styles || []).find((x) => x.id === id);
    if (!st) return;
    if (!st.unlocked) {
      const need = st.cost - (this.data.player ? this.data.player.points : 0);
      if (need > 0) {
        wx.showToast({ title: '积分不足，还差 ' + need + ' 分', icon: 'none' });
        return;
      }
      // 积分足够 -> 直接解锁并选中
      this.unlockStyle(id);
      return;
    }
    this.setData({ styleId: id });
  },
  unlockStyle(styleId) {
    wx.showLoading({ title: '解锁中…', mask: true });
    callFn('generateRecipe', { action: 'unlockStyle', styleId: styleId }).then((r) => {
      wx.hideLoading();
      if (!r.success) { wx.showToast({ title: r.error || '解锁失败', icon: 'none' }); return; }
      let nm = '';
      ((r.data && r.data.styles) || []).forEach((x) => { if (x.id === styleId) nm = x.name; });
      this.setData({ styleId: styleId, player: r.data.player, styles: r.data.styles });
      wx.showToast({ title: '已解锁：' + (nm || '新风格'), icon: 'success' });
    });
  },

  // ----- 生成 -----
  onGenerate() {
    const ingredients = this.data.ingredients.trim();
    if (!ingredients) { wx.showToast({ title: '先告诉我冰箱里有什么', icon: 'none' }); return; }
    this.setData({ generating: true });
    this.startPotText(ingredients);
    callFn('generateRecipe', { action: 'generate', ingredients, style: this.data.styleId }).then((r) => {
      this.stopPotText();
      this.setData({ generating: false });
      if (!r.success) { wx.showToast({ title: r.error || '生成失败', icon: 'none' }); return; }
      const g = app.globalData;
      g.recipe = r.data.recipe;
      g.recordId = r.data.recordId;
      g.player = r.data.player;
      this.setData({ player: r.data.player, styles: r.data.styles });
      wx.navigateTo({
        url: '/pages/create/create?points=' + r.data.points_gained + '&streak=' + r.data.streak + '&tag=' + encodeURIComponent(r.data.tag || '')
      });
    });
  },

  // ----- 剩菜博物馆 -----
  loadRank(tag) {
    callFn('generateRecipe', { action: 'listRank', tag: tag || '' }).then((r) => {
      if (!r.success || !Array.isArray(r.data)) return;
      const tabs = ['全部'];
      r.data.forEach((it) => { if (it.tag && tabs.indexOf(it.tag) < 0) tabs.push(it.tag); });
      this.setData({ rankData: r.data, rankTabs: tabs });
    });
  },
  onRankTab(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({ rankTag: tag });
    if (tag === '全部') this.loadRank('');
    else this.loadRank(tag);
  },
  onRankTap(e) {
    const it = this.data.rankData[e.currentTarget.dataset.index];
    if (!it) return;
    wx.showModal({
      title: it.name,
      content: (it.rating === '已进医院' ? '🚑 ' : '😋 ') + it.rating + '\n' + it.tag + '\n\n' + it.warning,
      showCancel: false,
      confirmText: '看完了'
    });
  }
});
