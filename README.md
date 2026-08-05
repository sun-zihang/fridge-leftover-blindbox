# 🍲 冰箱剩菜盲盒 · 网页版

> AI 深夜食堂主厨在线整活：输入冰箱里的奇葩剩菜，一键生成脱口秀风格的创意菜谱 + 朋友圈打卡海报。

## ✨ 功能亮点
- 🎲 **单页全流程**：标题 → 食材输入 → AI 生成 → 结果展示 → 评价 → 海报 → 黑暗料理红黑榜。
- 🎙️ **语音输入**：浏览器语音识别（Chrome/Edge），不支持时自动隐藏按钮。
- 📷 **拍照识别食材**：上传/拍摄冰箱照片，多模态模型 qwen3.5-plus 自动识别食材并填入输入框（图片自动压缩，未配置环境自动隐藏）。
- 🍲 **生成动画 + 音效**：冒泡的锅 Loading + 主厨形象 + 趣味文案轮播，WebAudio 合成音效（可一键静音）。
- 📖 **结果展示**：霓虹菜名、卡片式做法、斜体摆盘建议、红色主厨警告；支持「真香 / 已进医院」评价（评价后卡片变金/病号绿）。
- 🌡️ **黑暗指数 0-100**：AI 评分 + 启发式兜底，四档分级（家常安全/家常凑合/黑暗料理/生化武器），带进度条与主厨表情反馈。
- ⚠️ **危险食材红色高亮**：命中发芽土豆/河豚/生豆角等规则时弹出红色警告条。
- 🛒 **主厨采购清单**：AI 建议的额外调料/食材，可勾选打勾。
- 🍽️ **每日挑战**：按日期确定性轮换的 3 种奇葩食材，一键填入、打卡 +5 分。
- 👍 **红黑榜投票**：给榜单菜谱投「真香票 / 送医票」，票数置顶。
- 📸 **海报生成**：Canvas 绘制赛博朋克风打卡海报（含二维码，5:8 比例自适应手机/桌面），可下载 / 系统分享。
- 🔥 **黑暗料理红黑榜**：接入云数据库 recipes 展示真实评价；空数据或未配置环境时自动回退演示数据。
- 📖 **内置 206 道家常菜谱库**（蒸馏自「厨房小课堂」公开食谱）：正常家常模式按食材匹配出菜，AI 失败时兜底。
- 🧾 **详细菜单制作界面**：食材清单 / 备菜准备 / 分步做法 / 预计用时 / 主厨小贴士，一键查看完整菜单。
- 🛡️ **免责声明**：底部食品免责提示，娱乐向内容不构成饮食建议。
## 🧱 技术架构
- 前端：原生 HTML + CSS + JS（零构建、零依赖），CloudBase JS SDK 走 CDN。
- 后端：腾讯云开发 CloudBase（Serverless 云函数 + 静态网站托管 + 云数据库）。
- AI：云函数 `generateRecipe` 内通过 `@cloudbase/node-sdk` 的 `app.ai()` 调用托管大模型（默认 `hy3` 腾讯混元，内置免费国产 AI，体验版可直接启用；备选 `qwen3.5-flash` 通义千问）。
- 菜谱库：`normalRecipes.js`（UMD）三端共用——云函数 normal 模式匹配/兜底、网页与小程序的演示模式均从此库出菜。

## 📁 项目结构
```
├── web/                        # 网页版前端（部署到静态托管）
│   ├── index.html
│   ├── style.css
│   ├── normalRecipes.js           # 内置家常菜谱库（206 道）
│   └── app.js
├── cloudfunctions/
│   └── generateRecipe/         # AI 生成菜谱云函数（generate / rate / listRank / dailyChallenge / vote / recognizeImage）
│       ├── index.js
│       ├── recipe.js           # 纯逻辑（JSON 提取/校验/兜底），可本地单测
│       ├── config.json
│       ├── package.json
│       └── test/recipe.test.js # 单元测试（node --test）
└── PRD.md                      # 产品需求文档
```

## 🚀 快速开始

### 1. 本地预览（演示模式）
未配置环境 ID 时自动进入演示模式（本地假数据，无需云环境）：

```bash
cd web
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

### 2. 修改配置
编辑 `web/app.js` 顶部：

```js
var CLOUD_ENV_ID = 'a455-d3g2s3dt865d86640';   // 当前已配置为线上环境 ID（换环境时修改）
var CLOUD_REGION = 'ap-shanghai';   // 环境地域（与云函数一致）
```

### 3. 部署云函数 generateRecipe
- **方式一（控制台）**：云开发控制台 → 云函数 → 新建 `generateRecipe`（Node.js 16+，**超时时间设为 60–120 秒**）→ 上传 `cloudfunctions/generateRecipe` 目录（含 `index.js`、`recipe.js`、`package.json`、`config.json`）→ 云端安装依赖。
- **方式二（CLI）**：`npm i -g @cloudbase/cli` → `tcb login` → 在仓库根目录执行 `tcb functions:deploy generateRecipe -e <envId>`（具体参数以 [CloudBase CLI 文档](https://docs.cloudbase.net/cli-v1/commands) 为准）。

### 4. 启用 AI 模型（TokenHub）
1. 云开发控制台 → AI → Token 资源包，确认已开通（未开通按提示领取/购买）。
2. 云开发控制台 → AI 模型 → 确认 `hy3`（腾讯混元）已启用（体验版默认启用、无需额外付费；如未启用可勾选开启）。
   - 可在 `cloudfunctions/generateRecipe/index.js` 顶部的 `MODEL` 常量切换其他模型（需先在控制台启用）。

### 5. 网页访问前置
1. 云开发控制台 → 身份认证 → 登录方式 → 开启**匿名登录**（网页调用云函数需要）。
2. 云开发控制台 → 环境 → 安全配置 → **Web 安全域名**，加入你的访问域名（如 `https://<envId>.tcloudbaseapp.com`；本地调试可先不校验）。

