# TASK-003: 复杂技能浏览器 Playtest

## Goal

把 UI agent 从 2 人 3 回合 happy path 扩展到复杂技能链，验证目标线、资源变化、响应窗口和结算摘要在真实浏览器里仍然可读。

## Status

2026-06-14 进展：
- 已给大厅设置、测试技能选择器、攻击/技能目标控件补稳定 `data-testid`。
- 已新增 `npm run test:ui-agents:complex` 作为显式复杂技能 smoke；默认 `npm run test:ui-agents` 保持绿色。
- 已验证默认 UI agents 通过：`artifacts/playtests/ui-agents-2026-06-13T22-36-09-841Z/report.md`。
- 已验证复杂技能 UI agents 通过：`artifacts/playtests/ui-agents-2026-06-13T22-31-28-877Z/report.md`。
- 复杂模式当前采用“单房主 + 2 个 AI 对手”，避免第二个人类页连续提交带来的同步抖动；第 3 回合已完成火箭双目标提交，HUD 目标数 2，座位映射 2/2，结算 cueTargets=2、summaryTargets=2，且目标线/落点 smoke 验证 effectVectors=6、effectImpacts=6、effectTargets=2。

## Why

当前 `test:ui-agents` 已覆盖创建房间、加入房间、吃饼、沿用上回合、攻击、目标预览、行动 HUD、底部命令区和基础结算 cue。下一类高风险来自技能链：多目标、变招、反弹、复活窗口和资源不足提示。如果这些只靠人工试玩，很容易在后续迭代中回归。

## Scope

主要文件：

- `scripts/ui-playtest-agents.ts`
- `apps/client/src/components/ActionPanel.tsx`
- `apps/client/src/components/PokerTableGame.tsx`
- `apps/client/src/lib/battleDirector.ts`
- `docs/PLAYTEST_REPORT.md`
- `docs/UI_DESIGN_PLAN.md`

不在本任务中处理：

- 重做完整规则平衡。
- 最终美术资产。
- 声音资源和音频混音。

## Scenario

建议先做一个固定 4 人局：

1. 房主创建房间。
2. 加入 3 个 AI 或脚本玩家。
3. 固定技能模式，让至少一名玩家拥有多目标或响应窗口技能。
4. 第 1 回合吃饼，建立资源。
5. 第 2 回合触发一次攻击 + 防御/反弹。
6. 第 3 回合触发一次技能链或响应窗口。
7. 截图并检查桌面、行动面板和右侧信息栏。

首批候选技能：

| 技能 | ID | 用途 |
| --- | --- | --- |
| 火箭 | `skill_79_36319` | 技能攻击，可连续选择 1-2 名目标，适合验证多目标 target ids。 |
| 狂风骤雪 | `skill_97_60773` | 群攻技能，适合验证 targetMode=all 和全体目标映射。 |
| 斗转星移 | `skill_94_627` | 变伤阶段转移伤害，适合验证响应窗口和目标选择。 |
| 绝对守护 | `skill_74_34920` | 变招阶段改变单体/群体攻击，适合验证复杂参数和状态解释。 |
| 地狱主宰 | `skill_112_59292` | 复活阶段技能，适合后续验证 revival_action。 |

推荐第一版只做 `skill_79_36319` 或 `skill_97_60773`，因为它们发生在普通行动阶段，能先把多目标验收跑通。

## Acceptance

- UI agent 报告包含复杂技能场景的小节。
- 至少检查一次响应窗口：进入、放弃/跳过、结算继续。
- 至少检查一次多目标或技能目标：`data-target-ids` 非空，并能映射到 DOM 座位。
- 行动 HUD 在技能模式下仍显示下一步、目标、状态和不可提交原因。
- 结算摘要保留动作、目标和结果，不被系统步骤覆盖。
- `npm run test:ui-agents` 通过，并上传截图 artifact。
- `npm run test:ui-agents:complex` 通过，并上传复杂技能截图 artifact。

## Verification

```bash
npm run typecheck
npm run test:ui-agents
npm run test:ui-agents:complex
```

## Commit

实现和测试通过后提交：

```text
Add complex skill browser playtest
```
