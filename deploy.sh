#!/bin/bash

################################################################################
# XieHe Medical System - 一键部署脚本
# 
# 功能: 
#   1. 拉取最新代码
#   2. 构建前后端Docker镜像
#   3. 启动所有服务
#   4. 健康检查
#
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# 作者: XieHe Medical System
# 创建时间: 2025-12-15
################################################################################

set -e  # 遇到错误立即退出

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ==================== 配置参数 ====================
PROJECT_DIR="/Users/bytedance/XieHe-System"
GIT_BRANCH="main"
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="${PROJECT_DIR}/backups/deploy_$(date +%Y%m%d_%H%M%S)"

# ==================== 辅助函数 ====================
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${PURPLE}➜ $1${NC}"
}

# ==================== 环境检查 ====================
check_environment() {
    print_header "环境检查"
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    print_success "Docker已安装: $(docker --version)"
    
    # 检查Docker Compose
    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装"
        exit 1
    fi
    print_success "Docker Compose已安装"
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        print_error "Git未安装"
        exit 1
    fi
    print_success "Git已安装: $(git --version)"
    
    # 检查项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "项目目录不存在: $PROJECT_DIR"
        exit 1
    fi
    print_success "项目目录存在: $PROJECT_DIR"
    
    # 检查磁盘空间
    available_space=$(df -h "$PROJECT_DIR" | awk 'NR==2 {print $4}')
    print_info "可用磁盘空间: $available_space"
}

# ==================== 备份当前部署 ====================
backup_current_deployment() {
    print_header "备份当前部署"
    
    if [ -d "$PROJECT_DIR/.git" ]; then
        print_step "创建备份目录: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        
        # 备份环境文件
        if [ -f "$PROJECT_DIR/.env" ]; then
            cp "$PROJECT_DIR/.env" "$BACKUP_DIR/.env.backup"
            print_success "已备份 .env 文件"
        fi
        
        if [ -f "$PROJECT_DIR/frontend/.env.local" ]; then
            cp "$PROJECT_DIR/frontend/.env.local" "$BACKUP_DIR/.env.local.backup"
            print_success "已备份 frontend/.env.local 文件"
        fi
        
        # 记录当前Git提交
        cd "$PROJECT_DIR"
        git rev-parse HEAD > "$BACKUP_DIR/git_commit.txt"
        print_success "已记录当前Git提交"
    else
        print_warning "未检测到Git仓库，跳过备份"
    fi
}

# ==================== 拉取最新代码 ====================
pull_latest_code() {
    print_header "拉取最新代码"
    
    cd "$PROJECT_DIR"
    
    # 检查是否有未提交的更改
    if [ -d ".git" ]; then
        if ! git diff-index --quiet HEAD --; then
            print_warning "检测到未提交的更改"
            read -p "是否要暂存这些更改并继续? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git stash save "Auto-stash before deploy $(date +%Y%m%d_%H%M%S)"
                print_success "已暂存本地更改"
            else
                print_error "部署已取消"
                exit 1
            fi
        fi
        
        # 拉取最新代码
        print_step "从远程仓库拉取最新代码..."
        git fetch origin
        git checkout "$GIT_BRANCH"
        git pull origin "$GIT_BRANCH"
        print_success "代码已更新到最新版本"
        
        # 显示最新提交信息
        print_info "最新提交信息:"
        git log -1 --pretty=format:"%h - %an, %ar : %s" | sed 's/^/  /'
        echo ""
    else
        print_warning "未检测到Git仓库，跳过代码拉取"
    fi
}

# ==================== 停止旧服务 ====================
stop_old_services() {
    print_header "停止旧服务"
    
    cd "$PROJECT_DIR"
    
    if [ -f "$COMPOSE_FILE" ]; then
        print_step "停止Docker容器..."
        docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
        print_success "旧服务已停止"
        
        # 清理未使用的镜像
        print_step "清理未使用的Docker镜像..."
        docker image prune -f > /dev/null 2>&1 || true
        print_success "清理完成"
    else
        print_warning "未找到 docker-compose.yml 文件"
    fi
}

