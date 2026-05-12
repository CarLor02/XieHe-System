#!/bin/bash
# AI 服务管理脚本
# 用于统一管理 zhengmian 和 cemian AI 服务

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZHENGMIAN_SCRIPT="$SCRIPT_DIR/model/zhengmian/start_host.sh"
CEMIAN_SCRIPT="$SCRIPT_DIR/model/cemian/start_host.sh"

print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}$1${NC}"
}

# 检查脚本是否存在
check_scripts() {
    if [ ! -f "$ZHENGMIAN_SCRIPT" ]; then
        print_error "未找到 zhengmian 启动脚本: $ZHENGMIAN_SCRIPT"
        exit 1
    fi
    if [ ! -f "$CEMIAN_SCRIPT" ]; then
        print_error "未找到 cemian 启动脚本: $CEMIAN_SCRIPT"
        exit 1
    fi
}

# 启动所有服务
start_all() {
    print_header "启动所有 AI 服务"
    
    echo -e "${BLUE}启动正面模型服务 (zhengmian)...${NC}"
    "$ZHENGMIAN_SCRIPT" || print_error "正面模型启动失败"
    echo ""
    
    echo -e "${BLUE}启动侧面模型服务 (cemian)...${NC}"
    "$CEMIAN_SCRIPT" || print_error "侧面模型启动失败"
    echo ""
    
    print_success "所有服务启动完成"
}

# 停止所有服务
stop_all() {
    print_header "停止所有 AI 服务"
    
    echo -e "${BLUE}停止正面模型服务 (zhengmian)...${NC}"
    "$ZHENGMIAN_SCRIPT" --stop || true
    echo ""
    
    echo -e "${BLUE}停止侧面模型服务 (cemian)...${NC}"
    "$CEMIAN_SCRIPT" --stop || true
    echo ""
    
    print_success "所有服务已停止"
}

# 重启所有服务
restart_all() {
    print_header "重启所有 AI 服务"
    
    stop_all
    sleep 2
    start_all
}

# 查看所有服务状态
status_all() {
    print_header "AI 服务状态"
    
    echo -e "${BLUE}正面模型服务 (zhengmian, 端口 8001):${NC}"
    "$ZHENGMIAN_SCRIPT" --status || true
    echo ""
    
    echo -e "${BLUE}侧面模型服务 (cemian, 端口 8002):${NC}"
    "$CEMIAN_SCRIPT" --status || true
}

# 查看所有服务日志
logs_all() {
    print_header "查看所有 AI 服务日志"
    print_info "提示: 使用 Ctrl+C 退出日志查看"
    print_info "日志文件位置:"
    echo -e "  - ${BLUE}logs/ai/zhengmian.log${NC}"
    echo -e "  - ${BLUE}logs/ai/cemian.log${NC}"
    echo ""
    
    # 同时查看两个日志文件
    tail -f logs/ai/zhengmian.log logs/ai/cemian.log
}

# 显示帮助
show_help() {
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start       启动所有 AI 服务"
    echo "  stop        停止所有 AI 服务"
    echo "  restart     重启所有 AI 服务"
    echo "  status      查看所有服务状态"
    echo "  logs        查看所有服务日志（实时）"
    echo "  help        显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start    # 启动所有 AI 服务"
    echo "  $0 status   # 查看服务状态"
    echo "  $0 restart  # 重启所有服务"
}

# 主逻辑
check_scripts

case "${1:-help}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    status)
        status_all
        ;;
    logs)
        logs_all
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
