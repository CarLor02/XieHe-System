# XieHe Medical System - 部署指南

## 🚀 一键部署

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- Git
- 至少 4GB 可用磁盘空间

### 部署步骤

1. **赋予执行权限**
```bash
chmod +x deploy.sh
```

2. **执行部署脚本**
```bash
./deploy.sh
```

3. **访问服务**
- 前端应用: http://localhost:3000
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs

## 📋 脚本功能

部署脚本会自动执行以下步骤：

1. ✅ **环境检查** - 检查Docker、Git等必要工具
2. 💾 **备份** - 备份当前部署配置
3. 🔄 **拉取代码** - 从Git仓库拉取最新代码
4. 🛑 **停止旧服务** - 停止并清理旧容器
5. 🔨 **构建镜像** - 构建最新的Docker镜像
6. 🚀 **启动服务** - 启动所有服务容器
7. 🏥 **健康检查** - 验证所有服务是否正常运行

## 🔧 常用命令

### 查看服务状态
```bash
docker compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
```

### 重启服务
```bash
# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart backend
docker compose restart frontend
```

### 停止服务
```bash
docker compose down
```

### 停止并删除数据卷
```bash
docker compose down -v
```

## 🐛 故障排查

### 服务无法启动

1. 检查端口是否被占用
```bash
lsof -i :3000  # 前端端口
lsof -i :8000  # 后端端口
lsof -i :3307  # MySQL端口
lsof -i :6380  # Redis端口
```

2. 查看服务日志
```bash
docker compose logs backend
docker compose logs frontend
```

### 数据库连接失败

```bash
# 检查MySQL是否正常
docker compose exec mysql mysqladmin ping -h localhost -u root -proot_password_2024

# 进入MySQL容器
docker compose exec mysql mysql -u root -proot_password_2024
```

### 前端无法连接后端

1. 检查环境变量配置
2. 确认后端服务健康状态
```bash
curl http://localhost:8000/health
```

## 🔄 更新部署

当代码更新后，只需再次运行部署脚本：

```bash
./deploy.sh
```

脚本会自动：
- 拉取最新代码
- 重新构建镜像
- 重启服务

## 📁 备份与恢复

### 自动备份

部署脚本会自动创建备份：
- 位置: `backups/deploy_YYYYMMDD_HHMMSS/`
- 内容: 环境配置文件、Git提交信息

### 手动备份数据库

```bash
# 备份
docker compose exec mysql mysqldump -u root -proot_password_2024 medical_system > backup.sql

# 恢复
docker compose exec -T mysql mysql -u root -proot_password_2024 medical_system < backup.sql
```

## 🔒 安全建议

1. **生产环境修改默认密码**
   - 编辑 `dotenv/.env.database` 修改数据库密码
   - 修改 `JWT_SECRET_KEY`

2. **配置防火墙**
   - 仅开放必要端口
   - 使用反向代理（nginx）

3. **启用HTTPS**
   - 配置SSL证书
   - 使用Let's Encrypt自动证书

## 📊 监控

### 资源使用情况

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df
```

### 清理未使用资源

```bash
# 清理未使用的镜像
docker image prune -f

# 清理所有未使用资源
docker system prune -a
```

## 📞 支持

如遇到问题，请：
1. 查看日志文件
2. 检查 GitHub Issues
3. 联系技术支持团队

---

**XieHe Medical System v1.0**  
协和医疗影像诊断系统
