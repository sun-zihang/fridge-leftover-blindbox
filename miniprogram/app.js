App({
  globalData: {
    envId: 'fridge-blindbox-d9foky90cf58fa93',
    recipe: null,          // 从 index 传给 create / poster
    recordId: '',
    posterSkin: 'normal',  // normal | cert | medical
    challengeId: '',
    player: null
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 以上基础库以使用云能力');
      return;
    }
    wx.cloud.init({ env: this.globalData.envId, traceUser: true });
  }
});
