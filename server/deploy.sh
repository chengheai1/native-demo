#!/usr/bin/env bash
# ============================================================
# 序 API 生产发布脚本
#
#   本地 server/ 源码 → rsync 到服务器 → 服务器 docker build →
#   旧容器改名保留 → 启动新容器 → 探活 → 成功则清理 / 失败自动回滚
#
# 服务器上的运行时配置（邮箱 SMTP、域名等）在 /opt/xu-api/run.env，
# 脚本只读取、不覆盖；首次部署需从 .env.example 复制并填好。
#
# 用法：
#   DEPLOY_HOST=203.0.113.10 NETWORK=bridge ./deploy.sh  # 发布当前工作区代码
#   PUBLIC_HEALTH=https://api.example.com/api/health ./deploy.sh  # 配置公网探活
#   HEALTH_PROBE=false ./deploy.sh       # 演练：强制探活失败，验证自动回滚
#   KEEP_IMAGES=5 ./deploy.sh            # 多保留几代镜像
# ============================================================
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------- 部署配置（不在仓库中保存真实主机与网络） ----------------
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
SSH_OPTS="${SSH_OPTS:--o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new \
  -o ControlMaster=auto -o ControlPath=/tmp/ssh-xu-%r@%h-%p -o ControlPersist=60}"
REMOTE_DIR="${REMOTE_DIR:-/opt/xu-api}"
CONTAINER="${CONTAINER:-xu-api}"
IMAGE="${IMAGE:-xu-api}"
NETWORK="${NETWORK:-}"
# 只绑回环，对外统一走宿主 nginx 反代
HOST_PORT="${HOST_PORT:-127.0.0.1:8000}"
PUBLIC_HEALTH="${PUBLIC_HEALTH:-}"
HEALTH_PROBE="${HEALTH_PROBE:-curl -fsS --max-time 3 http://127.0.0.1:8000/api/health}"
KEEP_IMAGES="${KEEP_IMAGES:-3}"
KEEP_DB_BACKUPS="${KEEP_DB_BACKUPS:-5}"

TARGET="$DEPLOY_USER@$DEPLOY_HOST"
TAG="$(date +%Y%m%d-%H%M%S)"
GIT_REV="$(git -C "$HERE/.." rev-parse --short HEAD 2>/dev/null || echo unknown)"
if [ -n "$(git -C "$HERE/.." status --porcelain -- server 2>/dev/null)" ]; then
  GIT_REV="$GIT_REV-dirty"
fi

# ---------------- 输出 ----------------
if [ -t 1 ]; then
  C_BLUE=$'\033[1;34m'; C_YELLOW=$'\033[1;33m'; C_RED=$'\033[1;31m'; C_GREEN=$'\033[1;32m'; C_OFF=$'\033[0m'
else
  C_BLUE=; C_YELLOW=; C_RED=; C_GREEN=; C_OFF=
fi
step() { printf '%s==>%s %s\n' "$C_BLUE" "$C_OFF" "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '%s⚠%s %s\n' "$C_YELLOW" "$C_OFF" "$*" >&2; }
# 失败即退出；若已经切过容器，先把旧容器换回来再退出
die() {
  printf '%s✗%s %s\n' "$C_RED" "$C_OFF" "$*" >&2
  if [ "${SWAPPED:-0}" = 1 ]; then rollback; fi
  exit 1
}
ok()   { printf '%s✓%s %s\n' "$C_GREEN" "$C_OFF" "$*"; }

remote() { ssh $SSH_OPTS "$TARGET" "$@" < /dev/null; }
# 需要从 heredoc 喂 stdin 的场景（远端 bash -s）
remote_script() { ssh $SSH_OPTS "$TARGET" "$@"; }

usage() { sed -n '3,15p' "$0" | sed 's/^# \{0,1\}//'; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  '') ;;
  *) die "未知参数：$1（试试 --help）" ;;
esac

SWAPPED=0

# 回滚：把改名保留的旧容器换回来
rollback() {
  warn "回滚到上一个容器……"
  remote "docker rm -f '$CONTAINER'" >/dev/null 2>&1 || true
  if remote "docker inspect '$CONTAINER-prev'" >/dev/null 2>&1; then
    if remote "docker rename '$CONTAINER-prev' '$CONTAINER' && docker start '$CONTAINER'" >/dev/null; then
      if remote "timeout 8 $HEALTH_PROBE" >/dev/null 2>&1; then
        warn "已回滚，旧版本健康检查通过"
      else
        warn "已回滚，但旧版本健康检查未通过，请人工确认"
      fi
    else
      warn "回滚失败，请人工介入：ssh $TARGET 'docker ps -a'"
    fi
  else
    warn "没有可回滚的容器，请人工介入：ssh $TARGET 'docker ps -a'"
  fi
}

# 发布失败时统一走这里：切过容器就回滚，避免线上空转
handle_error() {
  local rc=$1
  if [ "$SWAPPED" = 1 ]; then rollback; fi
  exit "$rc"
}
trap 'handle_error $?' ERR

