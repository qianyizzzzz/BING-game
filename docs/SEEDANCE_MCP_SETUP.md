# Seedance / 视频生成配置说明

本项目当前有两条可能的 Seedance 接入路线：

1. **AceDataCloud 代理接口**：仓库脚本目前默认使用这条路线。
2. **火山引擎官方 Ark / AI Hub 接口**：如果购买的是火山引擎页面里的 Seedance 2.0 套餐，需要另行适配官方接口参数。

> 当前 `scripts/seedance-effect-batch.ts` 和 `scripts/seedance-effect-settle.ts` 读取的是 `ACEDATACLOUD_API_TOKEN`，不是火山引擎官方的 Ark Key。

## 当前仓库默认路线：AceDataCloud

PowerShell 临时配置，只对当前窗口有效：

```powershell
$env:ACEDATACLOUD_API_TOKEN="你的 AceDataCloud token"
$env:ACEDATACLOUD_API_BASE_URL="https://api.acedata.cloud"
```

长期配置到当前 Windows 用户环境变量：

```powershell
[Environment]::SetEnvironmentVariable("ACEDATACLOUD_API_TOKEN", "你的 AceDataCloud token", "User")
[Environment]::SetEnvironmentVariable("ACEDATACLOUD_API_BASE_URL", "https://api.acedata.cloud", "User")
```

配置后需要重新打开 PowerShell；如果是给 Codex MCP 用，通常也需要重启 Codex 或新开会话。

检查是否生效：

```powershell
[bool]$env:ACEDATACLOUD_API_TOKEN
$env:ACEDATACLOUD_API_BASE_URL
```

## 火山引擎官方购买页

如果你在 `https://ai.volcengine.com/activity/seedance2` 这类页面购买，先确认套餐是否支持 **API 调用**，而不是只支持网页端生成。

购买后通常会拿到火山引擎自己的 API Key / Ark Key / Endpoint 信息。当前仓库脚本不会自动读取这些变量；需要新增或改造一个官方接口适配层，再决定使用类似下面的变量名：

```powershell
$env:VOLCENGINE_ARK_API_KEY="你的火山引擎 Ark Key"
$env:VOLCENGINE_SEEDANCE_MODEL="官方模型 ID"
```

在官方接口适配完成前，不要把火山引擎 Key 填到 `ACEDATACLOUD_API_TOKEN`，否则脚本会把它当 AceDataCloud token 发送到错误的 API 域名。

## Codex MCP 配置

本机 Codex 用户配置中已加入 Seedance MCP 入口：

```toml
[mcp_servers.seedance]
args = ["mcp-seedance"]
command = 'C:\Users\haoyu\.local\bin\uvx.exe'
startup_timeout_sec = 120
```

如需给 MCP 默认参数，可在 `C:\Users\haoyu\.codex\config.toml` 中使用：

```toml
[mcp_servers.seedance.env]
ACEDATACLOUD_API_BASE_URL = "https://api.acedata.cloud"
SEEDANCE_DEFAULT_MODEL = "doubao-seedance-1-0-pro-fast-251015"
SEEDANCE_DEFAULT_RESOLUTION = "480p"
SEEDANCE_DEFAULT_RATIO = "16:9"
SEEDANCE_DEFAULT_DURATION = "2"
SEEDANCE_REQUEST_TIMEOUT = "1800"
LOG_LEVEL = "INFO"
```

不要把真实 token 写进仓库文件。token 放 Windows 用户环境变量或本机私有配置里。

## BING-game 的使用流程

只生成计划，不消耗 API：

```powershell
npm.cmd run seedance:effects:plan -- --offset=76 --limit=1 --estimated-cny-per-task=3
```

提交任务，会消耗 API：

```powershell
npm.cmd run seedance:effects:submit -- --offset=76 --limit=1 --estimated-cny-per-task=3
```

查询并下载已有任务结果：

```powershell
npm.cmd run seedance:effects:settle -- --manifest=artifacts/seedance/effect-generation-tasks.json
```

输出约定：

```text
apps/client/public/assets/effects/{skillId}/poster.png
apps/client/public/assets/effects/{skillId}/effect.mp4
apps/client/public/assets/effects/{skillId}/effect.webm
```

## 费用规则

- `plan` 不调用付费 API。
- `submit` 会调用付费 API。
- 批量提交前必须写明 `--estimated-cny-per-task`。
- 预计或累计达到 **10 元人民币** 前，必须先得到用户明确许可。

## 安全事项

- 不要提交 token、账号信息、Authorization header 或带密钥的日志。
- 不要把火山引擎官方 Key 和 AceDataCloud token 混用。
- 如果购买的是火山引擎官方套餐，先完成官方接口适配，再批量提交。
