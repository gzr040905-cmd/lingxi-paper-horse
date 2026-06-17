# 分享给别人玩

这个小游戏是纯静态网站，整个 `lingxi-folk-mystery` 文件夹都可以直接发布。

## 最推荐：发布成公网链接

适合发给任何人，手机和电脑都能打开。

可选平台：

- Netlify：把整个 `lingxi-folk-mystery` 文件夹拖到 Netlify Deploy 页面。
- GitHub Pages：把文件夹内容放进仓库，Pages 入口选择根目录。
- Vercel / Cloudflare Pages：导入静态项目即可，不需要构建命令。

发布设置：

- Build command：留空
- Publish directory：当前文件夹，或平台要求时填 `.`
- 首页文件：`index.html`

发布后，把平台给出的 `https://...` 链接发给别人即可。

## 参考站同款：GitHub Pages + Cloudflare

如果你想像参考站一样隐藏 GitHub Pages 源站，用自定义域名给别人玩，请看：

```text
GITHUB_PAGES_CLOUDFLARE.md
```

## 同一 Wi-Fi 内试玩

适合同宿舍、同教室、同办公室临时试玩。

1. 在本目录启动服务：

```powershell
python -m http.server 8766 --bind 0.0.0.0
```

2. 查看本机局域网 IP：

```powershell
ipconfig
```

3. 让别人手机或电脑连接同一个 Wi-Fi，访问：

```text
http://你的局域网IP:8766/
```

示例：

```text
http://192.168.1.23:8766/
```

如果打不开，通常是 Windows 防火墙拦截了 Python，需要允许该网络访问。

## 直接发文件

可以把整个 `lingxi-folk-mystery` 文件夹压缩发给别人。对方解压后打开 `index.html` 即可。

这种方式最简单，但每个人的浏览器记录都是自己的，不能多人共享进度。
