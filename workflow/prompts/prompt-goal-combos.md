# 提示词 + Goal 组合写法

日期：2026-06-13

这份模板用于把一个想法交给 Codex、Claude、Figma 或子智能体时说清楚。核心原则是：**提示词负责行动方式，Goal 负责完成边界**。

## 推荐结构

```text
Goal:
我要在 BING-game 中完成一个可验证的目标：{一句话目标}。

Context:
- 仓库/页面/功能位置：{路径或模块}
- 已有约束：{设计方向、技术栈、不要碰的文件}
- 用户是谁：{新手玩家 / 竞技玩家 / 开发商 / 美术总监}

Task:
请完成：
1. {具体产物}
2. {验证方式}
3. {需要提交或输出的文档}

Acceptance:
- {可检查的验收标准 1}
- {可检查的验收标准 2}
- {可检查的验收标准 3}

Commit:
重要步骤完成后单独 commit。不要把无关改动混进同一个 commit。
```

## 为什么要拆 Goal 和提示词

- Goal 是“到哪里算完成”，避免模型只做一半。
- 提示词是“怎么做”，包括角色、上下文、步骤、禁忌和输出格式。
- Acceptance 是“怎么验收”，最好能对应命令、截图、报告或文件路径。
- Commit 规则让长期任务不会变成一个巨大不可审查的改动。

## Codex 实现类模板

```text
Goal:
让 BING 的行动面板支持一键沿用上回合行动，并通过 UI agent 验证。

Context:
- 主要文件：apps/client/src/components/ActionPanel.tsx、apps/client/src/App.tsx
- 测试脚本：scripts/ui-playtest-agents.ts
- 设计方向：保持桌面信息可读，不新增大弹窗

Task:
1. 实现“沿用上回合”按钮。
2. 非法时给出清楚原因，合法时直接提交。
3. 更新 UI agent，让第 2 回合使用该按钮。
4. 跑 build 和 test:ui-agents。

Acceptance:
- 按钮只在有上回合行动时出现。
- 目标、技能、资源不足等非法情况不会静默失败。
- test:ui-agents 报告包含“沿用上回合”通过记录。

Commit:
功能和测试通过后 commit：Add repeat last action shortcut
```

## 子智能体评审模板

```text
Goal:
用子智能体评审当前 UI 是否像真实游戏，而不是只像网页工具。

Context:
- 只读，不修改文件。
- 重点看 docs/UI_DESIGN_PLAN.md、README.md、scripts/ui-playtest-agents.ts、最近 artifacts/playtests 报告。

Task:
请分别从以下视角输出修改建议：
1. 新手玩家：第一次玩是否知道下一步。
2. 竞技玩家：能否快速读局和复用操作。
3. 开发商/QA：哪些风险会影响发布。
4. 美术总监：角色、动效、桌面 UI 是否统一。

Acceptance:
- 每个视角至少 3 条观察。
- 输出 P0/P1/P2 修改建议。
- 指出哪些建议可以直接转成开发任务。

Commit:
如果整理成文档，commit：Document subagent UI review findings
```

## 长时间仓库任务模板

适合“持续做到某个时间，如果没完成就继续”的任务。关键是把完成边界、提交节奏、push 节奏和验证方式写清楚。

```text
Goal:
在 BING-game 中持续推进 {主题}，目标是在 {日期时间/时区} 前完成可验证版本；如果没有完成，就继续推进下一个最高优先级子任务。

Context:
- 工作区：C:\Users\haoyu\Desktop\bing\bing(1)\bing
- 分支：main
- 发布口径：适合受控公网试玩，不宣称正式公开发布
- 约束：README 使用中文；重要步骤单独 commit；push 约每 3 小时一次；不要回滚用户改动

Task:
1. 先检查 git status、README、package scripts、最新 playtest 报告。
2. 逐步完成 P0/P1 任务，每完成一个重要步骤就 commit。
3. 运行对应验证命令，并把报告路径写入文档。
4. 到 push 窗口再统一 push。

Acceptance:
- 工作区每个阶段都有清楚 commit。
- 关键命令通过，例如 typecheck、test:ci、test:ui-agents 或 test:ui-agents:complex。
- docs/PLAYTEST_REPORT.md、README.md 或 workflow/tasks/ 指向最新状态。
- 未完成事项进入下一步任务清单，而不是只写在聊天里。

Commit:
按功能/文档/验证拆 commit，不把无关改动混在一起。
```

