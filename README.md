# 🍲 冰箱剩菜盲盒 · 微信小程序

> AI 深夜食堂主厨在线整活：输入冰箱里的奇葩剩菜，一键生成脱口秀风格的创意菜谱 + 朋友圈打卡海报。

## ✨ 功能亮点
- 🎲 **首页**：霓虹标题 + "开启魔法"按钮（支持摇一摇进入），底部「黑暗料理红黑榜」横向滚动。
- 🥘 **食材输入页**：多行文本输入 + 语音输入（微信同声传译插件，失败自动回退原生录音）；生成时"冒泡的锅"Loading 动画。
- 📖 **结果展示**：霓虹菜名、卡片式做法、斜体摆盘建议、红色主厨警告；支持"真香 / 已进医院"评价。
- 📸 **海报页**：Canvas 2D 绘制赛博朋克风打卡海报，保存到相册 + 分享给好友。

## 🧱 技术架构
- 前端：微信小程序原生（WXML + WXSS + JS）
- 后端：腾讯云开发 CloudBase（Serverless）
- AI：云函数 `generateRecipe` 内通过 `@cloudbase/node-sdk` 的 `app.ai()` 调用托管大模型（默认 `deepseek-v4-flash`）
- 存储：CloudBase 云数据库集合 `recipes`

## 📁 项目结构
```
├── app.js / app.json / app.wxss / sitemap.json   # 小程序全局配置
├── project.config.json                           # 开发者工具项目配置
├── pages/
│   ├── index/    # 首页（红黑榜 + 入口）
│   ├── create/   # 食材输入与 AI 生成
│   └── poster/   # 海报生成与保存/分享
├── cloudfunctions/
│   └── generateRecipe/   # AI 生成菜谱云函数（含 JSON 校验 + 入库 + 评价）
└── PRD.md
```

## 🚀 快速开始

### 1. 导入项目
1. 打开微信开发者工具 → 导入项目 → 选择本目录（`D:\剩菜盲盒`）。
2. `project.config.json` 中 `appid` 默认是 `touristappid`（游客模式），请替换成你自己的小程序 AppID。
   - 若使用游客模式，云开发相关能力（wx.cloud）无法使用，仅可预览 UI。

### 2. 开通云开发
1. 开发者工具 → 工具栏「云开发」→ 开通环境，记下**环境 ID**。
2. 把环境 ID 填到 `app.js` 顶部的 `CLOUD_ENV_ID`（例如 `cloud1-xxxxxx`）。

### 3. 部署云函数
1. 在开发者工具中右键 `cloudfunctions/generateRecipe` → **创建并部署：云端安装依赖**。
2. 部署后在「云开发控制台 → 云函数 → generateRecipe → 配置」中把**超时时间设为 60–120 秒**（AI 生成较慢）。

### 4. 启用 AI 模型（TokenHub）
云函数通过 CloudBase AI 能力调用大模型，需要在控制台完成预检：
1. **Token 资源包**：云开发控制台 → AI → Token 资源包，确认已开通（未开通时按提示购买/领取）。
2. **启用模型**：云开发控制台 → AI 模型 → 找到 `deepseek-v4-flash` 并启用（默认没有模型启用）。
   - 可在 `cloudfunctions/generateRecipe/index.js` 顶部的 `MODEL` 常量切换其他模型（如 `hunyuan-2.0-instruct-20251111`、`deepseek-v3.2`、`glm-5`、`kimi-k2.6`），需先在控制台启用。

### 5. 数据库
- 首次调用生成后会自动创建 `recipes` 集合（云函数以管理员身份写入，不受安全规则限制）。
- 首页「黑暗料理红黑榜」目前为前端演示数据，后续可接入 `recipes` 集合查询。

### 6. 语音输入（可选）
- 语音转文字依赖「微信同声传译」插件：小程序管理后台 → 设置 → 第三方设置 → 添加插件 `wx069ba97219f66d99`（微信同声传译，版本 0.3.5）。
- 未添加插件时，语音按钮回退为原生录音（wx.getRecorderManager），仅录制不转文字。

## 🧪 联调自测链路
1. 首页点「开启魔法」→ 输入食材 → 点「召唤主厨」。
2. 云函数调用 AI → 校验 JSON → 写入 `recipes` → 返回菜谱。
3. 结果页展示 → 评价 → 生成海报 → 保存相册 / 分享。

## 🐛 常见问题
- **云函数调用失败 / 报错 model not enabled**：按上文第 4 步在控制台启用模型并确认 Token 资源包已开通。
- **wx.cloud is not a function**：基础库版本过低，`project.config.json` 中 `libVersion` 建议 ≥ 2.9.0（Canvas 2D 需要）。
- **海报空白**：请使用真机预览；开发者工具模拟器对 Canvas 2D 的支持有限。
- **git 同步**：本仓库通过 GitHub 管理，推送前请确保 `gh auth login` 或 SSH key 已配置。


## 🌐 网页版（H5）· 部署到云开发静态托管

项目内置了与小程序同功能的网页版（`web/` 目录：`index.html` + `style.css` + `app.js`），
可部署到云开发静态网站托管，用 HTTPS 域名直接访问、转发到朋友圈/微信群。

### 功能
- 输入食材 → 调用同一个 `generateRecipe` 云函数生成菜谱（复用小程序后端与数据库）
- 语音输入（浏览器 SpeechRecognition，Chrome/Edge 支持）
- 结果展示（霓虹菜名 / 卡片做法 / 摆盘建议 / 主厨警告）+ 真香/已进医院评价
- Canvas 生成赛博朋克海报 → 下载 / 系统分享

### 1. 本地预览（演示模式）
未配置环境 ID 时自动进入**演示模式**（本地假数据，无需云环境）：
```bash
cd web
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

### 2. 修改配置
编辑 `web/app.js` 顶部：
```js
var CLOUD_ENV_ID = 'YOUR_ENV_ID';   // 改为你的云开发环境 ID
var CLOUD_REGION = 'ap-shanghai';   // 环境地域（与云函数一致）
```

### 3. 部署前准备（一次性）
1. 确保 `generateRecipe` 云函数已部署（见上文「部署云函数」）。
2. 云开发控制台 → 身份认证 → 登录方式 → 开启**匿名登录**（网页调用云函数需要）。
3. 云开发控制台 → 环境 → 安全配置 → **Web 安全域名**，加入你的访问域名
   （如 `https://<envId>.tcloudbaseapp.com`；本地调试可先不校验）。

### 4. 部署（两种方式任选）

**方式 A：控制台**（最简单）
1. 云开发控制台 → 静态网站托管 → 开通。
2. 把 `web/` 下 3 个文件拖拽上传（或整个目录上传）。
3. 访问默认域名：`https://<envId>.tcloudbaseapp.com`（可在「静态网站托管 → 域名管理」绑定自定义域名，需备案+解析+证书）。

**方式 B：tcb CLI**
```bash
npm i -g @cloudbase/cli
tcb login
tcb hosting detail --env-id <envId>          # 自动开通托管
tcb hosting deploy ./web --env-id <envId> --yes
tcb hosting list --env-id <envId>            # 验证
```
访问：`https://<envId>.tcloudbaseapp.com/index.html`

### 5. 验证
- 演示模式能生成菜谱/海报 → 说明页面正常。
- 配置环境 ID 后能生成真实 AI 菜谱 → 说明云函数 + 匿名登录 + 安全域名链路已通。

---

## 📄 协议
仅供学习交流使用。
