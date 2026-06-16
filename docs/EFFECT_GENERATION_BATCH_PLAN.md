# 技能特效批量生成计划

日期：2026-06-16

这份计划只安排生成顺序和预算闸门，不代表已经调用付费 API。当前状态由以下命令验证：

```powershell
npm.cmd run test:effect-spec
npm.cmd run test:effect-budget
npm.cmd run test:effect-assets -- --json
```

## 当前事实

| 项目 | 数量 |
| --- | ---: |
| 技能总数 | 120 |
| 已覆盖关键帧 prompt 的技能 | 120 |
| 关键帧 prompt 总数 | 480 |
| 已覆盖 Seedance prompt 的技能 | 120 |
| 已有完整动画资产的技能 | 1 |
| 已有 4 张关键帧和 poster 的技能 | 1 |
| 缺失资产文件总数 | 833 |
| 坏文件 / 尺寸错误 | 0 |

当前已经跑通完整视频闭环的是 `skill_78_18866`（火球）：已有 `keyframe-01.png` 到 `keyframe-04.png`、`poster.png`、`effect.mp4`、`effect.webm`。

## 生成顺序

### P0：先跑 1 个闭环样例

目标：证明关键帧输入、Seedance 视频生成、下载、转码、前端读取都能跑通。

范围：

- `skill_78_18866` 火球
- 生成 `effect.mp4`
- 生成或转码 `effect.webm`
- 保留 `poster.png`
- 运行 `npm.cmd run test:effect-assets -- --json`

计划命令：

```powershell
npm.cmd run seedance:effects:plan -- --provider=volcengine --offset=76 --limit=1 --estimated-cny-per-task=3
```

提交前必须确认：

- API provider 使用火山引擎 Ark 官方接口：`--provider=volcengine`。
- token 已配置在 PowerShell / 用户环境变量中。
- 预计费用没有达到 10 RMB；达到或超过时先问用户。

### P1：攻击与高频技能小批量

目标：优先覆盖玩家最常见、最能感知差异的技能。

建议每批：

- 3-5 个技能。
- 每批先生成 keyframe，再生成 Seedance 视频。
- 每批完成后立刻运行资产审计和浏览器 smoke。

推荐顺序：

1. `火球`
2. `火箭`
3. `雷电法术`
4. `寒冰剑`
5. `毒箭雨`
6. `暴风雪`
7. `三千雷动`

### P2：防御 / 治疗 / 资源技能

目标：覆盖行动面板最常见的非攻击反馈，避免只有攻击有表现。

类型：

- 防御类：盾、守护、反弹、免疫。
- 治疗类：回血、复活、生命修复。
- 资源类：获得饼、消耗饼、状态增益。

验收重点：

- 不遮挡 HP、饼数、目标线和提交状态超过 500ms。
- reduced motion 下能回退到 `poster.png`。

### P3：锁定 / 被动 / visual-only 技能

目标：让没有主动 `play` 的技能也有触发印记或状态反馈。

执行前先检查：

- 是否有运行时触发点。
- 是否只需要短促印记，而不是完整大动画。
- 是否会造成误解，例如把“被动生效”看成“主动攻击”。

## 预算闸门

所有付费 API 任务都必须带估算参数：

```powershell
--estimated-cny-per-frame=<单张关键帧估算人民币>
--estimated-cny-per-task=<单个 Seedance 视频估算人民币>
--prior-spend-cny=<可选；覆盖台账里的已发生或已估算人民币费用>
```

规则：

- `plan` 命令不消耗 API。
- `submit` 命令会消耗 API。
- 单批预计或累计达到 **10 RMB** 前，必须先得到用户明确许可。
- 已经跑通的火球 Seedance 样例按当前估算记作约 3 RMB，并记录在 `docs/PAID_API_SPEND_LEDGER.json`；脚本默认读取该台账作为累计费用。
- 如需临时覆盖台账费用，可显式传 `--prior-spend-cny=<金额>` 或设置 `PAID_API_PRIOR_SPEND_CNY`。
- 未确认 provider 前，不提交任何付费任务。

## 每批验收

每批生成后至少运行：

```powershell
npm.cmd run test:effect-spec
npm.cmd run test:effect-assets -- --json
npm.cmd run test:effect-budget
npm.cmd run build
```

如果接入了前端播放，还需要补充：

```powershell
npm.cmd run test:ui-agents:run
```

预算脚本改动后必须运行：

```powershell
npm.cmd run test:effect-budget
```

该命令会先审计 `docs/PAID_API_SPEND_LEDGER.json`，再验证关键帧与 Seedance dry-run 是否按累计费用截断。

## 自动批次选择

关键帧计划脚本默认会跳过已经存在的关键帧，并在设置了 `--estimated-cny-per-frame` 时把计划控制在 10 RMB 以下；若确实要超过预算线，必须先得到用户许可，再显式加 `--allow-over-budget`。继续已有批次时默认从 `docs/PAID_API_SPEND_LEDGER.json` 读取累计费用。

```powershell
npm.cmd run effects:keyframes:plan -- --offset-skills=0 --limit-skills=10 --estimated-cny-per-frame=0.5
```

计划文件会记录 `budget.priorSpendCny`、`budget.totalEstimatedCnyWithPrior`、`selectedFramesBeforeBudgetCap`、`skippedByBudgetCap` 和 `budget.cappedForSpendLimit`，方便确认哪些关键帧只是因为预算闸门被延后，并不是 prompt 缺失。

Seedance 提交脚本默认会跳过已经具备 `poster.png`、`effect.mp4`、`effect.webm` 的技能，并且火山 Ark 路线默认只发送第 1 张和第 4 张关键帧作为 `first_frame` / `last_frame`：

```powershell
npm.cmd run seedance:effects:plan -- --provider=volcengine --offset=0 --limit=3 --estimated-cny-per-task=3
```

## 记录要求

每批必须记录：

- provider：火山引擎 Ark 官方接口，除非明确切回 AceDataCloud。
- 任务 id。
- 估算费用和实际费用。
- `docs/PAID_API_SPEND_LEDGER.json` 台账更新；可先运行 `npm.cmd run effects:spend:sync` 从本地 Seedance manifest / settle report 同步安全字段。
- `artifacts/seedance/effect-settle-report.json` 不保留临时视频 URL、Bearer、token、API key 或签名参数；由 `npm.cmd run test:effect-budget` 一并审计。
- 生成文件路径。
- 美术总监结论：通过、返工、或仅作为技术样例。
- 是否触发 10 RMB 许可线。
