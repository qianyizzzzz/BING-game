# TASK-004: 行动可读性与复杂技能结算摘要

## Goal

让新手在前三回合和复杂技能回合里，不看调试日志也能知道“现在该做什么、刚才谁对谁做了什么、为什么产生这个结果”。

## Background

2026-06-14 新手玩家 Agent 复审指出：默认 UI agents 与复杂技能 smoke 已通过，但可读性仍有三个 P0 风险：

- 可行动阶段文案出现“正在收招”等偏结算语义，容易让玩家误以为已经不能操作。
- 火箭双目标 smoke 能提交成功，HUD 目标数和座位映射通过，但结算摘要与 battle cue 的目标元数据仍可能丢失。
- 技能提交时如果主按钮或摘要显示成普通“攻击”，会破坏玩家对技能链的理解。

## Status

2026-06-14 进展：

- 已把可行动状态文案从“正在收招”改为“请选择行动 / 等待亮招”。
- 已让技能提交按钮显示具体技能名，并暴露 `data-submit-label`。
- 已让技能表现层从同回合 `turn_revealed.actions` 反查目标，火箭复杂技能 smoke 已验证 `cueTargets=2`、`summaryTargets=2`。
- 已给不可提交状态增加补救动作提示，并暴露 `data-next-action-hint` / `action-recovery-hint`；默认 UI agents 已验证：`artifacts/playtests/ui-agents-2026-06-14T00-14-42-679Z/report.md`。
- 已给桌面结算摘要增加“行动者”和血/饼变化 chip，并暴露 `data-resource-delta-count` / `data-resource-deltas`；默认 UI agents 与火箭复杂技能 smoke 已纳入门禁：`artifacts/playtests/ui-agents-2026-06-13T23-20-33-679Z/report.md`。
- 已给 `SkillEffectLayer` 暴露目标线/落点元数据，火箭复杂技能 smoke 已验证 effectVectors=6、effectImpacts=6、effectTargets=2。
- 已让多目标技能在“当前选择”和桌面特效中消费 `targetIds`，火箭提交前会显示两个目标名。
- 已给提交后状态增加“已锁定行动”回执，并暴露 `data-locked-action`；默认 UI agents 已验证“吃饼 +1”和“杀 -> 竞技玩家”。

## Scope

主要文件：

- `apps/client/src/components/ActionPanel.tsx`
- `apps/client/src/components/PokerTableGame.tsx`
- `apps/client/src/components/TurnAnimation.tsx`
- `apps/client/src/lib/battlePresentation.ts`
- `apps/client/src/lib/turnTimeline.ts`
- `scripts/ui-playtest-agents.ts`
- `docs/PLAYTEST_REPORT.md`
- `docs/UI_DESIGN_PLAN.md`

## Acceptance

- 玩家尚未提交时，主阶段/行动 HUD 必须包含“请选择行动”“等待你出招”或“待提交”等可行动语义，不能只显示“正在收招”“亮招中”“结算中”。
- 技能模式下，主提交按钮或提交摘要必须显示技能名，例如“提交：火箭”或“提交：技能”，不能显示成普通“提交：攻击”。
- `npm run test:ui-agents:complex` 中火箭结算后，摘要文本包含“火箭”，并保留至少 2 个目标的名称或座位映射。
- 复杂技能的 battle cue 必须能把 source/target 映射到座位：`summaryTargets >= 2` 或 `cueTargetSeats >= 2` 至少一项通过。
- 禁用提交按钮附近必须同时显示失败原因和下一步补救动作，例如“饼不足，先吃饼”。
- 前 3 回合结算摘要至少包含：行动者、动作、目标、HP/饼变化、原因或结果。

## Verification

```bash
npm run typecheck
npm run test:ui-agents
npm run test:ui-agents:complex
```

## Notes

当前验收项已完成。后续音效资源、竞技读局层和角色遮挡预算另起任务推进；目标不是加更多说明文字，而是让桌面内的关键状态更可信、更像游戏回合。
