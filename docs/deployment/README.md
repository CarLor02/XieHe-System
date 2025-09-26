# 部署运维文档

## 📋 概述

本目录包含医疗影像诊断系统的部署、运维、监控相关文档，涵盖开发、测试、生产环境的完整部署方案。

## 📁 文档结构

```
docs/deployment/
├── README.md                    # 部署文档总览
├── environment-setup.md         # 环境搭建指南
├── docker-deployment.md         # Docker部署指南
├── kubernetes-deployment.md     # Kubernetes部署指南
├── database-setup.md            # 数据库配置指南
├── nginx-configuration.md       # Nginx配置指南
├── ssl-certificate.md           # SSL证书配置
├── monitoring-setup.md          # 监控系统搭建
├── backup-strategy.md           # 备份策略
├── disaster-recovery.md         # 灾难恢复方案
├── performance-tuning.md        # 性能调优指南
├── troubleshooting.md           # 故障排查指南
├── maintenance.md               # 系统维护指南
├── scripts/                     # 部署脚本
│   ├── deploy.sh               # 部署脚本
│   ├── backup.sh               # 备份脚本
│   ├── restore.sh              # 恢复脚本
│   └── health-check.sh         # 健康检查脚本
└── configs/                     # 配置文件模板
    ├── nginx/                  # Nginx配置
    ├── docker/                 # Docker配置
    ├── k8s/                    # Kubernetes配置
    └── monitoring/             # 监控配置
```

## 🚀 快速部署

### 使用Docker Compose (推荐)

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd medical-imaging-system
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置数据库密码等
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **验证部署**
   ```bash
   curl http://localhost/health
   ```

### 手动部署

详细步骤请参考 [环境搭建指南](./environment-setup.md)

## 🏗️ 部署架构

### 生产环境架构
```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │    (Nginx)      │
                    └─────────┬───────┘
                              │
                    ┌─────────┴───────┐
                    │                 │
            ┌───────▼────────┐ ┌──────▼────────┐
            │  Frontend App  │ │  Backend API  │
            │   (Next.js)    │ │   (FastAPI)   │
            └────────────────┘ └───────┬───────┘
                                       │
                              ┌────────▼────────┐
                              │                 │
                    ┌─────────▼────────┐ ┌──────▼────────┐
                    │     MySQL        │ │     Redis     │
                    │   (Primary)      │ │    (Cache)    │
                    └──────────────────┘ └───────────────┘
```

## 🌍 环境配置

### 开发环境
- **目的**: 本地开发和调试
- **配置**: 单机部署，开启调试模式
- **数据库**: 本地MySQL实例
- **域名**: localhost:3000

### 测试环境
- **目的**: 功能测试和集成测试
- **配置**: 容器化部署
- **数据库**: 独立测试数据库
- **域名**: test.medical-system.com

### 生产环境
- **目的**: 正式服务用户
- **配置**: 高可用集群部署
- **数据库**: 主从复制，读写分离
- **域名**: medical-system.com

## 📦 容器化部署

### Docker镜像
- **前端镜像**: `medical-system/frontend:latest`
- **后端镜像**: `medical-system/backend:latest`
- **数据库镜像**: `mysql:8.0`
- **缓存镜像**: `redis:7-alpine`

### 服务编排
```yaml
version: '3.8'
services:
  frontend:
    image: medical-system/frontend:latest
    ports:
      - "3000:3000"
    depends_on:
      - backend
  
  backend:
    image: medical-system/backend:latest
    ports:
      - "8000:8000"
    depends_on:
      - mysql
      - redis
  
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

## ☸️ Kubernetes部署

### 集群要求
- **节点数量**: 最少3个节点
- **CPU**: 每节点最少4核
- **内存**: 每节点最少8GB
- **存储**: 支持动态存储卷

### 核心组件
- **Deployment**: 应用部署
- **Service**: 服务发现
- **Ingress**: 流量入口
- **ConfigMap**: 配置管理
- **Secret**: 敏感信息管理
- **PVC**: 持久化存储

## 🔍 监控告警

### 监控指标
- **系统指标**: CPU、内存、磁盘、网络
- **应用指标**: 响应时间、错误率、吞吐量
- **业务指标**: 用户活跃度、诊断成功率

### 告警规则
- **系统告警**: 资源使用率超过80%
- **应用告警**: 错误率超过5%
- **业务告警**: 诊断服务不可用

### 监控工具
- **Prometheus**: 指标收集
- **Grafana**: 可视化面板
- **AlertManager**: 告警管理
- **ELK Stack**: 日志分析

## 💾 备份策略

### 数据备份
- **数据库备份**: 每日全量备份 + 实时增量备份
- **文件备份**: 每周全量备份
- **配置备份**: 版本控制管理

### 备份存储
- **本地备份**: 保留7天
- **远程备份**: 保留30天
- **归档备份**: 保留1年

### 恢复测试
- **月度恢复测试**: 验证备份完整性
- **季度演练**: 完整灾难恢复演练

## 🔧 性能优化

### 数据库优化
- **索引优化**: 根据查询模式优化索引
- **查询优化**: 分析慢查询并优化
- **连接池**: 配置合适的连接池大小

### 应用优化
- **缓存策略**: Redis缓存热点数据
- **代码优化**: 异步处理、批量操作
- **资源优化**: 静态资源CDN加速

### 系统优化
- **内核参数**: 调优网络和文件系统参数
- **JVM调优**: 优化垃圾回收策略
- **负载均衡**: 配置合理的负载均衡策略

## 🚨 故障处理

### 常见故障
1. **服务无响应**: 检查进程状态和资源使用
2. **数据库连接失败**: 检查数据库状态和网络连接
3. **内存不足**: 检查内存使用和垃圾回收
4. **磁盘空间不足**: 清理日志和临时文件

### 应急响应
1. **故障发现**: 监控告警或用户反馈
2. **影响评估**: 评估故障影响范围
3. **快速恢复**: 执行应急恢复方案
4. **根因分析**: 分析故障根本原因
5. **改进措施**: 制定预防措施

## 📋 运维检查清单

### 日常检查
- [ ] 系统资源使用情况
- [ ] 应用服务状态
- [ ] 数据库性能指标
- [ ] 备份任务执行状态
- [ ] 安全日志审查

### 周度检查
- [ ] 系统补丁更新
- [ ] 性能趋势分析
- [ ] 容量规划评估
- [ ] 安全漏洞扫描

### 月度检查
- [ ] 备份恢复测试
- [ ] 灾难恢复演练
- [ ] 性能基准测试
- [ ] 安全审计报告

## 📞 技术支持

### 联系方式
- **运维团队**: ops@medical-system.com
- **技术支持**: support@medical-system.com
- **紧急联系**: +86-xxx-xxxx-xxxx

### 支持时间
- **工作日**: 9:00-18:00 (标准支持)
- **7x24**: 紧急故障支持
- **响应时间**: 严重故障15分钟内响应

## 📚 相关文档

- [环境搭建指南](./environment-setup.md)
- [Docker部署指南](./docker-deployment.md)
- [监控系统搭建](./monitoring-setup.md)
- [故障排查指南](./troubleshooting.md)
- [性能调优指南](./performance-tuning.md)

---

**注意**: 部署前请仔细阅读相关文档，确保环境配置正确。生产环境部署建议先在测试环境验证。
