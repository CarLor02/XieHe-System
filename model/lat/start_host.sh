#!/bin/bash
# 宿主机启动侧面模型服务脚本
# 用于在宿主机（非 Docker 容器）环境下启动 lat AI 服务
#
# 用法:
#   ./start_host.sh           # 后台启动
#   ./start_host.sh --stop    # 停止服务
#   ./start_host.sh --logs    # 查看日志
#   ./start_host.sh --status  # 查看状态

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录（假设脚本在 model/lat/ 下）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOTENV_DIR="$PROJECT_ROOT/dotenv"
LOG_DIR="$PROJECT_ROOT/logs/ai"
PID_FILE="$SCRIPT_DIR/.lat.pid"
LOG_FILE="$LOG_DIR/lat.log"
PORT=8002

# 解析参数
ACTION="start"
if [ $# -gt 0 ]; then
    case "$1" in
        --stop)   ACTION="stop" ;;
        --logs)   ACTION="logs" ;;
        --status) ACTION="status" ;;
        -h|--help)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  无参数       后台启动服务"
            echo "  --stop      停止服务"
            echo "  --logs      查看日志（实时跟踪）"
            echo "  --status    查看服务状态"
            echo "  -h, --help  显示帮助"
            exit 0
            ;;
        *)
            echo -e "${RED}未知参数: $1${NC}"
            echo "使用 -h 或 --help 查看帮助"
            exit 1
            ;;
    esac
fi

# ==================== 工具函数 ====================
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0  # 运行中
        else
            rm -f "$PID_FILE"  # 清理无效的 PID 文件
            return 1  # 未运行
        fi
    fi
    return 1  # 未运行
}

get_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}✓ 服务运行中${NC}"
        echo -e "  PID: ${BLUE}$PID${NC}"
        echo -e "  端口: ${BLUE}$PORT${NC}"
        echo -e "  日志: ${BLUE}$LOG_FILE${NC}"
        echo ""
        echo -e "${YELLOW}健康检查:${NC}"
        if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ HTTP 服务正常${NC}"
        else
            echo -e "  ${RED}✗ HTTP 服务无响应${NC}"
        fi
        return 0
    else
        echo -e "${RED}✗ 服务未运行${NC}"
        return 1
    fi
}

stop_service() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${YELLOW}停止服务 (PID: $PID)...${NC}"
        kill "$PID" 2>/dev/null || true

        # 等待进程结束
        for i in {1..10}; do
            if ! ps -p "$PID" > /dev/null 2>&1; then
                rm -f "$PID_FILE"
                echo -e "${GREEN}✓ 服务已停止${NC}"
                return 0
            fi
            sleep 1
        done

        # 强制终止
        echo -e "${YELLOW}强制终止进程...${NC}"
        kill -9 "$PID" 2>/dev/null || true
        rm -f "$PID_FILE"
        echo -e "${GREEN}✓ 服务已强制停止${NC}"
    else
        echo -e "${YELLOW}服务未运行，无需停止${NC}"
    fi
}

# ==================== 主逻辑 ====================
case "$ACTION" in
    stop)
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}停止侧面模型服务${NC}"
        echo -e "${GREEN}========================================${NC}"
        stop_service
        exit 0
        ;;

    status)
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}侧面模型服务状态${NC}"
        echo -e "${GREEN}========================================${NC}"
        get_status
        exit $?
        ;;

    logs)
        if [ ! -f "$LOG_FILE" ]; then
            echo -e "${RED}错误: 日志文件不存在: $LOG_FILE${NC}"
            echo -e "${YELLOW}提示: 请先启动服务${NC}"
            exit 1
        fi
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}侧面模型服务日志 (Ctrl+C 退出)${NC}"
        echo -e "${GREEN}========================================${NC}"
        tail -f "$LOG_FILE"
        exit 0
        ;;
esac

