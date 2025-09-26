#!/bin/bash

# 自动化部署脚本
# 
# 用于部署医疗影像诊断系统到生产环境
# 支持部署脚本、回滚机制、健康检查等功能
# 
# 作者: XieHe Medical System
# 创建时间: 2025-09-25

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_NAME="xiehe-medical-system"
DOCKER_COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy.log"
HEALTH_CHECK_TIMEOUT=300  # 5分钟
ROLLBACK_ENABLED=true

# 创建必要的目录
mkdir -p logs backups uploads ssl nginx/conf.d

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# 检查依赖
check_dependencies() {
    log "检查系统依赖..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    # 检查磁盘空间
    available_space=$(df . | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 5000000 ]; then  # 5GB
        warn "可用磁盘空间不足5GB，建议清理磁盘空间"
    fi
    
    log "依赖检查完成"
}

# 备份当前部署
backup_current_deployment() {
    if [ "$ROLLBACK_ENABLED" = true ]; then
        log "备份当前部署..."
        
        timestamp=$(date +%Y%m%d_%H%M%S)
        backup_path="$BACKUP_DIR/backup_$timestamp"
        mkdir -p "$backup_path"
        
        # 备份数据库
        if docker ps | grep -q "postgres\|mysql"; then
            log "备份数据库..."
            if docker ps | grep -q "postgres"; then
                docker exec $(docker ps -q -f name=postgres) pg_dumpall -U postgres > "$backup_path/database_backup.sql"
            elif docker ps | grep -q "mysql"; then
                docker exec $(docker ps -q -f name=mysql) mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --all-databases > "$backup_path/database_backup.sql"
            fi
        fi
        
        # 备份上传文件
        if [ -d "./uploads" ]; then
            cp -r ./uploads "$backup_path/"
        fi
        
        # 备份配置文件
        cp -r ./nginx "$backup_path/" 2>/dev/null || true
        cp .env "$backup_path/" 2>/dev/null || true
        cp "$DOCKER_COMPOSE_FILE" "$backup_path/"
        
        # 记录当前运行的容器
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" > "$backup_path/running_containers.txt"
        
        log "备份完成: $backup_path"
        echo "$backup_path" > "$BACKUP_DIR/latest_backup.txt"
    fi
}

# 构建镜像
build_images() {
    log "构建Docker镜像..."
    
    # 构建后端镜像
    if [ -f "Dockerfile.backend" ]; then
        log "构建后端镜像..."
        docker build -f Dockerfile.backend -t "${PROJECT_NAME}-backend:latest" .
    fi
    
    # 构建前端镜像
    if [ -f "Dockerfile.frontend" ]; then
        log "构建前端镜像..."
        docker build -f Dockerfile.frontend -t "${PROJECT_NAME}-frontend:latest" .
    fi
    
    log "镜像构建完成"
}

# 启动服务
start_services() {
    log "启动服务..."
    
    # 停止现有服务
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
    
    # 清理未使用的镜像和容器
    docker system prune -f
    
    # 启动服务
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    log "服务启动完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    local start_time=$(date +%s)
    local timeout=$HEALTH_CHECK_TIMEOUT
    
    # 等待服务启动
    sleep 30
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $timeout ]; then
            error "健康检查超时"
            return 1
        fi
        
        # 检查后端健康状态
        if curl -f -s http://localhost:8000/api/v1/health/ > /dev/null; then
            log "后端服务健康检查通过"
            backend_healthy=true
        else
            backend_healthy=false
        fi
        
        # 检查前端健康状态
        if curl -f -s http://localhost:3000/ > /dev/null; then
            log "前端服务健康检查通过"
            frontend_healthy=true
        else
            frontend_healthy=false
        fi
        
        # 检查数据库连接
        if docker exec $(docker ps -q -f name=postgres) pg_isready -U postgres > /dev/null 2>&1 || \
           docker exec $(docker ps -q -f name=mysql) mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" > /dev/null 2>&1; then
            log "数据库连接检查通过"
            database_healthy=true
        else
            database_healthy=false
        fi
        
        # 检查Redis连接
        if docker exec $(docker ps -q -f name=redis) redis-cli ping > /dev/null 2>&1; then
            log "Redis连接检查通过"
            redis_healthy=true
        else
            redis_healthy=false
        fi
        
        if [ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ] && \
           [ "$database_healthy" = true ] && [ "$redis_healthy" = true ]; then
            log "所有服务健康检查通过"
            return 0
        fi
        
        info "等待服务启动完成... (${elapsed}s/${timeout}s)"
        sleep 10
    done
}

