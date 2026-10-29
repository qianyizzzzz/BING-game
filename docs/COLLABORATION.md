# 双人协作与免费公网测试

以 GitHub 中已经合并的版本作为共同基线。每个人在自己的电脑上使用自己的开发助手修改项目，通过独立分支和合并申请共享成果。

## 开通仓库权限

仓库所有者在 GitHub 仓库的 `Settings → Collaborators → Add people` 中邀请另一位开发者；对方接受后才能推送分支。浏览器登录和 Git 登录不等于获得某个仓库的写入权限。遇到 `Permission denied` 或 HTTP 403 时，由所有者添加协作者，或者使用已经有权限的账号登录；不要强制推送或覆盖远端。

## 日常协作

1. 开工前检查本地改动，并获取远端最新版本。保留未提交内容，先提交或妥善暂存，再更新分支。
2. 每项任务建立独立分支，例如 `feature/fusion-effects` 或 `design/table-art`。
3. 默认分工：规则与服务端修改集中在 `packages/shared`、`apps/server`；页面、样式、模型和特效素材集中在 `apps/client`。需要跨目录修改时，在合并申请中说明原因。
4. 前端只展示状态和提交操作，所有游戏规则仍由共享引擎计算。修改公共类型、事件或接口时，同时更新两端。
5. 完成后运行构建和相关检查，推送分支并创建合并申请。检查通过、双方验收后再合入主分支。
6. 发布期间会重启服务；当前房间存在内存里，进行中的对局会中断。安排在无对局时发布。

双方开发助手都应先阅读根目录 `AGENTS.md`。不要上传 `.env`、令牌、账号数据、比赛记录或本地测试产物。

## Render 免费测试站

本仓库根目录 `render.yaml` 声明一个 Free Docker Web Service，区域为 Singapore，健康检查为 `/health`。没有声明付费数据盘、数据库或额外预览服务。

首次部署前，先把完整项目和此配置同步到有权限的 GitHub 仓库。登录 Render，连接该仓库，通过 `New → Blueprint` 选择实际包含 `render.yaml` 的分支，检查计划为 **Free** 后创建服务。不要为了修复权限问题改变仓库的公开范围。

也可手工创建 `New → Web Service`：运行方式选择 Docker，仓库根目录保持为空，Dockerfile 使用 `./Dockerfile`，实例选择 Free，环境变量以 `render.yaml` 为准。不要设置 `VITE_SERVER_URL=http://localhost:3001`，前端在公网默认连接当前网站。

服务显示 Live 后，使用 Render 实际分配的 HTTPS 网址。服务端只自动允许 Render 提供的本服务 `RENDER_EXTERNAL_URL`，不通配允许其他 Render 网站；自定义域名仍通过 `PUBLIC_ORIGINS` 单独配置。

自动更新配置为 `After CI Checks Pass`。若 GitHub 检查失败，先修复检查；不要关闭检查以掩盖构建、规则或发布资产问题。通过测试站验证两位玩家建房、加入、开局、提交操作，以及 390px 手机界面，再合并后续美术修改。

## 免费方案的数据边界

免费实例会休眠，重启、休眠和重新部署会丢失本地账号、复盘等运行数据。测试时使用可丢弃数据。源代码和随仓库提交的美术资源保存在 GitHub，不依赖运行数据盘；需要长期保存运行数据时再单独选择付费持久化方案。

官方说明：[Render Web Services](https://render.com/docs/web-services)、[Blueprint 配置](https://render.com/docs/blueprint-spec)、[免费实例限制](https://render.com/docs/free)。
