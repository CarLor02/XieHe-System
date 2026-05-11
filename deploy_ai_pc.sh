#!/bin/bash
################################################################################
# XieHe Medical System - 本机 AI 服务启动脚本 (deploy_ai_pc.sh)
#
# 适用场景: AI 服务直接跑在宿主机（非容器），主系统已通过 deploy_pc.sh 部署
# 自动读取 dotenv/ 中的 token 和 IP，以正确配置启动 zhengmian + cemian
#
# 用法:
#   chmod +x deploy_ai_pc.sh
#   ./deploy_ai_pc.sh [OPTIONS]
#
# 选项:
#   --stop             停止已在运行的 AI 服务
#   --ip <IP>          手动指定局域网 IP（默认自动检测）
#   --conda-env <ENV>  指定 conda 环境名（默认用当前激活的环境）
#   -y, --yes          跳过确认提示
#   -h, --help         显示帮助
#
# 示例:
#   ./deploy_ai_pc.sh                       # 启动 AI 服务（自动配置）
#   ./deploy_ai_pc.sh --stop                # 停止 AI 服务
#   ./deploy_ai_pc.sh --conda-env spine     # 使用 conda env "spine"
#   ./deploy_ai_pc.sh --ip 192.168.1.42     # 手动指定 IP
################################################################################

set -euo pipefail

# ==================== 颜色 ====================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'; NC='\033[0m'

# ==================== 默认参数 ====================
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOTENV_DIR="$PROJECT_DIR/dotenv"
PID_FILE="$DOTENV_DIR/ai_pids.txt"
LOG_DIR="$PROJECT_DIR/logs/ai"
MANUAL_IP=""
CONDA_ENV=""
STOP_ONLY=0
AUTO_YES=0

ZHENGMIAN_DIR="$PROJECT_DIR/model/zhengmian"
CEMIAN_DIR="$PROJECT_DIR/model/cemian"
ZHENGMIAN_PORT=8001
CEMIAN_PORT=8002

# ==================== 解析参数 ====================
while [[ $# -gt 0 ]]; do
    case "$1" in
        --stop)        STOP_ONLY=1; shift ;;
        --ip)          MANUAL_IP="$2"; shift 2 ;;
        --conda-env)   CONDA_ENV="$2"; shift 2 ;;
        -y|--yes)      AUTO_YES=1; shift ;;
        -h|--help)
            sed -n '/#/p' "$0" | head -30
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

detect_lan_ip() {
    ip route get 8.8.8.8 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1 \
        || hostname -I 2>/dev/null | awk '{print $1}' \
        || echo "127.0.0.1"
}

# 杀掉占用指定端口的进程
kill_port() {
    local port="$1"
    local pid
    pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
        print_step "停止端口 ${port} 上的进程 (PID: ${pid})..."
        kill "$pid" 2>/dev/null || true
        sleep 1
        # 如果还没停，强制杀
        kill -9 "$pid" 2>/dev/null || true
        print_success "端口 ${port} 已释放"
    fi
}

# ==================== 停止 AI 服务 ====================
stop_ai_services() {
    print_header "停止 AI 服务"

    # 先用 PID 文件停
    if [ -f "$PID_FILE" ]; then
        while IFS= read -r pid; do
            [ -z "$pid" ] && continue
            if kill -0 "$pid" 2>/dev/null; then
                print_step "停止进程 PID $pid..."
                kill "$pid" 2>/dev/null || true
                sleep 1
                kill -9 "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
        print_success "已停止 PID 文件中的进程"
    fi

    # 兜底：直接杀端口上的进程
    kill_port "$ZHENGMIAN_PORT"
    kill_port "$CEMIAN_PORT"

    print_success "AI 服务已停止"
}

