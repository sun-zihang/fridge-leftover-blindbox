// app.js
// TODO: 替换为你的云开发环境 ID（微信开发者工具 -> 云开发 控制台可查，形如 cloud1-xxxxxx）
const CLOUD_ENV_ID = 'YOUR_ENV_ID';

App({
  globalData: {
    envId: CLOUD_ENV_ID
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库过低，请使用 2.2.3 及以上基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      // 未填写环境 ID 时使用默认环境
      env: CLOUD_ENV_ID && CLOUD_ENV_ID !== 'YOUR_ENV_ID' ? CLOUD_ENV_ID : undefined,
      traceUser: true
    });
  }
});
