# MySQL 容器部署说明

## 概述

本系统已集成 MySQL 数据库容器,支持自动初始化数据库表和测试数据。

## 配置说明

### 1. 环境变量配置

MySQL 容器使用以下环境变量（在 `docker-compose.yml` 中配置）:

```yaml
environment:
  - MYSQL_ROOT_PASSWORD=qweasd2025           # Root 密码
  - MYSQL_DATABASE=medical_imaging_system    # 数据库名
```

### 2. 端口映射

- **容器内端口**: 3306
- **宿主机端口**: 3307 (避免与本地 MySQL 冲突)

### 3. 数据持久化

MySQL 数据存储在 Docker 卷中:
- `mysql_data`: 数据库文件 (`/var/lib/mysql`)
- `mysql_logs`: 日志文件 (`/var/log/mysql`)

## 数据库初始化

### 自动初始化

后端容器启动时会自动检查并初始化数据库:

1. **检查连接**: 等待 MySQL 服务完全启动
2. **检查表**: 检查数据库中是否已有表
3. **初始化**: 如果表数量 < 5,自动运行初始化脚本

初始化脚本按顺序执行:
1. `init_user_tables.py` - 用户权限表
2. `init_patient_tables.py` - 患者管理表
3. `init_image_tables.py` - 影像管理表
4. `init_report_tables.py` - 诊断报告表
5. `init_system_tables.py` - 系统配置表

### 手动初始化

如需手动初始化数据库:

```bash
# 进入后端容器
docker exec -it medical_backend bash

# 运行初始化脚本
cd /app/scripts
python init_database.py
```

## 部署步骤

### 1. 首次部署

```bash
# 1. 确保有正确的配置
cp .env.example .env
# 编辑 .env 文件,设置数据库密码等

# 2. 运行部署脚本
./deploy.sh
```

部署脚本会:
- ✅ 拉取最新代码
- ✅ 停止旧服务
- ✅ 构建 Docker 镜像
- ✅ 启动 MySQL 容器
- ✅ 启动后端容器(自动初始化数据库)
- ✅ 启动前端容器
- ✅ 执行健康检查

### 2. 后续部署

```bash
# 直接运行部署脚本即可
./deploy.sh

# 或使用安全部署脚本(包含恶意软件检查)
./scripts/secure_deploy.sh
```

## 数据库管理

### 连接数据库

```bash
# 从宿主机连接
mysql -h 127.0.0.1 -P 3307 -u root -pqweasd2025 medical_imaging_system

# 从容器内连接
docker exec -it medical_mysql mysql -u root -pqweasd2025 medical_imaging_system
```

### 查看数据库状态

```bash
# 查看容器状态
docker compose ps mysql

# 查看容器日志
docker compose logs mysql

# 进入容器
docker exec -it medical_mysql bash
```

### 备份数据库

```bash
# 备份数据库
docker exec medical_mysql mysqldump -u root -pqweasd2025 medical_imaging_system > backup.sql

# 恢复数据库
docker exec -i medical_mysql mysql -u root -pqweasd2025 medical_imaging_system < backup.sql
```

### 重置数据库

```bash
# 停止服务
docker compose down

# 删除数据卷
docker volume rm xiehe-system_mysql_data

# 重新部署(会自动初始化)
./deploy.sh
```

## 健康检查

部署脚本会自动执行健康检查:

```bash
# MySQL 健康检查
✅ 检查MySQL数据库...
   MySQL服务正常

# 如果失败
❌ MySQL服务异常
```

手动健康检查:

```bash
# 检查 MySQL 连接
docker compose exec mysql mysqladmin ping -h localhost -u root -pqweasd2025

# 查看表数量
docker compose exec mysql mysql -u root -pqweasd2025 -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='medical_imaging_system';"
```

## 故障排除

### 问题 1: MySQL 启动失败

```bash
# 查看日志
docker compose logs mysql

# 常见原因:
# - 端口冲突(3307 已被占用)
# - 权限问题
# - 数据卷损坏
```

### 问题 2: 数据库初始化失败

```bash
# 查看后端日志
docker compose logs backend

# 手动初始化
docker exec -it medical_backend bash
cd /app/scripts
python init_database.py
```

### 问题 3: 连接超时

```bash
# 检查 MySQL 是否完全启动
docker compose ps

# 增加等待时间
# 在 docker-compose.yml 中调整 healthcheck 参数
```

## 安全建议

### 生产环境配置

1. **修改默认密码**
```yaml
MYSQL_ROOT_PASSWORD=<strong-random-password>
MYSQL_PASSWORD=<strong-random-password>
```

2. **限制端口暴露**
```yaml
# 不暴露到公网
ports:
  - '127.0.0.1:3307:3306'
```

3. **启用 SSL/TLS**
```bash
# 在 my.cnf 中配置 SSL
```

4. **定期备份**
```bash
# 设置定时备份任务
0 2 * * * /path/to/backup_script.sh
```

## 参考资料

- MySQL 初始化脚本: `backend/scripts/init_database.py`
- Docker SQL 初始化: `docker/mysql/init/*.sql`
- 环境变量配置: `.env.example`
- 后端启动脚本: `docker/backend-entrypoint.sh`