# ==================== 读取配置 ====================
load_config() {
    # 读取 storage token
    if [ ! -f "$DOTENV_DIR/.env.storage" ]; then
        print_error "找不到 $DOTENV_DIR/.env.storage，请先运行 ./deploy_pc.sh 部署主系统"
        exit 1
    fi
    STORAGE_TOKEN=$(grep "^STORAGE_SERVICE_TOKEN=" "$DOTENV_DIR/.env.storage" | cut -d= -f2)
    if [ -z "$STORAGE_TOKEN" ]; then
        print_error "STORAGE_SERVICE_TOKEN 为空，dotenv/.env.storage 可能损坏"
        exit 1
    fi

    # 确定 LAN IP
    if [ -n "$MANUAL_IP" ]; then
        LAN_IP="$MANUAL_IP"
    elif [ -f "$DOTENV_DIR/.env.frontend" ]; then
        # 优先从已有配置读（和主系统保持一致）
        LAN_IP=$(grep "NEXT_PUBLIC_API_URL" "$DOTENV_DIR/.env.frontend" 2>/dev/null \
            | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        [ -z "$LAN_IP" ] && LAN_IP="$(detect_lan_ip)"
    else
        LAN_IP="$(detect_lan_ip)"
    fi

    # storage-service 运行在 Docker 内，通过端口映射暴露到 localhost:8090
    # 参考：infrastructure/docker/compose/storage-service.yml
    # 端口：8090 = storage-service, 3030 = frontend (不要混淆)
    STORAGE_URL="http://localhost:8090"
}

# ==================== 检查模型文件 ====================
check_model_files() {
    print_header "检查模型文件"
    local ok=1

    # zhengmian 需要 weights/pose.pt 和 weights/pose_corner.pt
    for f in "weights/pose.pt" "weights/pose_corner.pt"; do
        if [ -f "$ZHENGMIAN_DIR/$f" ]; then
            print_success "zhengmian/$f  ($(du -h "$ZHENGMIAN_DIR/$f" | cut -f1))"
        else
            print_error "缺少: model/zhengmian/$f"
            ok=0
        fi
    done

    # cemian 需要 models/corner_model.pt 和 models/cfh_model.pt
    for f in "models/corner_model.pt" "models/cfh_model.pt"; do
        if [ -f "$CEMIAN_DIR/$f" ]; then
            print_success "cemian/$f  ($(du -h "$CEMIAN_DIR/$f" | cut -f1))"
        else
            print_error "缺少: model/cemian/$f"
            ok=0
        fi
    done

    [ "$ok" = "0" ] && { print_error "模型文件缺失，无法启动"; exit 1; }
}

# ==================== 确定 Python 解释器 ====================
resolve_python() {
    if [ -n "$CONDA_ENV" ]; then
        # 找 conda 安装目录
        local conda_base
        conda_base=$(conda info --base 2>/dev/null || echo "$HOME/miniconda3")
        PYTHON_BIN="$conda_base/envs/$CONDA_ENV/bin/python"
        UVICORN_BIN="$conda_base/envs/$CONDA_ENV/bin/uvicorn"
        if [ ! -f "$UVICORN_BIN" ]; then
            print_error "conda 环境 '$CONDA_ENV' 中找不到 uvicorn，请先: conda activate $CONDA_ENV && pip install uvicorn"
            exit 1
        fi
        print_info "使用 conda 环境: ${CYAN}${CONDA_ENV}${NC}  ($UVICORN_BIN)"
    else
        UVICORN_BIN=$(command -v uvicorn 2>/dev/null || true)
        if [ -z "$UVICORN_BIN" ]; then
            print_error "当前环境找不到 uvicorn，请激活正确的 conda 环境或用 --conda-env 指定"
            exit 1
        fi
        print_info "使用当前环境 uvicorn: ${CYAN}${UVICORN_BIN}${NC}"
    fi
}

# ==================== 启动单个 AI 服务 ====================
start_service() {
    local name="$1"   # zhengmian | cemian
    local dir="$2"    # 工作目录
    local port="$3"   # 端口

    mkdir -p "$LOG_DIR"
    local log_file="$LOG_DIR/${name}.log"

    print_step "启动 ${name} (端口 ${port})..."

    nohup env \
        STORAGE_SERVICE_URL="$STORAGE_URL" \
        STORAGE_SERVICE_TOKEN="$STORAGE_TOKEN" \
        NO_PROXY="localhost,127.0.0.1,${LAN_IP}" \
        no_proxy="localhost,127.0.0.1,${LAN_IP}" \
        bash -c "cd '$dir' && '$UVICORN_BIN' app:app --host 0.0.0.0 --port '$port'" \
        > "$log_file" 2>&1 &

    local pid=$!
    echo "$pid" >> "$PID_FILE"
    print_success "${name} 已启动 (PID: ${pid}，日志: logs/ai/${name}.log)"
}

# ==================== 等待健康检查 ====================
wait_healthy() {
    local name="$1" url="$2" max="${3:-30}"
    print_step "等待 ${name} 就绪..."
    for i in $(seq 1 "$max"); do
        if curl --noproxy '*' -sf "$url" >/dev/null 2>&1; then
            print_success "${name} 健康检查通过"
            return 0
        fi
        sleep 2
    done
    print_warning "${name} 未在规定时间内响应，请查看日志: logs/ai/${name}.log"
}

# ==================== 主流程 ====================
main() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║     XieHe Medical System - 本机 AI 服务部署              ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    if [ "$STOP_ONLY" = "1" ]; then
        stop_ai_services
        return 0
    fi

    load_config

    echo -e "  局域网 IP:     ${CYAN}${LAN_IP}${NC}"
    echo -e "  Storage URL:   ${CYAN}${STORAGE_URL}${NC}"
    echo -e "  Storage Token: ${CYAN}${STORAGE_TOKEN:0:8}...${NC}"
    echo -e "  zhengmian:     端口 ${ZHENGMIAN_PORT}"
    echo -e "  cemian:        端口 ${CEMIAN_PORT}"
    echo ""

    resolve_python
    check_model_files

    # 先停掉旧服务
    stop_ai_services
    # 清空 PID 文件
    rm -f "$PID_FILE"; touch "$PID_FILE"

    print_header "启动 AI 服务"
    start_service "zhengmian" "$ZHENGMIAN_DIR" "$ZHENGMIAN_PORT"
    start_service "cemian"    "$CEMIAN_DIR"    "$CEMIAN_PORT"

    wait_healthy "zhengmian" "http://localhost:${ZHENGMIAN_PORT}/health" 30
    wait_healthy "cemian"    "http://localhost:${CEMIAN_PORT}/health"    30

    print_header "🎉 AI 服务已就绪"
    echo -e "  ${GREEN}zhengmian（正面）：${NC} http://${LAN_IP}:${ZHENGMIAN_PORT}"
    echo -e "  ${GREEN}cemian（侧面）：  ${NC} http://${LAN_IP}:${CEMIAN_PORT}"
    echo ""
    echo -e "${CYAN}常用命令：${NC}"
    echo -e "  ${YELLOW}查看日志：${NC} tail -f ${PROJECT_DIR}/logs/ai/zhengmian.log"
    echo -e "            tail -f ${PROJECT_DIR}/logs/ai/cemian.log"
    echo -e "  ${YELLOW}停止服务：${NC} ./deploy_ai_pc.sh --stop"
    echo ""
    echo -e "${YELLOW}提示：重新部署主系统（IP 变更等）后需重新运行本脚本。${NC}"
}

trap 'print_error "脚本中断"; exit 1' ERR

main "$@"