# ---------------- 1/7 本地与服务器预检 ----------------
step "[1/7] 预检"
command -v ssh   >/dev/null || die "本机缺少 ssh"
command -v rsync >/dev/null || die "本机缺少 rsync"
[ -n "$DEPLOY_HOST" ] || die "请通过 DEPLOY_HOST 指定部署主机"
[ -n "$NETWORK" ] || die "请通过 NETWORK 指定 Docker 网络"
[ -f "$HERE/app/main.py" ] || die "找不到 $HERE/app/main.py，请在 server/ 目录下运行"
[ -f "$HERE/Dockerfile" ]  || die "找不到 $HERE/Dockerfile"

remote true >/dev/null 2>&1 || die "无法 SSH 到 $TARGET（检查网络 / 密钥 / SSH_OPTS）"
remote 'docker info >/dev/null 2>&1' || die "服务器 docker 不可用，或 $DEPLOY_USER 无 docker 权限"

if remote "docker inspect '$CONTAINER'" >/dev/null 2>&1; then
  HAS_CONTAINER=1
else
  HAS_CONTAINER=0
fi

# 处理上次发布中断留下的状态
if [ "$HAS_CONTAINER" = 1 ] && remote "docker inspect '$CONTAINER-prev'" >/dev/null 2>&1; then
  warn "发现上次残留的 $CONTAINER-prev，删除后继续"
  remote "docker rm -f '$CONTAINER-prev'" >/dev/null
elif [ "$HAS_CONTAINER" = 0 ] && remote "docker inspect '$CONTAINER-prev'" >/dev/null 2>&1; then
  warn "上次回滚未完成：$CONTAINER 不存在，正在恢复 $CONTAINER-prev"
  remote "docker rename '$CONTAINER-prev' '$CONTAINER' && docker start '$CONTAINER'" >/dev/null
  HAS_CONTAINER=1
fi
info "目标 $TARGET:$REMOTE_DIR  镜像 $IMAGE:$TAG (git $GIT_REV)"

# ---------------- 2/7 运行时配置 ----------------
step "[2/7] 检查 $REMOTE_DIR/run.env"
env_state="$(remote_script "bash -s" <<REMOTE
set -euo pipefail
cd '$REMOTE_DIR'
mkdir -p data backups
if [ ! -f run.env ]; then
  if docker inspect '$CONTAINER' >/dev/null 2>&1; then
    docker inspect '$CONTAINER' --format '{{range .Config.Env}}{{println .}}{{end}}' \
      | grep -vE '^(PATH|LANG|GPG_KEY|PYTHON_VERSION|PYTHON_SHA256|PYTHONDONTWRITEBYTECODE|PYTHONUNBUFFERED|PIP_NO_CACHE_DIR)=' > run.env
    chmod 600 run.env
    echo "DERIVED"
  else
    cp .env.example run.env
    chmod 600 run.env
    echo "CREATED"
  fi
fi
grep -q '^MAIL_HOST=.\{1,\}'     run.env || echo MISSING_MAIL_HOST
grep -q '^MAIL_USERNAME=.\{1,\}' run.env || echo MISSING_MAIL_USERNAME
grep -q '^MAIL_PASSWORD=.\{1,\}' run.env || echo MISSING_MAIL_PASSWORD
grep -q '^MAIL_FROM=.\{1,\}'     run.env || echo MISSING_MAIL_FROM
grep -q '^APP_ENV=production'    run.env || echo NOT_PRODUCTION
REMOTE
)"

case "$env_state" in
  *CREATED*)
    die "首次部署：已在服务器生成 $REMOTE_DIR/run.env（模板）。
   请填好 MAIL_HOST / MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM / PUBLIC_BASE_URL 等后重跑：
     ssh $TARGET 'vi $REMOTE_DIR/run.env'" ;;
esac
case "$env_state" in
  *DERIVED*) info "run.env 已从运行中的容器导出" ;;
  *MISSING_MAIL_*)
    die "$REMOTE_DIR/run.env 缺少邮箱 SMTP 配置；登录页现在只支持邮箱验证码，发不出信就没人能登录" ;;
esac
case "$env_state" in
  *NOT_PRODUCTION*) warn "run.env 中 APP_ENV 不是 production，线上文档与 CORS 行为会不同" ;;
esac

# ---------------- 3/7 备份 ----------------
step "[3/7] 备份代码与数据库（保留最近 $KEEP_DB_BACKUPS 份）"
remote_script "bash -s" <<REMOTE
set -euo pipefail
cd '$REMOTE_DIR'
mkdir -p data/backups backups
tar czf "backups/app-$TAG.tar.gz" app
if docker inspect -f '{{.State.Running}}' '$CONTAINER' 2>/dev/null | grep -q true; then
  docker exec '$CONTAINER' python -c "
import sqlite3
src = sqlite3.connect('/data/app.db')
dst = sqlite3.connect('/data/backups/app-$TAG.db')
src.backup(dst)
dst.close(); src.close()
" || { echo "数据库快照失败，已中止发布" >&2; exit 1; }
else
  echo "    容器未运行，跳过数据库快照"