## 多 Agent 组合模板

```text
Goal:
用子智能体从 4 个视角评审 BING 的 UI、动画、发布质量和美术方向，并把建议整理成可执行任务。

Context:
- 只读评审阶段不要修改文件。
- 必读：README.md、docs/UI_DESIGN_PLAN.md、docs/PLAYTEST_REPORT.md、最新 artifacts/playtests 报告。
- 角色：新手玩家、竞技玩家、开发商/QA、美术总监。

Task:
1. 新手玩家 Agent：找首次开房、前三回合、结算理解的困惑点。
2. 竞技玩家 Agent：找读局、快速操作、平衡和复玩问题。
3. 开发商/QA Agent：找 CI、发布、数据、安全和仓库边界问题。
4. 美术总监 Agent：找角色、牌桌、VFX、动画和风格统一问题。
5. 主 Agent 汇总成 P0/P1/P2 修改意见，并新建或更新 workflow/tasks。

Acceptance:
- 每个 agent 至少输出 3 条发现。
- 汇总结果包含“已处理 / 下一步 / 验收标准”。
- 至少 1 条建议被转成可验证任务或自动化门禁。

Commit:
整理成文档后 commit：Document multi-agent design review
```

## 美术 / Blender 模板

```text
Goal:
把默认 6 个角色推进到可提交的 blockout 资产里程碑，并明确它不是最终资产。

Context:
- 必读：docs/SUBAGENT_ART_DIRECTOR_BLENDER.md、workflow/docs/01-visual-bible.md
- 输出目录：apps/client/public/assets/characters/
- 审计文档：docs/CHARACTER_ASSET_AUDIT.md

Task:
1. 生成每角色 LOD0/LOD1 GLB。
2. 渲染 portrait、mobile-avatar、front、side、three-quarter、table-scale。
3. 在审计文档写清楚预算、来源、缺口和下一步。

Acceptance:
- 6 个角色文件齐全。
- LOD0/LOD1 预算在文档里可查。
- 审计文档明确“脚本生成，无外部真人肖像或未授权素材”。
- 头像在角色选择小尺寸下仍能识别。

Commit:
资产完整后 commit：Add Blender LOD and mobile avatar exports
```

## UI 设计方案模板

```text
Goal:
把战斗结算从“全屏说明”升级为“桌面内演出”。

Context:
- 参考 docs/UI_DESIGN_PLAN.md
- 相关模块：turnTimeline、TurnAnimation、SkillEffectLayer、PlayerSeat、TableScene3D、battleAudio

Task:
1. 定义统一 BattleDirector 数据层。
2. 把伤害、防御、反弹、技能、死亡映射成同一套 beat。
3. 在桌面内显示目标线、数值变化、hit-stop 和轻微镜头反应。

Acceptance:
- 玩家不看日志也能知道谁打谁、谁防住、谁掉血。
- reduced motion 模式不会丢失关键信息。
- UI agent 能截图验证目标线、资源 delta、canvas 非空和关键控件不遮挡。

Commit:
每完成一个表现层子系统单独 commit。
```

## 小技巧

- 一次只写一个主要 Goal，别把“改 UI、做动画、部署、写 README、训练 AI”塞进同一个 Goal。
- 需要长时间推进时，把 Goal 拆成阶段：P0 可玩、P1 像游戏、P2 可发布。
- 给模型具体路径比给抽象描述更好。
- 验收标准越像 checklist，越容易得到稳定结果。
- 如果涉及 git，提前写清楚 commit 和 push 频率。
