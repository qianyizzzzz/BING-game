# BING Game / 饼

<p align="center">
  <strong>一款“同时出招，亮牌结算”的多人卡牌策略游戏。</strong>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a>
  ·
  <a href="#公网联机">公网联机</a>
  ·
  <a href="#美术与动画方向">美术与动画方向</a>
  ·
  <a href="#子智能体协作">子智能体协作</a>
  ·
  <a href="#常用命令">常用命令</a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=111111">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socketdotio&logoColor=white">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-0.184-111111?style=flat-square&logo=threedotjs&logoColor=white">
</p>

## 项目简介

`饼` 是一个原创回合制卡牌策略游戏。每名玩家在同一回合暗中选择行动，全部锁定后统一亮牌并结算：吃饼、防御、攻击、反弹、技能、伤害、复活和击败都在同一条节奏里发生。

当前仓库包含：

- React / Vite / Three.js 客户端：房间、牌桌、座位、行动面板、目标预览、技能卡册和结算演出。
- Express / Socket.IO 服务端：房间状态、回合结算、AI 出招、复盘记录和训练样本导出。
- `packages/shared` 共享规则包：动作、技能、状态、socket 类型和回合时间线。
- 自动化试玩 agent：覆盖开房、加入、出招、观战、重连、超时兜底和复杂技能 smoke。
- 全技能特效文档：120 个技能，每个技能 4 张关键帧提示词和 1 条 Seedance 动画提示词。
- 美术与资产管线：手绘搞怪动物头像、GLB/LOD 运行时验证、发布素材审计和付费 API 费用台账。

## 当前状态

| 模块 | 状态 |
| --- | --- |
| 核心玩法 | 双玩家创建房间、加入、开局、出招、沿用上回合、攻击、技能和结算主流程已通过自动化回归。 |
| UI / HUD | 牌桌、行动面板、目标预览、结算摘要、技能 gallery 和油画纸面风格已接入；还在继续打磨轻薄度、字体和信息层级。 |
| 角色资产 | 6 个默认角色已有手绘动物头像、移动端头像和动作姿态图；当前 GLB 仍是技术占位，不能宣传为最终美术。 |
| 特效资产 | 文档已覆盖 120 个技能、480 条关键帧提示词和 120 条 Seedance 提示词；当前只有火球样例有完整 mp4 / webm。 |
| 自动化验收 | 覆盖规则回归、agent 名册、角色资源、视觉风格、技能 gallery、特效规格、预算门控、公网配置和发布资源审计。 |
| 发布边界 | 当前为私有项目。公开发布前必须逐项确认素材来源、授权、生产 Origin、持久化备份和发布产物审计。 |

## 快速开始

```bash
npm install
npm run dev
```

本地地址：

