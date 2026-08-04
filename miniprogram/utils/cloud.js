// 原生微信云开发：小程序直接调用本环境（fridge-blindbox-d9foky90cf58fa93）的云函数 generateRecipe
// 前提：已在开发者工具把 cloudfunctions/generateRecipe 上传部署到本环境；身份由微信 openid 自动提供（更稳）。
function callFn(name, data) {
  return wx.cloud.callFunction({ name: name, data: data || {} })
    .then(function (res) {
      const r = res && res.result ? res.result : {};
      return (r && r.success !== undefined) ? r : { success: false, error: '响应异常' };
    })
    .catch(function (err) {
      console.warn('callFunction failed:', name, err);
      return { success: false, error: (err && err.errMsg) || '网络异常' };
    });
}

module.exports = { callFn };
