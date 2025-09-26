#!/bin/bash

# XieHe医疗影像诊断系统 - 数据库备份脚本
# 支持自动备份MySQL数据库和Redis数据

set -e

# 配置变量
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
MYSQL_CONTAINER="medical_mysql"
REDIS_CONTAINER="medical_redis"

# 数据库连接信息
DB_NAME="medical_system"
DB_USER="medical_user"
DB_PASSWORD="medical_password_2024"
DB_ROOT_PASSWORD="root_password_2024"

# 创建备份目录
mkdir -p "$BACKUP_DIR/mysql" "$BACKUP_DIR/redis" "$BACKUP_DIR/volumes"

echo "🗄️ 开始备份XieHe医疗影像诊断系统数据..."

# 1. 备份MySQL数据库
echo "📊 备份MySQL数据库..."
docker exec $MYSQL_CONTAINER mysqldump \
    -u root -p$DB_ROOT_PASSWORD \
    --single-transaction \
    --routines \
    --triggers \
    --all-databases > "$BACKUP_DIR/mysql/full_backup_$DATE.sql"

# 备份特定数据库
docker exec $MYSQL_CONTAINER mysqldump \
    -u root -p$DB_ROOT_PASSWORD \
    --single-transaction \
    --routines \
    --triggers \
    $DB_NAME > "$BACKUP_DIR/mysql/medical_system_$DATE.sql"

echo "✅ MySQL备份完成: $BACKUP_DIR/mysql/"

# 2. 备份Redis数据
echo "🔄 备份Redis数据..."
docker exec $REDIS_CONTAINER redis-cli BGSAVE
sleep 5  # 等待后台保存完成

# 复制Redis数据文件
docker cp $REDIS_CONTAINER:/data/dump.rdb "$BACKUP_DIR/redis/dump_$DATE.rdb"

echo "✅ Redis备份完成: $BACKUP_DIR/redis/"

# 3. 备份Docker Volumes
echo "💾 备份Docker Volumes..."
docker run --rm \
    -v medical_mysql_data:/source:ro \
    -v "$(pwd)/$BACKUP_DIR/volumes":/backup \
    alpine tar czf /backup/mysql_volume_$DATE.tar.gz -C /source .

docker run --rm \
    -v medical_redis_data:/source:ro \
    -v "$(pwd)/$BACKUP_DIR/volumes":/backup \
    alpine tar czf /backup/redis_volume_$DATE.tar.gz -C /source .

echo "✅ Volume备份完成: $BACKUP_DIR/volumes/"

# 4. 创建备份信息文件
cat > "$BACKUP_DIR/backup_info_$DATE.txt" << EOF
XieHe医疗影像诊断系统 - 备份信息
=====================================

备份时间: $(date)
备份版本: $DATE

文件列表:
- MySQL完整备份: mysql/full_backup_$DATE.sql
- MySQL系统备份: mysql/medical_system_$DATE.sql  
- Redis数据备份: redis/dump_$DATE.rdb
- MySQL Volume: volumes/mysql_volume_$DATE.tar.gz
- Redis Volume: volumes/redis_volume_$DATE.tar.gz

恢复命令:
- MySQL: ./scripts/restore_database.sh $DATE
- 手动恢复: docker exec -i medical_mysql mysql -u root -p < backups/mysql/medical_system_$DATE.sql

系统状态:
$(docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}")
EOF

# 5. 清理旧备份（保留最近7天）
echo "🧹 清理旧备份文件..."
find "$BACKUP_DIR" -name "*_*.sql" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*_*.rdb" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "backup_info_*.txt" -mtime +7 -delete 2>/dev/null || true

# 6. 显示备份大小
echo "📈 备份统计:"
du -sh "$BACKUP_DIR"/*/ 2>/dev/null || true

echo ""
echo "🎉 备份完成！"
echo "📁 备份位置: $BACKUP_DIR"
echo "📋 备份信息: $BACKUP_DIR/backup_info_$DATE.txt"
echo ""
echo "💡 提示:"
echo "   - 定期将备份文件复制到远程存储"
echo "   - 使用 ./scripts/restore_database.sh $DATE 恢复数据"
echo "   - 使用 ./scripts/test_backup.sh $DATE 测试备份完整性"
