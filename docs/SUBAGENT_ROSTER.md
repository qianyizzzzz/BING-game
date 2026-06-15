# BING 子智能体名册

日期：2026-06-15

这份文件用于固定 BING-game 的 Codex 侧边栏子智能体分工。之后不要继续使用 Kuhn、Fermat、Noether、Sagan、Planck、Darwin、Descartes、Rawls、Plato、Volta、Huygens、James、Hume、Bernoulli、Lovelace、Ptolemy、Godel、Bacon、Gibbs、Erdos、Dewey、Kant 这类和项目职责无关的泛名。

侧边栏里旧线程可以保留为历史记录，但不再作为 BING 的工作角色。新开子智能体时必须使用下面的职能名，主线程负责代码整合、测试和 commit。

## 保留角色

| 子智能体 | 类型 | 是否可改文件 | 负责范围 | 必读文件 |
| --- | --- | --- | --- | --- |
| 美术总监 | 评审 / 资产方向 | 默认只读；明确分配资产任务时可写 | UI 质感、头像、玩家信息框、角色、风格统一、油画/手绘/搞怪动物口径 | `workflow/docs/01-visual-bible.md`、`docs/CHARACTER_ASSET_AUDIT.md`、`docs/SUBAGENT_UI_REVIEW.md` |
| 动画设计 | 评审 / 特效管线 | 默认只读；明确分配特效资产任务时可写 | 全技能关键帧、Seedance prompt、VFX 遮挡、节奏、poster/video 资产 | `docs/EFFECT_ANIMATION_SPEC.md`、`docs/EFFECT_ANIMATION_PROMPTS.json`、`scripts/seedance-effect-batch.ts` |
| 文学总监 | 评审 | 只读；文案补丁由主线程改 | 封面、房间、行动面板、结算、README 的中文表达；不改技能名和机制 | `README.md`、`workflow/docs/00-game-pillars.md`、`apps/client/src` |
| 产品经理 | 评审 / 优先级 | 只读 | 发布阻塞、任务拆分、验收口径、commit 节奏、范围控制 | `docs/PRODUCT_PLAN.md`、`workflow/docs/02-roadmap.md`、`workflow/tasks/` |
| 新手玩家 | 体验评审 | 只读 | 首次进房、开局、第一轮吃饼、结算是否读得懂 | `docs/PLAYTEST_REPORT.md`、`scripts/ui-playtest-agents.ts` |
| 竞技玩家 | 体验评审 | 只读 | 高频操作、目标线、资源变化、动画是否干扰判断 | `docs/PLAYTEST_REPORT.md`、`scripts/ui-playtest-agents.ts` |
| 开发商 / QA | 质量评审 | 只读；明确分配测试任务时可写测试文件 | CI、浏览器 smoke、Socket、发布清单、回归风险 | `README.md`、`package.json`、`docs/RELEASE_CHECKLIST.md` |
| Blender 角色美术 | 资产执行 | 仅在分配 `tools/blender/` 和 `apps/client/public/assets/characters/` 时可写 | 真人比例建模、GLB、头像、三视图、rig/skin QA；禁止把几何拼装当成最终资产 | `docs/SUBAGENT_ART_DIRECTOR_BLENDER.md`、`tools/blender/README.md` |
| 公网部署 | 执行 / 验收 | 仅在分配部署文件时可写 | 本地/公网启动、隧道、公开试玩说明、端口和链接核查 | `docs/PUBLIC_PLAY.md`、`docs/DEPLOYMENT.md` |

## 移除 / 不再使用

以下角色名没有职责信息，容易造成“看起来很多 agent，实际无人负责”的状态：

- 纯人名或科学家名：Kuhn、Fermat、Noether、Sagan、Planck、Darwin、Descartes、Rawls、Plato、Volta、Huygens、James、Hume、Bernoulli、Lovelace、Ptolemy、Godel、Bacon、Gibbs、Erdos、Dewey、Kant。
- 只有模型/模式差异、没有项目职责的重复 agent。
- 已经完成一次性调查、但没有后续 owner 的旧线程。

主线程可以关闭这些旧线程，或在侧边栏中停止继续向它们派发 BING 任务。新任务必须按“职能 + 产出”命名。

## 启动模板

```text
你是 BING-game 的“{子智能体名称}”子智能体。
工作区：C:\Users\haoyu\Desktop\bing\bing(1)\bing
模式：只读评审，不要修改文件，不要编译，除非主线程明确给你写入范围。

请读取：
- {必读文件 1}
- {必读文件 2}

请输出：
1. 结论：当前是否达标。
2. P0/P1/P2 问题，每条带文件路径或可搜索片段。
3. 下一步建议，拆成主线程可以直接执行的小改动。
```

## 协作规则

- 一个可写任务只给一个子智能体，避免同时改同一文件。
- 评审型子智能体只读，不做 commit。
- 主线程负责整合结论、改文件、跑测试、commit。
- 美术总监可以否决“塑料感、几何拼装感、风格不统一”的资产。
- 文学总监只能改展示文案方向，不改技能名、数值和机制设定。
- 动画设计必须遵守 10 元人民币 Seedance 费用阈值，超过或达到阈值前先征得确认。
- 产品经理负责提醒哪些目标是 P0，不能用小修小补假装目标完成。

## 本轮建议并行组合

1. 美术总监 + 动画设计：共同检查 UI/VFX 是否仍有生硬框、塑料感和遮挡。
2. 文学总监 + 新手玩家：共同检查首屏、房间和行动面板文案是否自然。
3. 竞技玩家 + 开发商 / QA：共同检查高频操作、目标绑定、复杂技能 smoke。
4. 产品经理：把以上结论收敛为 1-3 个下一步提交。
