# GitHub Pages + Cloudflare 隐藏源站发布方案

目标：玩家只访问你的自定义域名，例如 `https://game.your-domain.com/`，普通玩家看不到 GitHub Pages 的 `username.github.io` 地址。

## 发布前隐私原则

- 只上传网站文件。
- 不上传上级目录、脚本日志、系统路径、账号配置、令牌或截图。
- 不把 GitHub 用户名写进网页内容。
- 如果非常介意 GitHub 账号被技术人员追踪，使用一个单独的发布专用 GitHub 账号或组织。
- Cloudflare 代理能隐藏源站地址，但不能让 GitHub 仓库本身“消失”；如果仓库是公开的，知道仓库地址的人仍能看到文件。

## 1. GitHub Pages

1. 打开仓库 Settings。
2. 进入 Pages。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，目录选择 `/root`。
5. 保存后等待 GitHub 生成临时地址。

临时地址形如：

```text
https://你的github用户名.github.io/lingxi-paper-horse/
```

这只是源站验证地址，不发给玩家。

## 2. 绑定自定义域名

假设你要使用：

```text
game.your-domain.com
```

把 `CNAME.example` 复制成 `CNAME`，内容只写一行：

```text
game.your-domain.com
```

## 3. Cloudflare DNS

域名接入 Cloudflare 后，DNS 添加：

```text
Type: CNAME
Name: game
Target: 你的github用户名.github.io
Proxy status: Proxied / 橙色云朵
```

SSL/TLS 建议：

```text
Encryption mode: Full
Always Use HTTPS: On
Automatic HTTPS Rewrites: On
```

然后访问：

```text
https://game.your-domain.com/
```

## 4. 验证隐藏源站

玩家访问时，响应头应显示：

```text
server: cloudflare
```

技术响应头里可能仍有 GitHub/Fastly 标记，这是参考站同款结构，说明 Cloudflare 在前，GitHub Pages 在后。
