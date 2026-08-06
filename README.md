# 🍲 冰箱剩菜盲盒 · 网页版

> AI 深夜食堂主厨在线整活：输入冰箱里的奇葩剩菜，一键生成脱口秀风格的创意菜谱 + 朋友圈打卡海报。

## ✨ 功能亮点
- 🎲 **单页全流程**：标题 → 食材输入 → AI 生成 → 结果展示 → 评价 → 海报 → 黑暗料理红黑榜。
- 🎙️ **语音输入**：浏览器语音识别（Chrome/Edge），实时反馈 + 关键词表情（说「洋葱」掉 😭）。
- 📷 **拍照识别食材**：上传/拍摄冰箱照片，多模态模型 qwen3.5-plus 自动识别食材并填入输入框（图片自动压缩）。
- 🎭 **主厨人设**：幽默 / 毒舌 / 戏精 / 温柔 四种性格，切换后 AI 语气画风跟着变。
- 🧪 **食材合成实验室**：选两种基础食材一键合成，探索「合成表」（米饭+牛奶→中式米布丁这种）。
- 🍲 **生成动画 + 音效**：冒泡的锅 Loading + 主厨形象 + 趣味文案轮播，WebAudio 合成音效（可一键静音）。
- 🌡️ **黑暗指数 0-100**：AI 评分 + 启发式兜底。0-30 家常凑合 / 31-70 猎奇整活 / 71-99 生化武器 / **100 传说级料理**（极低概率彩蛋，主厨下跪膜拜）。
- ⚠️ **危险食材红色高亮**：命中发芽土豆/河豚/生豆角等规则时弹出红色警告条（附「剩菜急救」安全提示）。
- 🛒 **主厨采购清单**：AI 建议的额外调料/食材，可勾选打勾。
- 🍽️ **每日挑战**：按日期确定性轮换的 3 种奇葩食材，一键填入、打卡 +5 分。
- 👍 **红黑榜投票**：给榜单菜谱投「真香票 / 送医票」，票数置顶。
- 📸 **海报生成**：Canvas 赛博朋克打卡海报（含二维码，5:8 自适应）+ 米其林认证书 + 急诊挂号单皮肤，可下载/分享。
- 🔥 **黑暗料理红黑榜**：接入云数据库 recipes 展示真实评价；空数据或未配置环境时自动回退演示数据。
- 📖 **内置 649 道家常菜谱库（145 iddzz 带演示视频 + 298 HowToCook + 206 家常）**：正常家常模式按「iddzz → HowToCook → 家常库」三级食材匹配出菜，AI 失败时兜底。
- 🧾 **详细菜单制作界面**：食材清单 / 备菜准备 / 分步做法 / 预计用时 / 主厨小贴士。
- 🍱 **带饭友好度标签**：每道菜标注「✅ 微波加热不变味 / 🍱 适合第二天带饭 / ⚠️ 不宜带饭」。
- 🗓️ **周计划管家**：基于虚拟冰箱一键生成下周 7 天不重复菜谱，统筹买菜清单（同名计数去重、冰箱已有自动扣除），可复制 / 导出 / 一键去外卖买菜。
- 🥡 **备菜指南（Meal Prep）**：批量买回一种食材（如鸡胸肉），自动生成 3-5 条预处理方案（切块腌制 / 撕丝冷藏…含存储方式与保质期）。
- 👨‍🍳 **厨房模式**：全屏大字步骤 + 浏览器语音播报（TTS）+ 可语音控制「下一步 / 上一步 / 暂停 / 退出」，手湿也能照着做。
- 🤖 **反向搜索 · 平替主厨**：输入「想吃糖醋排骨，但没排骨了」，用冰箱现有食材给出平替方案与菜谱。
- 🛡️ **免责声明**：底部食品免责提示，娱乐向内容不构成饮食建议。
- ⚔️ **双人盲盒对局**：创建/加入房间（6 位房间码 + 邀请链接），双方各报 3 样以上食材 → 自动交换一颗「炸弹食材」→ 同时让 AI 出菜 → 审判阶段双菜并排揭晓、互打「离谱分」，分高者赢；输家三选一惩罚（发朋友圈文案 / 换头像 1 小时 / 下局用指定食材），可「再来一局」。
- 🎲 **厨房随机事件**：每次生成有 10% 概率触发「停电了 / 猫打翻调料 / 灵感爆发」，事件横幅 + 专属音效 + 菜谱随之变化。
- 🥚 **隐藏彩蛋**：连续 3 次「鸡蛋+番茄」主厨直接拒单；输入「前任/礼物」触发「断舍离爆炒苦瓜」；输入框占位符贱萌文案轮换。
- 💬 **伪社交弹幕**：页面底部实时滚动「用户8848 刚用辣条做出红烧肉…」，热闹氛围拉满。
- 🔊 **音效升级**：真香 → 清脆「叮」+欢呼琶音；已进医院 → 救护车双音鸣笛 + 玻璃碎；随机事件各有专属合成音效。
## 🧱 技术架构
- 前端：原生 HTML + CSS + JS（零构建、零依赖），CloudBase JS SDK 走 CDN。
- 后端：腾讯云开发 CloudBase（Serverless 云函数 + 静态网站托管 + 云数据库）。
- AI：云函数 `generateRecipe` 内通过 `@cloudbase/node-sdk` 的 `app.ai()` 调用托管大模型（默认 `hy3` 腾讯混元，内置免费国产 AI，体验版可直接启用；备选 `qwen3.5-flash` 通义千问）。
- 菜谱库：`iddzzRecipes.js`（145 道，含 B 站演示视频）+ `howToCookRecipes.js`（298 道，来源 Anduin2017/HowToCook，Unlicense 公有领域）+ `normalRecipes.js`（206 道），均为 UMD 三端共用——normal 模式按 iddzz → HowToCook → 家常库三级匹配，AI 失败时兜底。
- 厨房管家纯逻辑：`practical.js`（UMD、可单测）——带饭标签 / 周计划 / 买菜清单合并 / 备菜方案 / 反向搜索，演示模式本地规则兜底，云模式 AI 增强（云函数新增 `weekPlan` / `mealPrep` / `reverseSearch` 三个 action）。

