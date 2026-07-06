#!/bin/bash
# 一键更换服务器 IP 地址脚本
# 用于修改 LAN_IP 并重新部署所有服务

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_PORTS_FILE="$SCRIPT_DIR/dotenv/.env.ports"

# ==================== 固定密码配置 ====================
# 修改这里可以设置自定义的固定密码
FIXED_MYSQL_PASSWORD="xiehe_mysql_2024"
FIXED_MINIO_USER="minioadmin"
FIXED_MINIO_PASSWORD="xiehe_minio_2024"
# ====================================================

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

print_step() {
    echo -e "${BLUE}➜ $1${NC}"
}

# 验证 IP 地址格式
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        IFS='.' read -r -a octets <<< "$ip"
        for octet in "${octets[@]}"; do
            if ((octet > 255)); then
                return 1
            fi
        done
        return 0
    else
        return 1
    fi
}

# 获取当前 IP
get_current_ip() {
    if [ -f "$ENV_PORTS_FILE" ]; then
        grep "^LAN_IP=" "$ENV_PORTS_FILE" | cut -d= -f2 | tr -d ' "'
    else
        echo ""
    fi
}

# 显示帮助
show_help() {
    echo "用法: $0 [新IP地址]"
    echo ""
    echo "参数:"
    echo "  新IP地址    要设置的新 IP 地址（可选，不提供则交互式输入）"
    echo ""
    echo "示例:"
    echo "  $0 192.168.1.200              # 直接指定新 IP"
    echo "  $0                            # 交互式输入新 IP"
    echo ""
    echo "功能:"
    echo "  - 修改 dotenv/.env.ports 中的 LAN_IP"
    echo "  - 重新生成所有配置文件（保留数据库密码）"
    echo "  - 重启所有服务（Docker + AI）"
    echo "  - 验证服务可用性"
}

