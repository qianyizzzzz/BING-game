# TASK-007：油画特效关键帧与 Seedance 动画管线

## 目标

把 BING-game 的技能、攻击、防御、治疗等特效从 CSS 几何光效升级为“油画颜料 + 透明装置”的短动画资产。每个技能都需要：

- 4 张关键帧：`keyframe-01.png` 到 `keyframe-04.png`
- 1 张封面：`poster.png`
- 1 个视频：`effect.mp4`
- 1 个前端优先播放版本：`effect.webm`
- 1 条 Seedance prompt
- 清晰的触发/目标/遮挡验收规则

## 当前事实

截至 2026-06-15：

- `docs/EFFECT_ANIMATION_PROMPTS.json` 已覆盖 120 个技能。
- 每个技能都有 4 条关键帧 prompt，共 480 条关键帧任务。
- 每个技能都有 Seedance prompt。
- `scripts/seedance-effect-batch.ts` 已支持把本地关键帧 PNG 作为 `image_url` data URL 传给 Seedance，不再只是提交文本 prompt。
- `scripts/seedance-effect-batch.ts` 保留 10 RMB 预算闸门；估算达到或超过 10 RMB 时必须先问用户。
- 实际落盘资产还远未完成：当前只有 `skill_78_18866`（火球）有 4 张 keyframe 和 poster，所有技能都缺 `effect.webm` 和 `effect.mp4`。
- `scripts/effect-asset-audit.ts` 已能区分缺文件与坏文件，并检查 PNG 尺寸/签名、MP4/WebM 基础签名。

## 当前审计摘要

最新命令：

```powershell
npm run test:effect-assets -- --json
```

最新结果：

```text
totalSkills: 120
completeSkills: 0
missingSkills: 120
invalidSkills: 0
totalMissingFiles: 835
missing keyframe-01.png: 119
missing keyframe-02.png: 119
missing keyframe-03.png: 119
missing keyframe-04.png: 119
missing poster.png: 119
missing effect.webm: 120
missing effect.mp4: 120
```

火球小样：

```text
skill_78_18866 火球
existing: keyframe-01.png, keyframe-02.png, keyframe-03.png, keyframe-04.png, poster.png
missing: effect.webm, effect.mp4
invalid: none
```

## 推荐流程

1. 使用 image generation 生成每个技能的 4 张油画关键帧。
2. 每个技能的关键帧保持同一构图：起势、展开/命中、峰值、消散。
3. 用 Seedance 或同类视频补帧工具把 4 张关键帧补成 0.8-1.6 秒短动画。
4. settle 后保存 `effect.mp4`、`effect.webm`、`poster.png`。
5. 用 `npm run test:effect-assets -- --json` 做资产审计。
6. 前端播放视频；失败或 reduced motion 时回退到 poster。

## 生成命令

规划关键帧：

```powershell
npm run effects:keyframes:plan -- --offset-skills=0 --limit-skills=5
```

只规划缺失关键帧：

```powershell
npm run effects:keyframes:plan -- --offset-skills=0 --limit-skills=5 --limit-frames=20
```

规划 Seedance 任务：

```powershell
npm run seedance:effects:plan -- --offset=76 --limit=1
```

提交 Seedance 任务前必须估算人民币单价：

```powershell
npm run seedance:effects:submit -- --offset=76 --limit=1 --estimated-cny-per-task=3
```

如果估算总价达到或超过 10 RMB，脚本会阻止提交。除非用户明确批准，不要加 `--allow-over-budget`。

## P0 缺口

1. 还没有批量 image generation 落盘 119 个技能的关键帧。
2. 火球已有关键帧，但还没有生成 `effect.mp4` / `effect.webm`。
3. `scripts/seedance-effect-settle.ts` 仍需要把下载的 mp4 转成 webm，或记录无法转码的原因。
4. 55 个 visual-only / 非主动技能需要运行时触发点，否则即使有资产也不会播放。
5. 前端还需要确认所有技能 fallback 到 poster 的路径，并在 reduced motion 下不播放视频。

## 资产路径

```text
apps/client/public/assets/effects/{skillId}/keyframe-01.png
apps/client/public/assets/effects/{skillId}/keyframe-02.png
apps/client/public/assets/effects/{skillId}/keyframe-03.png
apps/client/public/assets/effects/{skillId}/keyframe-04.png
apps/client/public/assets/effects/{skillId}/poster.png
apps/client/public/assets/effects/{skillId}/effect.webm
apps/client/public/assets/effects/{skillId}/effect.mp4
```

## 验收标准

- 不再像圆形 SVG、发光渐变或程序粒子。
- 有明确油画笔触、颜料厚度、透明液体或装置反光。
- 不遮挡 HP、饼数、目标线和提交状态超过 500ms。
- 动画在 reduced motion 中可回退到 poster frame。
- `npm run test:effect-assets -- --json` 中 `invalidAssets` 必须为 0。
- 单个 `webm` 建议小于 1.5MB。