- 对局状态机：`duel.js`（纯逻辑、可单测）——lobby→swap→cook→judge→done 五阶段，懒超时判负、心跳断线检测、平票平局、再来一局；`rooms` 集合存房间状态，网页端 watch 只读，写入全走云函数。
## 📁 项目结构
```
├── web/                        # 网页版前端（部署到静态托管）
│   ├── index.html
│   ├── style.css
│   ├── normalRecipes.js           # 内置家常菜谱库（206 道）
│   ├── iddzzRecipes.js            # iddzz 菜谱库（145 道，含 B 站演示视频）
│   ├── howToCookRecipes.js        # HowToCook 菜谱库（298 道，Unlicense）
│   ├── practical.js              # 厨房管家纯逻辑（周计划/备菜/反向搜索/带饭标签）
│   ├── app.js
│   └── 5ba02e89310da31b8a84990776a2d5c5.txt  # 微信域名校验文件（勿删）
├── scripts/
│   └── importHowToCook.js        # 开发期：HowToCook 菜谱导入（node scripts/importHowToCook.js）
├── cloudfunctions/
│   └── generateRecipe/         # AI 生成菜谱云函数（generate+persona/synth / rate / listRank / dailyChallenge / vote / recognizeImage / weekPlan / mealPrep / reverseSearch）
│       ├── index.js
│       ├── recipe.js           # 纯逻辑（JSON 提取/校验/兜底），可本地单测
│       ├── duel.js             # 双人对局纯状态机（lobby/swap/cook/judge/done）
│       ├── normalRecipes.js     # 家常菜谱库（206 道，与 web 同步）
│       ├── howToCookRecipes.js  # HowToCook 菜谱库（298 道，与 web 同步）
│       ├── config.json
│       ├── package.json
│       └── test/               # 单元测试（node --test，共 48 条）
│           ├── recipe.test.js
│           ├── duel.test.js
│           ├── howToCookRecipes.test.js
│           └── practical.test.js
├── miniprogram/                # 微信小程序版（可选，桥接网页版 a455 环境，见下文）
├── _acl.js / _mkRoom.js        # 开发期脚本：rooms ACL 初始化 / 创建测试房间
├── cloudbaserc.json            # tcb CLI 配置
├── project.config.json         # 小程序项目配置
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
- **方式一（控制台）**：云开发控制台 → 云函数 → 新建 `generateRecipe`（Node.js 16+，**超时时间设为 60–120 秒**）→ 上传 `cloudfunctions/generateRecipe` 目录（含 `index.js`、`recipe.js`、`duel.js`、`normalRecipes.js`、`howToCookRecipes.js`、`package.json`、`config.json`）→ 云端安装依赖。
- **方式二（CLI）**：`npm i -g @cloudbase/cli` → `tcb login` → 在仓库根目录执行 `tcb functions:deploy generateRecipe -e <envId>`（具体参数以 [CloudBase CLI 文档](https://docs.cloudbase.net/cli-v1/commands) 为准）。

### 4. 启用 AI 模型（TokenHub）
1. 云开发控制台 → AI → Token 资源包，确认已开通（未开通按提示领取/购买）。
2. 云开发控制台 → AI 模型 → 确认 `hy3`（腾讯混元）已启用（体验版默认启用、无需额外付费；如未启用可勾选开启）。
   - 可在 `cloudfunctions/generateRecipe/index.js` 顶部的 `MODEL` 常量切换其他模型（需先在控制台启用）。

### 5. 网页访问前置
1. 云开发控制台 → 身份认证 → 登录方式 → 开启**匿名登录**（网页调用云函数需要）。
2. 云开发控制台 → 环境 → 安全配置 → **Web 安全域名**，加入你的访问域名（如 `https://<envId>.tcloudbaseapp.com`；本地调试可先不校验）。

