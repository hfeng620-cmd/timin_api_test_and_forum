#!/usr/bin/env bash
# =============================================================================
# Timin 云服务器部署脚本
# 用法: bash scripts/deploy.sh
#
# 功能:
#   1. 拉取最新代码
#   2. 安装生产依赖
#   3. 以服务器模式构建
#   4. 零停机重载 PM2
#   5. 健康检查
#   6. 失败自动回滚
# =============================================================================

set -euo pipefail  # 遇到错误立即退出，未定义变量报错，管道中任一命令失败则整体失败

# ---- 配置 ------------------------------------------------
APP_PORT="${APP_PORT:-3000}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"
HEALTH_CHECK_DELAY="${HEALTH_CHECK_DELAY:-2}"
ROLLBACK_ENABLED="${ROLLBACK_ENABLED:-true}"
BACKUP_DIR=".deploy-backups"

# ---- 颜色输出 ------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $*"; }

# ---- 错误处理 ------------------------------------------------
error_handler() {
  local exit_code=$?
  local line_no=$1
  log_error "部署失败！脚本在第 ${line_no} 行退出，错误码: ${exit_code}"
  echo ""

  if [ "${ROLLBACK_ENABLED}" = "true" ] && [ -n "${PREV_REV:-}" ]; then
    log_warn "正在回滚到部署前的版本: ${PREV_REV}..."
    do_rollback
  else
    log_warn "无法回滚（未启用回滚或无先前版本信息）"
  fi

  echo ""
  log_error "========================================="
  log_error "  部署失败 — $(date '+%Y-%m-%d %H:%M:%S')"
  log_error "========================================="
  exit "${exit_code}"
}

trap 'error_handler ${LINENO}' ERR

# ---- 函数：健康检查 ------------------------------------------------
health_check() {
  local retries="${HEALTH_CHECK_RETRIES}"
  local delay="${HEALTH_CHECK_DELAY}"

  log_step "[健康检查] 等待应用启动 (最多 ${retries} 次尝试, 间隔 ${delay}s)..."

  for i in $(seq 1 "${retries}"); do
    local http_code
    http_code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}" 2>/dev/null || echo "000")

    if [ "${http_code}" = "200" ]; then
      log_info "健康检查通过: HTTP ${http_code} (尝试 ${i}/${retries})"
      return 0
    fi

    if [ "${i}" -lt "${retries}" ]; then
      echo "  尝试 ${i}/${retries}: HTTP ${http_code}, ${delay}s 后重试..."
      sleep "${delay}"
    fi
  done

  log_error "健康检查失败！连续 ${retries} 次未收到 HTTP 200 响应"
  return 1
}

# ---- 函数：创建备份 ------------------------------------------------
create_backup() {
  log_step "[备份] 创建部署前备份..."

  mkdir -p "${BACKUP_DIR}"

  # 保存当前 Git HEAD 用于回滚
  PREV_REV=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  echo "${PREV_REV}" > "${BACKUP_DIR}/prev-rev.txt"
  log_info "先前版本: ${PREV_REV}"

  # 备份当前的 .next 目录（如果存在）
  if [ -d ".next" ]; then
    local backup_name=".next-backup-$(date '+%Y%m%d-%H%M%S').tar.gz"
    tar -czf "${BACKUP_DIR}/${backup_name}" .next 2>/dev/null || true
    echo "${backup_name}" > "${BACKUP_DIR}/latest-next-backup.txt"
    log_info ".next 目录已备份: ${BACKUP_DIR}/${backup_name}"
  fi

  # 备份 node_modules（如果存在）
  if [ -d "node_modules" ]; then
    local nm_backup="node_modules-backup-$(date '+%Y%m%d-%H%M%S').tar.gz"
    tar -czf "${BACKUP_DIR}/${nm_backup}" node_modules 2>/dev/null || true
    echo "${nm_backup}" > "${BACKUP_DIR}/latest-nm-backup.txt"
    log_info "node_modules 已备份: ${BACKUP_DIR}/${nm_backup}"
  fi
}

