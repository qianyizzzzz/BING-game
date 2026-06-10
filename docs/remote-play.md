# 异网联机

不同 Wi-Fi 下不能直接访问 `192.168.x.x`。推荐把打包后的后端入口 `3001` 用公网隧道暴露出去。

## Cloudflare Tunnel

1. 构建并启动游戏：

```powershell
npm run build
npm run serve
```

1. 另开一个终端，把本机 `3001` 端口映射出去：

```powershell
cloudflared tunnel --url http://localhost:3001
```

1. 把终端里生成的 `https://...trycloudflare.com` 链接发给其他玩家。

## ngrok

```powershell
npm run build
npm run serve
ngrok http 3001
```

其他玩家打开 ngrok 给出的 `https://...` 链接即可。

## 自定义公网域名

如果使用自己的反向代理或域名，启动服务时把来源加入白名单：

```powershell
$env:PUBLIC_ORIGINS="https://你的域名"
npm run serve
```