### 6. 数据库
首次调用生成后会自动创建 `recipes` / `players` / `challenges` / `rooms` 集合（云函数以管理员身份写入，不受安全规则限制）。红黑榜读取 `recipes` 中「真香 / 已进医院」的评价记录。`rooms` 集合用于双人对局：网页端通过实时 watch **只读**房间状态，需将权限设为「所有用户可读，仅管理端可写」（ADMINWRITE），写入全部由云函数管理员完成。


### 7. 双人盲盒对局
1. **部署**：按第 3 步部署最新云函数（含 `duel.js` 与 `createDuel/joinDuel/duelReady/duelSwap/duelCook/duelVote/duelTimeout/duelHeartbeat/duelGet/duelRematch` 等 action）。
2. **rooms 集合**：云开发控制台 → 数据库 → 新建集合 `rooms`（云函数首次创建房间时也会自动创建）。
3. **权限**：数据库 → `rooms` → 权限设置 → 选择「所有用户可读，仅管理端可写」（ADMINWRITE）。网页端只读 watch，写入全走云函数。
4. **玩法**：点「⚔️ 双人盲盒对局」→ 创建房间，把 6 位房间码或邀请链接发给好友 → 双方各报 ≥3 样食材并「就绪」→ 自动交换炸弹（3 秒动画 + 音效）→ 双方点「开整」让 AI 出菜（60 秒倒计时，对方进度可见、内容隐藏）→ 审判阶段双菜并排揭晓、互打 0-100 离谱分 → 分高者赢；输家三选一惩罚（复制文案自行执行）；平票无人受罚；可「再来一局」。
5. **规则**：输入 30 秒 / 烹饪 60 秒 / 评分 60 秒，任一超时判负且惩罚翻倍；对手超过 40 秒无心跳判掉线；房主单独等待好友时不判负，好友加入后才开始 30 秒倒计时。
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
5. 双人对局：创建房间 → 好友通过邀请链接加入 → 双方就绪 → 交换炸弹动画 → 双方「开整」出菜 → 审判阶段互打离谱分 → 结算（赢家横幅 + 输家三选一惩罚）→ 再来一局；任一环节超时会触发「超时判负 + 惩罚翻倍」。

## 🧪 本地自动化检查
```bash
node --check web/app.js
node --check cloudfunctions/generateRecipe/index.js
node --test cloudfunctions/generateRecipe/test/recipe.test.js cloudfunctions/generateRecipe/test/duel.test.js cloudfunctions/generateRecipe/test/normalRecipes.test.js
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
