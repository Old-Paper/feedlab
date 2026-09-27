# FeedLab · YouTube / Bilibili 封面标题信息流盲测工具

在尽量还原的 YouTube / Bilibili 推荐流环境中测试封面与标题的第一眼吸引力。
纯前端应用,所有数据保存在浏览器 IndexedDB,不上传任何服务器。

## 启动

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 类型检查 + 产物输出到 dist/
npm run preview  # 预览构建产物
```

## 核心流程

```
新建项目 → 上传封面(多选) → 输入标题(单条/批量) → 生成 Candidate(固定搭配 / 笛卡尔积)
  → 选平台(YouTube / Bilibili) × 设备(桌面 / 手机) × Viewport
  → 设置干扰视频(内置 30 个 + 自导入) → 随机插入 Candidate
  → Preview / Shuffle → Blind Test(倒计时-展示-隐藏-作答) → Find Target(计时找目标)
  → A/B Compare(同 Seed 双 Feed) → Results(CTR / 反应时间 / 错点率 / 均衡对比)
```

## 目录结构

```
src/
  types/            领域模型(Project/Candidate/TestSession/Feed…)
  db/
    database.ts     Dexie schema(projects/assets/testSessions/settings)
    repositories/   ProjectRepository / AssetRepository / SessionRepository / SettingsRepository
  features/
    testing/
      randomEngine.ts      cyrb128 + sfc32 种子随机引擎
      shuffle.ts           Fisher-Yates
      balancedScheduler.ts 均衡曝光调度(shuffled bag)+ 轮次计划
      feedGenerator.ts     Candidate + 干扰视频 → Feed(确定性)
      metrics.ts           CTR / 反应时间 / 错点率聚合
    io/projectIO.ts        .project.json 导入导出(图片 base64 内嵌)
  mock/
    builtinMockVideos.ts   内置 30 个干扰视频(程序生成封面,无真实创作者素材)
    generators.ts          SVG 封面 / 头像生成器
  stores/                  projectStore / projectListStore / simulationStore / testStore / settingsStore / toastStore
  platforms/
    youtube/  desktop/ + mobile/(独立布局,Standard/Experimental 双 preset)
    bilibili/ desktop/ + mobile/(高密度桌面版 / 双列手机版)
  pages/                   Home / Editor(6 个 Tab) / Simulator / Blind / Find / AB / Results / Settings
  components/              DeviceViewport(CSS transform 真实比例) / Inspect 探针 / UI 基件
```

## 关键设计

- **每日真实封面池**:GitHub Actions 每天定时(北京 09:00)运行 `scripts/fetch-covers.mjs`,
  Bilibili 用官方公开接口(综合热门头部 = 全站最火;深页播放量最低段 = 不太火);
  YouTube 解析搜索页内嵌数据(大众关键词相关度排序取高播放 = 最火;按上传时间排序且播放
  < 5万 = 不太火;trending 页对未登录服务器请求不内嵌数据,不可用)。各抓 16+16 条真实
  视频的封面/标题/频道/播放量,生成 `public/data/coverPool.json` 并提交。**每天只更新
  一次,当天所有访客使用同一份数据**。在模拟器/盲测/找目标/A-B 工具栏勾选「真实封面池」
  后,干扰视频自动替换为当前所选平台的真实视频池;封面直接热链平台 CDN(`no-referrer`)。
  本地手动刷新:`node scripts/fetch-covers.mjs`。
- **Seeded Random**:cyrb128 哈希种子 + sfc32 PRNG。相同 Seed + 相同配置 = 完全相同的
  Feed 顺序、Candidate 位置、元数据抖动。A/B 对比中两图共享同一 Seed,唯一变量是 Candidate。
- **Balanced Scheduler**:shuffled-bag 轮换。每个 Candidate(以及随机位置)在一袋内恰好出现
  一次后才允许重复,重洗时避免与上一轮相同,保证 N 轮测试曝光差 ≤ 1。
- **真实显示尺寸**:DeviceViewport 以精确 W×H 渲染设备再整体 CSS scale;Inspect 模式在
  hover 时读取 DOM 实测缩略图显示尺寸、原图缩放比、标题行数与可见字符数。
- **每平台独立 crop**:同一原图可为 YT 桌面 / YT 手机 / B站 桌面 / B站 手机 保存 4 份构图。
- **测试公平性**:目标卡与干扰卡使用完全相同的组件与样式,无任何特殊边框 / 标签 / hover。

## 已知限制

- Feed 为视觉还原,不含真实视频播放、登录、评论等无关功能。
- 干扰视频封面为程序生成渐变卡;建议导入真实竞品截图获得更贴近实战的环境。
- 移动端 preset(YouTube Standard/Experimental、Bilibili)基于 2025 年左右的界面特征,
  平台改版时只需调整 `platforms/*/presets.ts`。
- 单浏览器单标签页使用;多标签同时写同一项目未做冲突合并。
