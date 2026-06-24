# Timin 观察站 -- 服务器部署文档

本文档描述如何将 Timin 观察站部署到自有 VPS / 云服务器（非 GitHub Pages 静态部署）。

---

## 前置要求

在开始之前，请确保服务器已安装并配置好以下环境：

| 组件 | 最低版本 | 用途 |
|------|---------|------|
| Node.js | 22.x | 应用运行时 |
| npm | 10.x（随 Node 22 附带） | 依赖管理 |
| PM2 | 5.x | 进程守护和零停机重载 |
| Nginx | 1.24+ | 反向代理和静态资源缓存 |
| Supabase | 任意项目 | 数据库、认证和存储 |
| Git | 2.x | 拉取代码 |
| certbot | 2.x | Let's Encrypt SSL 证书 |

### 安装命令（Ubuntu 22.04 / 24.04）

```bash
# 1. 安装 Node.js 22（使用 NodeSource 官方源）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证版本
node -v   # 应输出 v22.x.x
npm -v    # 应输出 10.x.x

# 2. 安装 PM2
sudo npm install -g pm2

# 配置 PM2 开机自启
pm2 startup systemd
# 按屏幕提示执行输出的 sudo 命令

# 3. 安装 Nginx
sudo apt-get install -y nginx

# 启动并设置开机自启
sudo systemctl enable nginx
sudo systemctl start nginx

# 4. 安装 certbot（Let's Encrypt）
sudo apt-get install -y certbot python3-certbot-nginx

# 5. 确认 Git 已安装
git --version
```

---

## 快速部署（5 步）

```bash
# 步骤 1：克隆仓库
git clone https://github.com/hfeng620-cmd/timin_api_test_and_forum.git
cd timin_api_test_and_forum

# 步骤 2：确认使用 Node 22（如果有 .nvmrc，nvm 会自动切换）
nvm use 2>/dev/null || true
node -v  # 确认输出 v22.x.x

# 步骤 3：配置环境变量
cp .env.example .env.local
nano .env.local  # 填入 Supabase 项目 URL 和 anon key

# 步骤 4：执行部署脚本
bash scripts/deploy.sh

# 步骤 5：验证服务运行
pm2 status
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000
# 应输出 200
```

部署完成后，访问 `http://<服务器IP>:3000` 确认页面正常加载。

---

## 环境变量配置

将 `.env.example` 复制为 `.env.local` 并填入实际值：

```bash
cp .env.example .env.local
```

### 必填变量

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase 项目 URL（Settings → API → Project URL） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xxxxx` | Supabase 匿名公钥（Settings → API → anon public key） |

### 可选变量

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `NEXT_PUBLIC_GISCUS_REPO` | `hfeng620-cmd/timin_api_test_and_forum` | Giscus 评论组件仓库 |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | `R_kgDOxxxxx` | Giscus 仓库 ID |
| `NEXT_PUBLIC_GISCUS_CATEGORY` | `General` | Giscus 分类名 |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | `DIC_kwDOxxxxx` | Giscus 分类 ID |

### 构建时环境变量

| 变量名 | 值 | 说明 |
|--------|---|------|
| `DEPLOY_TARGET` | `server` | 必须在构建时设为 `server`，否则会按静态导出构建 |

> 部署脚本 `scripts/deploy.sh` 已自动设置 `DEPLOY_TARGET=server`，无需手动处理。

### 获取 Supabase 密钥

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击左侧 **Settings** → **API**
4. 复制 **Project URL** 和 **anon public key**（以 `sb_publishable_` 开头）
5. 填入 `.env.local`

---

## Supabase 数据库初始化

部署应用前，必须在 Supabase 项目中执行 SQL 文件创建数据库表、索引和权限策略。

### 执行步骤

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 → 左侧导航点击 **SQL Editor**
3. 点击 **New query**

按以下顺序执行 SQL 文件：

#### 第一步：核心论坛表结构

在 SQL Editor 中粘贴 `supabase/forum-schema.sql` 的全部内容并执行。

该文件创建：
- `forum_profiles` -- 用户资料表（关联 auth.users）
- `forum_admins` -- 管理员表
- `forum_posts` -- 论坛帖子表（含 RLS 策略，新帖默认隐藏待审核）
- `forum_replies` -- 回复表
- `forum_likes` -- 点赞表
- `forum_posts_public` / `forum_public_replies` -- 公开视图
- `handle_new_user()` -- 新用户自动创建 profile 的触发器

#### 第二步：中转站榜单表结构

在 SQL Editor 中粘贴 `supabase/stations-schema.sql` 的全部内容并执行。

该文件创建：
- `stations` -- 中转站信息表
- `station_edits` -- 编辑记录表（可追溯修改历史）
- `stations_with_editor` -- 带最后编辑者信息的视图
- **初始种子数据**（14 个已收录的中转站）

#### 第三步：存储桶配置（论坛图片上传）

在 SQL Editor 中粘贴 `supabase/storage-setup.sql` 的全部内容并执行。

该文件创建：
- `forum-images` 公开存储桶
- 公开读取、认证用户上传、用户可删除自己文件的策略

#### 第四步：论坛增强功能（可选）

在 SQL Editor 中粘贴 `supabase/forum-enhancements.sql` 的全部内容并执行。

该文件创建：
- `forum_audit_log` -- 管理员操作审计日志
- `forum_hot_topics` -- 热门话题视图（基于点赞和回复数）
- `forum_spam_keywords` -- 垃圾内容关键词过滤表
- `forum_stats` -- 论坛统计数据视图
- `forum_user_ranks` -- 用户声望排行视图

### 验证数据库初始化

执行以下 SQL 确认所有表已创建：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

预期输出应至少包含：`forum_admins`, `forum_audit_log`, `forum_likes`, `forum_posts`, `forum_profiles`, `forum_replies`, `forum_spam_keywords`, `station_edits`, `stations`。

### 配置 Supabase Email 认证

1. Supabase Dashboard → **Authentication** → **Providers**
2. 找到 **Email** 并启用
3. 如需邮箱验证，保持 **Confirm email** 开启
4. 配置 **Site URL** 为你的服务器域名（如 `https://observe.example.com`）
5. 在 **Redirect URLs** 中添加 `https://observe.example.com/community`

