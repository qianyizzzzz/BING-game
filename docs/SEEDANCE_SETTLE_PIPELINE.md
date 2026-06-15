# Seedance 特效落盘管线

## 目的

Seedance 任务完成后，需要把返回的视频和封面整理成前端、审计脚本都能识别的固定结构：

```text
apps/client/public/assets/effects/{skillId}/poster.png
apps/client/public/assets/effects/{skillId}/effect.mp4
apps/client/public/assets/effects/{skillId}/effect.webm
```

## 命令

```powershell
npm run seedance:effects:settle -- --manifest=artifacts/seedance/effect-generation-tasks.json
```

常用参数：

- `--ffmpeg=<path>`：指定 ffmpeg 路径，用来把 `effect.mp4` 转成 `effect.webm`。
- `--skip-webm`：只下载 Seedance 返回文件，不转码；报告会把任务标记为 `partial` 并记录缺失原因。
- `--max-polls=<count>` / `--poll-delay-ms=<ms>`：调整轮询次数和间隔。

## 行为

- 如果 Seedance 返回 mp4，脚本会保存为 `effect.mp4`，并尝试用 ffmpeg 生成 `effect.webm`。
- 如果 Seedance 返回 webm，脚本会保存为 `effect.webm`，并在报告里提示 `effect.mp4` 仍缺失。
- 如果封面不是 png，脚本会保存为 `poster-source.{ext}`，并在报告里提示需要补 `poster.png`。
- 只有 `poster.png`、`effect.mp4`、`effect.webm` 都存在时，任务状态才会是 `downloaded`；否则是 `partial` 或 `pending`。

## 费用规则

提交或继续任何会消耗 Seedance / 图片生成 API 的批量任务前，必须估算人民币成本。预计达到或超过 10 元人民币时，需要先得到用户明确许可。

本 settle 脚本本身不会提交新任务；它只查询已有任务并下载结果。
