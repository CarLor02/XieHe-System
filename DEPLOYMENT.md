# 快速部署指南

## 🚀 一键部署

本系统提供两种部署方式:

### 方式 1: 标准部署 (推荐)

```bash
./deploy.sh
```

**功能:**
- ✅ 环境检查
- ✅ 代码拉取
- ✅ 服务备份
- ✅ Docker 镜像构建
- ✅ MySQL 数据库自动初始化
- ✅ 服务启动和健康检查

### 方式 2: 安全部署 (生产环境推荐)

```bash
./scripts/secure_deploy.sh
```

**功能:**
- ✅ 所有标准部署功能
- ✅ **恶意软件检查** (检测挖矿病毒等)
- ✅ **系统安全检查** (CPU、进程、可疑文件)
- ✅ 部署前安全验证

---

## 📋 部署前准备

### 1. 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- Git
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

### 2. 配置文件(可选)

如需自定义配置:

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置(修改密码等)
vim .env
```

**默认配置:**
- MySQL 端口: 3307 (宿主机)
- 后端 API 端口: 8080
- 前端端口: 3030
- Redis 端口: 6380

---

## 🎯 首次部署

```bash
# 1. 克隆代码(如果还没有)
git clone <repository-url>
cd XieHe-System

# 2. 确保脚本有执行权限
chmod +x deploy.sh
chmod +x scripts/secure_deploy.sh

# 3. 执行部署(二选一)

# 标准部署
./deploy.sh

# 或安全部署(推荐生产环境)
./scripts/secure_deploy.sh
```

**首次部署会:**
1. 构建 Docker 镜像 (~5-10分钟)
2. 创建 MySQL 容器
3. **自动初始化数据库** (创建表、插入测试数据)
4. 启动所有服务

---

## 🔄 后续更新部署

```bash
# 拉取最新代码
git pull

# 重新部署
./deploy.sh
```

**后续部署会:**
1. 自动停止旧服务
2. 重新构建镜像
3. 启动新服务
4. **自动检测数据库** (已有数据不会重新初始化)

---

## 📊 验证部署

部署完成后,访问:

- **前端**: http://your-server-ip:3030
- **后端 API**: http://your-server-ip:8080
- **API 文档**: http://your-server-ip:8080/docs

---

## 🛠️ 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 检查 MySQL 状态
./scripts/check_mysql.sh

# 清理恶意软件(如遇到安全问题)
sudo ./scripts/security_cleanup.sh
```

---

## 🗄️ 数据库管理

### 连接数据库

```bash
# 从宿主机连接
mysql -h 127.0.0.1 -P 3307 -u medical_user -pmedical_pass_2024 medical_system

# 从容器内连接
docker exec -it medical_mysql mysql -u root -pmedical_root_2024 medical_system
```

### 手动初始化数据库

```bash
# 进入后端容器
docker exec -it medical_backend bash

# 运行初始化脚本
cd /app/scripts
python init_database.py
```

### 备份数据库

```bash
# 备份
docker exec medical_mysql mysqldump -u root -pmedical_root_2024 medical_system > backup_$(date +%Y%m%d).sql

# 恢复
docker exec -i medical_mysql mysql -u root -pmedical_root_2024 medical_system < backup_20260104.sql
```

---

## ⚠️ 故障排除

### 问题 1: 端口冲突

```bash
# 检查端口占用
lsof -i :3030  # 前端
lsof -i :8080  # 后端
lsof -i :3307  # MySQL

# 修改端口: 编辑 docker-compose.yml
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

### 问题 3: 恶意软件感染

```bash
# 运行安全清理
sudo ./scripts/security_cleanup.sh

# 然后重新部署
./scripts/secure_deploy.sh
```

---

## 📚 详细文档

- [MySQL 部署文档](docs/deployment/mysql-deployment.md)
- [安全配置指南](docker-compose.security.yml)
- [项目完整文档](docs/README.md)

---

## 🆘 获取帮助

如遇问题:
1. 查看日志: `docker compose logs`
2. 检查配置: `./scripts/check_mysql.sh`
3. 查看文档: `docs/` 目录
4. 联系技术支持
