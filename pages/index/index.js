// pages/index/index.js
const RED_BLACK_LIST = [
  {
    id: 1,
    emoji: '🤯',
    dish: '可乐泡面布丁',
    comment: '吃完我的脑子开始唱RAP，医院的WiFi还不错。',
    rating: '已进医院'
  },
  {
    id: 2,
    emoji: '😋',
    dish: '酸奶炸鸡',
    comment: '本来以为是黑暗料理，结果吃出了米其林的错觉。',
    rating: '真香'
  },
  {
    id: 3,
    emoji: '🚑',
    dish: '老干妈西瓜汤',
    comment: '人生建议：西瓜和辣椒酱是前任关系，别复合。',
    rating: '已进医院'
  },
  {
    id: 4,
    emoji: '✨',
    dish: '香蕉咖喱炒饭',
    comment: '甜咸永动机，一碗下去直接通宵改论文。',
    rating: '真香'
  },
  {
    id: 5,
    emoji: '💀',
    dish: '抹茶螺蛳粉',
    comment: '颜色很治愈，味道很致郁。',
    rating: '已进医院'
  },
  {
    id: 6,
    emoji: '🔥',
    dish: '薯片煎蛋',
    comment: '脆脆的像在吃黄金，就是有点费下巴。',
    rating: '真香'
  }
];

Page({
  data: {
    list: RED_BLACK_LIST
  },

  onLoad() {
    this.startShake();
  },

  onUnload() {
    this.stopShake();
  },

  onGoCreate() {
    wx.navigateTo({ url: '/pages/create/create' });
  },

  // 摇一摇进入生成页
  startShake() {
    if (!wx.startAccelerometer) return;
    wx.startAccelerometer({ interval: 'game' });
    wx.onAccelerometerChange((res) => {
      const force = Math.abs(res.x) + Math.abs(res.y) + Math.abs(res.z);
      if (force > 22 && !this._shaking) {
        this._shaking = true;
        wx.vibrateShort({ type: 'heavy' });
        wx.navigateTo({ url: '/pages/create/create' });
        setTimeout(() => {
          this._shaking = false;
        }, 2500);
      }
    });
  },

  stopShake() {
    if (wx.stopAccelerometer) {
      wx.stopAccelerometer({});
    }
  }
});
