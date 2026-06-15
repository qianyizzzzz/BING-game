# BING 技能特效资产状态

更新时间：2026-06-15

## 当前结论

特效文档和 Prompt 清单已经覆盖全部 120 个技能，但最终可在游戏中播放的动画资产还没有完成。当前有 1 个技能具备 4 张关键帧和 poster，可作为 Seedance 输入样例；0 个技能具备完整 `effect.webm` / `effect.mp4` 动画资产。

这份状态由 `npm.cmd run effects:status` 生成，统计口径和 `npm.cmd run test:effect-assets -- --json` 对齐。

## 覆盖情况

| 项目 | 数量 |
| --- | ---: |
| 技能总数 | 120 |
| 已有逐技能特效文档 / Prompt 的技能 | 120 |
| 关键帧 Prompt 总数 | 480 |
| Seedance Prompt 总数 | 120 |
| 已有完整落盘资产的技能 | 0 |
| 已有 4 张关键帧和 poster 的技能 | 1 |
| 缺任意资产文件的技能 | 120 |
| 坏文件 / 尺寸错误 | 0 |

## 已有小样

| 技能 | 已有文件 | 缺失文件 | 备注 |
| --- | --- | --- | --- |
| `skill_78_18866` 火球 | `keyframe-01.png`、`keyframe-02.png`、`keyframe-03.png`、`keyframe-04.png`、`poster.png` | `effect.webm`、`effect.mp4` | 可作为 Seedance 关键帧输入验证样例 |

## 当前缺口

| 文件 | 缺失数量 |
| --- | ---: |
| `keyframe-01.png` | 119 |
| `keyframe-02.png` | 119 |
| `keyframe-03.png` | 119 |
| `keyframe-04.png` | 119 |
| `poster.png` | 119 |
| `effect.webm` | 120 |
| `effect.mp4` | 120 |

合计缺失资产文件：835。

## 安全命令

只生成计划，不调用付费 API：

```powershell
npm.cmd run test:effect-assets -- --json
npm.cmd run effects:status
npm.cmd run effects:keyframes:plan -- --offset-skills=0 --limit-skills=5 --estimated-cny-per-frame=0.5
npm.cmd run seedance:effects:plan -- --offset=76 --limit=1 --estimated-cny-per-task=3
```

提交 Seedance 前必须带预算估算：

```powershell
npm.cmd run seedance:effects:submit -- --offset=76 --limit=1 --estimated-cny-per-task=3
```

估算总额达到或超过 10 RMB 时，必须先向用户确认是否继续；获得明确许可后才可以继续提交付费任务。