- 前端：[http://localhost:5173](http://localhost:5173)
- 后端：[http://localhost:3001](http://localhost:3001)

## 公网联机

临时开启一个公网多人房间：

```bash
npm run public
```

这个命令会构建项目、启动生产服务，并通过 Cloudflare Tunnel 暴露本机 `3001` 端口。游玩期间请保持终端窗口打开。

已经构建过时可以跳过构建：

```bash
npm run public:no-build
```

更多说明见 [公网联机](docs/PUBLIC_PLAY.md) 和 [部署说明](docs/DEPLOYMENT.md)。

## 美术与动画方向

当前视觉目标是“油画纸面 + 透明装置 + 手绘搞怪动物角色”：

- 页面元素要轻薄，避免塑料感、硬方框和后台 dashboard 感。
- 头像和玩家信息框采用手绘角色、纸面纹理、低饱和色和不规则边缘。
- 技能和介绍界面做成 gallery，展示一张张技能卡片。
- 技能特效以 `docs/EFFECT_ANIMATION_PROMPTS.json` 为准：每个技能 4 张关键帧，再用 Seedance 补成短动画。
- 付费 API 调用有预算门槛：累计估算达到或超过 10 RMB 时必须先确认。
- Seedance settle 报告只保留安全摘要，不保存临时视频 URL、签名参数、prompt payload 或密钥。

相关文档：

- [视觉圣经](workflow/docs/01-visual-bible.md)
- [UI 设计方案](docs/UI_DESIGN_PLAN.md)
- [全技能特效状态](docs/EFFECT_ASSET_STATUS.md)
- [技能特效批量生成计划](docs/EFFECT_GENERATION_BATCH_PLAN.md)
- [油画特效生产线](workflow/tasks/TASK-007-oil-paint-effect-pipeline.md)
- [Seedance MCP / API 配置](docs/SEEDANCE_MCP_SETUP.md)
- [角色资产审计](docs/CHARACTER_ASSET_AUDIT.md)
- [资产权属与来源说明](docs/ASSET_RIGHTS.md)

## 子智能体协作

仓库使用功能命名的 BING 子智能体，而不是泛名角色。当前核心职责包括：

- 美术总监：检查油画感、字体、透明度、色彩、头像和整体美术一致性。
- 动画设计：拆解技能关键帧、Seedance prompt、节奏、遮挡和 reduced-motion 回退。
- 文学总监：修正界面文案、README、引导文本和气质表达，不修改技能名和原机制。
- 产品经理：检查主流程、信息层级、可理解性和发布优先级。
- 新手玩家 / 竞技玩家：分别从学习成本和高频对局读局角度做 playtest。
- 开发商 QA：负责 smoke、回归、截图、控制台错误和发布风险。
- 公网部署：负责本地 / 公网联机、隧道、端口和部署文档。

完整名单见 [BING 子智能体名册](docs/SUBAGENT_ROSTER.md)。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 同时启动客户端和服务端开发服务。 |
| `npm run build` | 构建 shared、server 和 client。 |
| `npm run serve` | 启动生产模式服务。 |
| `npm run public` | 构建并打开临时公网联机地址。 |
| `npm run typecheck` | 对所有 workspace 运行 TypeScript 检查。 |
| `npm run test:ci` | 运行核心 CI：类型、规则、agent、视觉、特效、预算、公网配置和发布资源审计。 |
| `npm run verify` | 构建后运行核心检查和默认 UI 自动化试玩。 |
| `npm run verify:release` | 发布前完整门禁。 |
| `npm run test:assets` | 检查 6 个角色的 GLB、头像、QA 图和材质资源。 |
| `npm run test:visual-style` | 检查房间入口、角色选择、玩家座位和行动面板的油画 / 手绘风格。 |
| `npm run test:skill-gallery` | 检查技能卡册和完整技能参考页的 gallery 结构、搜索、分类和计数。 |
| `npm run test:effect-spec` | 检查 120 个技能的特效文档、关键帧提示词和 Seedance 提示词。 |
| `npm run test:effect-budget` | 检查付费 API ledger、Seedance settle 报告脱敏和 10 RMB 预算门槛。 |
| `npm run test:effect-assets:stage` | 阶段性检查火球样例完整、全局无坏特效文件、状态页统计同步。 |
| `npm run test:public-config` | 检查公网试玩脚本、端口、Cloudflare Tunnel 文档和生产 Origin 配置说明。 |
| `npm run seedance:effects:plan` | 生成 Seedance 任务 payload，不调用 API。 |
| `npm run seedance:effects:submit -- --estimated-cny-per-task=3` | 提交 Seedance 任务；达到 10 RMB 预算线会自动停止。 |
| `npm run seedance:effects:settle` | 轮询已提交任务并下载动画资产；报告只写安全摘要。 |
| `npm run effects:spend:sync` | 从本地 Seedance 任务 manifest 同步安全付费记录到费用台账。 |

## 项目结构

```text
apps/
  client/          React、Vite、Tailwind、Three.js 游戏界面
  server/          Express、Socket.IO、房间状态、复盘接口
packages/
  shared/          共享规则、动作、技能、socket 类型、状态机
docs/              架构、部署、公网联机、AI 训练、UI 方案、资产说明
scripts/           公网隧道、规则检查、playtest、Seedance、训练工具
tools/             Blender / MCP 辅助脚本
workflow/          制作流程、任务、提示词、审查和试玩模板
```

## 文档入口

- [架构说明](docs/ARCHITECTURE.md)
- [产品计划](docs/PRODUCT_PLAN.md)
- [发布清单](docs/RELEASE_CHECKLIST.md)
- [公网联机](docs/PUBLIC_PLAY.md)
- [AI 训练](docs/AI_TRAINING.md)
- [Playtest 报告](docs/PLAYTEST_REPORT.md)
- [子智能体 UI 评审](docs/SUBAGENT_UI_REVIEW.md)
- [BING 子智能体名册](docs/SUBAGENT_ROSTER.md)
- [Prompt + Goal 写法](workflow/prompts/prompt-goal-combos.md)
- [Game Pillars](workflow/docs/00-game-pillars.md)
- [Roadmap](workflow/docs/02-roadmap.md)

## 许可说明

当前为私有项目，详见 [LICENSE](LICENSE)。素材来源、发布边界和授权注意事项见 [资产权属与来源说明](docs/ASSET_RIGHTS.md)。
