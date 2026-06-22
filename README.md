# BING Game / 饼

一款回合制多人卡牌策略游戏。所有玩家先暗中选择行动，锁定后一起亮牌结算。

<p>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=111111">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socketdotio&logoColor=white">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-0.184-111111?style=flat-square&logo=threedotjs&logoColor=white">
</p>

![BING 桌面牌桌截图](docs/screenshots/table-desktop.png)

## 现在可以玩什么

- 创建房间、加入房间、加 AI、观战和公网联机。
- 同时出招、沿用上回合、目标预览、倒计时兜底和统一亮牌结算。
- 吃饼、防御、攻击、技能、反弹、复活、击败和回合摘要。
- 技能 gallery 与完整技能参考页。当前规则库不止 65 个技能，审计按完整技能表检查。
- 新手玩家、竞技玩家、开发商 QA、美术总监、文学总监等 BING 子智能体协作检查。
- 仓库使用功能命名的 BING 子智能体，避免保留无关的泛名角色。

## 快速开始

```bash
npm install
npm run dev
```

开发地址：

- 前端：[http://localhost:5173](http://localhost:5173)
- 后端：[http://localhost:3001](http://localhost:3001)

## 公网联机

```bash
npm run public
```

这个命令会构建项目、启动生产服务，并通过 Cloudflare Tunnel 暴露本机 `3001` 端口。游玩期间保持终端窗口打开。

如果已经构建过：

```bash
npm run public:no-build
```

更多说明见 [公网联机](docs/PUBLIC_PLAY.md) 和 [部署说明](docs/DEPLOYMENT.md)。

## 项目状态

| 模块 | 状态 |
| --- | --- |
| 玩法 | 双人房间、AI 补位、出招、结算、复活、击败、重连和观战主流程已接入自动化回归。 |
| UI | 房间入口、牌桌、行动面板、玩家座位、结算浮层和技能 gallery 已改为轻量纸面风格，仍在继续打磨字体、透明度和信息层级。 |
| 美术 | 方向为“油画纸面 + 透明装置 + 手绘搞怪动物角色”。头像已有第一批动物角色资产。 |
| 角色模型 | 当前 GLB 仍是技术占位，不能宣传为最终美术。后续需要统一替换为符合角色方向的正式模型。 |
| 技能特效 | 120 个技能已有关键帧与 Seedance 动画提示词；完整视频资产仍在分批生成。 |
| 测试 | `test:ci` 覆盖规则、子智能体、README、视觉风格、技能 gallery、特效规格、预算门禁、公网配置和发布资产。 |
| 发布 | 当前为私有项目。公开前需要完成素材授权、Origin、持久化、发布清单和资产审计。 |

## 美术方向

BING 不走写实和厚重游戏 HUD。界面应该像一张可操作的纸面牌桌：轻、薄、留白明确，边框尽量弱化，必要的容器使用虚化、纸纹、半透明和手绘边缘解决。

角色头像采用手绘搞怪动物风格，精致度压低一点，保持可爱但不要偶像化。技能与介绍界面做成技能 gallery：像翻阅一组卡片，而不是后台表格。

技能动画以 `docs/EFFECT_ANIMATION_PROMPTS.json` 为准：每个技能 4 张关键帧，再用 Seedance 补成短动画。付费 API 有硬门槛：累计估算达到或超过 10 RMB 时必须先确认。

Seedance settle 报告只保留安全摘要，不保存临时视频 URL、签名参数、prompt payload 或密钥。

## 工程门禁

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 同时启动客户端和服务端开发服务。 |
| `npm run build` | 构建 shared、server 和 client。 |
| `npm run serve` | 启动生产模式服务。 |
| `npm run public` | 构建并打开临时公网联机地址。 |
| `npm run typecheck` | 对所有 workspace 运行 TypeScript 检查。 |
| `npm run test:ci` | 运行核心 CI 门禁。 |
| `npm run verify` | 构建、CI、默认 UI 自动化试玩。 |
| `npm run verify:release` | 发布前完整门禁。 |
| `npm run test:readme` | 检查 README 结构、关键事实、链接和乱码。 |
| `npm run test:visual-style` | 检查入口、座位、行动面板等是否符合当前视觉方向。 |
| `npm run test:skill-gallery` | 检查技能 gallery 的搜索、分类、计数和页面结构。 |
| `npm run test:effect-budget` | 检查付费 API 台账、Seedance settle 报告脱敏和 10 RMB 门槛。 |
| `npm run test:public-config` | 检查公网试玩脚本、端口、Tunnel 文档和生产 Origin 说明。 |
| `npm run seedance:effects:plan` | 生成 Seedance 任务 payload，不调用 API。 |
| `npm run seedance:effects:submit -- --estimated-cny-per-task=3` | 提交 Seedance 任务；触达预算线会自动停止。 |
| `npm run seedance:effects:settle` | 轮询任务并下载动画资产；报告只写安全摘要。 |

## 目录

```text
apps/
  client/          React、Vite、Tailwind、Three.js 游戏界面
  server/          Express、Socket.IO、房间状态、复盘接口
packages/
  shared/          共享规则、动作、技能、socket 类型、状态机
docs/              架构、部署、公网联机、UI、资产、训练和发布说明
scripts/           审计、playtest、Seedance、公网隧道和训练工具
tools/             Blender / MCP 辅助脚本
workflow/          制作流程、任务、提示词、审查和试玩模板
```

## 文档

- [架构说明](docs/ARCHITECTURE.md)
- [产品计划](docs/PRODUCT_PLAN.md)
- [发布清单](docs/RELEASE_CHECKLIST.md)
- [公网联机](docs/PUBLIC_PLAY.md)
- [AI 训练](docs/AI_TRAINING.md)
- [Playtest 报告](docs/PLAYTEST_REPORT.md)
- [UI 设计方案](docs/UI_DESIGN_PLAN.md)
- [子智能体 UI 评审](docs/SUBAGENT_UI_REVIEW.md)
- [BING 子智能体名册](docs/SUBAGENT_ROSTER.md)
- [Prompt + Goal 写法](workflow/prompts/prompt-goal-combos.md)
- [视觉圣经](workflow/docs/01-visual-bible.md)
- [全技能特效状态](docs/EFFECT_ASSET_STATUS.md)
- [技能特效批量生成计划](docs/EFFECT_GENERATION_BATCH_PLAN.md)
- [油画特效生产线](workflow/tasks/TASK-007-oil-paint-effect-pipeline.md)
- [Seedance MCP / API 配置](docs/SEEDANCE_MCP_SETUP.md)
- [角色资产审计](docs/CHARACTER_ASSET_AUDIT.md)
- [资产权属与来源说明](docs/ASSET_RIGHTS.md)

## 费用与素材边界

付费 API 调用以本地 ledger 为准，累计估算达到或超过 10 RMB 时先停下确认。生成素材进入项目之前，需要保留来源、用途、授权状态和发布风险说明。

当前仓库为私有项目，详见 [LICENSE](LICENSE)。
