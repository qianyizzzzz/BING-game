# BING 发布清单

日期：2026-06-13

当前结论：项目适合受控公网试玩；正式公开发布前仍需补多人集火/公网 tunnel 浏览器门禁、安全白名单、持久化策略、许可证和资产权属。

## 0. 最新本地验证

2026-06-14 07:08 本地拆分门禁已通过：

- `npm run test:ci`
- `npm run test:release-assets:dist`
- 默认 UI agent：`artifacts/playtests/ui-agents-2026-06-14T01-01-35-676Z/report.md`
- 复杂技能 UI agent：`artifacts/playtests/ui-agents-2026-06-14T01-15-06-505Z/report.md`
- 重连/观战 smoke：`artifacts/playtests/reconnect-spectator-2026-06-13T23-43-00-536Z/report.md`
- 短限时自动兜底 smoke：`artifacts/playtests/timeout-fallback-2026-06-14T00-33-52-581Z/report.md`
- 角色浏览器：`artifacts/playtests/character-runtime-2026-06-13T23-56-29-228Z/report.md`

说明：`npm run verify:release` 已拆成“先 build 一次，再运行 `verify:release:run`”。日常单项命令仍会自行构建 client；发布或 CI 环境可以调用 `test:ui-agents:run`、`test:ui-agents:complex:run`、`test:ui-agents:reconnect:run`、`test:ui-agents:timeout:run`、`test:character-browser:run` 复用已构建 dist，降低超时概率。

## 1. Clean Clone 验证

- 使用 Node.js 24 和 npm 10+。
- 从空目录 clone 仓库。
- 运行 `npm ci`。
- 运行 `npm run build`。
- 运行 `npm run test:ci`。
- 发布前运行 `npm run verify:release`，完整覆盖默认 UI、复杂技能、角色浏览器和发布资产边界；如果环境有严格超时，先 `npm run build`，再分段运行 `npm run verify:release:run` 中的子命令。
- 本地需要浏览器验收时运行 `npm run test:ui-agents`、`npm run test:ui-agents:complex`、`npm run test:ui-agents:reconnect`、`npm run test:ui-agents:timeout` 和 `npm run test:character-browser`。
- GitHub Actions 可夜间运行默认 UI agents 与复杂技能 smoke，并可手动运行角色浏览器、重连/观战、短限时自动兜底验收；报告和截图会作为 artifacts 上传。

通过标准：构建和测试均通过；Vite 大 chunk 警告可接受，但需要记录为后续性能优化项。

## 2. 本地试玩

- 运行 `npm run dev`，确认前端 `5173` 和后端 `3001` 可访问。
- 创建房间、加入房间、开始游戏、提交三回合行动。
- 运行复杂技能 smoke，确认火箭双目标 HUD 和座位映射仍通过。
- 运行短限时自动兜底 smoke，确认 5 秒限时下未操作真人会被服务端自动记为吃饼、训练样本不丢失、页面推进到后续回合。
- 检查 3D canvas、角色 GLB、目标预览、新手结算摘要、控制台错误。

通过标准：无 console/page error，无 UI agent 视觉告警。

## 3. 受控公网试玩

- 运行 `npm run public`。
- 把生成的 `https://*.trycloudflare.com` 链接发给测试玩家。
- 多设备加入同一房间，至少完成 3 回合。
- 试玩期间保持终端窗口打开。

通过标准：外网玩家可加载页面、Socket.IO 正常连接、房间状态同步、复盘可生成。

## 4. 正式公网部署

- 复制 `.env.example` 为 `.env`。
- 设置 `PUBLIC_ORIGINS` 为正式域名。
- 保持 `ALLOW_TUNNEL_ORIGINS=false`；只有临时 `npm run public` 试玩才开启 tunnel 自动放行。
- 设置 `PUBLIC_DIR=apps/client/dist`。
- 设置 `ACCOUNT_DATA_FILE` 到持久化磁盘路径。
- 使用 Nginx/Caddy 提供 HTTPS，并反代到 `localhost:3001`。

通过标准：随机 Origin 的连接不能加入正式房间；正式域名和 localhost 调试路径可用。

## 5. Docker 部署

```bash
docker build -t bing-card-game .
docker run -p 3001:3001 -v bing-data:/app/data bing-card-game
```

通过标准：容器重启后账号和复盘数据仍存在；`/health` 返回成功；浏览器能进入游戏。

## 6. 数据与备份

- `data/` 必须挂载到稳定磁盘或 Docker volume。
- 每次公开试玩前备份 `data/accounts` 和 `data/matches`。
- 当前不支持多实例共享本地 JSON 数据；多实例部署前需要接数据库。

通过标准：重启服务后房间复盘、账号数据和训练样本仍可读取。

## 7. 发布前阻断项

- 补充正式 `LICENSE` 和资产权属说明。
- 明确角色 GLB、贴图、截图、技能表来源。
- 保持公开战斗画面没有 `/assets/placeholders/` 网络请求。
- 发布产物不得包含 `*.blend*` 或 `assets/characters/source/`；源场景只保留在 `tools/blender/source/`。
- 扩展浏览器级 CI：复杂技能 smoke 已纳入夜间 workflow；重连/观战和短限时自动兜底 smoke 已加入手动 workflow；继续把响应窗口和多人集火加入可选 workflow，并上传报告和截图。
- 做一次移动端 360px/375px/390px/430px 截图 QA。

通过标准：阻断项全部关闭后，才把项目描述从“受控试玩”改为“公开发布”。

## 8. 回滚

- 保留最近一次通过 `npm run build && npm run test:ci` 的 commit。
- 发布失败时回退到上一 commit，重新构建并重启服务。
- Docker 部署时保留上一版镜像 tag。

通过标准：15 分钟内能恢复到上一版可试玩状态。