### 添加管理员

数据库初始化后，需要手动将第一个用户设为管理员：

1. 访问你的站点 `/community` 页面，用邮箱注册账号并完成邮箱验证
2. 在 Supabase Dashboard → **Authentication** → **Users** 中找到你的用户 UUID
3. 在 SQL Editor 中执行：

```sql
insert into public.forum_admins (user_id)
values ('你的用户UUID')
on conflict (user_id) do nothing;
```

---

## PM2 配置说明

项目根目录下的 `ecosystem.config.cjs` 文件已配置好 PM2 运行参数：

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "timin",                       // PM2 进程名称
      script: "node_modules/.bin/next",    // Next.js CLI
      args: "start -p 3000",               // 监听 3000 端口
      instances: 2,                         // 2 个实例（cluster 模式）
      exec_mode: "cluster",                 // 集群模式，支持零停机重载
      env_file: ".env.local",              // 从 .env.local 加载环境变量
      merge_logs: true,                     // 合并多个实例的日志
      autorestart: true,                    // 崩溃自动重启
      min_uptime: "10s",                    // 最少运行 10 秒才视为成功
      max_restarts: 10,                     // 最多重启 10 次
      restart_delay: 1000,                  // 重启间隔 1 秒
    },
  ],
};
```

### 常用 PM2 命令

```bash
# 首次启动
pm2 start ecosystem.config.cjs

# 零停机重载（代码更新后推荐）
pm2 reload ecosystem.config.cjs

# 查看运行状态
pm2 status

# 查看实时日志
pm2 logs timin

# 查看最近 100 行日志
pm2 logs timin --lines 100

# 停止应用
pm2 stop timin

# 重启应用
pm2 restart timin

# 删除应用（从 PM2 列表中移除）
pm2 delete timin

# 保存当前 PM2 进程列表（配合 startup 实现开机自启）
pm2 save

# 查看应用详细信息（内存、CPU）
pm2 show timin

# 监控面板
pm2 monit
```

### 日志位置

PM2 日志默认存储在 `~/.pm2/logs/`：

- 标准输出：`~/.pm2/logs/timin-out.log`
- 错误输出：`~/.pm2/logs/timin-error.log`

---

## Nginx 反向代理配置

Nginx 负责接收来自客户端的 HTTP/HTTPS 请求，并转发到本地 3000 端口的 Next.js 服务。

### 基本配置文件

创建 `/etc/nginx/sites-available/timin`：

```nginx
# /etc/nginx/sites-available/timin

