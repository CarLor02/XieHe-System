#!/bin/bash

# XieHe医疗影像诊断系统 - 完整Docker启动脚本
# 启动所有服务：数据库、后端、前端

set -e

echo "🐳 XieHe医疗影像诊断系统 - Docker完整启动"
echo "=============================================="

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker未安装或未启动"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ 错误: Docker Compose未安装"
    exit 1
fi

# 检查Docker守护进程
if ! docker info &> /dev/null; then
    echo "❌ 错误: Docker守护进程未运行"
    exit 1
fi

# 清理旧容器（可选）
read -p "🧹 是否清理旧容器和镜像? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理旧容器..."
    docker compose down --remove-orphans 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p backups/{mysql,redis,volumes}
mkdir -p docker/mysql/{data,logs,init}
mkdir -p docker/redis/{data,logs}
mkdir -p docker/nginx/{logs,ssl}

# 构建镜像
echo "🔨 构建Docker镜像..."
echo "   - 构建后端镜像..."
docker compose build backend

echo "   - 构建前端镜像..."
docker compose build frontend

# 启动基础服务（数据库和缓存）
echo "🗄️ 启动数据库服务..."
docker compose up -d mysql redis

# 等待数据库启动
echo "⏳ 等待数据库启动..."
timeout=60
counter=0
while ! docker exec medical_mysql mysqladmin ping -h localhost -u root -proot_password_2024 --silent 2>/dev/null; do
    if [ $counter -eq $timeout ]; then
        echo "❌ 数据库启动超时"
        docker compose logs mysql
        exit 1
    fi
    echo "   等待MySQL启动... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 1))
done

echo "✅ MySQL数据库启动成功"

# 等待Redis启动
echo "⏳ 等待Redis启动..."
timeout=30
counter=0
while ! docker exec medical_redis redis-cli ping 2>/dev/null | grep -q PONG; do
    if [ $counter -eq $timeout ]; then
        echo "❌ Redis启动超时"
        docker compose logs redis
        exit 1
    fi
    echo "   等待Redis启动... ($counter/$timeout)"
    sleep 1
    counter=$((counter + 1))
done

echo "✅ Redis缓存启动成功"

# 启动应用服务
echo "🚀 启动应用服务..."
docker compose up -d backend frontend

# 等待后端启动
echo "⏳ 等待后端服务启动..."
timeout=120
counter=0
while ! curl -f http://localhost:8000/health 2>/dev/null; do
    if [ $counter -eq $timeout ]; then
        echo "❌ 后端服务启动超时"
        docker compose logs backend
        exit 1
    fi
    echo "   等待后端启动... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 1))
done

echo "✅ 后端服务启动成功"

# 等待前端启动
echo "⏳ 等待前端服务启动..."
timeout=120
counter=0
while ! curl -f http://localhost:3000 2>/dev/null; do
    if [ $counter -eq $timeout ]; then
        echo "❌ 前端服务启动超时"
        docker compose logs frontend
        exit 1
    fi
    echo "   等待前端启动... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 1))
done

echo "✅ 前端服务启动成功"

# 启动Nginx（可选）
read -p "🌐 是否启动Nginx反向代理? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌐 启动Nginx..."
    docker compose up -d nginx
    echo "✅ Nginx启动成功"
fi

# 显示服务状态
echo ""
echo "📊 服务状态:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# 显示访问地址
echo ""
echo "🌐 访问地址:"
echo "   ✅ 前端界面: http://localhost:3000"
echo "   ✅ 后端API文档: http://localhost:8000/docs"
echo "   ✅ 健康检查: http://localhost:8000/health"
echo "   ✅ MySQL数据库: localhost:3307"
echo "   ✅ Redis缓存: localhost:6380"

if docker compose ps nginx | grep -q "Up"; then
    echo "   ✅ Nginx代理: http://localhost"
fi

# 显示有用的命令
echo ""
echo "💡 常用命令:"
echo "   查看日志: docker compose logs -f [service_name]"
echo "   停止服务: docker compose down"
echo "   重启服务: docker compose restart [service_name]"
echo "   进入容器: docker exec -it [container_name] bash"
echo "   备份数据: ./scripts/backup_database.sh"

# 创建启动日志
cat > "startup_log_$(date +%Y%m%d_%H%M%S).txt" << EOF
XieHe医疗影像诊断系统 - Docker启动日志
=====================================

启动时间: $(date)
启动方式: 完整Docker部署

服务状态:
$(docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}")

系统资源:
$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}")

访问地址:
- 前端: http://localhost:3000
- 后端: http://localhost:8000
- 数据库: localhost:3307
- 缓存: localhost:6380
EOF

echo ""
echo "🎉 XieHe医疗影像诊断系统启动完成！"
echo "📋 启动日志: startup_log_$(date +%Y%m%d_%H%M%S).txt"
echo ""
echo "🔒 数据持久化说明:"
echo "   - MySQL数据存储在Docker volume: medical_mysql_data"
echo "   - Redis数据存储在Docker volume: medical_redis_data"
echo "   - 文件上传存储在Docker volume: medical_uploads_data"
echo "   - 即使容器重启，数据也不会丢失"
echo ""
echo "💾 数据备份建议:"
echo "   - 定期运行: ./scripts/backup_database.sh"
echo "   - 备份文件位置: ./backups/"
echo "   - 恢复命令: ./scripts/restore_database.sh <timestamp>"
