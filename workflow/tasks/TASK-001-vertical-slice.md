# TASK-001: Vertical Slice

## Status

`Spec Needed`

## Goal

做出一段 5-10 分钟、能代表最终游戏体验的垂直切片。

## Why

垂直切片是后续 Steam 页面、Demo、预告片、玩家测试和制作判断的基础。如果这一段站不住，继续扩内容会放大风险。

## Player Flow

1. 玩家进入主菜单。
2. 玩家开始新游戏。
3. 玩家经历一个短但完整的核心玩法循环。
4. 玩家遇到一次明确挑战。
5. 玩家获得反馈、奖励或推进。
6. 玩家到达一个阶段结束、失败或结算界面。

## Design Input

Figma link:

```text
TODO: 主菜单、HUD、结算界面、失败界面。
```

Reference screenshots:

```text
TODO
```

Visual Bible sections:

```text
TODO: Keywords, Color Tokens, HUD, Button, Panel。
```

## Required States

- [ ] Main menu default
- [ ] Main menu hover
- [ ] Main menu selected / controller focus
- [ ] Gameplay HUD
- [ ] Pause menu
- [ ] Failure state
- [ ] Success or summary state
- [ ] Loading or transition state

## Implementation Scope

Allowed files/modules:

```text
TODO: 填写允许 Codex 修改的目录。
```

Do not touch:

```text
TODO: 填写核心系统禁区。
```

## Acceptance Criteria

- [ ] 玩家可以从主菜单开始一局。
- [ ] 玩家可以完成一次核心循环。
- [ ] 玩家可以失败，并看到失败反馈。
- [ ] 玩家可以完成阶段目标，并看到阶段反馈。
- [ ] UI 有接近最终方向的视觉风格。
- [ ] 暂停和退出路径可用。
- [ ] 1920x1080 下 UI 不重叠。
- [ ] 1366x768 下 UI 不重叠。
- [ ] Steam Deck-like 分辨率风险已检查。
- [ ] 可录制一段 30-60 秒展示视频。

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

- [ ] 从启动到进入游戏。
- [ ] 完成一次核心循环。
- [ ] 触发失败。
- [ ] 触发成功或结算。
- [ ] 调整分辨率后查看 UI。

Screenshot required:

```text
Yes
```

## Notes

先追“能代表游戏”的一段体验，不要为了垂直切片扩太多系统。