# ---- 函数：回滚 ------------------------------------------------
do_rollback() {
  log_step "[回滚] 正在恢复部署前的状态..."

  # 回滚 Git 代码
  if [ "${PREV_REV}" != "unknown" ]; then
    log_info "回滚 Git 到 ${PREV_REV}..."
    git reset --hard "${PREV_REV}"
  fi

  # 恢复 .next 目录（如果备份存在）
  if [ -f "${BACKUP_DIR}/latest-next-backup.txt" ]; then
    local next_backup
    next_backup=$(cat "${BACKUP_DIR}/latest-next-backup.txt")
    if [ -f "${BACKUP_DIR}/${next_backup}" ]; then
      log_info "恢复 .next 目录..."
      rm -rf .next
      tar -xzf "${BACKUP_DIR}/${next_backup}"
    fi
  fi

  # 恢复 node_modules（如果备份存在）
  if [ -f "${BACKUP_DIR}/latest-nm-backup.txt" ]; then
    local nm_backup
    nm_backup=$(cat "${BACKUP_DIR}/latest-nm-backup.txt")
    if [ -f "${BACKUP_DIR}/${nm_backup}" ]; then
      log_info "恢复 node_modules..."
      rm -rf node_modules
      tar -xzf "${BACKUP_DIR}/${nm_backup}"
    fi
  fi

  # 重启 PM2（使用恢复后的代码）
  log_info "重启 PM2 进程..."
  pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

  # 回滚后的健康检查
  sleep 3
  if curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}" | grep -q "200"; then
    log_info "回滚成功！应用已恢复到 ${PREV_REV}"
  else
    log_error "回滚后应用仍不健康，需要手动排查！"
    log_error "请检查: pm2 logs timin --lines 50"
  fi
}

# ---- 函数：清理旧备份（保留最近 5 次）---------------------------------
cleanup_backups() {
  log_step "[清理] 清理旧备份文件..."
  cd "${BACKUP_DIR}" 2>/dev/null || return 0

  # 清理 .next 备份：保留最新 5 个
  for pattern in ".next-backup-*.tar.gz" "node_modules-backup-*.tar.gz"; do
    ls -t ${pattern} 2>/dev/null | tail -n +6 | while read -r old_backup; do
      rm -f "${old_backup}"
      log_info "已删除旧备份: ${old_backup}"
    done
  done

  cd "$(dirname "$0")/.."
}

# ---- 函数：检查前置条件 ------------------------------------------------
check_prerequisites() {
  log_step "[检查] 验证前置条件..."

  # 检查 Node.js
  if ! command -v node &>/dev/null; then
    log_error "未找到 Node.js，请先安装 Node.js 22"
    exit 1
  fi

  local node_version
  node_version=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "${node_version}" -lt 22 ]; then
    log_error "Node.js 版本过低: $(node -v)，需要 22.x"
    log_error "请安装 Node.js 22: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
  fi
  log_info "Node.js: $(node -v) ✓"

  # 检查 npm
  if ! command -v npm &>/dev/null; then
    log_error "未找到 npm"
    exit 1
  fi
  log_info "npm: $(npm -v) ✓"

  # 检查 PM2
  if ! command -v pm2 &>/dev/null; then
    log_error "未找到 PM2，请先安装: sudo npm install -g pm2"
    exit 1
  fi
  log_info "PM2: $(pm2 -v) ✓"

  # 检查 .env.local
  if [ ! -f ".env.local" ]; then
    log_error "未找到 .env.local 文件"
    log_error "请执行: cp .env.example .env.local && nano .env.local"
    exit 1
  fi

  # 验证必需的环境变量
  if ! grep -q "NEXT_PUBLIC_SUPABASE_URL=.\+" .env.local 2>/dev/null; then
    log_error ".env.local 中未设置 NEXT_PUBLIC_SUPABASE_URL"
    exit 1
  fi
  if ! grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=.\+" .env.local 2>/dev/null; then
    log_error ".env.local 中未设置 NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
  fi
  log_info ".env.local 存在且包含必要配置 ✓"

  # 检查磁盘空间（至少 500MB 可用）
  local available_space
  available_space=$(df -BM . | awk 'NR==2 {print $4}' | sed 's/M//')
  if [ "${available_space}" -lt 500 ]; then
    log_error "磁盘空间不足: ${available_space}MB 可用，需要至少 500MB"
    exit 1
  fi
  log_info "磁盘空间: ${available_space}MB 可用 ✓"
}

