# 🐳 XieHe医疗影像诊断系统 - Docker数据持久化方案

## 📋 概述

本文档详细说明了XieHe医疗影像诊断系统在Docker环境下的数据持久化策略，确保数据安全和系统稳定性。

---

## 🔒 数据持久化机制

### 1. Docker Volumes 持久化

我们使用Docker Volumes来确保数据持久化，即使容器重启或删除，数据也不会丢失。

#### 配置的Volumes：
```yaml
volumes:
  mysql_data:          # MySQL数据库文件
  mysql_logs:          # MySQL日志文件
  redis_data:          # Redis数据文件
  redis_logs:          # Redis日志文件
  uploads_data:        # 用户上传的文件
  models_data:         # AI模型文件
  nginx_logs:          # Nginx访问日志
```

### 2. 数据存储位置

#### MySQL数据库
- **容器内路径**: `/var/lib/mysql`
- **Volume名称**: `mysql_data`
- **持久化内容**: 
  - 数据库文件 (.ibd, .frm)
  - 事务日志 (ib_logfile)
  - 配置文件
  - 用户权限信息

#### Redis缓存
- **容器内路径**: `/data`
- **Volume名称**: `redis_data`
- **持久化内容**:
  - RDB快照文件 (dump.rdb)
  - AOF日志文件 (appendonly.aof)

#### 文件上传
- **容器内路径**: `/app/uploads`
- **Volume名称**: `uploads_data`
- **持久化内容**:
  - 医学影像文件 (DICOM)
  - 患者资料文档
  - 诊断报告文件

---

## 🛡️ 数据安全保障

### 1. 容器重启安全
```bash
# 重启单个容器 - 数据不丢失
docker compose restart mysql
docker compose restart redis
docker compose restart backend

# 重启所有容器 - 数据不丢失
docker compose restart
```

### 2. 容器删除安全
```bash
# 停止并删除容器 - 数据保留在Volume中
docker compose down

# 重新启动 - 数据自动恢复
docker compose up -d
```

### 3. 系统重启安全
- 服务器重启后，Docker Volumes自动挂载
- 数据完整性得到保障
- 服务自动恢复到重启前状态

---

## 💾 备份策略

### 1. 自动备份脚本
```bash
# 执行完整备份
./scripts/backup_database.sh

# 备份内容包括：
# - MySQL数据库导出 (.sql)
# - Redis数据快照 (.rdb)
# - Docker Volumes打包 (.tar.gz)
```

### 2. 备份文件结构
```
backups/
├── mysql/
│   ├── full_backup_20240926_143000.sql      # 完整数据库备份
│   └── medical_system_20240926_143000.sql   # 系统数据库备份
├── redis/
│   └── dump_20240926_143000.rdb             # Redis数据快照
├── volumes/
│   ├── mysql_volume_20240926_143000.tar.gz  # MySQL Volume备份
│   └── redis_volume_20240926_143000.tar.gz  # Redis Volume备份
└── backup_info_20240926_143000.txt          # 备份信息文件
```

### 3. 备份频率建议
- **生产环境**: 每日自动备份
- **开发环境**: 每周备份
- **重要操作前**: 手动备份

---

## 🔄 数据恢复

### 1. 快速恢复
```bash
# 从备份恢复数据
./scripts/restore_database.sh 20240926_143000

# 恢复过程：
# 1. 停止应用服务
# 2. 备份当前数据
# 3. 恢复指定备份
# 4. 重启所有服务
# 5. 验证数据完整性
```

### 2. 灾难恢复
```bash
# 完全重建系统
docker compose down -v  # 删除所有容器和Volume
docker compose up -d    # 重新创建
./scripts/restore_database.sh <backup_timestamp>
```

### 3. 部分恢复
```bash
# 仅恢复MySQL
docker exec -i medical_mysql mysql -u root -p < backups/mysql/medical_system_20240926_143000.sql

# 仅恢复Redis
docker cp backups/redis/dump_20240926_143000.rdb medical_redis:/data/dump.rdb
docker compose restart redis
```

---

## 📊 Volume管理

### 1. 查看Volume信息
```bash
# 列出所有Volume
docker volume ls

# 查看Volume详情
docker volume inspect mysql_data

# 查看Volume使用情况
docker system df -v
```

### 2. Volume备份
```bash
# 备份Volume到本地
docker run --rm \
  -v mysql_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mysql_backup.tar.gz -C /source .
```

### 3. Volume恢复
```bash
# 从本地恢复Volume
docker run --rm \
  -v mysql_data:/target \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/mysql_backup.tar.gz -C /target
```

---

## ⚠️ 注意事项

### 1. 数据一致性
- 备份前确保数据库事务完成
- 使用 `--single-transaction` 参数保证一致性
- Redis使用 `BGSAVE` 命令避免阻塞

### 2. 存储空间
- 定期清理旧备份文件
- 监控Volume使用情况
- 预留足够的磁盘空间

### 3. 权限管理
- 备份文件设置适当权限
- 限制数据库访问权限
- 定期更新密码

---

## 🚀 最佳实践

### 1. 定期备份
```bash
# 添加到crontab
0 2 * * * /path/to/XieHe-System/scripts/backup_database.sh
```

### 2. 监控告警
- 监控Volume使用率
- 备份成功/失败通知
- 数据库连接状态检查

### 3. 测试恢复
- 定期测试备份文件完整性
- 在测试环境验证恢复流程
- 记录恢复时间和步骤

---

## 📞 故障排除

### 1. 数据丢失
```bash
# 检查Volume是否存在
docker volume ls | grep medical

# 检查容器挂载
docker inspect medical_mysql | grep -A 10 "Mounts"

# 恢复最近备份
./scripts/restore_database.sh $(ls -1 backups/mysql/*_*.sql | tail -1 | sed 's/.*_\([0-9_]*\)\.sql/\1/')
```

### 2. 备份失败
```bash
# 检查容器状态
docker compose ps

# 检查磁盘空间
df -h

# 手动备份
docker exec medical_mysql mysqldump -u root -p --all-databases > manual_backup.sql
```

### 3. 恢复失败
```bash
# 检查备份文件完整性
head -10 backups/mysql/medical_system_20240926_143000.sql

# 检查数据库连接
docker exec medical_mysql mysql -u root -p -e "SHOW DATABASES;"

# 查看错误日志
docker compose logs mysql
```

---

## 📈 总结

通过Docker Volumes和完善的备份策略，XieHe医疗影像诊断系统实现了：

✅ **数据持久化**: 容器重启不丢失数据  
✅ **自动备份**: 定期备份关键数据  
✅ **快速恢复**: 一键恢复到指定时间点  
✅ **灾难恢复**: 完整的系统重建能力  
✅ **监控告警**: 实时监控数据状态  

这确保了医疗数据的安全性和系统的高可用性。
