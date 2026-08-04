// pages/create/create.js
Page({
  data: {
    ingredients: '',
    charCount: 0,
    generating: false,
    showResult: false,
    recipe: null,
    recordId: '',
    rated: false,
    recording: false,
    micText: '语音输入'
  },

  onInput(e) {
    this.setData({
      ingredients: e.detail.value,
      charCount: e.detail.value.length
    });
  },

  // ========== 语音输入 ==========
  getVoicePlugin() {
    let plugin = null;
    try {
      plugin = requirePlugin('WechatSI');
    } catch (err) {
      plugin = null;
    }
    return plugin;
  },

  onVoiceTap() {
    if (this.data.recording) {
      this.stopVoice();
      return;
    }

    const plugin = this.getVoicePlugin();
    if (plugin && plugin.getRecordRecognitionManager) {
      const manager = plugin.getRecordRecognitionManager();
      if (!this._recogBound) {
        this._recogBound = true;
        manager.onRecognize = function () {};
        manager.onStop = (res) => {
          const text = (res && res.result) ? res.result : '';
          this.appendVoiceText(text);
          this.setData({ recording: false, micText: '语音输入' });
        };
        manager.onError = () => {
          this.setData({ recording: false, micText: '语音输入' });
          wx.showToast({ title: '识别失败，请重试', icon: 'none' });
        };
      }
      manager.start({ duration: 15000, lang: 'zh_CN' });
      this.setData({ recording: true, micText: '松手结束' });
    } else {
      // 回退：原生录音（wx.getRecorderManager），仅录制不转文字
      if (!this._recorder) {
        this._recorder = wx.getRecorderManager();
        this._recorder.onStop(() => {
          this.setData({ recording: false, micText: '语音输入' });
          wx.showToast({ title: '已录音，需配置语音转文字插件', icon: 'none' });
        });
        this._recorder.onError(() => {
          this.setData({ recording: false, micText: '语音输入' });
        });
      }
      this._recorder.start({ duration: 15000, format: 'mp3' });
      this.setData({ recording: true, micText: '松手结束' });
    }
  },

  stopVoice() {
    const plugin = this.getVoicePlugin();
    if (plugin && plugin.getRecordRecognitionManager) {
      plugin.getRecordRecognitionManager().stop();
    } else if (this._recorder) {
      this._recorder.stop();
    } else {
      this.setData({ recording: false, micText: '语音输入' });
    }
  },

  appendVoiceText(text) {
    const t = (text || '').trim();
    if (!t) return;
    const prev = this.data.ingredients.trim();
    const next = prev ? prev + '、' + t : t;
    this.setData({ ingredients: next, charCount: next.length });
  },

  // ========== 生成菜谱 ==========
  onGenerate() {
    const text = this.data.ingredients.trim();
    if (!text) {
      wx.showToast({ title: '先告诉我冰箱里有什么', icon: 'none' });
      return;
    }
    if (this.data.generating) return;

    this.setData({ generating: true, showResult: false, recipe: null, rated: false });

    wx.cloud.callFunction({
      name: 'generateRecipe',
      data: { action: 'generate', ingredients: text }
    })
      .then((res) => {
        const r = res.result || {};
        if (!r.success) {
          throw new Error(r.error || '生成失败');
        }
        this.setData({
          generating: false,
          showResult: true,
          recipe: r.data.recipe,
          recordId: r.data.recordId || ''
        });
      })
      .catch((err) => {
        this.setData({ generating: false });
        wx.showToast({
          title: (err && err.message) ? err.message : '生成失败，请稍后重试',
          icon: 'none',
          duration: 2500
        });
      });
  },

  // ========== 评价 ==========
  onRate(e) {
    const rating = e.currentTarget.dataset.rating;
    if (!this.data.recordId || this.data.rated) return;
    wx.cloud.callFunction({
      name: 'generateRecipe',
      data: { action: 'rate', recordId: this.data.recordId, rating: rating }
    })
      .then((res) => {
        const r = res.result || {};
        if (!r.success) throw new Error(r.error || '评价失败');
        this.setData({ rated: true });
        wx.showToast({ title: '评价成功', icon: 'success' });
      })
      .catch(() => {
        wx.showToast({ title: '评价失败', icon: 'none' });
      });
  },

  // ========== 跳转海报页 ==========
  goPoster() {
    const recipe = this.data.recipe;
    if (!recipe) return;
    wx.navigateTo({
      url: '/pages/poster/poster',
      success: (res) => {
        res.eventChannel.emit('recipe', {
          recipe: recipe,
          ingredients: this.data.ingredients
        });
      }
    });
  },

  onShareAppMessage() {
    const recipe = this.data.recipe;
    return {
      title: recipe
        ? '我把「' + recipe.name + '」做出来了，你敢挑战吗？'
        : '冰箱剩菜盲盒：开冰箱盲盒，AI 主厨来整活',
      path: '/pages/index/index'
    };
  }
});