# ==================== 构建Docker镜像 ====================
build_docker_images() {
    print_header "构建Docker镜像"
    
    cd "$PROJECT_DIR"
    
    print_step "开始构建镜像（这可能需要几分钟）..."
    
    # 使用docker compose构建所有镜像
    print_info "使用Docker Compose构建所有镜像..."
    docker compose -f "$COMPOSE_FILE" build --no-cache || {
        print_error "镜像构建失败"
        exit 1
    }
    print_success "所有镜像构建成功"
    
    # 显示镜像信息
    print_info "镜像列表:"
    docker images | grep -E "xiehe-|REPOSITORY" | sed 's/^/  /'
}

# ==================== 启动服务 ====================
start_services() {
    print_header "启动服务"
    
    cd "$PROJECT_DIR"
    
    print_step "启动Docker Compose服务..."
    docker compose -f "$COMPOSE_FILE" up -d || {
        print_error "服务启动失败"
        exit 1
    }
    print_success "服务已启动"
    
    # 等待服务启动
    print_step "等待服务初始化（30秒）..."
    sleep 30
}

# ==================== 健康检查 ====================
health_check() {
    print_header "健康检查"
    
    cd "$PROJECT_DIR"
    
    # 检查容器状态
    print_step "检查容器状态..."
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    
    # 检查MySQL
    print_step "检查MySQL服务..."
    for i in {1..30}; do
        if docker compose -f "$COMPOSE_FILE" exec -T mysql mysqladmin ping -h localhost -u root -proot_password_2024 &> /dev/null; then
            print_success "MySQL服务正常"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "MySQL服务启动超时"
            exit 1
        fi
        sleep 2
    done
    
    # 检查Redis
    print_step "检查Redis服务..."
    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis服务正常"
    else
        print_warning "Redis服务异常"
    fi
    
    # 检查后端API
    print_step "检查后端API服务..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            print_success "后端API服务正常"
            break
        fi
        if [ $i -eq 30 ]; then
            print_warning "后端API服务可能异常"
        fi
        sleep 2
    done
    
    # 检查前端服务
    print_step "检查前端服务..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "前端服务正常"
            break
        fi
        if [ $i -eq 30 ]; then
            print_warning "前端服务可能异常"
        fi
        sleep 2
    done
}

# ==================== 显示日志 ====================
show_logs() {
    print_header "服务日志"
    
    cd "$PROJECT_DIR"
    
    print_info "显示最近的服务日志（按Ctrl+C退出）..."
    echo ""
    sleep 2
    docker compose -f "$COMPOSE_FILE" logs --tail=50 -f
}

# ==================== 部署摘要 ====================
print_summary() {
    print_header "部署完成"
    
    echo -e "${GREEN}🎉 部署成功！${NC}"
    echo ""
    echo -e "${CYAN}访问地址:${NC}"
    echo -e "  ${GREEN}前端应用:${NC} http://localhost:3000"
    echo -e "  ${GREEN}后端API:${NC}  http://localhost:8000"
    echo -e "  ${GREEN}API文档:${NC}  http://localhost:8000/docs"
    echo ""
    echo -e "${CYAN}常用命令:${NC}"
    echo -e "  ${YELLOW}查看日志:${NC}   docker compose -f $COMPOSE_FILE logs -f"
    echo -e "  ${YELLOW}停止服务:${NC}   docker compose -f $COMPOSE_FILE down"
    echo -e "  ${YELLOW}重启服务:${NC}   docker compose -f $COMPOSE_FILE restart"
    echo -e "  ${YELLOW}查看状态:${NC}   docker compose -f $COMPOSE_FILE ps"
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        echo -e "${CYAN}备份目录:${NC} $BACKUP_DIR"
        echo ""
    fi
}

# ==================== 主流程 ====================
main() {
    clear
    
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║          XieHe Medical System - 一键部署脚本               ║"
    echo "║                                                            ║"
    echo "║          协和医疗影像诊断系统 v1.0                         ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # 确认部署
    read -p "确认开始部署? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "部署已取消"
        exit 1
    fi
    
    # 执行部署流程
    check_environment
    backup_current_deployment
    pull_latest_code
    stop_old_services
    build_docker_images
    start_services
    health_check
    print_summary
    
    # 询问是否查看日志
    echo ""
    read -p "是否查看实时日志? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        show_logs
    fi
}

# ==================== 错误处理 ====================
trap 'print_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# ==================== 执行主流程 ====================
main "$@"
