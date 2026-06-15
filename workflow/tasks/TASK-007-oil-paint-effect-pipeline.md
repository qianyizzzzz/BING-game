# TASK-007：油画特效关键帧与 Seedance 动画管线

## 目标

把 BING-game 的技能、攻击、防御、治疗等特效从 CSS 几何光效升级为“油画颜料 + 透明装置”的动画资产。

## 推荐流程

1. 使用 imagegen 生成每个特效的 3-5 张关键帧。
2. 将关键帧送入 Seedance 或同类视频补帧工具，生成 0.8-1.6 秒短动画。
3. 导出 `webm`、`mp4`、`poster.png`，前端优先播放视频，失败时显示 poster。
4. 每个特效都要做桌面距离、移动端和低性能回退 QA。

## 2026-06-15 动画设计复审缺口

当前已经有全技能规格和 prompt manifest，但还不是完整生产线：

- `scripts/effect-keyframe-batch.ts` 目前只生成 plan/jsonl，还没有真正调用 imagegen 并把 480 张关键帧落盘。
- `scripts/seedance-effect-batch.ts` 已能按关键帧齐备和 10 元人民币阈值保护任务，但 payload 仍主要是文本 prompt；下一步必须把 4 张关键帧作为 Seedance 支持的图片输入或可访问 URL 传入。
- `scripts/seedance-effect-settle.ts` 目前只下载 `effect.mp4` 和 poster，不会生成合同要求的 `effect.webm`。
- `scripts/effect-asset-audit.ts` 目前只检查文件存在，不检查 PNG 尺寸、透明区、MP4/WebM 可解码、时长、帧率和 poster 来源。
- 55 个未接入 `play` 的技能即使有视觉资产，也还需要运行时触发点，否则锁定/被动/系统反馈不会播放。

下一步 P0 验收：

1. 火球小样必须通过 keyframe 图片输入 Seedance，而不是只传文本。
2. settle 后同一技能目录里同时存在 `effect.mp4`、`effect.webm`、`poster.png`。
3. `npm run test:effect-assets -- --json` 能区分“文件缺失”和“文件存在但不可解码/尺寸错误”。
4. 批量调度按 `only missing and keyframes complete` 选任务，不要先 `offset/limit` 后过滤导致空跑。

## 首批特效

| id | 用途 | 关键帧方向 |
| --- | --- | --- |
| `sha-splash` | 攻击命中 | 红色油彩从目标点向外飞溅，末尾留下细小颜料斑点 |
| `defense-ripple` | 防御 | 青绿色透明液体形成圆形波纹，像亚克力盘上的水波 |
| `rebound-snap` | 反弹 | 蓝黑细线绷紧后回弹，带少量油彩拖痕 |
| `heal-bloom` | 治疗 | 暖黄和白色颜料从中心柔和晕开，边缘轻微发亮 |

## 资产路径

```text
apps/client/public/assets/effects/{effectId}/keyframe-01.png
apps/client/public/assets/effects/{effectId}/keyframe-02.png
apps/client/public/assets/effects/{effectId}/keyframe-03.png
apps/client/public/assets/effects/{effectId}/poster.png
apps/client/public/assets/effects/{effectId}/effect.webm
apps/client/public/assets/effects/{effectId}/effect.mp4
```

## 验收标准

- 不再像圆形 SVG、发光渐变或程序粒子。
- 有明确油画笔触、颜料厚度、透明液体或装置反光。
- 不遮挡 HP、饼数、目标线和提交状态超过 500ms。
- 动画在 reduced motion 下可回退到 poster frame。
- 文件体积可控，单个 `webm` 建议小于 1.5MB。