# 主逻辑
main() {
    print_header "一键更换服务器 IP 地址"
    
    # 检查参数
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    # 获取当前 IP
    CURRENT_IP=$(get_current_ip)
    if [ -n "$CURRENT_IP" ]; then
        echo -e "${CYAN}当前 IP: ${BLUE}$CURRENT_IP${NC}"
    else
        print_info "当前未设置 IP"
    fi
    echo ""
    
    # 获取新 IP
    if [ -n "$1" ]; then
        NEW_IP="$1"
    else
        echo -e -n "${YELLOW}请输入新的 IP 地址: ${NC}"
        read NEW_IP
    fi
    
    # 验证 IP 格式
    if ! validate_ip "$NEW_IP"; then
        print_error "无效的 IP 地址格式: $NEW_IP"
        exit 1
    fi
    
    # 确认变更
    echo ""
    echo -e "${CYAN}准备将 IP 从 ${BLUE}$CURRENT_IP${CYAN} 更改为 ${BLUE}$NEW_IP${NC}"
    echo -e -n "${YELLOW}是否继续? (y/n): ${NC}"
    read -r CONFIRM
    
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        print_info "操作已取消"
        exit 0
    fi
    
    echo ""
    print_header "开始更换 IP"

    print_info "使用固定密码配置:"
    echo -e "  MySQL 密码: ${BLUE}$FIXED_MYSQL_PASSWORD${NC}"
    echo -e "  MinIO 用户: ${BLUE}$FIXED_MINIO_USER${NC}"
    echo -e "  MinIO 密码: ${BLUE}$FIXED_MINIO_PASSWORD${NC}"
    echo ""

    # 1. 停止所有服务
    print_step "停止所有服务..."
    echo ""

    print_info "停止 AI 服务..."
    ./manage_ai.sh stop || true
    echo ""

    print_info "停止 Docker 服务..."
    ./scripts/compose.sh down || true
    echo ""

    print_success "所有服务已停止"
    echo ""
    
    # 3. 备份配置文件
    print_step "备份当前配置..."
    if [ -f "$ENV_PORTS_FILE" ]; then
        cp "$ENV_PORTS_FILE" "$ENV_PORTS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        print_success "配置已备份"
    fi
    echo ""

    # 4. 修改 IP
    print_step "修改 LAN_IP 为: $NEW_IP"
    if [ -f "$ENV_PORTS_FILE" ]; then
        sed -i.tmp "s/^LAN_IP=.*/LAN_IP=$NEW_IP/" "$ENV_PORTS_FILE"
        rm -f "$ENV_PORTS_FILE.tmp"
        print_success "IP 地址已更新"
    else
        print_error "未找到配置文件: $ENV_PORTS_FILE"
        exit 1
    fi
    echo ""

    # 5. 重新生成配置并部署
    print_step "重新生成配置并部署服务..."
    echo ""

    # 检测网络：能否在 3 秒内连上 GitHub（或任意外网）
    # 有网络 → 正常拉取最新代码；无网络 → --skip-pull 直接用本地代码 + Docker 层缓存
    DEPLOY_EXTRA_FLAGS=""
    if curl -sf --connect-timeout 3 --max-time 5 https://github.com -o /dev/null 2>/dev/null; then
        print_success "网络可用，将拉取最新代码"
    else
        print_info "网络不可用，跳过 git pull，使用本地代码和 Docker 层缓存"
        DEPLOY_EXTRA_FLAGS="--skip-pull"
    fi

    # 必须显式传 --ip，否则 deploy_pc.sh 会用 detect_lan_ip() 自动检测
    # 在联网状态下 detect_lan_ip 会返回互联网出口 IP，而非用户指定的局域网 IP
    # 不传 --rebuild：让 Docker 复用层缓存，避免无网时重新下载 npm/pip 包
    # shellcheck disable=SC2086
    ./deploy_pc.sh --reset-env --ip "$NEW_IP" $DEPLOY_EXTRA_FLAGS -y
    echo ""
    print_success "配置已重新生成，Docker 服务已启动"
    echo ""

    # 6. 设置固定密码（重要！）
    print_step "设置固定密码..."

    # 设置 MySQL 固定密码
    if [ -f "dotenv/.env.database" ]; then
        sed -i.tmp "s/^DB_PASSWORD=.*/DB_PASSWORD=$FIXED_MYSQL_PASSWORD/" dotenv/.env.database
        sed -i.tmp "s/^MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=$FIXED_MYSQL_PASSWORD/" dotenv/.env.database
        sed -i.tmp "s|^DATABASE_URL=.*|DATABASE_URL=mysql+pymysql://root:$FIXED_MYSQL_PASSWORD@mysql:3306/medical_imaging_system|" dotenv/.env.database
        sed -i.tmp "s|^TEST_DATABASE_URL=.*|TEST_DATABASE_URL=mysql+pymysql://root:$FIXED_MYSQL_PASSWORD@mysql:3306/medical_imaging_system_test|" dotenv/.env.database
        rm -f dotenv/.env.database.tmp
        print_success "MySQL 固定密码已设置"
    fi

    # 设置 MinIO 固定凭据
    if [ -f "dotenv/.env.minio" ]; then
        sed -i.tmp "s/^MINIO_ROOT_USER=.*/MINIO_ROOT_USER=$FIXED_MINIO_USER/" dotenv/.env.minio
        sed -i.tmp "s/^MINIO_ROOT_PASSWORD=.*/MINIO_ROOT_PASSWORD=$FIXED_MINIO_PASSWORD/" dotenv/.env.minio
        rm -f dotenv/.env.minio.tmp
        print_success "MinIO 固定凭据已设置"
    fi
    echo ""

    # 7. 重启 Docker 服务以应用固定密码
    print_step "重启 Docker 服务以应用密码..."
    ./scripts/compose.sh restart backend mysql minio 2>/dev/null || true
    sleep 3
    print_success "Docker 服务已重启"
    echo ""

    # 8. 启动 AI 服务
    print_step "启动 AI 服务..."
    echo ""
    ./manage_ai.sh start
    echo ""

    # 9. 等待服务启动
    print_step "等待服务完全启动..."
    sleep 5
    echo ""

    # 10. 验证服务
    print_header "验证服务状态"

    echo -e "${CYAN}Docker 服务状态:${NC}"
    ./scripts/compose.sh ps
    echo ""

    echo -e "${CYAN}AI 服务状态:${NC}"
    ./manage_ai.sh status
    echo ""

    # 8. 测试访问
    print_step "测试服务访问..."
    echo ""

    SUCCESS_COUNT=0
    TOTAL_COUNT=4

    # 测试 Backend
    if curl -s -f "http://$NEW_IP:3000/api/v1/health" > /dev/null 2>&1; then
        print_success "Backend 可访问: http://$NEW_IP:3000"
        ((SUCCESS_COUNT++))
    else
        print_error "Backend 无法访问: http://$NEW_IP:3000"
    fi

    # 测试 Frontend
    if curl -s -f "http://$NEW_IP:3030" > /dev/null 2>&1; then
        print_success "Frontend 可访问: http://$NEW_IP:3030"
        ((SUCCESS_COUNT++))
    else
        print_error "Frontend 无法访问: http://$NEW_IP:3030"
    fi

    # 测试 AI ap
    if curl -s -f "http://$NEW_IP:8001/health" > /dev/null 2>&1; then
        print_success "AI ap 可访问: http://$NEW_IP:8001"
        ((SUCCESS_COUNT++))
    else
        print_error "AI ap 无法访问: http://$NEW_IP:8001"
    fi

    # 测试 AI lat
    if curl -s -f "http://$NEW_IP:8002/health" > /dev/null 2>&1; then
        print_success "AI lat 可访问: http://$NEW_IP:8002"
        ((SUCCESS_COUNT++))
    else
        print_error "AI lat 无法访问: http://$NEW_IP:8002"
    fi

    echo ""

    # 9. 总结
    print_header "IP 更换完成"

    echo -e "${CYAN}原 IP:${NC} ${BLUE}$CURRENT_IP${NC}"
    echo -e "${CYAN}新 IP:${NC} ${BLUE}$NEW_IP${NC}"
    echo ""
    echo -e "${CYAN}服务验证:${NC} ${GREEN}$SUCCESS_COUNT${NC}/${TOTAL_COUNT} 个服务可访问"
    echo ""

    if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
        print_success "所有服务运行正常！"
    else
        print_error "部分服务无法访问，请检查日志"
        echo ""
        echo -e "${YELLOW}查看日志:${NC}"
        echo -e "  Docker 服务: ${BLUE}./scripts/compose.sh logs -f${NC}"
        echo -e "  AI 服务: ${BLUE}./manage_ai.sh logs${NC}"
    fi

    echo ""
    echo -e "${CYAN}访问地址:${NC}"
    echo -e "  前端: ${BLUE}http://$NEW_IP:3030${NC}"
    echo -e "  后端: ${BLUE}http://$NEW_IP:3000${NC}"
    echo -e "  AI 正面: ${BLUE}http://$NEW_IP:8001${NC}"
    echo -e "  AI 侧面: ${BLUE}http://$NEW_IP:8002${NC}"
    echo ""

    if [ -n "$CURRENT_IP" ] && [ "$CURRENT_IP" != "$NEW_IP" ]; then
        print_info "提示: 如需回滚到旧 IP，运行: $0 $CURRENT_IP"
    fi
}

# 切换到脚本目录
cd "$SCRIPT_DIR"

# 执行主逻辑
main "$@"
