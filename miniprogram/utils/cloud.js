// 云函数调用封装：失败时返回 { success:false }，页面自行兜底演示数据
function callFn(name, data) {
  return wx.cloud.callFunction({ name, data })
    .then(function (res) {
      const r = res && res.result ? res.result : {};
      return r;
    })
    .catch(function (err) {
      console.warn('callFunction failed:', name, err);
      return { success: false, error: (err && err.errMsg) || '网络异常' };
    });
}
module.exports = { callFn };