upstream timin_backend {
    # 连接 PM2 cluster 的两个实例（3000 端口）
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name observe.example.com;   # 替换为你的域名

    # 日志（可选，便于排查问题）
    access_log /var/log/nginx/timin-access.log;
    error_log  /var/log/nginx/timin-error.log;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 客户端上传大小限制（论坛支持图片上传）
    client_max_body_size 10m;

    # 静态资源缓存（Next.js 的 _next/static 目录）
    location /_next/static/ {
        proxy_pass http://timin_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 缓存静态资源 30 天（文件名带 hash，可放心缓存）
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 主应用请求
    location / {
        proxy_pass http://timin_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Next.js 需要这些头来正确处理重定向和 API 调用
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # 长连接超时
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # 禁止访问隐藏文件（.git, .env.local 等）
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 启用站点

```bash
# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/timin /etc/nginx/sites-enabled/timin

# 测试 Nginx 配置语法
sudo nginx -t

# 如果显示 "syntax is ok" 和 "test is successful"，重载 Nginx
sudo systemctl reload nginx
```

### 删除默认站点（可选，避免冲突）

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```

---

## SSL 证书（Let's Encrypt）

### 获取证书

确保域名已解析到服务器 IP 后再执行：

```bash
# 仅为域名获取证书（推荐，certbot 会自动修改 Nginx 配置）
sudo certbot --nginx -d observe.example.com

# 按提示输入邮箱地址（用于证书到期提醒）
# 同意服务条款
# 选择是否重定向 HTTP 到 HTTPS（建议选 2，自动重定向）
```

### 证书自动续期

Let's Encrypt 证书有效期 90 天。certbot 安装时会自动添加 systemd timer 实现自动续期：

```bash
# 验证自动续期 timer 已启用
sudo systemctl status certbot.timer

# 手动测试续期流程（不会实际续期，仅验证配置是否正确）
sudo certbot renew --dry-run
```

### 续期后重载 Nginx

certbot 在 `/etc/letsencrypt/renewal-hooks/deploy/` 中可以配置续期后的钩子。创建重载脚本：

```bash
# 如果 certbot 续期后 Nginx 没有自动重载，添加钩子
sudo bash -c 'cat > /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << "EOF"
#!/bin/bash
systemctl reload nginx
EOF'
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
```

### 证书更新后的最终 Nginx 配置

certbot 会自动将你的配置文件改写成包含 SSL 的版本，最终效果类似：

```nginx
server {
    listen 443 ssl;
    server_name observe.example.com;

    ssl_certificate     /etc/letsencrypt/live/observe.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/observe.example.com/privkey.pem;

    # ... 其余配置同上 ...
}

server {
    listen 80;
    server_name observe.example.com;
    return 301 https://$server_name$request_uri;   # HTTP → HTTPS 重定向
}
```

---

## GitHub Actions 自动部署

项目已配置 GitHub Actions 工作流（`.github/workflows/deploy.yml`），在推送到 `main` 分支时自动构建并部署到 GitHub Pages。

### 现有工作流说明

该工作流为**静态导出**（GitHub Pages）模式，在 `ubuntu-latest` 上执行：

- 使用 Node 22
- 构建时注入 Supabase 环境变量
- 产物上传为 Pages artifact 并部署

### 添加服务器自动部署（可选）

如果你希望推送代码后自动部署到 VPS，可以添加一个新的 workflow 文件 `.github/workflows/deploy-server.yml`：

```yaml
name: 部署到服务器

on:
  push:
    branches:
      - master
  workflow_dispatch:   # 允许手动触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 通过 SSH 执行远程部署
        uses: appleboy/ssh-action@v1.2.2
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT || 22 }}
          script: |
            cd /opt/timin_api_test_and_forum
            git pull origin master
            export DEPLOY_TARGET=server
            npm ci --production
            npm run build
            pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

            # 健康检查
            sleep 3
            HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000)
            if [ "$HTTP_CODE" != "200" ]; then
              echo "健康检查失败！HTTP 状态码: $HTTP_CODE"
              exit 1
            fi
            echo "健康检查通过：HTTP $HTTP_CODE"
```

然后在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加以下 secrets：

| Secret 名 | 值 |
|-----------|-----|
| `SSH_HOST` | 服务器 IP 地址 |
| `SSH_USER` | SSH 用户名（如 `root` 或 `deploy`） |
| `SSH_PRIVATE_KEY` | SSH 私钥内容（`cat ~/.ssh/id_ed25519`） |
| `SSH_PORT` | SSH 端口（默认 22，非默认需设置） |

### 在服务器上配置 SSH 密钥

```bash
# 在服务器上生成专用部署密钥（如果不希望使用个人密钥）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# 将公钥添加到 authorized_keys
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys

# 查看私钥内容（复制到 GitHub Secrets）
cat ~/.ssh/github_actions_deploy
```

---

## 常见问题排查

### 1. 部署后页面 502 Bad Gateway

**原因**：Nginx 无法连接到后端的 Next.js 服务。

**排查步骤**：

```bash
# 检查 PM2 进程是否在运行
pm2 status

# 检查 Next.js 是否在 3000 端口监听
sudo ss -tlnp | grep 3000

# 如果 PM2 进程存在但状态为 errored，查看日志
pm2 logs timin --lines 50

# 手动测试 Next.js 是否响应
curl -v http://127.0.0.1:3000
```

**常见修复**：
- 确认 `.env.local` 中 Supabase 环境变量正确
- 确认构建时使用了 `DEPLOY_TARGET=server`
- 手动启动 `node node_modules/.bin/next start -p 3000` 查看错误

### 2. Supabase 连接失败 / 论坛无法加载

**原因**：环境变量未正确加载或 Supabase 项目配置不正确。

**排查步骤**：

```bash
# 检查 .env.local 文件是否存在且内容正确
cat .env.local

