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

5. **`./infrastructure/docker/backend-entrypoint.sh`** - 后端容器启动脚本
   - 等待 MySQL 就绪
   - 自动数据库初始化
   - 启动 FastAPI 应用

### ❌ 已删除的冗余文件

- `deploy_docker.sh` - 功能已合并到 `deploy.sh`
- `scripts/deploy.sh` - 与主部署脚本重复
- `scripts/start_hybrid.sh` - 开发模式，不推荐使用
- `infrastructure/mysql/init-db.sh` - 功能已由 `backend-entrypoint.sh` 实现

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
   - 编辑 `dotenv/.env.database` 和 `dotenv/.env.backend`
   - 更改 MySQL root 密码
   - 更改应用用户密码

4. **限制端口访问**
   - 使用防火墙
   - 只暴露必要端口

---

## 📖 相关文档

- [快速部署指南](./DEPLOYMENT.md) - 详细部署步骤
- [MySQL 部署文档](./docs/deployment/mysql-deployment.md) - 数据库配置
- [安全配置](./infrastructure/docker/compose/security.yml) - Docker 安全配置
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



关机重启后启动服务
##########################
cd ~/Documents/XieHe-System

# 1. 启动 Docker 服务（如果没自动启动）
sudo systemctl start docker

# 2. 启动所有 Docker 服务
./scripts/compose.sh up -d

# 3. 启动 AI 服务（宿主机运行）
./manage_ai.sh start

# 4. 查看状态
./scripts/compose.sh ps
./manage_ai.sh status

########################
操作	是否需要联网
./scripts/compose.sh up -d	❌ 不需要
./scripts/compose.sh down	❌ 不需要
./scripts/compose.sh ps	❌ 不需要
./scripts/compose.sh logs	❌ 不需要
./deploy_pc.sh (重新构建)	✅ 需要
git pull (拉取更新)	✅ 需要

# 创建 systemd 服务
sudo tee /etc/systemd/system/xiehe.service > /dev/null << 'EOF'
[Unit]
Description=XieHe Medical Imaging System
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=root
WorkingDirectory=/home/root/Documents/XieHe-System
ExecStart=/home/root/Documents/XieHe-System/start_xiehe.sh
ExecStop=/home/root/Documents/XieHe-System/stop_xiehe.sh

[Install]
WantedBy=multi-user.target
EOF

# 替换用户名
sudo sed -i "s/root/$USER/g" /etc/systemd/system/xiehe.service

# 启用开机自启
sudo systemctl daemon-reload
sudo systemctl enable xiehe.service



####################检查IP
cd ~/Documents/XieHe-System

echo "=========================================="
echo "🔍 查看所有服务的 IP 配置"
echo "=========================================="

echo -e "\n📁 1️⃣ 配置文件中的 IP:"
echo "----------------------------------------"
echo "LAN_IP:"
grep "^LAN_IP=" dotenv/.env.ports 2>/dev/null || echo "  ❌ 文件不存在"

echo -e "\n前端 API 地址:"
grep "NEXT_PUBLIC_API_URL" dotenv/.env.frontend 2>/dev/null || echo "  ❌ 文件不存在"

echo -e "\nAI 服务地址:"
grep -E "ZHENGMIAN_URL|CEMIAN_URL" dotenv/.env.ai 2>/dev/null || echo "  ❌ 文件不存在"

echo -e "\n后端配置:"
grep -E "FRONTEND_URL|CORS_ORIGINS" dotenv/.env.backend 2>/dev/null || echo "  ❌ 文件不存在"

echo -e "\n🐳 2️⃣ Docker 容器中的环境变量:"
echo "----------------------------------------"

echo "Frontend 容器:"
docker exec medical_frontend printenv 2>/dev/null | grep -E "NEXT_PUBLIC_API|API_URL" || echo "  ❌ 容器未运行或无环境变量"

echo -e "\nBackend 容器:"
docker exec medical_backend printenv 2>/dev/null | grep -E "FRONTEND_URL|CORS|ZHENGMIAN|CEMIAN" || echo "  ❌ 容器未运行"

echo -e "\n🔎 3️⃣ 搜索所有配置文件中的 IP 地址:"
echo "----------------------------------------"
grep -rh "192\.168\.[0-9]\+\.[0-9]\+" dotenv/ 2>/dev/null | sort -u

echo -e "\n🌐 4️⃣ 容器网络信息:"
echo "----------------------------------------"
docker network inspect xiehe-system_medical_network 2>/dev/null | grep -A 3 "IPv4Address" | head -20

echo -e "\n📊 5️⃣ 容器端口映射:"
echo "----------------------------------------"
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep medical

echo -e "\n=========================================="
echo "✅ 诊断完成"
echo "=========================================="