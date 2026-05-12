#!/bin/bash
################################################################################
# XieHe Medical System - 单机局域网部署脚本 (deploy_pc.sh)
#
# 适用场景: 局域网内单台服务器，仅安装了 miniconda + docker + CUDA 驱动
# 所有服务均通过 Docker 运行，零额外依赖
#
# 用法:
#   chmod +x deploy_pc.sh
#   ./deploy_pc.sh [OPTIONS]
#
# 选项:
#   --with-ai          同时部署 AI 推理服务（zhengmian + cemian）
#   --gpu              AI 服务使用 NVIDIA GPU（需 nvidia-container-toolkit）
#   --ip <IP>          手动指定局域网 IP（默认自动检测）
#   --update-ip        仅更新 IP（不重新部署），IP 变化时使用
#   --branch <branch>  Git 分支（默认 main）
#   --skip-pull        跳过 git pull
#   --rebuild          强制重新构建所有镜像（不使用缓存）
#   --reset-env        重新生成所有 dotenv 配置文件
#   -y, --yes          跳过确认提示
#   -h, --help         显示帮助
#
# 示例:
#   ./deploy_pc.sh                        # 基础部署（无 AI）
#   ./deploy_pc.sh --with-ai              # 含 AI 推理（CPU 模式）
#   ./deploy_pc.sh --with-ai --gpu        # 含 AI 推理（GPU 模式）
#   ./deploy_pc.sh --with-ai --ip 192.168.1.100
#   ./deploy_pc.sh --update-ip            # 服务器 IP 变更后只更新配置
#常见命令
#git fetch origin && git reset --hard origin/main 拉取
#./deploy_pc.sh --skip-pull --reset-env 重建参数，修改后不会覆盖数据库愿密码
#./model/zhengmian/start_host.sh --stop
#./model/zhengmian/start_host.sh --stop
# 停止所有 uvicorn 进程（小心，会停掉所有 uvicorn） pkill -f "uvicorn app:app"
# 启动所有 AI 服务（zhengmian + cemian）./manage_ai.sh start
# 停止所有 AI 服务 ./manage_ai.sh stop
# 重启所有 AI 服务 ./manage_ai.sh restart
# 查看所有服务状态 ./manage_ai.sh status
# 实时查看所有服务日志（同时显示两个日志） ./manage_ai.sh logs
# 查看帮助 ./manage_ai.sh help
#修改IP
# 运行脚本，会提示输入新 IP./change_ip.sh
################################################################################

set -euo pipefail

# ==================== 固定密码配置 ====================
# 如果设置为固定值，则使用固定密码；留空则生成随机密码
FIXED_MYSQL_PASSWORD="xiehe_mysql_2024"
FIXED_MINIO_PASSWORD="xiehe_minio_2024"
# ====================================================

# ==================== 颜色 ====================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'; NC='\033[0m'

# ==================== 默认参数 ====================
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_BRANCH="main"
WITH_AI=0
USE_GPU=0
MANUAL_IP=""
SKIP_PULL=0
REBUILD=0
RESET_ENV=0
AUTO_YES=0
UPDATE_IP=0

# ==================== 解析参数 ====================
while [[ $# -gt 0 ]]; do
    case "$1" in
        --with-ai)   WITH_AI=1; shift ;;
        --gpu)       USE_GPU=1; shift ;;
        --ip)        MANUAL_IP="$2"; shift 2 ;;
        --update-ip) UPDATE_IP=1; shift ;;
        --branch)    GIT_BRANCH="$2"; shift 2 ;;
        --skip-pull) SKIP_PULL=1; shift ;;
        --rebuild)   REBUILD=1; shift ;;
        --reset-env) RESET_ENV=1; shift ;;
        -y|--yes)    AUTO_YES=1; shift ;;
        -h|--help)
            sed -n '/#/p' "$0" | head -38
            exit 0 ;;
        *) echo -e "${RED}未知参数: $1${NC}"; exit 1 ;;
    esac
done