# ==================== 启动服务 ====================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}启动侧面模型服务（宿主机模式）${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否已运行
if is_running; then
    echo -e "${YELLOW}服务已在运行中${NC}"
    get_status
    echo ""
    echo -e "${YELLOW}如需重启，请先执行: $0 --stop${NC}"
    exit 1
fi

# 检查 .env.storage 文件
echo -e "${YELLOW}检查配置文件...${NC}"
if [ ! -f "$DOTENV_DIR/.env.storage" ]; then
    echo -e "${RED}错误: 未找到 $DOTENV_DIR/.env.storage${NC}"
    echo -e "${YELLOW}请从 .env.storage.example 创建 .env.storage 文件${NC}"
    exit 1
fi

# 读取 STORAGE_SERVICE_TOKEN
TOKEN=$(grep "^STORAGE_SERVICE_TOKEN=" "$DOTENV_DIR/.env.storage" | cut -d= -f2)
if [ -z "$TOKEN" ]; then
    echo -e "${RED}错误: STORAGE_SERVICE_TOKEN 未设置${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 读取到 STORAGE_SERVICE_TOKEN${NC}"

# 检查 storage-service 是否可访问
echo -e "${YELLOW}检查 storage-service 连接...${NC}"
if curl -s -f http://localhost:8090/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ storage-service 连接正常 (http://localhost:8090)${NC}"
else
    echo -e "${RED}✗ 无法连接到 storage-service (http://localhost:8090)${NC}"
    echo -e "${YELLOW}请确保 storage-service 容器正在运行并暴露端口 8090${NC}"
    echo -e "${YELLOW}参考: model/AI_HOST_DEPLOYMENT.md${NC}"
    exit 1
fi

# 检查 Python 虚拟环境
echo -e "${YELLOW}检查 Python 环境...${NC}"
PYTHON_BIN="${PYTHON_BIN:-/opt/miniconda3/envs/xiehe/bin/python}"
UVICORN_BIN="${UVICORN_BIN:-/opt/miniconda3/envs/xiehe/bin/uvicorn}"

if [ ! -f "$PYTHON_BIN" ]; then
    echo -e "${RED}错误: 未找到 Python: $PYTHON_BIN${NC}"
    echo -e "${YELLOW}请设置 PYTHON_BIN 环境变量或确保安装了 xiehe conda 环境${NC}"
    exit 1
fi

if [ ! -f "$UVICORN_BIN" ]; then
    echo -e "${RED}错误: 未找到 uvicorn: $UVICORN_BIN${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 环境: $PYTHON_BIN${NC}"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 设置环境变量
export STORAGE_SERVICE_URL="http://localhost:8090"
export STORAGE_SERVICE_TOKEN="$TOKEN"
export STORAGE_SERVICE_TIMEOUT="30"

# 切换到模型目录
cd "$SCRIPT_DIR"

# 后台启动服务
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}启动 Uvicorn 服务 (http://0.0.0.0:$PORT)${NC}"
echo -e "${GREEN}========================================${NC}"

nohup "$UVICORN_BIN" app:app --host 0.0.0.0 --port $PORT > "$LOG_FILE" 2>&1 &
PID=$!
echo $PID > "$PID_FILE"

# 等待服务启动
sleep 3

if ps -p $PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 服务已启动${NC}"
    echo -e "  PID: ${BLUE}$PID${NC}"
    echo -e "  端口: ${BLUE}$PORT${NC}"
    echo -e "  日志: ${BLUE}$LOG_FILE${NC}"
    echo ""
    echo -e "${YELLOW}管理命令:${NC}"
    echo -e "  查看日志: ${BLUE}$0 --logs${NC}"
    echo -e "  查看状态: ${BLUE}$0 --status${NC}"
    echo -e "  停止服务: ${BLUE}$0 --stop${NC}"
else
    echo -e "${RED}✗ 服务启动失败${NC}"
    echo -e "${YELLOW}查看日志: tail -f $LOG_FILE${NC}"
    rm -f "$PID_FILE"
    exit 1
fi
