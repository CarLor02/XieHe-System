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

# 检查数据库是否需要初始化
echo "🔍 检查数据库状态..."
TABLE_COUNT=$(python -c "
import pymysql
import os

conn = pymysql.connect(
    host=os.getenv('DB_HOST', 'mysql'),
    port=int(os.getenv('DB_PORT', '3306')),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', 'qweasd2025'),
    database=os.getenv('DB_NAME', 'medical_imaging_system')
)
cursor = conn.cursor()
cursor.execute(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='%s'\" % os.getenv('DB_NAME', 'medical_imaging_system'))
count = cursor.fetchone()[0]
print(count)
conn.close()
" 2>/dev/null || echo "0")

echo "   现有表数量: $TABLE_COUNT"

if [ "$TABLE_COUNT" -lt "5" ]; then
    echo "📊 数据库未初始化或不完整，开始初始化..."
    
    # 运行 Python 初始化脚本
    cd /app/scripts
    python init_database.py
    
    if [ $? -eq 0 ]; then
        echo "✅ 数据库初始化成功!"
    else
        echo "⚠️  数据库初始化失败，但继续启动服务..."
    fi
else
    echo "✅ 数据库已初始化，跳过初始化过程"
fi

# 返回应用目录
cd /app

echo "================================================"
echo "  启动 FastAPI 应用..."
echo "================================================"

# 启动应用
exec uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 4