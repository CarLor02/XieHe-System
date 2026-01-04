# 部署脚本说明

## 📁 项目部署文件清单

### ✅ 保留的部署脚本

1. **`./deploy.sh`** - 主部署脚本（标准部署）
   - 完整的部署流程
   - 环境检查
   - 代码拉取
   - Docker 构建
   - MySQL 自动初始化
   - 健康检查

2. **`./scripts/secure_deploy.sh`** - 安全部署脚本（生产环境推荐）
   - 所有标准部署功能
   - **恶意软件扫描**
   - 系统安全检查
   - CPU/进程监控
   - 可疑文件检测

3. **`./scripts/security_cleanup.sh`** - 安全清理脚本
   - 恶意软件清除
   - 可疑进程终止
   - 系统清理

4. **`./scripts/check_mysql.sh`** - MySQL 状态检查
   - 容器状态检查
   - 数据库连接测试
   - 表数量统计

5. **`./docker/backend-entrypoint.sh`** - 后端容器启动脚本
   - 等待 MySQL 就绪
   - 自动数据库初始化
   - 启动 FastAPI 应用

### ❌ 已删除的冗余文件

- `deploy_docker.sh` - 功能已合并到 `deploy.sh`
- `scripts/deploy.sh` - 与主部署脚本重复
- `scripts/start_hybrid.sh` - 开发模式，不推荐使用
- `docker/mysql/init-db.sh` - 功能已由 `backend-entrypoint.sh` 实现

---

## 🚀 使用方法

### 首次部署

```bash
# 标准部署（开发/测试环境）
./deploy.sh

# 安全部署（生产环境）
./scripts/secure_deploy.sh
```

### 后续更新

```bash
# 拉取代码
git pull

# 重新部署
./deploy.sh
```

### 故障排查

```bash
# 检查 MySQL 状态
./scripts/check_mysql.sh

# 清理恶意软件（如遇安全问题）
sudo ./scripts/security_cleanup.sh
```

---

## 📋 部署流程说明

### deploy.sh 执行流程

1. **环境检查**
   - Docker 版本
   - Docker Compose
   - 磁盘空间

2. **备份当前部署**
   - 保存环境配置
   - 记录 Git 提交

3. **拉取最新代码**
   - Git pull
   - 处理冲突

4. **停止旧服务**
   - 停止容器
   - 清理旧镜像

5. **构建 Docker 镜像**
   - 前端镜像
   - 后端镜像

6. **启动服务**
   - Redis (6380)
   - MySQL (3307) + 自动初始化
   - Backend (8080)
   - Frontend (3030)

7. **健康检查**
   - MySQL 连接测试
   - Redis ping
   - Backend API
   - Frontend 响应

### secure_deploy.sh 执行流程

在 deploy.sh 流程基础上，**部署前**增加:

1. **可疑进程检查**
   - 挖矿程序 (javae, xmrig, minerd)
   - 可疑连接 (supportxmr, cryptonight)

2. **可疑文件检查**
   - `/tmp/.XIN-unix`
   - `/var/tmp/.unix`
   - 其他恶意路径

3. **系统资源检查**
   - CPU 使用率
   - 异常进程

---

## 🔒 安全建议

### 生产环境部署

1. **使用安全部署脚本**
   ```bash
   ./scripts/secure_deploy.sh
   ```

2. **定期执行安全检查**
   ```bash
   # 设置定时任务
   0 */6 * * * /path/to/scripts/security_cleanup.sh
   ```

3. **修改默认密码**
   - 编辑 `docker-compose.yml`
   - 更改 MySQL root 密码
   - 更改应用用户密码

4. **限制端口访问**
   - 使用防火墙
   - 只暴露必要端口

---

## 📖 相关文档

- [快速部署指南](./DEPLOYMENT.md) - 详细部署步骤
- [MySQL 部署文档](./docs/deployment/mysql-deployment.md) - 数据库配置
- [安全配置](./docker-compose.security.yml) - Docker 安全配置
- [项目文档](./docs/README.md) - 完整项目文档

---

## ⚠️ 注意事项

1. **首次部署会自动初始化数据库**
   - 创建所有表结构
   - 插入测试数据
   - 可能需要 2-5 分钟

2. **后续部署不会重新初始化**
   - 自动检测表是否存在
   - 保留现有数据

3. **手动初始化数据库**
   ```bash
   docker exec -it medical_backend bash
   cd /app/scripts
   python init_database.py
   ```

4. **数据备份**
   - 定期备份 MySQL 数据
   - 备份环境配置文件

---

## 🆘 获取帮助

遇到问题请:
1. 查看日志: `docker compose logs`
2. 检查状态: `./scripts/check_mysql.sh`
3. 查看文档: `./docs/`
4. 联系技术支持