# =============================================================================
# 主流程
# =============================================================================

echo ""
echo "=============================================="
echo "  Timin 部署开始 — $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

# ---- 切换到项目根目录 ------------------------------------------------
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
log_info "项目目录: ${PROJECT_ROOT}"

# ---- 前置检查 --------------------------------------------------------
check_prerequisites

# ---- 创建备份 --------------------------------------------------------
create_backup

# ---- 拉取最新代码 ----------------------------------------------------
# 保存本地未提交的改动（如果存在）
log_step "[1/5] 拉取最新代码..."
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  log_warn "检测到本地未提交的改动，执行 git stash 暂存"
  git stash push -m "auto-stash before deploy $(date '+%Y-%m-%d %H:%M:%S')"
  STASHED="true"
else
  STASHED="false"
fi

if git pull origin master; then
  log_info "代码已更新到最新 ✓"
else
  log_error "git pull 失败，请检查网络或仓库状态"
  if [ "${STASHED}" = "true" ]; then
    git stash pop
  fi
  exit 1
fi

# ---- 安装生产依赖 ----------------------------------------------------
log_step "[2/5] 安装生产依赖..."
if npm ci --production; then
  log_info "依赖安装完成 ✓"
else
  log_error "npm ci 失败"
  exit 1
fi

# ---- 以服务器模式构建 ------------------------------------------------
log_step "[3/5] 构建应用（服务器模式）..."
log_info "DEPLOY_TARGET=server"

if DEPLOY_TARGET=server npm run build; then
  log_info "构建完成 ✓"
else
  log_error "构建失败"
  exit 1
fi

# ---- 平滑重载 PM2 ----------------------------------------------------
log_step "[4/5] 重载 PM2 进程..."

# 检查 PM2 中是否已有 timin 进程
if pm2 list | grep -q "timin"; then
  log_info "检测到已有 timin 进程，执行 reload（零停机）..."
  if pm2 reload ecosystem.config.cjs; then
    log_info "PM2 reload 完成 ✓"
  else
    log_error "PM2 reload 失败，尝试直接 start..."
    pm2 start ecosystem.config.cjs || {
      log_error "PM2 start 也失败了"
      exit 1
    }
  fi
else
  log_info "首次启动 timin 进程..."
  if pm2 start ecosystem.config.cjs; then
    log_info "PM2 start 完成 ✓"
  else
    log_error "PM2 start 失败"
    exit 1
  fi
fi

# 保存 PM2 进程列表（确保重启后自动恢复）
pm2 save

# ---- 健康检查 --------------------------------------------------------
log_step "[5/5] 健康检查..."
if health_check; then
  log_info ""
else
  log_error "健康检查未通过，部署视为失败"
  exit 1
fi

# ---- 清理旧备份 --------------------------------------------------------
cleanup_backups

# ---- 完成 ------------------------------------------------------------
echo ""
echo "=============================================="
echo "  ${GREEN}部署成功${NC} — $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

# 打印运行状态摘要
pm2 status | grep "timin" || true
echo ""

# 如果之前有 stash，恢复提示
if [ "${STASHED:-false}" = "true" ]; then
  log_warn "提醒: 部署前暂存了本地改动 (git stash)，如需要请执行 git stash pop 恢复"
fi