# 回滚部署
rollback() {
    if [ "$ROLLBACK_ENABLED" = true ] && [ -f "$BACKUP_DIR/latest_backup.txt" ]; then
        local backup_path=$(cat "$BACKUP_DIR/latest_backup.txt")
        
        if [ -d "$backup_path" ]; then
            warn "开始回滚到: $backup_path"
            
            # 停止当前服务
            docker-compose -f "$DOCKER_COMPOSE_FILE" down
            
            # 恢复配置文件
            cp "$backup_path/$DOCKER_COMPOSE_FILE" .
            cp -r "$backup_path/nginx" . 2>/dev/null || true
            cp "$backup_path/.env" . 2>/dev/null || true
            
            # 恢复上传文件
            if [ -d "$backup_path/uploads" ]; then
                rm -rf ./uploads
                cp -r "$backup_path/uploads" .
            fi
            
            # 启动服务
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
            
            # 恢复数据库
            if [ -f "$backup_path/database_backup.sql" ]; then
                sleep 30  # 等待数据库启动
                if docker ps | grep -q "postgres"; then
                    docker exec -i $(docker ps -q -f name=postgres) psql -U postgres < "$backup_path/database_backup.sql"
                elif docker ps | grep -q "mysql"; then
                    docker exec -i $(docker ps -q -f name=mysql) mysql -u root -p"$MYSQL_ROOT_PASSWORD" < "$backup_path/database_backup.sql"
                fi
            fi
            
            log "回滚完成"
        else
            error "备份路径不存在: $backup_path"
        fi
    else
        error "无法回滚：未启用回滚或无可用备份"
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log "清理旧备份..."
    
    # 保留最近7个备份
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "backup_*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    fi
    
    log "备份清理完成"
}

# 显示部署状态
show_status() {
    log "部署状态:"
    echo "----------------------------------------"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    echo "----------------------------------------"
    
    # 显示服务URL
    echo "服务访问地址:"
    echo "前端: http://localhost:3000"
    echo "后端API: http://localhost:8000"
    echo "API文档: http://localhost:8000/docs"
    echo "----------------------------------------"
}

# 主部署流程
main() {
    log "开始部署 $PROJECT_NAME"
    
    # 检查参数
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            backup_current_deployment
            build_images
            start_services
            
            if health_check; then
                cleanup_old_backups
                show_status
                log "部署成功完成!"
            else
                error "健康检查失败，开始回滚..."
                rollback
                exit 1
            fi
            ;;
        "rollback")
            log "执行回滚操作"
            rollback
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
            ;;
        "stop")
            log "停止所有服务"
            docker-compose -f "$DOCKER_COMPOSE_FILE" down
            ;;
        "restart")
            log "重启所有服务"
            docker-compose -f "$DOCKER_COMPOSE_FILE" restart
            ;;
        "clean")
            log "清理系统"
            docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans
            docker system prune -af
            ;;
        *)
            echo "用法: $0 {deploy|rollback|status|logs|stop|restart|clean}"
            echo ""
            echo "命令说明:"
            echo "  deploy   - 部署应用（默认）"
            echo "  rollback - 回滚到上一个版本"
            echo "  status   - 显示服务状态"
            echo "  logs     - 查看服务日志"
            echo "  stop     - 停止所有服务"
            echo "  restart  - 重启所有服务"
            echo "  clean    - 清理所有容器和镜像"
            exit 1
            ;;
    esac
}

# 信号处理
trap 'error "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"
