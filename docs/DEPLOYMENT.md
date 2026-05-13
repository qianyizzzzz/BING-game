# 公网网页游戏部署

目标是让玩家不需要下载项目，只打开网址就能玩。

## 部署结构

```text
Browser
  -> HTTPS 域名
  -> Node/Express/Socket.IO server
  -> React 静态文件
  -> data/ 比赛复盘与训练样本
```

当前服务端已经支持：

- `/`：生产环境下托管 React 前端。
- `/socket.io/*`：实时对局通信。
- `/api/matches`：比赛列表。
- `/api/matches/:roomId`：单局复盘。
- `/api/matches/:roomId/training-samples`：训练样本。

## 本机生产模式

```bash
npm install
npm run build
npm run serve
```

然后访问：

```text
http://localhost:3001
```

如果要让别人从公网访问，不要暴露 `5173`。`5173` 是开发服务器，只适合本机或同一局域网调试。公网应该暴露 `3001`，因为它同时提供网页、Socket.IO 和 API。

## 临时公网测试

可以用 ngrok 或 Cloudflare Tunnel 把本机 `3001` 暂时映射成 HTTPS 公网地址：

```bash
npm run build
npm run serve
```

另开一个终端：

```bash
ngrok http 3001
```

把 ngrok 给出的 `https://...` 链接发给别人即可。

## 正式公网部署

正式上线建议租一台云服务器，然后：

```bash
git clone <your-repo>
cd bing
npm install
npm run build
npm run serve
```

再用 Nginx/Caddy 把域名的 HTTPS 流量反代到 `localhost:3001`。生产环境需要把 `data/` 挂到稳定磁盘，后续再替换成数据库。

## Docker 部署

```bash
docker build -t bing-card-game .
docker run -p 3001:3001 -v bing-data:/app/data bing-card-game
```

部署到云服务器后，把域名解析到服务器，并给 3001 前面接 Nginx/Caddy 做 HTTPS 反向代理。

## 后续生产化

- 把 `data/` 替换成 PostgreSQL 或 MongoDB，避免多实例部署时数据分裂。
- 增加账号系统，保存玩家名、战绩、天梯分。
- 增加房间列表和观战。
- 增加限流和断线重连。