# 确认 PM2 加载了正确的环境变量文件
pm2 show timin | grep "env_file"

# 测试 Supabase API 可直接访问
curl https://xxxxx.supabase.co/rest/v1/
# 应返回 JSON（非 404）
```

**常见修复**：
- 确认 SQL 文件已在 Supabase SQL Editor 中执行
- 确认 Email 认证已在 Supabase 中启用
- 确认 Supabase 项目的 Site URL 和 Redirect URLs 包含你的域名

### 3. 构建失败：`output: "export"` 与 server 模式冲突

**原因**：构建时没有设置 `DEPLOY_TARGET=server`，导致 Next.js 使用静态导出模式，但某些页面使用了服务端特性（API Routes、ISR 等）。

**修复**：

```bash
# 确保构建时设置了环境变量
DEPLOY_TARGET=server npm run build

# 或使用部署脚本（已自动设置）
bash scripts/deploy.sh
```

### 4. PM2 进程反复重启

**原因**：应用启动后立即崩溃，PM2 达到 `max_restarts` 上限后停止尝试。

**排查步骤**：

```bash
# 查看详细错误日志
pm2 logs timin --err --lines 100

# 查看 PM2 重启历史
pm2 show timin | grep -A 5 "restarts"
```

**常见修复**：
- 检查 `.env.local` 是否存在且格式正确
- 检查端口 3000 是否被其他进程占用：`sudo lsof -i :3000`
- 检查 Node 版本是否为 22：`node -v`
- 重新安装依赖：`rm -rf node_modules && npm ci`

### 5. Nginx 配置报错

**原因**：配置语法错误导致 Nginx 无法启动或重载。

**修复步骤**：

```bash
# 始终先测试配置语法
sudo nginx -t

# 如果报错，查看具体错误行
# 常见问题：
# - 缺少分号
# - server_name 后没加分号
# - 路径不存在
# - 变量名拼写错误
```

### 6. SSL 证书获取失败

**原因**：域名未解析到服务器 IP，或 Nginx 未正确运行。

**排查步骤**：

```bash
# 确认域名解析
dig observe.example.com +short
# 或
nslookup observe.example.com

# 确认 Nginx 正在运行
sudo systemctl status nginx

# 确认 80 端口防火墙已开放
sudo ufw status verbose
# 或（如果使用 iptables）
sudo iptables -L -n | grep 80
```

**修复**：
- 等待 DNS 解析生效（通常几分钟到几个小时）
- 开放防火墙 80 和 443 端口：`sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- 如果使用云服务商，检查安全组/防火墙规则

### 7. 端口 3000 无响应但 PM2 显示 online

**原因**：应用可能监听在错误地址（如仅 IPv4 或仅 IPv6）。

**排查步骤**：

```bash
# 查看 PM2 日志，确认实际监听地址
pm2 logs timin --lines 20 | grep -i "listen\|ready\|started"

# 用 IPv4 和 IPv6 分别测试
curl -4 http://127.0.0.1:3000
curl -6 http://[::1]:3000
```

**修复**：
- Next.js 默认监听 `0.0.0.0:3000`（所有接口），通常不需要修改
- 如果仅 IPv6 可用，Nginx upstream 需改为 `[::1]:3000`

### 8. 如何回滚到上一个版本

```bash
# 回滚 Git 到上一个版本
git log --oneline -5          # 查看最近的提交
git revert <commit-hash>      # 安全回滚（推荐）
# 或
git reset --hard HEAD~1       # 强制回退（谨慎使用）

# 重新构建和部署
DEPLOY_TARGET=server npm run build
pm2 reload ecosystem.config.cjs

# 健康检查确认
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000
```

---

## 部署检查清单

上线前逐项确认：

- [ ] Node.js 22 已安装（`node -v` 输出 v22.x.x）
- [ ] `.env.local` 已配置所有必填环境变量
- [ ] Supabase SQL 文件已全部执行（forum-schema.sql, stations-schema.sql, storage-setup.sql）
- [ ] Supabase Email 认证已启用
- [ ] 管理员账号已创建（在 forum_admins 表中插入记录）
- [ ] `DEPLOY_TARGET=server npm run build` 构建成功
- [ ] PM2 进程状态为 online（`pm2 status`）
- [ ] `curl http://127.0.0.1:3000` 返回 200
- [ ] Nginx 已配置并启用（`sudo nginx -t && sudo systemctl reload nginx`）
- [ ] SSL 证书已配置（访问 `https://你的域名` 确认锁定图标）
- [ ] 防火墙已开放 80 和 443 端口
- [ ] Supabase Site URL 和 Redirect URLs 已更新为生产域名
