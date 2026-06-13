# 公网游玩

目标：让玩家不在同一个 Wi-Fi / 局域网时，也能直接打开一个 HTTPS 地址进入游戏。

## 临时公网房间

在项目根目录运行：

```powershell
npm run public
```

这个命令会依次完成：

1. 打包前端和共享代码。
2. 启动生产模式游戏服务，默认本地端口是 `3001`。
3. 启动 Cloudflare Tunnel，把 `http://localhost:3001` 暴露成公网 HTTPS 地址。

如果本机没有可用的 `cloudflared`，脚本会自动下载当前平台的 Cloudflare Tunnel 程序到 `artifacts/tools/`。

如果自动下载失败并提示 GitHub 连接超时，可以先手动安装：

```powershell
winget install --id Cloudflare.cloudflared --source winget
cloudflared --version
npm run public:no-build
```

终端里出现类似下面的地址后，把它发给其他玩家：

```text
https://example-name.trycloudflare.com
```

所有玩家打开这个地址即可进入同一套服务。创建房间的人再把房间号发给其他人即可。

注意：这个公网地址是临时地址，关闭终端后就失效。游玩期间需要保持 `npm run public` 的终端窗口打开。

## 常用命令

```powershell
npm run public
```

构建并开启公网链接，推荐日常使用。

```powershell
npm run public:no-build
```

跳过构建，直接启动服务和公网链接。适合刚刚已经构建过、只想快速开房。

```powershell
npm run public:tunnel
```

只启动公网隧道，要求你已经手动启动了生产服务。如果服务不是由 `npm run public` 或 `npm run public:no-build` 启动，请先显式允许临时 tunnel 来源：

```powershell
$env:ALLOW_TUNNEL_ORIGINS="true"
npm run serve
```

## 端口

默认暴露本地 `3001`：

```powershell
node scripts/public-play.mjs --port=3001
```

如果端口被占用，可以换一个端口：

```powershell
node scripts/public-play.mjs --port=3101
```

## 正式长期上线

如果需要一个长期不变的网址，不建议使用临时隧道。推荐部署到云服务器或平台服务：

```powershell
npm install
npm run build
npm run serve
```

然后用 Caddy / Nginx / 平台 HTTPS 入口反向代理到 `3001`。长期部署时需要让 `data/` 持久化，否则账号、比赛记录和训练样本可能丢失。
正式长期上线建议使用 `PUBLIC_ORIGINS` 写死域名，并保持 `ALLOW_TUNNEL_ORIGINS=false`。