fi
ls -1t data/backups/app-*.db 2>/dev/null | tail -n +$((KEEP_DB_BACKUPS + 1)) | xargs -r rm -f || true
ls -1t backups/app-*.tar.gz 2>/dev/null | tail -n +$((KEEP_DB_BACKUPS + 1)) | xargs -r rm -f || true
REMOTE

# ---------------- 4/7 同步源码 ----------------
step "[4/7] 同步 server/ 源码"
rsync -az --delete --exclude '__pycache__' --exclude '.venv' \
  "$HERE/app/" "$TARGET:$REMOTE_DIR/app/"
rsync -az "$HERE/Dockerfile" "$HERE/requirements.txt" "$HERE/.dockerignore" "$TARGET:$REMOTE_DIR/"
info "已同步 app/ 与构建文件"

# ---------------- 5/7 构建镜像 ----------------
step "[5/7] 服务器构建镜像 $IMAGE:$TAG"
if ! build_log="$(remote "cd '$REMOTE_DIR' && docker build \
  --label org.opencontainers.image.revision='$GIT_REV' \
  --label org.opencontainers.image.title='xu-api' \
  -t '$IMAGE:$TAG' . 2>&1")"; then
  printf '%s\n' "$build_log" | tail -40 >&2
  die "镜像构建失败（运行中的容器未改动）"
fi

# ---------------- 6/7 切换容器 ----------------
step "[6/7] 切换容器"
[ "$HAS_CONTAINER" = 1 ] || die "服务器上没有 $CONTAINER，无法原地切换；首次部署请手动 docker run（见 AGENTS.md）"
remote "docker stop '$CONTAINER' >/dev/null && docker rename '$CONTAINER' '$CONTAINER-prev'"
SWAPPED=1
if ! remote "docker run -d --name '$CONTAINER' --restart unless-stopped \
  --network '$NETWORK' -p '$HOST_PORT':8000 \
  -v '$REMOTE_DIR/data:/data' --env-file '$REMOTE_DIR/run.env' \
  '$IMAGE:$TAG'" >/dev/null; then
  remote "docker logs --tail 30 '$CONTAINER' 2>&1" >&2 || true
  die "新容器启动失败"
fi

# ---------------- 7/7 探活 ----------------
step "[7/7] 探活"
# 整个等待过程放在一次 ssh 里，避免逐次连接的开销（跨省/跨境链路可达数秒）
if remote_script "bash -s" <<REMOTE
set -u
for _ in \$(seq 1 20); do
  if $HEALTH_PROBE >/dev/null 2>&1; then exit 0; fi
  sleep 2
done
exit 1
REMOTE
then
  info "容器 40s 内通过健康检查"
else
  remote "docker logs --tail 40 '$CONTAINER' 2>&1" >&2 || true
  remote "timeout 5 $HEALTH_PROBE" >&2 || true
  die "容器 40s 内未通过健康检查"
fi

body="$(remote "$HEALTH_PROBE" || true)"
case "$body" in
  *'"status":"ok"'*) ;;
  *) remote "docker logs --tail 40 '$CONTAINER' 2>&1" >&2 || true
     die "健康检查返回异常：$body" ;;
esac
case "$body" in
  *'"code":200'*) info "响应包络正常" ;;
  *) warn "健康检查缺少 {code,data,message} 包络，请核对中间件" ;;
esac

# 切换成功，清理旧容器
SWAPPED=0
remote "docker rm -f '$CONTAINER-prev'" >/dev/null || warn "旧容器清理失败，可稍后手动 docker rm -f $CONTAINER-prev"

# 旧镜像只保留最近 KEEP_IMAGES 个发布标签（时间戳标签天然按时间排序）；
# 手工打的标签（如 1.0）不动，避免误删
old_tags="$(remote "docker images '$IMAGE' --format '{{.Tag}}' | grep -E '^[0-9]{8}-[0-9]{6}$' | sort -r | tail -n +$((KEEP_IMAGES + 1))" || true)"
for old in $old_tags; do
  remote "docker rmi '$IMAGE:$old'" >/dev/null 2>&1 || true
done
[ -z "$old_tags" ] || info "已清理旧镜像：$(printf '%s ' $old_tags)"

# 公网自检：可选；反代/证书不由本脚本负责，失败只告警
if [ -n "$PUBLIC_HEALTH" ]; then
  if pub="$(curl -fsS --max-time 10 "$PUBLIC_HEALTH" 2>/dev/null)"; then
    case "$pub" in
      *'"status":"ok"'*) info "公网 $PUBLIC_HEALTH 正常" ;;
      *) warn "公网返回异常：$pub" ;;
    esac
  else
    warn "公网自检不通（nginx/证书/网络），请手动确认 $PUBLIC_HEALTH"
  fi
fi

remote "docker ps --filter name='$CONTAINER' --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"

ok "发布完成：$IMAGE:$TAG (git $GIT_REV)"
info "可回滚镜像：$(remote "docker images '$IMAGE' --format '{{.Tag}}'" | sort -r | tr '\n' ' ')"
info "查看日志：ssh $TARGET 'docker logs -f --tail 100 $CONTAINER'"
