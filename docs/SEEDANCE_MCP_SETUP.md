# Seedance / 视频生成配置说明

本项目现在支持两条 Seedance 接入路线：

1. **火山引擎 Ark 官方接口**：适用于你截图里的「快速 API 接入」，推荐当前项目优先使用。
2. **AceDataCloud 代理接口**：保留兼容，只有在你确实使用 AceDataCloud token 时才走这条路线。

不要把火山引擎 Ark Key 填到 `ACEDATACLOUD_API_TOKEN`，否则脚本会把它发送到错误的 API 域名。

## 火山引擎 Ark 配置

你截图里的关键信息是：

- API Base: `https://ark.cn-beijing.volces.com/api/v3`
- Submit Endpoint: `/contents/generations/tasks`
- Model: `doubao-seedance-2-0-260128`
- Header: `Authorization: Bearer $ARK_API_KEY`

PowerShell 临时配置，只对当前窗口有效：

```powershell
$env:ARK_API_KEY="你的火山引擎 API Key"
$env:SEEDANCE_PROVIDER="volcengine"
$env:SEEDANCE_API_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
$env:SEEDANCE_DEFAULT_MODEL="doubao-seedance-2-0-260128"
```

长期配置到当前 Windows 用户环境变量：

```powershell
[Environment]::SetEnvironmentVariable("ARK_API_KEY", "你的火山引擎 API Key", "User")
[Environment]::SetEnvironmentVariable("SEEDANCE_PROVIDER", "volcengine", "User")
[Environment]::SetEnvironmentVariable("SEEDANCE_API_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3", "User")
[Environment]::SetEnvironmentVariable("SEEDANCE_DEFAULT_MODEL", "doubao-seedance-2-0-260128", "User")
```

配置后需要重新打开 PowerShell；如果给 Codex MCP 使用，通常也需要重启 Codex 或新开会话。

检查是否生效：

```powershell
[bool]$env:ARK_API_KEY
$env:SEEDANCE_PROVIDER
$env:SEEDANCE_DEFAULT_MODEL
```

你也可以用 `VOLCENGINE_ARK_API_KEY` 代替 `ARK_API_KEY`。脚本会优先读取 `VOLCENGINE_ARK_API_KEY`，其次读取 `ARK_API_KEY`。

## BING-game 使用流程

只生成计划，不消耗 API：

```powershell
npm.cmd run seedance:effects:plan -- --provider=volcengine --offset=76 --limit=1 --estimated-cny-per-task=3
```

如果使用图片关键帧，火山 Ark 要求每个 `image_url` 内容带官方支持的 `role`。官方文档明确首帧图片使用 `first_frame`，尾帧图片使用 `last_frame`。因此当前脚本默认只向 Ark 发送第 1 张和第 4 张关键帧；中间关键帧保留在提示词和本地素材里，用于描述运动过程。

```powershell
npm.cmd run seedance:effects:plan -- --provider=volcengine --offset=76 --limit=1 --estimated-cny-per-task=3 --image-slots=1,4 --image-roles=first_frame,last_frame
```

提交任务，会消耗 API：

```powershell
npm.cmd run seedance:effects:submit -- --provider=volcengine --offset=76 --limit=1 --estimated-cny-per-task=3
```

查询并下载已有任务结果：

```powershell
npm.cmd run seedance:effects:settle -- --provider=volcengine --manifest=artifacts/seedance/effect-generation-tasks.json
```

settle 报告只写入任务 id、状态、模型、用量和下载文件路径等安全摘要，不保存临时视频 URL、签名参数、prompt 或密钥。可用下面的预算/报告门禁复查：

```powershell
npm.cmd run test:effect-budget
```

同步费用台账，只写入安全字段，不保存 prompt、URL 或密钥：

```powershell
npm.cmd run effects:spend:sync
```

输出约定：

```text
apps/client/public/assets/effects/{skillId}/poster.png
apps/client/public/assets/effects/{skillId}/effect.mp4
apps/client/public/assets/effects/{skillId}/effect.webm
```

## AceDataCloud 兼容配置

只有你使用 AceDataCloud token 时才需要：

```powershell
[Environment]::SetEnvironmentVariable("ACEDATACLOUD_API_TOKEN", "你的 AceDataCloud token", "User")
[Environment]::SetEnvironmentVariable("ACEDATACLOUD_API_BASE_URL", "https://api.acedata.cloud", "User")
[Environment]::SetEnvironmentVariable("SEEDANCE_PROVIDER", "acedata", "User")
```

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
SEEDANCE_PROVIDER = "volcengine"
SEEDANCE_API_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
SEEDANCE_DEFAULT_MODEL = "doubao-seedance-2-0-260128"
SEEDANCE_DEFAULT_RESOLUTION = "480p"
SEEDANCE_DEFAULT_RATIO = "16:9"
SEEDANCE_DEFAULT_DURATION = "2"
SEEDANCE_REQUEST_TIMEOUT = "1800"
LOG_LEVEL = "INFO"
```

不要把真实 token 写进仓库文件。token 放 Windows 用户环境变量或本机私有配置里。

## 费用规则

- `plan` 不调用付费 API。
- `submit` 会调用付费 API。
- 批量提交前必须写明 `--estimated-cny-per-task`。
- 累计费用默认读取 `docs/PAID_API_SPEND_LEDGER.json`；如需临时覆盖，可传 `--prior-spend-cny=<金额>` 或设置 `PAID_API_PRIOR_SPEND_CNY`。
- 预计或累计达到 **10 元人民币** 前，必须先得到用户明确许可。
- 成功生成后必须把任务 id、估算费用或实际费用、技能 id 和 provider 写回 `docs/PAID_API_SPEND_LEDGER.json`；可以用 `npm.cmd run effects:spend:sync` 从本地结果自动同步。
- 本地 `artifacts/seedance/effect-settle-report.json` 也必须保持脱敏；`npm.cmd run test:effect-budget` 会检查报告里没有临时视频 URL、签名参数、Bearer、API key 或 token。

## 安全事项

- 不要在聊天、README、commit、日志里暴露 API Key。
- 不要提交 Authorization header 或带密钥的请求日志。
- 先跑 1 个技能闭环样例，再分批生成全部技能动画。
