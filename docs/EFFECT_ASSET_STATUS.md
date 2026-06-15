# BING 技能特效资产状态

更新时间：2026-06-15

## 覆盖情况

| 项目 | 数量 |
| --- | ---: |
| 技能总数 | 120 |
| 已有特效文档 / prompt 的技能 | 120 |
| 关键帧 prompt 总数 | 480 |
| 已有完整落盘资产的技能 | 0 |
| 已有 4 张关键帧和 poster 的技能 | 1 |
| 缺任意文件的技能 | 120 |
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

## 命令

```powershell
npm run test:effect-assets -- --json
npm run effects:keyframes:plan -- --offset-skills=0 --limit-skills=5
npm run seedance:effects:plan -- --offset=76 --limit=1
```

提交 Seedance 前必须带预算估算：

```powershell
npm run seedance:effects:submit -- --offset=76 --limit=1 --estimated-cny-per-task=3
```

达到或超过 10 RMB 时必须先问用户。
