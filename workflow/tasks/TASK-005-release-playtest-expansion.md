# TASK-005: 发布前浏览器场景扩展

## Goal

把当前已经通过的默认 UI、复杂技能、重连/观战、角色浏览器 smoke，继续扩展成更接近公开试玩前的浏览器门禁。目标不是把所有长场景塞进每日 CI，而是提供可手动运行、可上传截图和报告的高风险场景。

## Status

2026-06-14 进展：

- 默认 UI agents 已通过：`artifacts/playtests/ui-agents-2026-06-14T01-01-35-676Z/report.md`。
- 复杂技能 smoke 已通过：`artifacts/playtests/ui-agents-2026-06-14T01-15-06-505Z/report.md`。
- 重连/观战 smoke 已通过：`artifacts/playtests/reconnect-spectator-2026-06-13T23-43-00-536Z/report.md`。
- 短限时自动兜底 smoke 已通过：`artifacts/playtests/timeout-fallback-2026-06-14T01-21-25-786Z/report.md`。
- 角色浏览器 BBox smoke 已通过：`artifacts/playtests/character-runtime-2026-06-13T23-56-29-228Z/report.md`。
- `verify:release` 已拆成 build 一次后复用 `:run` 命令，降低重复构建导致的本地超时风险。

## Priority

1. 多真人 / 集火场景：4 个真实 Browser context 同时提交，覆盖 2-4 人集火同一目标、1 人防御/反弹、结算死亡或濒死。
2. 响应窗口链路：固定触发反弹、变招、转移伤害、复活窗口，验证进入、跳过、继续结算和 readout。已先补短限时自动兜底 smoke，用 5 秒限时覆盖“真人不操作时服务端自动吃饼、训练样本不丢、页面继续推进”的基础风险。
3. 公网 tunnel smoke：在 `npm run public` 或外部 URL 下跑一条轻量 join/start/submit 检查，验证 Socket.IO origin 与 public link。
4. 动画中帧截图：复杂技能在 250ms / 600ms / 900ms 捕捉锁定、飞行线、落点爆发，避免只看结算后的 DOM 元数据。
5. 遮挡预算：结合角色 BBox、battle readout、行动 dock、目标线，检查桌面/390px 移动端没有关键元素互相遮挡。

## Scope

主要文件：

- `scripts/ui-playtest-agents.ts`
- `scripts/reconnect-spectator-smoke.ts`
- `scripts/timeout-fallback-smoke.ts`
- `scripts/character-runtime-browser-check.ts`
- `apps/client/src/components/PokerTableGame.tsx`
- `apps/client/src/components/SkillEffectLayer.tsx`
- `apps/client/src/components/TableScene3D.tsx`
- `.github/workflows/browser-playtest.yml`
- `docs/PLAYTEST_REPORT.md`
- `docs/RELEASE_CHECKLIST.md`

## Acceptance

- 新增场景必须生成 `artifacts/playtests/.../report.md` 和关键截图。
- 失败报告必须说明是视觉、console、socket、状态同步、目标映射、资源变化还是动作窗口问题。
- 多人场景至少验证：source/target、座位映射、HP/饼 delta、目标线/落点、死亡/胜负、无 console/page error。
- 响应窗口场景至少验证：窗口原因、可用动作、跳过/放弃、继续结算、摘要不丢失。
- 公网 tunnel 场景不得默认跑在每日 CI；只能手动触发或本地显式执行。

## Verification

```bash
npm run test:ci
npm run test:ui-agents
npm run test:ui-agents:complex
npm run test:ui-agents:reconnect
npm run test:ui-agents:timeout
npm run test:character-browser
```

后续新增脚本时，优先提供 `:run` 变体，便于 release workflow 先 build 一次再复用 dist。
