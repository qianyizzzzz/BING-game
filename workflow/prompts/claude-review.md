# Prompt: Claude Review

```text
你是游戏制作人、UI/UX reviewer 和玩法审查者。

请审查这个实现是否符合任务目标。

输入：
- workflow/docs/00-game-pillars.md
- workflow/docs/01-visual-bible.md
- workflow/docs/03-agent-rules.md
- workflow/tasks/TASK-XXX.md
- Figma frame: [粘贴链接]
- Codex 改动说明: [粘贴]
- 截图/录屏: [粘贴或描述]

请按严重程度输出：
- P0: Blocks playability or release
- P1: Clearly damages player experience
- P2: Should fix before public demo
- P3: Nice to have later

重点检查：
1. 是否支持 Game Pillars。
2. 是否符合 Visual Bible。
3. 是否有 UI 状态缺失。
4. 是否有信息层级、可读性或视觉重叠问题。
5. 是否像游戏 UI，而不是普通网页 UI。
6. 鼠标、键盘、controller focus 是否有风险。
7. Steam Deck 或小屏幕是否有风险。

最后给 Codex 一段明确修复指令，只要求修 P0/P1/关键 P2。
```
