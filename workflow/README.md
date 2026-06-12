# Game Production Workflow

这个文件夹是游戏项目的“工作流指挥中心”。它不替代代码目录，也不替代 Figma 文件，而是让 Codex、Claude、Figma 和你自己围绕同一套目标、规则和验收标准工作。

## 目录结构

```text
workflow/
  README.md
  AGENTS.md
  CLAUDE.md
  docs/
    00-game-pillars.md
    01-visual-bible.md
    02-roadmap.md
    03-agent-rules.md
    04-steam-checklist.md
  tasks/
    TASK-template.md
    TASK-001-vertical-slice.md
    TASK-002-main-menu.md
  reviews/
    REVIEW-template.md
  playtests/
    PLAYTEST-template.md
  prompts/
    claude-spec.md
    codex-implement.md
    claude-review.md
    figma-design.md
    prompt-goal-combos.md
```

## 每个文件的作用

- `docs/00-game-pillars.md`：定义游戏最重要的体验目标，防止项目越做越散。
- `docs/01-visual-bible.md`：定义视觉、UI、颜色、字体、动效和禁忌风格。
- `docs/02-roadmap.md`：从原型、垂直切片、Demo 到 Steam 上架的路线图。
- `docs/03-agent-rules.md`：规定 Codex、Claude、Figma 的分工和协作边界。
- `../docs/SUBAGENT_ART_DIRECTOR_BLENDER.md`：美术总监 Agent 使用 Blender MCP 建模、优化和验收角色资产的规范。
- `docs/04-steam-checklist.md`：记录面向 Steam 上架需要补齐的事项。
- `tasks/TASK-template.md`：所有功能任务都从这个模板复制。
- `reviews/REVIEW-template.md`：Claude 或人工审查时使用。
- `playtests/PLAYTEST-template.md`：每次试玩记录反馈。
- `prompts/`：给 Codex、Claude、Figma 使用的标准提示词。
- `prompts/prompt-goal-combos.md`：把目标、上下文、验收标准和 commit 规则组合成稳定提示词的中文模板。
- `AGENTS.md`：给 Codex 的项目规则参考。
- `CLAUDE.md`：给 Claude 的项目规则参考。

## 推荐工作流

```text
想法
  -> Claude 拆成任务规格
  -> Figma 做关键界面和状态
  -> Codex 实现并验证
  -> Claude 审查
  -> Codex 修复
  -> 你试玩确认
  -> 更新 Visual Bible 和 Roadmap
```

每个功能都应该有一个任务文件，例如：

```text
workflow/tasks/TASK-003-inventory.md
```

任务文件必须写清楚：

- 目标是什么
- 为什么要做
- 玩家流程是什么
- Figma 输入是什么
- Codex 可以改哪些文件
- 验收标准是什么
- 如何验证

没有验收标准的任务，不建议直接交给 Codex 开发。

## Agent 分工

### Codex

负责实现、集成、修 bug、跑项目、跑测试、检查截图和构建结果。

适合给 Codex 的任务：

```text
请根据 workflow/tasks/TASK-XXX.md 和 Figma frame，实现这个功能。
完成后运行项目，检查 UI 是否重叠，并汇报改动文件和验证结果。
```

### Claude

负责拆需求、写规格、审玩法、审 UI、做代码和体验审查。

适合给 Claude 的任务：

```text
请根据 workflow/docs/00-game-pillars.md 和 workflow/docs/01-visual-bible.md，
把这个想法拆成 workflow/tasks/TASK-template.md 格式的任务。
```

### Figma

负责视觉方向、界面布局、组件状态、颜色、字体、图标和交互动效说明。

Figma 任务至少应该包含：

- 默认状态
- hover 状态
- selected / controller focus 状态
- disabled 状态
- 小屏幕布局
- 组件命名

### Blender / 美术总监 Agent

负责角色 3D 建模、材质优化、turnaround、头像裁切和资产验收。目标是把默认角色和玩家形象从 placeholder 推进到接近真人比例的半写实游戏角色。

适合给美术总监 Agent 的任务：

```text
请读取 docs/SUBAGENT_ART_DIRECTOR_BLENDER.md 和 workflow/docs/01-visual-bible.md，
使用 Blender MCP 为 ember-guardian 建立半写实 3D 角色模型。
完成后导出 .blend、.glb、头像、三视图，并生成 artifacts/art/ember-guardian-review.md。
```

## Figma MCP 使用方式

本机已经建议使用本地 Figma MCP：

```text
figma-desktop -> http://127.0.0.1:3845/mcp
```

使用前确认：

1. Figma Desktop 已打开。
2. 已进入 Dev Mode。
3. Desktop MCP server 已启用。
4. Codex 或 Claude 使用新会话加载 MCP。

## Blender MCP 使用方式

Blender 建模任务需要先确认本机会话里已经暴露 Blender MCP。当前项目本机已准备：

1. Blender 便携版：`tools/blender/blender-4.5.0-windows-x64/blender.exe`。
2. Blender MCP add-on：`tools/blender/blender-mcp/addon.py`。
3. MCP server：`uvx blender-mcp`。
4. Socket 默认端口：`localhost:9876`。
5. 建模前读取 `docs/SUBAGENT_ART_DIRECTOR_BLENDER.md`。

如果 Codex 工具栏还看不到 Blender MCP，先重启/刷新 MCP 客户端。Agent 可以使用本地 BlenderMCP socket 做初稿，但不能声称完成最终真人级模型。

常用请求：

```text
请使用 figma-desktop 读取我当前选中的 Figma frame，并总结布局、颜色、字体和组件状态。
```

```text
请使用 figma-desktop 读取这个 Figma frame，然后根据 workflow/tasks/TASK-XXX.md 实现 UI。
```

## 每周节奏

建议每周只追一个清晰目标。

```text
周一：确定本周目标，Claude 拆任务。
周二：Figma 做视觉稿和状态。
周三：Codex 实现第一个任务。
周四：Codex 实现第二个任务，Claude 审查。
周五：你试玩，记录 playtest。
周末：修关键问题，更新文档和路线图。
```

每周必须留下一个可见产物：

- 一段可玩流程
- 一组 UI 截图
- 一段 30 秒录屏
- 一个 Steam 页面素材草稿
- 一份 playtest 记录

## 如何开始

建议从 `TASK-001-vertical-slice.md` 开始。

1. 填写 `docs/00-game-pillars.md`。
2. 填写 `docs/01-visual-bible.md`。
3. 补充 `tasks/TASK-001-vertical-slice.md`。
4. 让 Claude 审一次任务规格。
5. 在 Figma 做一个关键界面。
6. 让 Codex 实现并截图验证。

如果希望 Codex 和 Claude 在项目根目录自动读取规则，可以把 `workflow/AGENTS.md` 和 `workflow/CLAUDE.md` 的内容合并到项目根目录对应文件中。当前先放在 `workflow/` 内，避免覆盖已有项目规则。
