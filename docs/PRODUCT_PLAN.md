# BING 产品计划

日期：2026-06-13

## 当前版本定位

BING 是一款多人同步出招的策略卡牌/桌游网页游戏。当前版本已经具备可试玩的核心闭环：实时房间、共享规则、行动提交、统一结算、3D 桌面、角色资产、复盘和 UI agent 自动化验收。

现在最重要的目标不是继续堆功能，而是把“能玩”打磨成“玩家看得懂、每回合有张力、反馈像游戏”。

## Must

- 保证本地能安装、运行、构建和测试。
- 准备阶段、出招阶段、行动窗口、结算阶段、死亡/胜利阶段文案必须清楚。
- 移动端行动面板不能藏住提交按钮和目标选择。
- README 使用中文，说明项目是什么、如何运行、如何公网联机、当前完成度和下一步。
- `docs/PLAYTEST_REPORT.md` 记录两个玩家 agent、开发商 agent 和美术总监 agent 的结论。
- 最后 push 前运行基础检查，并写清楚未覆盖风险。

## Should

- 扩展 UI agent：继续覆盖复杂技能链、断线重连、多人集火和公网 tunnel。
- 增加 balance/selfplay 指标：2/3/4/6 人局平均回合数、防御成功率、反弹收益、群攻收益。
- 更新 `docs/CHARACTER_ASSET_AUDIT.md`：说明 LOD0/LOD1 已具备 skinned/animated GLB，并记录剩余高模、精细权重和精修动画缺口。
- 把右侧日志/规则/技能做成更强的上下文工具栏。
- 将桌面结算逐步从面板提示迁移到座位、目标线和数值 delta。

## Could

- 增加 `BattleDirector`，统一驱动 3D 镜头、座位状态、技能 VFX、结算 overlay 和音效。
- 给竞技玩家增加动画加速/跳过、快速改目标、上一招和威胁阈值提示。
- 为角色资产接入 KTX2/Draco/Meshopt 压缩与懒加载。
- 增加复杂技能浏览器场景，并把关键截图与报告沉淀为 release artifacts。

## 09:30 前收尾顺序

1. 固定当前代码和资产状态，避免再开大规模 Blender 生成。
2. 更新 README、PLAYTEST_REPORT、PRODUCT_PLAN 和 MORNING_HANDOFF。
3. 运行 `npm run typecheck`、`npm run build`、`npm run test:rules`、`npm run test:turn-timeline`、`npm run test:ui-agents`。
4. 检查 `git status`，确认没有临时日志、缓存、半生成资产。
5. 提交文档与小修。
6. 临近 09:30 push 本地领先的 commits。

## 主要风险

- 角色资产仍是 WIP/blockout，不能宣传为最终半写实角色。
- 当前角色资产仍是 WIP/blockout，LOD0/LOD1 只有 first-pass skin 和预览 clips，还没有最终高模、精细权重和精修动画。
- UI agent 和角色浏览器 smoke 已有 workflow，但复杂技能链、断线重连和多人政治局覆盖不足。
- 大型前端文件仍然偏热：`ActionPanel.tsx`、`TableScene3D.tsx`、`App.tsx` 后续修改需要谨慎。
