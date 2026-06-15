# Seedance / 视频生成 MCP 配置说明

本机 Codex 用户配置已添加 Seedance MCP：

```toml
[mcp_servers.seedance]
args = ["mcp-seedance"]
command = 'C:\Users\haoyu\.local\bin\uvx.exe'
startup_timeout_sec = 120
```

## 使用前置条件

1. 在 AceDataCloud 获取 `ACEDATACLOUD_API_TOKEN`。
2. 将 token 设置为 Windows 用户环境变量，不要写入仓库文件。
3. 重启 Codex 或新开会话，让 MCP 工具列表重新加载。

PowerShell 设置示例：

```powershell
[Environment]::SetEnvironmentVariable("ACEDATACLOUD_API_TOKEN", "你的-token", "User")
```

设置后重新打开 Codex。Seedance MCP 应提供视频生成、图片生视频、模型列表、任务查询等能力。

## 在 BING 中的用途

- 读取 `docs/EFFECT_ANIMATION_SPEC.md` 中每个技能的 4 张 imagegen 关键帧提示词。
- 用 Seedance 的图片生视频能力把 `keyframe-01.png` 到 `keyframe-04.png` 补成 0.8-1.6 秒技能动画。
- 输出到 `apps/client/public/assets/effects/{skillId}/effect.webm` 和 `effect.mp4`。
- 保留 `poster.png` 用作低性能设备或加载失败时的静帧。

## 注意事项

- 当前会话不会自动热加载新 MCP；配置完成后通常需要重启。
- 不要提交 token、生成平台账号信息或包含 Authorization header 的日志。
- 若本地 `uvx mcp-seedance` 首次启动较慢，可先重启 Codex 后让 MCP 由客户端按需启动。
