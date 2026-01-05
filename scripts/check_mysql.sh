#!/bin/bash

################################################################################
# MySQL 容器状态检查脚本
# 用于验证 MySQL 容器配置和状态
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  MySQL 容器状态检查${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 1. 检查配置文件
echo -e "${YELLOW}[1/6] 检查配置文件...${NC}"

if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✅ docker-compose.yml 存在${NC}"
    
    # 检查 MySQL 服务配置
    if grep -q "mysql:" docker-compose.yml; then
        echo -e "${GREEN}✅ MySQL 服务已配置${NC}"
    else
        echo -e "${RED}❌ MySQL 服务未配置${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ docker-compose.yml 不存在${NC}"
    exit 1
fi

if [ -f ".env.example" ]; then
    echo -e "${GREEN}✅ .env.example 存在${NC}"
else
    echo -e "${YELLOW}⚠️  .env.example 不存在${NC}"
fi

# 2. 检查初始化脚本
echo ""
echo -e "${YELLOW}[2/6] 检查初始化脚本...${NC}"

if [ -d "docker/mysql/init" ]; then
    echo -e "${GREEN}✅ MySQL 初始化目录存在${NC}"
    init_files=$(ls docker/mysql/init/*.sql 2>/dev/null | wc -l)
    echo -e "   SQL 初始化文件: ${init_files} 个"
else
    echo -e "${YELLOW}⚠️  MySQL 初始化目录不存在${NC}"
fi

if [ -f "docker/backend-entrypoint.sh" ]; then
    echo -e "${GREEN}✅ 后端启动脚本存在${NC}"
else
    echo -e "${YELLOW}⚠️  后端启动脚本不存在${NC}"
fi

if [ -f "backend/scripts/init_database.py" ]; then
    echo -e "${GREEN}✅ 数据库初始化脚本存在${NC}"
else
    echo -e "${RED}❌ 数据库初始化脚本不存在${NC}"
fi

# 3. 检查容器状态
echo ""
echo -e "${YELLOW}[3/6] 检查容器状态...${NC}"

if docker ps -a --format "{{.Names}}" | grep -q "medical_mysql"; then
    STATUS=$(docker ps -a --filter "name=medical_mysql" --format "{{.Status}}")
    if [[ $STATUS == *"Up"* ]]; then
        echo -e "${GREEN}✅ MySQL 容器运行中${NC}"
        echo -e "   状态: $STATUS"
    else
        echo -e "${YELLOW}⚠️  MySQL 容器已停止${NC}"
        echo -e "   状态: $STATUS"
    fi
else
    echo -e "${BLUE}ℹ️  MySQL 容器未创建${NC}"
fi

# 4. 检查数据卷
echo ""
echo -e "${YELLOW}[4/6] 检查数据卷...${NC}"

if docker volume ls | grep -q "mysql_data"; then
    SIZE=$(docker volume inspect xiehe-system_mysql_data --format "{{.Mountpoint}}" 2>/dev/null | xargs du -sh 2>/dev/null | cut -f1 || echo "未知")
    echo -e "${GREEN}✅ mysql_data 卷存在${NC}"
    echo -e "   大小: $SIZE"
else
    echo -e "${BLUE}ℹ️  mysql_data 卷未创建${NC}"
fi

if docker volume ls | grep -q "mysql_logs"; then
    echo -e "${GREEN}✅ mysql_logs 卷存在${NC}"
else
    echo -e "${BLUE}ℹ️  mysql_logs 卷未创建${NC}"
fi

# 测试数据库连接
echo ""
echo -e "${YELLOW}[5/6] 测试数据库连接...${NC}"

if docker ps | grep -q "medical_mysql"; then
    if docker exec medical_mysql mysqladmin ping -h localhost -u root -pqweasd2025 &>/dev/null; then
        echo -e "${GREEN}✅ MySQL 连接正常${NC}"
        
        # 获取表数量
        TABLE_COUNT=$(docker exec medical_mysql mysql -u root -pqweasd2025 -e \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='medical_imaging_system';" \
            2>/dev/null | tail -1 || echo "0")
        echo -e "   数据库表数量: $TABLE_COUNT"
        
        if [ "$TABLE_COUNT" -gt "0" ]; then
            echo -e "${GREEN}✅ 数据库已初始化${NC}"
        else
            echo -e "${YELLOW}⚠️  数据库未初始化${NC}"
        fi
    else
        echo -e "${RED}❌ MySQL 连接失败${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  MySQL 容器未运行，跳过连接测试${NC}"
fi

# 6. 检查端口占用
echo ""
echo -e "${YELLOW}[6/6] 检查端口占用...${NC}"

if lsof -i :3307 &>/dev/null || netstat -an | grep -q ":3307.*LISTEN" 2>/dev/null; then
    PORT_INFO=$(lsof -i :3307 2>/dev/null | tail -1 || netstat -an | grep ":3307.*LISTEN" 2>/dev/null)
    echo -e "${GREEN}✅ 端口 3307 已占用${NC}"
    echo -e "   $PORT_INFO"
else
    echo -e "${BLUE}ℹ️  端口 3307 空闲${NC}"
fi

# 总结
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  检查完成${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if docker ps | grep -q "medical_mysql"; then
    echo -e "${GREEN}MySQL 容器运行正常!${NC}"
else
    echo -e "${YELLOW}MySQL 容器未运行，请执行 ./deploy.sh 启动服务${NC}"
fi

echo ""
echo -e "${BLUE}常用命令:${NC}"
echo -e "  查看日志:   ${YELLOW}docker compose logs mysql${NC}"
echo -e "  进入容器:   ${YELLOW}docker exec -it medical_mysql bash${NC}"
echo -e "  连接数据库: ${YELLOW}docker exec -it medical_mysql mysql -u root -pqweasd2025 medical_imaging_system${NC}"
echo -e "  停止服务:   ${YELLOW}docker compose down${NC}"
echo -e "  启动服务:   ${YELLOW}./deploy.sh${NC}"