# ==================== 辅助函数 ====================
print_header()  { echo ""; echo -e "${CYAN}==============================${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}==============================${NC}"; echo ""; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error()   { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_step()    { echo -e "${PURPLE}➜ $1${NC}"; }

confirm() {
    if [ "$AUTO_YES" = "1" ]; then return 0; fi
    read -p "$1 (y/n) " -n 1 -r; echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

generate_secret() {
    python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null \
        || openssl rand -hex 32 2>/dev/null \
        || cat /dev/urandom | LC_ALL=C tr -dc 'a-f0-9' | head -c 64
}

detect_lan_ip() {
    # 优先选非 127.x、非 docker0 的第一个 IPv4
    ip route get 8.8.8.8 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1 \
        || hostname -I 2>/dev/null | awk '{print $1}' \
        || echo "127.0.0.1"
}

# ==================== 检测局域网 IP ====================
if [ -n "$MANUAL_IP" ]; then
    LAN_IP="$MANUAL_IP"
else
    LAN_IP="$(detect_lan_ip)"
fi

# ==================== 环境检查 ====================
check_environment() {
    print_header "环境检查"
    command -v docker &>/dev/null || { print_error "Docker 未安装"; exit 1; }
    print_success "Docker: $(docker --version)"
    docker compose version &>/dev/null || { print_error "Docker Compose 插件未安装"; exit 1; }
    print_success "Docker Compose: $(docker compose version --short)"
    command -v git &>/dev/null || { print_error "Git 未安装"; exit 1; }
    print_success "Git: $(git --version)"
    if [ "$USE_GPU" = "1" ]; then
        docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi &>/dev/null \
            || { print_error "GPU 模式需要 nvidia-container-toolkit，且当前 Docker 无法访问 GPU"; exit 1; }
        print_success "NVIDIA GPU 可用"
    fi
    print_info "局域网 IP: ${CYAN}${LAN_IP}${NC}"
    print_info "可用磁盘: $(df -h "$PROJECT_DIR" | awk 'NR==2{print $4}')"
}

# ==================== 拉取代码 ====================
# 策略：强制对齐远端，不保留任何本地改动。
# 用 fetch + reset --hard 而不是 pull，避免 index 损坏或本地文件不一致导致卡死。
# 注意：untracked 文件（如模型权重 .pt）不会被删除。
pull_latest_code() {
    print_header "拉取最新代码"
    cd "$PROJECT_DIR"
    [ ! -d ".git" ] && { print_warning "非 Git 仓库，跳过拉取"; return; }

    print_step "fetch 远端..."
    git fetch origin

    print_step "切换到分支 $GIT_BRANCH..."
    git checkout "$GIT_BRANCH" 2>/dev/null || git checkout -b "$GIT_BRANCH" "origin/$GIT_BRANCH"

    print_step "强制对齐远端（丢弃所有本地改动）..."
    git reset --hard "origin/$GIT_BRANCH"

    print_success "代码已更新: $(git log -1 --pretty='%h - %s')"
}

# ==================== 生成 dotenv 文件 ====================
generate_dotenv_files() {
    print_header "生成配置文件"
    DOTENV_DIR="$PROJECT_DIR/dotenv"
    mkdir -p "$DOTENV_DIR"

    write_if_missing() {
        local file="$DOTENV_DIR/$1"
        if [ -f "$file" ] && [ "$RESET_ENV" = "0" ]; then
            print_info "已存在，跳过: dotenv/$1"
            return
        fi
        [ -f "$file" ] && print_warning "重置: dotenv/$1"
        cat > "$file"
        print_success "已生成: dotenv/$1"
    }

    # --- 生成各类密钥 ---
    # MySQL 密码：优先使用固定密码，否则检测容器或生成随机密码
    if [ -n "$FIXED_MYSQL_PASSWORD" ]; then
        DB_PASSWORD="$FIXED_MYSQL_PASSWORD"
        MYSQL_ROOT_PASSWORD="$FIXED_MYSQL_PASSWORD"
        print_info "使用固定 MySQL 密码: ${FIXED_MYSQL_PASSWORD:0:8}***"
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^medical_mysql$"; then
        OLD_DB_PASSWORD=$(docker exec medical_mysql printenv MYSQL_ROOT_PASSWORD 2>/dev/null || echo "")
        if [ -n "$OLD_DB_PASSWORD" ]; then
            DB_PASSWORD="$OLD_DB_PASSWORD"
            MYSQL_ROOT_PASSWORD="$OLD_DB_PASSWORD"
            print_info "检测到运行中的 MySQL 容器，保留现有密码（避免数据丢失）"
        else
            DB_PASSWORD="$(generate_secret | head -c 24)"
            MYSQL_ROOT_PASSWORD="${DB_PASSWORD}"
            print_warning "MySQL 容器运行中但无法读取密码，生成新密码"
        fi
    else
        DB_PASSWORD="$(generate_secret | head -c 24)"
        MYSQL_ROOT_PASSWORD="${DB_PASSWORD}"
        print_info "未检测到运行中的 MySQL 容器，生成新密码"
    fi

    # MinIO 密码：优先使用固定密码，否则检测容器或生成随机密码
    if [ -n "$FIXED_MINIO_PASSWORD" ]; then
        MINIO_USER="minioadmin"
        MINIO_PASSWORD="$FIXED_MINIO_PASSWORD"
        print_info "使用固定 MinIO 密码: ${FIXED_MINIO_PASSWORD:0:8}***"
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^medical_minio$"; then
        OLD_MINIO_USER=$(docker exec medical_minio printenv MINIO_ROOT_USER 2>/dev/null || echo "")
        OLD_MINIO_PASSWORD=$(docker exec medical_minio printenv MINIO_ROOT_PASSWORD 2>/dev/null || echo "")
        if [ -n "$OLD_MINIO_USER" ] && [ -n "$OLD_MINIO_PASSWORD" ]; then
            MINIO_USER="$OLD_MINIO_USER"
            MINIO_PASSWORD="$OLD_MINIO_PASSWORD"
            print_info "检测到运行中的 MinIO 容器，保留现有凭据"
        else
            MINIO_USER="minioadmin"
            MINIO_PASSWORD="$(generate_secret | head -c 20)"
            print_warning "MinIO 容器运行中但无法读取凭据，生成新凭据"
        fi
    else
        MINIO_USER="minioadmin"
        MINIO_PASSWORD="$(generate_secret | head -c 20)"
        print_info "未检测到运行中的 MinIO 容器，生成新凭据"
    fi

    # 其他密钥（JWT、Storage Token）总是重新生成
    JWT_SECRET="$(generate_secret)"
    STORAGE_TOKEN="$(generate_secret | head -c 32)"

    # --- .env.runtime ---
    write_if_missing ".env.runtime" <<EOF
ENVIRONMENT=production
DEBUG=false
PYTHONPATH=/app
MAX_UPLOAD_SIZE=104857600
LOG_LEVEL=INFO
LOG_DIR=/app/logs

# Go 模块代理（国内网络必须，proxy.golang.org 被拦截）
BUILD_GOPROXY=https://goproxy.cn,direct
BUILD_GOSUMDB=off

# Python pip 镜像（国内网络必须）
BUILD_PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
BUILD_PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

# apt-get 镜像（加速 Debian/Ubuntu 系统依赖安装，用于 backend）
BUILD_APT_MIRROR=mirrors.tuna.tsinghua.edu.cn
# apk 镜像（加速 Alpine 系统依赖安装，用于 frontend/nginx）
BUILD_APK_MIRROR=mirrors.tuna.tsinghua.edu.cn

# 如需 HTTP 代理（科学上网）可在此配置：
# BUILD_HTTP_PROXY=http://${LAN_IP}:7890
# BUILD_HTTPS_PROXY=http://${LAN_IP}:7890
EOF

    # --- .env.ports ---
    write_if_missing ".env.ports" <<EOF
BACKEND_PORT_BIND=0.0.0.0:8080:8080
FRONTEND_PORT_BIND=0.0.0.0:3030:3000
MYSQL_PORT_BIND=127.0.0.1:3306:3306
REDIS_PORT_BIND=127.0.0.1:6380:6379
MINIO_API_PORT_BIND=0.0.0.0:9000:9000
MINIO_CONSOLE_PORT_BIND=127.0.0.1:9001:9001
EOF

    # --- .env.database ---
    write_if_missing ".env.database" <<EOF
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=medical_imaging_system
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=medical_imaging_system
MYSQL_CHARACTER_SET_SERVER=utf8mb4
MYSQL_COLLATION_SERVER=utf8mb4_0900_ai_ci
DATABASE_URL=mysql+pymysql://root:${DB_PASSWORD}@mysql:3306/medical_imaging_system
TEST_DATABASE_URL=mysql+pymysql://root:${DB_PASSWORD}@mysql:3306/medical_imaging_system_test
EOF

    # --- .env.redis ---
    write_if_missing ".env.redis" <<EOF
REDIS_URL=redis://redis:6379/0
EOF

    # --- .env.minio ---
    write_if_missing ".env.minio" <<EOF
MINIO_ROOT_USER=${MINIO_USER}
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
MINIO_REGION=us-east-1
MINIO_PUBLIC_ENDPOINT=http://${LAN_IP}:9000
EOF

    # --- .env.storage ---
    write_if_missing ".env.storage" <<EOF
STORAGE_SERVICE_TOKEN=${STORAGE_TOKEN}
STORAGE_SERVICE_URL=http://storage-service:8090
IMAGE_FILE_BUCKET=medical-image-files
USER_AVATAR_BUCKET=medical-user-avatars
EOF

    # --- .env.backend ---
    # AI 服务运行在宿主机时，backend 容器通过宿主机 LAN IP 访问
    # （host.docker.internal 在某些 Linux 环境不可用，用实际 IP 更可靠）
    write_if_missing ".env.backend" <<EOF
JWT_SECRET_KEY=${JWT_SECRET}
FORWARDED_ALLOW_IPS=*
CORS_ORIGINS=http://${LAN_IP}:3030,http://localhost:3030
AI_FRONT_PREDICT_OBJECT_URL=http://${LAN_IP}:8001/predict_object
AI_FRONT_KEYPOINTS_OBJECT_URL=http://${LAN_IP}:8001/detect_keypoints_object
AI_LATERAL_PREDICT_OBJECT_URL=http://${LAN_IP}:8002/api/detect_and_keypoints_object
AI_LATERAL_DETECT_OBJECT_URL=http://${LAN_IP}:8002/api/detect_object
EOF

    # 前端 AI 端点根据是否部署 AI 决定
    local ai_base_url="http://${LAN_IP}"
    # MODEL_STORAGE_ALLOWED_CIDR=0.0.0.0/0：单机部署时宿主机进程经 Docker NAT 进入容器，
    # nginx 看到的源 IP 是 Docker bridge 网关（172.x.x.1），而非宿主机 LAN IP。
    # CIDR 放全段，由 X-Storage-Service-Token 提供实际认证。
    write_if_missing ".env.frontend" <<EOF
NEXT_PUBLIC_API_URL=http://${LAN_IP}:8080
NEXT_PUBLIC_API_BASE_URL=http://${LAN_IP}:8080
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_WEBSOCKET_URL=ws://${LAN_IP}:8080/api/v1/ws/ws
NEXT_PUBLIC_AI_DETECT_URL=${ai_base_url}:8001/predict
NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL=${ai_base_url}:8001/detect_keypoints
NEXT_PUBLIC_AI_DETECT_LATERAL_URL=${ai_base_url}:8002/detect_and_keypoints
NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL=${ai_base_url}:8002/detect
MODEL_STORAGE_ALLOWED_CIDR=0.0.0.0/0
EOF
}

# ==================== AI dotenv（仅在 --with-ai 时写入） ====================
generate_ai_dotenv() {
    DOTENV_DIR="$PROJECT_DIR/dotenv"
    local file="$DOTENV_DIR/.env.ai"
    if [ -f "$file" ] && [ "$RESET_ENV" = "0" ]; then
        print_info "已存在，跳过: dotenv/.env.ai"; return
    fi
    # 读取 storage token 供 Docker AI 容器使用（和 backend 同网络，直接访问 storage-service）
    local storage_token=""
    [ -f "$DOTENV_DIR/.env.storage" ] && \
        storage_token=$(grep "^STORAGE_SERVICE_TOKEN=" "$DOTENV_DIR/.env.storage" | cut -d= -f2)
    cat > "$file" <<EOF
AI_ZHENGMIAN_PORT_BIND=0.0.0.0:8001:8001
AI_CEMIAN_PORT_BIND=0.0.0.0:8002:8002
# Docker AI 容器与 storage-service 同在 medical_network，直接访问内部地址
STORAGE_SERVICE_URL=http://storage-service:8090
STORAGE_SERVICE_TOKEN=${storage_token}
EOF
    print_success "已生成: dotenv/.env.ai"
}

# ==================== compose 封装 ====================
COMPOSE_WRAPPER="$PROJECT_DIR/scripts/compose.sh"

main_compose() {
    XIEHE_COMPOSE_USE_EXAMPLES=0 "$COMPOSE_WRAPPER" "$@"
}

ai_compose() {
    # 构建 AI compose 命令（env file + compose files）
    local cmd=(docker compose)
    cmd+=(--env-file "$PROJECT_DIR/dotenv/.env.runtime")
    cmd+=(--env-file "$PROJECT_DIR/dotenv/.env.ai")
    cmd+=(-f "$PROJECT_DIR/infrastructure/docker/compose/base.yml")
    cmd+=(-f "$PROJECT_DIR/infrastructure/docker/compose/ai.yml")
    if [ "$USE_GPU" = "1" ]; then
        cmd+=(-f "$PROJECT_DIR/infrastructure/docker/compose/ai-gpu.yml")
    fi
    "${cmd[@]}" "$@"
}

# ==================== 停止旧服务 ====================
stop_old_services() {
    print_header "停止旧服务"
    cd "$PROJECT_DIR"
    print_step "停止主系统..."
    main_compose down 2>/dev/null || true
    if [ "$WITH_AI" = "1" ] && [ -f "$PROJECT_DIR/dotenv/.env.ai" ]; then
        print_step "停止 AI 服务..."
        ai_compose down 2>/dev/null || true
    fi
    docker image prune -f >/dev/null 2>&1 || true
    print_success "旧服务已停止"
}

# ==================== 构建镜像 ====================
build_docker_images() {
    print_header "构建 Docker 镜像"
    cd "$PROJECT_DIR"
    local build_args=()
    [ "$REBUILD" = "1" ] && build_args+=(--no-cache)

    print_step "构建主系统镜像（backend / frontend / storage-service）..."
    main_compose build "${build_args[@]}" || { print_error "主系统镜像构建失败"; exit 1; }
    print_success "主系统镜像构建完成"

    if [ "$WITH_AI" = "1" ]; then
        print_step "构建 AI 推理镜像（zhengmian / cemian）..."
        ai_compose build "${build_args[@]}" || { print_error "AI 镜像构建失败"; exit 1; }
        print_success "AI 镜像构建完成"
    fi
}

# ==================== 启动服务 ====================
start_services() {
    print_header "启动服务"
    cd "$PROJECT_DIR"

    print_step "启动主系统..."
    main_compose up -d || { print_error "主系统启动失败"; exit 1; }
    print_success "主系统已启动"

    if [ "$WITH_AI" = "1" ]; then
        print_step "启动 AI 推理服务..."
        ai_compose up -d || { print_error "AI 服务启动失败"; exit 1; }
        print_success "AI 服务已启动"
    fi
}

# ==================== 健康检查 ====================
health_check() {
    print_header "健康检查"
    cd "$PROJECT_DIR"

    # 容器状态一览
    print_step "容器状态："
    main_compose ps 2>/dev/null || true
    [ "$WITH_AI" = "1" ] && ai_compose ps 2>/dev/null || true
    echo ""

    wait_http() {
        local name="$1" url="$2" max_attempts="${3:-30}"
        print_step "等待 ${name}..."
        for i in $(seq 1 "$max_attempts"); do
            if curl --noproxy '*' -sf "$url" >/dev/null 2>&1; then
                print_success "${name} 正常"
                return 0
            fi
            sleep 3
        done
        print_warning "${name} 未在规定时间内响应，请稍后手动检查"
    }

    wait_http "后端 API"  "http://localhost:8080/health"  20
    wait_http "前端应用"  "http://localhost:3030"         20
    wait_http "MinIO"    "http://localhost:9000/minio/health/live" 10

    if [ "$WITH_AI" = "1" ]; then
        wait_http "AI 正面服务 (zhengmian)" "http://localhost:8001/health" 30
        wait_http "AI 侧面服务 (cemian)"    "http://localhost:8002/health" 30
    fi
}

# ==================== 初始化数据库用户 ====================
initialize_database() {
    print_header "初始化数据库用户"

    # 检查 admin 用户是否已存在（通过 backend 容器执行，避免直接暴露 MySQL 端口）
    print_step "检查 admin 用户是否已存在..."
    local admin_count
    admin_count=$(docker exec medical_backend python3 -c "
import os, sys
try:
    import pymysql
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'mysql'),
        port=int(os.getenv('DB_PORT', '3306')),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'medical_imaging_system'),
        charset='utf8mb4'
    )
    with conn.cursor() as cur:
        cur.execute(\"SELECT COUNT(*) FROM users WHERE username='admin'\")
        print(cur.fetchone()[0])
    conn.close()
except Exception as e:
    print('0', file=sys.stderr)
    print('0')
" 2>/dev/null || echo "0")

    if [ "${admin_count:-0}" -gt 0 ] 2>/dev/null; then
        print_info "admin 用户已存在，跳过初始化"
        return 0
    fi

    print_step "运行数据库初始化脚本..."
    if docker exec medical_backend python3 /app/scripts/init_user_tables.py; then
        print_success "数据库初始化完成"
        echo ""
        echo -e "${CYAN}默认账号：${NC}"
        echo -e "  ${GREEN}管理员：${NC} admin / admin123"
        echo -e "  ${GREEN}医生：  ${NC} doctor01 / doctor123"
    else
        print_warning "初始化脚本报错，可能已有数据（通常无需处理）"
        print_warning "手动运行: docker exec medical_backend python3 /app/scripts/init_user_tables.py"
    fi
}

# ==================== 更新局域网 IP ====================
update_ip_config() {
    print_header "更新局域网 IP 配置"
    DOTENV_DIR="$PROJECT_DIR/dotenv"

    if [ ! -f "$DOTENV_DIR/.env.frontend" ]; then
        print_error "dotenv/.env.frontend 不存在，请先完整部署: ./deploy_pc.sh"
        exit 1
    fi

    # 从前端配置读取旧 IP
    local old_ip
    old_ip=$(grep "NEXT_PUBLIC_API_URL" "$DOTENV_DIR/.env.frontend" 2>/dev/null \
        | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)

    if [ -z "$old_ip" ]; then
        print_error "无法从 dotenv/.env.frontend 读取旧 IP"
        exit 1
    fi

    if [ "$old_ip" = "$LAN_IP" ]; then
        print_success "IP 未变化 (${LAN_IP})，无需更新"
        return 0
    fi

    print_info "旧 IP: ${YELLOW}${old_ip}${NC}  →  新 IP: ${CYAN}${LAN_IP}${NC}"
    confirm "确认更新 IP？" || { print_error "已取消"; exit 1; }

    # 替换各 dotenv 文件中的 IP（只改 IP，不动密码）
    for f in "$DOTENV_DIR/.env.frontend" "$DOTENV_DIR/.env.backend" "$DOTENV_DIR/.env.minio"; do
        [ -f "$f" ] && sed -i "s/${old_ip}/${LAN_IP}/g" "$f" \
            && print_success "已更新: $(basename "$f")"
    done
    # .env.ai 里可能也有 LAN IP（手动 AI 提示用）
    [ -f "$DOTENV_DIR/.env.ai" ] && sed -i "s/${old_ip}/${LAN_IP}/g" "$DOTENV_DIR/.env.ai"

    # 前端 IP 编译进了静态文件，必须重建
    print_step "重建前端镜像（IP 已编译进静态文件）..."
    main_compose build frontend || { print_error "前端重建失败"; exit 1; }

    # 重启 backend（CORS_ORIGINS 变了）和 frontend
    print_step "重启 backend 和 frontend..."
    main_compose up -d --force-recreate backend frontend || { print_error "服务重启失败"; exit 1; }

    print_success "IP 更新完成！"
    echo ""
    echo -e "  ${GREEN}前端：${NC} http://${LAN_IP}:3030"
    echo -e "  ${GREEN}后端：${NC} http://${LAN_IP}:8080"
    echo ""
    echo -e "${YELLOW}提示：如有手动启动的 AI 服务，请用新 IP 重新启动。${NC}"
}

# ==================== 部署摘要 ====================
print_summary() {
    print_header "🎉 部署完成"
    echo -e "${CYAN}访问地址：${NC}"
    echo -e "  ${GREEN}前端应用：${NC}    http://${LAN_IP}:3030"
    echo -e "  ${GREEN}后端 API：${NC}    http://${LAN_IP}:8080"
    echo -e "  ${GREEN}API 文档：${NC}    http://${LAN_IP}:8080/docs"
    echo -e "  ${GREEN}MinIO 控制台：${NC} http://localhost:9001   (仅本机访问)"
    if [ "$WITH_AI" = "1" ]; then
        echo -e "  ${GREEN}AI 正面服务：${NC}  http://${LAN_IP}:8001"
        echo -e "  ${GREEN}AI 侧面服务：${NC}  http://${LAN_IP}:8002"
        [ "$USE_GPU" = "1" ] && echo -e "  ${YELLOW}GPU 加速：${NC}     已启用"
    fi
    echo ""
    echo -e "${CYAN}常用命令：${NC}"
    echo -e "  ${YELLOW}查看日志：${NC}   ./scripts/compose.sh logs -f"
    echo -e "  ${YELLOW}停止服务：${NC}   ./scripts/compose.sh down"
    echo -e "  ${YELLOW}重启服务：${NC}   ./scripts/compose.sh restart"
    echo -e "  ${YELLOW}查看状态：${NC}   ./scripts/compose.sh ps"
    if [ "$WITH_AI" = "1" ]; then
        echo -e "  ${YELLOW}AI 日志：${NC}    docker logs -f medical_ai_zhengmian"
        echo -e "             docker logs -f medical_ai_cemian"
    fi
    echo ""
    echo -e "${CYAN}配置文件位于：${NC} ${PROJECT_DIR}/dotenv/"
    echo -e "${YELLOW}提示：首次生成的密码保存在 dotenv/ 目录，请妥善保管。${NC}"
    echo ""
    # 如没有 Docker AI，显示手动启动 AI 的命令
    if [ "$WITH_AI" != "1" ]; then
        local storage_token=""
        [ -f "$PROJECT_DIR/dotenv/.env.storage" ] && \
            storage_token=$(grep "^STORAGE_SERVICE_TOKEN=" "$PROJECT_DIR/dotenv/.env.storage" | cut -d= -f2)
        echo -e "${CYAN}手动启动 AI 服务（如有模型权重）：${NC}"
        echo -e "  ${YELLOW}cd ${PROJECT_DIR}${NC}"
        echo -e "  ${YELLOW}export STORAGE_SERVICE_URL=http://localhost:8090${NC}"
        echo -e "  ${YELLOW}export STORAGE_SERVICE_TOKEN=${storage_token}${NC}"
        echo -e "  ${YELLOW}uvicorn app:app --host 0.0.0.0 --port 8001 --app-dir model/zhengmian &${NC}"
        echo -e "  ${YELLOW}uvicorn app:app --host 0.0.0.0 --port 8002 --app-dir model/cemian &${NC}"
        echo ""
        echo -e "${CYAN}IP 变更后更新配置：${NC}"
        echo -e "  ${YELLOW}./deploy_pc.sh --update-ip${NC}"
        echo ""
    fi
}

# ==================== 主流程 ====================
main() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║     XieHe Medical System - 单机局域网部署 (PC模式)        ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # --update-ip 模式：只更新 IP 和重建前端，不重部署
    if [ "$UPDATE_IP" = "1" ]; then
        echo -e "  模式:    ${YELLOW}仅更新局域网 IP${NC}"
        echo -e "  新 IP:   ${CYAN}${LAN_IP}${NC}"
        echo ""
        update_ip_config
        return 0
    fi

    echo -e "  局域网 IP:  ${CYAN}${LAN_IP}${NC}"
    echo -e "  AI 服务:    $([ "$WITH_AI" = "1" ] && echo "${GREEN}启用$([ "$USE_GPU" = "1" ] && echo " (GPU)")${NC}" || echo "${YELLOW}跳过${NC}")"
    echo -e "  Git 分支:   ${GIT_BRANCH}"
    echo -e "  强制重建:   $([ "$REBUILD" = "1" ] && echo "${YELLOW}是${NC}" || echo "否")"
    echo ""

    confirm "确认开始部署？" || { print_error "部署已取消"; exit 1; }

    check_environment
    [ "$SKIP_PULL" = "0" ] && pull_latest_code
    generate_dotenv_files
    [ "$WITH_AI" = "1" ] && generate_ai_dotenv
    stop_old_services
    build_docker_images
    start_services
    health_check
    initialize_database
    print_summary

    echo ""
    if confirm "是否查看实时日志？"; then
        main_compose logs --tail=50 -f
    fi
}

trap 'print_error "部署中断，请检查错误信息"; exit 1' ERR

main "$@"
