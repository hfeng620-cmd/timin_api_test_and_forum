#!/bin/bash
# Timix 一键恢复脚本
# 新服务器上跑: bash timin-recover.sh
set -e

echo "=== 安装 Node 22 ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "=== 安装 PM2 ==="
npm install -g pm2

echo "=== 克隆项目 ==="
cd ~
rm -rf timin_api_test_and_forum
git clone https://github.com/hfeng620-cmd/timin_api_test_and_forum.git
cd timin_api_test_and_forum

echo "=== 创建环境变量 ==="
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://svksgdsuquhkwyliavfn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_FxCS1_JqJiV74SFCG0q8Pg_-4iSCzk3
ENVEOF

echo "=== 切换为 Server 模式 ==="
sed -i 's/const isServerDeploy = process.env.DEPLOY_TARGET === "server"/const isServerDeploy = true/' next.config.ts

echo "=== 安装依赖 + 构建 ==="
npm install
npm run build

echo "=== 启动服务 ==="
pm2 delete timin 2>/dev/null || true
pm2 start "npx serve@latest out -l 3000 -s" --name timin
pm2 save
pm2 startup

echo "=== 完成 ==="
echo "网站已启动，检查端口后访问 http://$(curl -s ifconfig.me):3000"
pm2 status
