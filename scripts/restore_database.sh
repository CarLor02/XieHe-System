#!/bin/bash

# XieHe医疗影像诊断系统 - 数据库恢复脚本
# 支持从备份恢复MySQL数据库和Redis数据

set -e

# 检查参数
if [ $# -eq 0 ]; then
    echo "❌ 错误: 请提供备份时间戳"
    echo "用法: $0 <backup_timestamp>"
    echo "示例: $0 20240926_143000"
    echo ""
    echo "可用备份:"
    ls -1 backups/mysql/*_*.sql 2>/dev/null | sed 's/.*_\([0-9_]*\)\.sql/\1/' | sort -u || echo "  无可用备份"
    exit 1
fi

BACKUP_TIMESTAMP="$1"
BACKUP_DIR="./backups"
MYSQL_CONTAINER="medical_mysql"
REDIS_CONTAINER="medical_redis"

# 数据库连接信息
DB_NAME="medical_system"
DB_ROOT_PASSWORD="root_password_2024"

# 检查备份文件是否存在
MYSQL_BACKUP="$BACKUP_DIR/mysql/medical_system_$BACKUP_TIMESTAMP.sql"
REDIS_BACKUP="$BACKUP_DIR/redis/dump_$BACKUP_TIMESTAMP.rdb"

if [ ! -f "$MYSQL_BACKUP" ]; then
    echo "❌ 错误: MySQL备份文件不存在: $MYSQL_BACKUP"
    exit 1
fi

echo "🔄 开始恢复XieHe医疗影像诊断系统数据..."
echo "📅 备份时间戳: $BACKUP_TIMESTAMP"

# 确认操作
read -p "⚠️  警告: 此操作将覆盖现有数据。是否继续? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

# 1. 停止相关服务（保持数据库运行）
echo "⏸️  停止应用服务..."
docker compose stop backend frontend nginx 2>/dev/null || true

# 2. 恢复MySQL数据库
echo "📊 恢复MySQL数据库..."

# 创建数据库备份（以防万一）
echo "💾 创建当前数据库备份..."
docker exec $MYSQL_CONTAINER mysqldump \
    -u root -p$DB_ROOT_PASSWORD \
    --single-transaction \
    $DB_NAME > "$BACKUP_DIR/mysql/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || true

# 恢复数据库
echo "🔄 正在恢复数据库..."
docker exec -i $MYSQL_CONTAINER mysql -u root -p$DB_ROOT_PASSWORD < "$MYSQL_BACKUP"

echo "✅ MySQL数据库恢复完成"

# 3. 恢复Redis数据（如果备份存在）
if [ -f "$REDIS_BACKUP" ]; then
    echo "🔄 恢复Redis数据..."
    
    # 停止Redis写入
    docker exec $REDIS_CONTAINER redis-cli BGSAVE
    sleep 2
    
    # 复制备份文件
    docker cp "$REDIS_BACKUP" $REDIS_CONTAINER:/data/dump.rdb
    
    # 重启Redis容器以加载新数据
    docker compose restart redis
    
    # 等待Redis启动
    echo "⏳ 等待Redis启动..."
    sleep 10
    
    echo "✅ Redis数据恢复完成"
else
    echo "⚠️  Redis备份文件不存在，跳过Redis恢复"
fi

# 4. 重启所有服务
echo "🚀 重启所有服务..."
docker compose up -d

# 5. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 6. 验证服务状态
echo "🔍 验证服务状态..."
docker compose ps

# 7. 测试数据库连接
echo "🧪 测试数据库连接..."
if docker exec $MYSQL_CONTAINER mysql -u root -p$DB_ROOT_PASSWORD -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='$DB_NAME';" > /dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

# 8. 测试应用健康状态
echo "🏥 测试应用健康状态..."
sleep 10

# 检查后端健康状态
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ 后端服务正常"
else
    echo "⚠️  后端服务可能未完全启动，请稍后检查"
fi

# 检查前端健康状态
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务正常"
else
    echo "⚠️  前端服务可能未完全启动，请稍后检查"
fi

# 9. 创建恢复日志
cat > "$BACKUP_DIR/restore_log_$(date +%Y%m%d_%H%M%S).txt" << EOF
XieHe医疗影像诊断系统 - 数据恢复日志
=====================================

恢复时间: $(date)
备份时间戳: $BACKUP_TIMESTAMP
恢复文件: $MYSQL_BACKUP

恢复后系统状态:
$(docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}")

数据库表统计:
$(docker exec $MYSQL_CONTAINER mysql -u root -p$DB_ROOT_PASSWORD -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>/dev/null || echo "无法获取统计信息")
EOF

echo ""
echo "🎉 数据恢复完成！"
echo "📋 恢复日志: $BACKUP_DIR/restore_log_$(date +%Y%m%d_%H%M%S).txt"
echo ""
echo "🌐 访问地址:"
echo "   - 前端: http://localhost:3000"
echo "   - 后端API: http://localhost:8000/docs"
echo "   - 健康检查: http://localhost:8000/health"
echo ""
echo "💡 提示:"
echo "   - 请验证数据完整性"
echo "   - 检查应用功能是否正常"
echo "   - 如有问题，请查看容器日志: docker compose logs"
