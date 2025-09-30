#!/bin/bash

# Docker部署脚本
# 用于快速部署协和医疗影像诊断系统

set -e

echo "🚀 开始Docker部署..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker未安装，请先安装Docker${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker环境检查通过${NC}"

# 停止并删除旧容器
echo "🛑 停止旧容器..."
docker compose -f docker-compose.yml down -v 2>/dev/null || true

# 构建镜像
echo "🔨 构建Docker镜像..."
docker compose -f docker-compose.yml build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker compose -f docker-compose.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker compose -f docker-compose.yml ps

# 等待MySQL就绪
echo "⏳ 等待MySQL就绪..."
for i in {1..30}; do
    if docker compose -f docker-compose.yml exec -T mysql mysqladmin ping -h localhost -u root -proot_password_2024 &> /dev/null; then
        echo -e "${GREEN}✅ MySQL已就绪${NC}"
        break
    fi
    echo "等待MySQL... ($i/30)"
    sleep 2
done

# 初始化数据库
echo "📋 初始化数据库..."
docker compose -f docker-compose.yml exec -T backend python /app/init_docker_db.py || true

# 显示日志
echo ""
echo "📝 服务日志（最后20行）："
echo "================================"
docker compose -f docker-compose.yml logs --tail=20

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo "访问地址："
echo "  前端: http://localhost:3000"
echo "  后端API: http://localhost:8000"
echo "  API文档: http://localhost:8000/docs"
echo ""
echo "默认登录账号："
echo "  用户名: admin"
echo "  密码: secret"
echo ""
echo "查看日志："
echo "  docker compose -f docker-compose.yml logs -f"
echo ""
echo "停止服务："
echo "  docker compose -f docker-compose.yml down"

