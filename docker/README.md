# 医疗影像诊断系统 - Docker 配置

## 📋 概述

本目录包含医疗影像诊断系统的所有Docker相关配置文件，支持完整的容器化部署方案。

## 📁 目录结构

```
docker/
├── README.md                    # Docker配置文档
├── docker-compose.yml           # 开发环境编排文件
├── docker-compose.prod.yml      # 生产环境编排文件
├── docker-compose.test.yml      # 测试环境编排文件
├── .env.docker                  # Docker环境变量
├── nginx/                       # Nginx配置
│   ├── nginx.conf              # 主配置文件
│   ├── default.conf            # 默认站点配置
│   ├── ssl/                    # SSL证书目录
│   │   ├── cert.pem            # SSL证书
│   │   └── key.pem             # SSL私钥
│   └── logs/                   # 日志目录
├── mysql/                       # MySQL配置
│   ├── my.cnf                  # MySQL配置文件
│   ├── init/                   # 初始化脚本
│   │   ├── 01-create-database.sql
│   │   ├── 02-create-user.sql
│   │   └── 03-init-tables.sql
│   ├── data/                   # 数据目录
│   └── logs/                   # 日志目录
├── redis/                       # Redis配置
│   ├── redis.conf              # Redis配置文件
│   ├── data/                   # 数据目录
│   └── logs/                   # 日志目录
└── monitoring/                  # 监控配置
    ├── prometheus/             # Prometheus配置
    │   ├── prometheus.yml      # 主配置文件
    │   └── rules/              # 告警规则
    ├── grafana/                # Grafana配置
    │   ├── grafana.ini         # 主配置文件
    │   ├── dashboards/         # 仪表板配置
    │   └── provisioning/       # 自动配置
    └── alertmanager/           # 告警管理器
        └── alertmanager.yml    # 告警配置
```

## 🚀 快速开始

### 开发环境

```bash
# 启动开发环境
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 生产环境

```bash
# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 滚动更新
docker-compose -f docker-compose.prod.yml up -d --no-deps frontend
docker-compose -f docker-compose.prod.yml up -d --no-deps backend
```

### 测试环境

```bash
# 启动测试环境
docker-compose -f docker-compose.test.yml up -d

# 运行测试
docker-compose -f docker-compose.test.yml exec frontend npm test
docker-compose -f docker-compose.test.yml exec backend python -m pytest
```

## 🔧 服务配置

### 前端服务 (Frontend)
- **端口**: 3000
- **镜像**: Node.js 18 Alpine
- **健康检查**: HTTP GET /api/health
- **资源限制**: 512MB RAM, 0.5 CPU

### 后端服务 (Backend)
- **端口**: 8000
- **镜像**: Python 3.9 Alpine
- **健康检查**: HTTP GET /health
- **资源限制**: 1GB RAM, 1 CPU

### 数据库服务 (MySQL)
- **端口**: 3306
- **版本**: MySQL 8.0
- **数据持久化**: docker/mysql/data
- **配置文件**: docker/mysql/my.cnf

### 缓存服务 (Redis)
- **端口**: 6379
- **版本**: Redis 7.0 Alpine
- **数据持久化**: docker/redis/data
- **配置文件**: docker/redis/redis.conf

### 反向代理 (Nginx)
- **端口**: 80, 443
- **版本**: Nginx 1.24 Alpine
- **SSL支持**: 自动HTTPS重定向
- **配置文件**: docker/nginx/nginx.conf

## 🔒 安全配置

### SSL/TLS
- 使用Let's Encrypt自动证书
- 强制HTTPS重定向
- HSTS安全头部
- 现代TLS配置

### 网络安全
- 内部网络隔离
- 最小权限原则
- 安全组配置
- 防火墙规则

### 数据安全
- 数据库加密
- 敏感数据脱敏
- 备份加密
- 访问控制

## 📊 监控配置

### Prometheus
- 指标收集和存储
- 服务发现配置
- 告警规则定义
- 数据保留策略

### Grafana
- 可视化仪表板
- 告警通知
- 用户权限管理
- 数据源配置

### 日志管理
- 集中日志收集
- 日志轮转配置
- 错误日志告警
- 性能日志分析

## 🔄 备份与恢复

### 数据库备份
```bash
# 创建备份
docker-compose exec mysql mysqldump -u root -p medical_system > backup.sql

# 恢复备份
docker-compose exec -i mysql mysql -u root -p medical_system < backup.sql
```

### Redis备份
```bash
# 创建备份
docker-compose exec redis redis-cli BGSAVE

# 复制备份文件
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./redis-backup.rdb
```

### 应用数据备份
```bash
# 备份上传文件
docker run --rm -v medical_system_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# 恢复上传文件
docker run --rm -v medical_system_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

## 🚀 部署策略

### 蓝绿部署
1. 准备新版本容器
2. 更新负载均衡配置
3. 切换流量到新版本
4. 验证服务正常
5. 清理旧版本容器

### 滚动更新
1. 逐个更新服务实例
2. 健康检查验证
3. 自动回滚机制
4. 零停机部署

### 金丝雀发布
1. 部署少量新版本实例
2. 引导部分流量到新版本
3. 监控关键指标
4. 逐步扩大新版本比例

## 🔍 故障排查

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看容器日志
   docker-compose logs [service_name]
   
   # 检查容器状态
   docker-compose ps
   
   # 进入容器调试
   docker-compose exec [service_name] sh
   ```

2. **网络连接问题**
   ```bash
   # 检查网络配置
   docker network ls
   docker network inspect medical_system_default
   
   # 测试服务连通性
   docker-compose exec frontend ping backend
   ```

3. **数据持久化问题**
   ```bash
   # 检查数据卷
   docker volume ls
   docker volume inspect medical_system_mysql_data
   
   # 备份数据卷
   docker run --rm -v medical_system_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-data.tar.gz -C /data .
   ```

### 性能优化

1. **资源限制调优**
   - 根据实际负载调整CPU和内存限制
   - 使用资源监控工具分析使用情况
   - 设置合理的健康检查间隔

2. **镜像优化**
   - 使用多阶段构建减小镜像大小
   - 选择合适的基础镜像
   - 清理不必要的文件和依赖

3. **网络优化**
   - 使用内部网络减少延迟
   - 配置连接池和超时设置
   - 启用HTTP/2和压缩

## 📋 维护清单

### 日常维护
- [ ] 检查服务健康状态
- [ ] 监控资源使用情况
- [ ] 查看错误日志
- [ ] 验证备份完整性

### 周期维护
- [ ] 更新安全补丁
- [ ] 清理旧的镜像和容器
- [ ] 优化数据库性能
- [ ] 更新SSL证书

### 应急响应
- [ ] 服务故障恢复流程
- [ ] 数据恢复程序
- [ ] 安全事件处理
- [ ] 性能问题诊断

---

**注意**: 生产环境部署前请仔细检查所有配置文件，确保安全性和性能设置符合要求。
