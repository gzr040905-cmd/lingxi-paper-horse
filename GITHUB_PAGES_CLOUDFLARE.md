# GitHub Pages + Cloudflare 隐藏源站发布方案

目标：玩家只访问你的自定义域名，例如 `https://game.your-domain.com/`，普通玩家看不到 GitHub Pages 的 `username.github.io` 地址。

## 发布前隐私原则

- 只上传 `lingxi-folk-mystery` 文件夹里的网站文件。
- 不上传上级目录、脚本日志、系统路径、账号配置、令牌或截图。
- 不把 GitHub 用户名写进网页内容。
- 如果非常介意 GitHub 账号被技术人员追踪，使用一个单独的发布专用 GitHub 账号或组织。
- Cloudflare 代理能隐藏源站地址，但不能让 GitHub 仓库本身“消失”；如果仓库是公开的，知道仓库地址的人仍能看到文件。

## 1. 准备仓库

1. 新建一个 GitHub 仓库，建议命名为 `lingxi-paper-horse`。
2. 上传本文件夹内容到仓库根目录。
3. 不要上传 `.deploy-tools` 文件夹。如果存在，只是本机临时工具，不属于网站。
4. 仓库根目录应至少包含：

```text
index.html
style.css
game.js
manifest.webmanifest
service-worker.js
icon.svg
.nojekyll
```

## 2. 开启 GitHub Pages

1. 打开仓库 Settings。
2. 进入 Pages。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，目录选择 `/root`。
5. 保存后等待 GitHub 生成临时地址。

这个临时地址形如：

```text
https://你的github用户名.github.io/lingxi-paper-horse/
```

这只是源站验证地址，不发给玩家。

## 3. 绑定自定义域名

假设你要使用：

```text
game.your-domain.com
```

在仓库根目录创建 `CNAME` 文件，内容只写一行：

```text
game.your-domain.com
```

本项目已提供 `CNAME.example`，有真实域名后把它复制成 `CNAME` 并改成你的域名。

## 4. Cloudflare 设置

1. 域名接入 Cloudflare。
2. DNS 添加一条记录：

```text
Type: CNAME
Name: game
Target: 你的github用户名.github.io
Proxy status: Proxied / 橙色云朵
```

3. SSL/TLS 设置建议：

```text
Encryption mode: Full
Always Use HTTPS: On
Automatic HTTPS Rewrites: On
```

4. 等待 DNS 生效后访问：

```text
https://game.your-domain.com/
```

## 5. GitHub Pages 里确认域名

回到 GitHub 仓库 Settings -> Pages：

- Custom domain 应显示你的域名。
- 勾选 Enforce HTTPS。
- 如果提示 DNS check failed，等几分钟再刷新。

## 6. 验证是否隐藏源站

玩家访问时，响应头应显示：

```text
server: cloudflare
```

技术响应头里可能仍有 GitHub/Fastly 标记，这是参考站同款结构，说明 Cloudflare 在前，GitHub Pages 在后。

## 7. 当前项目隐私检查

当前发布目录不应包含任何真实的本机路径、账号令牌或私钥。重点检查：

- Windows 用户目录路径
- D 盘或其他本机绝对路径
- 任何平台登录令牌
- API 密钥
- 密码
- 私钥
- `.env` 文件
- `.deploy-tools` 文件夹

上传前可以在本机执行：

```powershell
rg -n "你的Windows用户名|平台令牌|API密钥|密码|私钥|\\.env|\\.deploy-tools" .
```

如果没有输出，说明没有命中这些明显敏感字段。
