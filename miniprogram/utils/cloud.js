// HTTP 桥接模式：小程序通过 wx.request 调用「网页版环境 a455」的 HTTP 网关
// 网关路由 /api/generateRecipe -> 云函数 generateRecipe（AI 已在 a455 启用）
// 优点：0 额外费用；网页版与小程序共用同一套 players/recipes/challenges 数据。
// 注意：生产发布前需在小程序后台「开发设置 → 服务器域名」把本域名加入 request 合法域名；
//       开发期 project.config.json 已设 urlCheck:false，开发者工具不会拦截。
const BRIDGE_URL = 'https://a455-d3g2s3dt865d86640-1462708919.ap-shanghai.app.tcloudbase.com/api/generateRecipe';
const BRIDGE_TOKEN = 'fridge-blindbox-secret-2026';

// 本地玩家 ID：首次生成后存本地（清缓存会换号，与网页版匿名 uid 同级）
function getPlayerId() {
  let id = '';
  try { id = wx.getStorageSync('fridgePlayerId') || ''; } catch (e) { /* ignore */ }
  if (!id) {
    id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { wx.setStorageSync('fridgePlayerId', id); } catch (e) { /* ignore */ }
  }
  return id;
}

// 统一调用：data 里带 action（generate/rate/listRank/getPlayer/unlockStyle/createChallenge/acceptChallenge）
function callFn(name, data) {
  return new Promise(function (resolve) {
    wx.request({
      url: BRIDGE_URL,
      method: 'POST',
      data: Object.assign({ token: BRIDGE_TOKEN, uid: getPlayerId() }, data || {}),
      timeout: 60000,
      success: function (res) {
        const r = res && res.data ? res.data : {};
        resolve(r && r.success !== undefined ? r : { success: false, error: '响应异常' });
      },
      fail: function (err) {
        console.warn('bridge request failed:', name, err);
        resolve({ success: false, error: (err && err.errMsg) || '网络异常' });
      }
    });
  });
}

module.exports = { callFn, getPlayerId, BRIDGE_URL };