### 6. 数据库
首次调用生成后会自动创建 `recipes` 集合（云函数以管理员身份写入，不受安全规则限制）。红黑榜读取同一集合中「真香 / 已进医院」的评价记录。

## 🌐 部署到云开发静态托管

**方式 A：控制台**（最简单）
1. 云开发控制台 → 静态网站托管 → 开通。
2. 把 `web/` 下的 `index.html`、`style.css`、`app.js` 拖拽上传（或上传整个目录）。
3. 访问默认域名：`https://<envId>.tcloudbaseapp.com`（可在「域名管理」绑定自定义域名，需备案+解析+证书）。

**方式 B：tcb CLI**
```bash
npm i -g @cloudbase/cli
tcb login
tcb hosting deploy ./web --env-id <envId> --yes
```
访问：`https://<envId>.tcloudbaseapp.com/index.html`

## 🧪 联调自测链路
1. 本地打开 `web/index.html`（演示模式）→ 输入食材 → 召唤主厨 → 生成演示菜谱。
2. 配置环境 ID + 部署云函数 + 启用模型后：真实生成 → 评价「真香 / 已进医院」。
3. 刷新页面，确认底部「黑暗料理红黑榜」出现刚评价的菜且标签正确（空数据时显示演示榜）。
4. 生成海报 → 下载 / 系统分享。

## 🧪 本地自动化检查
```bash
node --check web/app.js
node --check cloudfunctions/generateRecipe/index.js
node --test "cloudfunctions/generateRecipe/test/*.test.js"
```

## 🧪 微信小程序版（可选）

> 后端与网页版**共用同一套 CloudBase**（同一个云函数 `generateRecipe`、同一个 `recipes/players/challenges` 集合），小程序版只是换了一层前端。

### 项目结构
```
miniprogram/
├── app.js / app.json / app.wxss   # 小程序壳（wx.cloud.init）
├── utils/
│   ├── cloud.js                   # wx.cloud.callFunction 封装
│   └── game.js                    # 与云函数对齐的常量（风格/标签/徽章/文案）
└── pages/
    ├── index/                     # 挑战卡 + 输入 + 语音 + 风格 + 剩菜博物馆
    ├── create/                    # 生成结果 + 翻牌步骤 + 评价 + 甩锅/接受挑战
    └── poster/                    # Canvas 海报（普通/米其林证书/急诊挂号单）+ 保存相册
project.config.json                # miniprogramRoot / cloudfunctionRoot
```

### 运行方式（HTTP 桥接模式，0 额外费用）
1. 微信开发者工具 → 导入项目 → 选择**仓库根目录**（`project.config.json` 已配置好，`appid` 已填入 `wx2f367d0b24a74fda`）。
2. **无需在微信环境部署云函数、也无需升级微信云套餐**：小程序通过 `wx.request` 调用**网页版环境 a455 的 HTTP 网关**（路由 `/api/generateRecipe` → 云函数 `generateRecipe`，AI 已在 a455 启用），见 `miniprogram/utils/cloud.js`。
3. 开发期：`project.config.json` 已设 `urlCheck:false`，开发者工具不会拦截外部域名。**生产发布前**需在小程序后台「开发设置 → 服务器域名」把 `https://a455-d3g2s3dt865d86640-1462708919.ap-shanghai.app.tcloudbase.com` 加入 **request 合法域名**。
4. 语音输入：**默认已禁用**（微信同声传译插件在个人主体小程序会报 80082 permission deny）。若你已成功添加插件，把 `app.json` 里的 `plugins` 块（WechatSI / wx069ba97219f66d99）恢复即可，语音按钮会自动出现。
5. 身份：小程序用**本地 playerId**（`wx.storage`），清缓存会换号；后续可升级为 openid。

### 与网页版的差异（小程序优势）
- **身份更稳**：微信登录自带 openid，连续打卡不再受「清缓存换号」影响（网页版匿名 UID 的已知限制在此消除）。
- **真分享卡片**：`onShareAppMessage` 可自定义标题/路径，甩锅挑战直接生成带 `?challenge=` 的分享卡片。
- **待补**：小程序码（云函数 `wxacode.getUnlimited` 生成分享海报码）、订阅消息（开盲盒结果通知）。


## 🐛 常见问题
- **云函数调用失败 / 报错 model not enabled**：按上文第 4 步在控制台启用 `hy3` 模型并确认套餐有效（体验版含 3000 资源点/月，可直接抵扣）。
- **网页无法调用云函数（权限/CORS）**：确认匿名登录已开启、Web 安全域名已添加。
- **匿名用户调用云函数报 `PERMISSION_DENIED`**：云开发控制台 → 云函数 → 函数列表 → 该函数行内「权限控制」→ 将 `invoke` 规则设为 `true`（即「所有用户可调用」）→ 确定，保存后约 1–3 分钟生效。
- **海报空白 / 下载异常**：请使用较新的 Chrome/Edge；演示模式与云模式走同一 Canvas 绘制逻辑。
- **语音按钮不显示**：浏览器不支持 SpeechRecognition（仅 Chrome/Edge 支持），不影响其他功能。

---

## 📄 协议
仅供学习交流使用。
