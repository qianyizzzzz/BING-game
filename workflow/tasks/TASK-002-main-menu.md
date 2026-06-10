# TASK-002: Main Menu

## Status

`Design Needed`

## Goal

实现一个符合游戏视觉方向的主菜单，包含开始、设置、退出，并支持鼠标、键盘和 controller focus。

## Why

主菜单是玩家第一眼看到的游戏体验，也是后续截图、录屏、Steam 页面视觉方向的重要基础。

## Player Flow

1. 玩家启动游戏。
2. 玩家看到游戏名和主菜单。
3. 玩家可以选择开始游戏、进入设置或退出。
4. 鼠标悬停和键盘/手柄选择都有明确反馈。
5. 进入设置后可以返回主菜单。

## Design Input

Figma link:

```text
TODO
```

Reference screenshots:

```text
TODO
```

Visual Bible sections:

```text
Button, Panel, Typography, Color Tokens, Motion
```

## Required States

- [ ] Default
- [ ] Hover
- [ ] Pressed
- [ ] Selected
- [ ] Disabled
- [ ] Settings open
- [ ] Controller focus
- [ ] Small screen layout

## Implementation Scope

Allowed files/modules:

```text
TODO: 填写主菜单相关目录。
```

Do not touch:

```text
TODO: 填写不应改动的核心玩法目录。
```

## Acceptance Criteria

- [ ] 主菜单可显示。
- [ ] 开始按钮可进入游戏或当前可用流程。
- [ ] 设置按钮可打开设置界面或占位设置面板。
- [ ] 退出按钮行为符合当前平台限制。
- [ ] hover、pressed、selected 状态可区分。
- [ ] 1920x1080、1366x768 下文字不溢出。
- [ ] 小屏幕下按钮不重叠。
- [ ] 菜单不像普通网页后台。

## Verification

Build command:

```text
TODO
```

Test command:

```text
TODO
```

Manual checks:

- [ ] 鼠标操作全部按钮。
- [ ] 键盘切换焦点。
- [ ] 设置打开和返回。
- [ ] 小屏幕布局检查。

Screenshot required:

```text
Yes
```

## Notes

这个任务适合跑完整工作流：Claude 拆规格，Figma 出状态，Codex 实现，Claude 审查，Codex 修复。
