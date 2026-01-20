# 🚀 服务器数据迁移指南

## 📋 概述

本指南用于将生产服务器的数据库从旧的 Study/Series/Instance 三层模型迁移到新的 ImageFile 单层模型。

## ⚠️ 重要警告

- **此迁移不可逆！** 执行前必须备份数据库
- **会删除表和字段！** 确保数据已经迁移完成
- **需要停机维护！** 建议在低峰期执行

## 📊 迁移策略对比

### 之前的策略（渐进式）
```
1. 添加新字段 (image_file_id)
2. 迁移数据
3. 保留旧表 2-3 个月
4. 最后删除旧表
```

### 现在的策略（一次性）
```
1. 备份数据库 ✅
2. 迁移数据到新模型 ✅
3. 验证数据完整性 ✅
4. 删除旧表和字段 ✅
```

## 🔄 迁移步骤

### 步骤 0: 检查当前状态

```bash
# 连接到服务器数据库
mysql -h <服务器IP> -u root -p medical_imaging_system

# 检查是否存在旧表
SHOW TABLES LIKE 'studies';
SHOW TABLES LIKE 'series';
SHOW TABLES LIKE 'instances';

# 检查 image_files 表是否有旧字段
DESCRIBE image_files;
```

**如果旧表不存在**：说明已经清理过，无需执行迁移 ✅

**如果旧表存在**：继续执行以下步骤 ⬇️

### 步骤 1: 备份数据库 🔒

```bash
# 在服务器上执行
mysqldump -h 127.0.0.1 -u root -p medical_imaging_system > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql

# 验证备份文件
ls -lh backup_*.sql
```

### 步骤 2: 检查数据迁移状态

```bash
# 检查是否已经执行过数据迁移
cd /path/to/XieHe-System/backend
python migrations/test_db_connection.py
```

**如果数据还未迁移**：
```bash
# 先执行数据迁移（试运行）
python migrations/migrate_to_simplified_model.py

# 确认无误后执行实际迁移
python migrations/migrate_to_simplified_model.py --execute
```

**如果数据已迁移**：继续下一步 ⬇️

### 步骤 3: 验证数据完整性

```sql
-- 检查 image_files 表的数据
SELECT COUNT(*) FROM image_files;

-- 检查 image_annotations 的关联
SELECT COUNT(*) FROM image_annotations WHERE image_file_id IS NOT NULL;

-- 检查 ai_tasks 的关联
SELECT COUNT(*) FROM ai_tasks WHERE image_file_id IS NOT NULL;
```

### 步骤 4: 执行清理脚本

```bash
# 方法1: 使用 SQL 文件
mysql -h 127.0.0.1 -u root -p medical_imaging_system < migrations/cleanup_old_tables.sql

# 方法2: 手动执行
mysql -h 127.0.0.1 -u root -p medical_imaging_system
```

然后在 MySQL 命令行中：
```sql
source migrations/cleanup_old_tables.sql;
```

### 步骤 5: 验证清理结果

```sql
-- 确认旧表已删除
SHOW TABLES LIKE 'studies';    -- 应该返回空
SHOW TABLES LIKE 'series';     -- 应该返回空
SHOW TABLES LIKE 'instances';  -- 应该返回空

-- 确认字段已删除
DESCRIBE image_files;          -- 不应该有 study_id, series_id
DESCRIBE image_annotations;    -- 不应该有 study_id, instance_id
DESCRIBE ai_tasks;             -- 不应该有 study_id
```

### 步骤 6: 重启应用服务

```bash
# 如果使用 Docker
docker-compose restart backend

# 如果使用 systemd
systemctl restart xiehe-backend

# 如果使用 PM2
pm2 restart xiehe-backend
```

### 步骤 7: 测试 API

```bash
# 测试根端点
curl http://localhost:8000/

# 测试影像文件列表
curl http://localhost:8000/api/v1/image-files/

# 测试患者影像列表
curl http://localhost:8000/api/v1/image-files/patient/1
```

## 🔙 回滚方案

如果迁移后发现问题，可以回滚：

```bash
# 停止应用
docker-compose stop backend

# 恢复数据库
mysql -h 127.0.0.1 -u root -p medical_imaging_system < backup_before_cleanup_YYYYMMDD_HHMMSS.sql

# 重启应用
docker-compose start backend
```

## ✅ 检查清单

迁移前：
- [ ] 已备份数据库
- [ ] 已验证数据迁移完成
- [ ] 已通知用户停机维护
- [ ] 已准备回滚方案

迁移后：
- [ ] 旧表已删除
- [ ] 旧字段已删除
- [ ] API 正常响应
- [ ] 数据查询正常
- [ ] 前端功能正常

## 📞 问题排查

### 问题1: 外键约束错误
```
ERROR 1451: Cannot delete or update a parent row
```
**解决**：脚本已包含 `SET FOREIGN_KEY_CHECKS = 0`，如果仍有问题，手动删除外键约束。

### 问题2: 字段不存在
```
ERROR 1091: Can't DROP 'study_id'; check that column/key exists
```
**解决**：这是正常的，说明字段已经删除过了。

### 问题3: API 报错
```
sqlalchemy.exc.OperationalError: Unknown column 'study_id'
```
**解决**：重启应用服务，确保代码已更新。

## 📚 相关文档

- [数据迁移脚本说明](README.md)
- [模型清理总结](../../docs/refactoring/model-cleanup-summary.md)
- [重构总结文档](../../docs/refactoring/REFACTORING_SUMMARY.md)

