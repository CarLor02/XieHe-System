#!/bin/bash
# 后端容器启动脚本
# 负责数据库初始化和应用启动

set -e

echo "================================================"
echo "  医疗影像诊断系统 - 后端服务启动"
echo "================================================"

# 等待 MySQL 完全启动
echo "⏳ 等待 MySQL 服务启动..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if python -c "
import pymysql
import os
try:
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'mysql'),
        port=int(os.getenv('DB_PORT', '3306')),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', 'qweasd2025'),
        database=os.getenv('DB_NAME', 'medical_imaging_system')
    )
    conn.close()
    exit(0)
except Exception as e:
    print(f'连接错误: {e}')
    exit(1)
" 2>&1; then
        echo "✅ MySQL 连接成功"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   等待中... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ MySQL 连接超时"
    exit 1
fi

cd /app

echo "🔁 应用 Alembic 数据库迁移..."
alembic upgrade head
echo "✅ Alembic 数据库迁移完成"

echo "================================================"
echo "  启动 FastAPI 应用..."
echo "================================================"

# 启动应用
exec uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 4
