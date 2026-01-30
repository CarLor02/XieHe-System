# 协和医院医疗影像诊断系统 - 操作手册

**版本**: 1.0.0
**更新日期**: 2026-01-07
**适用对象**: 系统管理员、医生、技术人员

---

## 目录

1. [系统概述](#1-系统概述)
2. [系统架构](#2-系统架构)
3. [环境准备](#3-环境准备)
4. [系统部署](#4-系统部署)
5. [系统配置](#5-系统配置)
6. [功能使用指南](#6-功能使用指南)
7. [数据库管理](#7-数据库管理)
8. [系统监控与维护](#8-系统监控与维护)
9. [故障排查](#9-故障排查)
10. [常见问题FAQ](#10-常见问题faq)

---

## 1. 系统概述

### 1.1 系统简介

协和医院医疗影像诊断系统是一套完整的医疗影像管理和AI辅助诊断平台，主要功能包括：

- **患者信息管理**: 患者档案、就诊记录、病史管理
- **医学影像管理**: DICOM影像上传、存储、查看、标注
- **AI辅助诊断**: 基于深度学习的自动诊断建议
- **诊断报告管理**: 报告生成、审核、发布、导出
- **系统监控**: 实时性能监控、告警、日志管理

### 1.2 系统特点

- **现代化技术栈**: Next.js 15 + React 19 + FastAPI + MySQL 8.0
- **容器化部署**: Docker + Docker Compose，一键部署
- **高性能**: Redis缓存、数据库优化、异步处理
- **安全可靠**: JWT认证、权限管理、数据加密
- **可扩展**: 模块化设计、微服务架构、API优先

### 1.3 系统用户角色

| 角色 | 权限 | 主要功能 |
|------|------|----------|
| **系统管理员** | 全部权限 | 用户管理、系统配置、监控维护 |
| **医生** | 诊断权限 | 患者管理、影像查看、报告编写 |
| **技师** | 影像权限 | 影像上传、质量控制 |
| **护士** | 基础权限 | 患者信息录入、预约管理 |

### 1.4 支持的影像模态

- **CT** (Computed Tomography) - 计算机断层扫描
- **MR** (Magnetic Resonance) - 磁共振成像
- **XR** (X-Ray) - X光摄影
- **US** (Ultrasound) - 超声检查
- **NM** (Nuclear Medicine) - 核医学
- **PT** (Positron Emission Tomography) - 正电子发射断层
- **MG** (Mammography) - 乳腺摄影
- **DX/CR/DR** - 数字放射摄影

---

## 2. 系统架构

### 2.1 整体架构

系统采用前后端分离架构，分为四层：

1. **前端层**: Next.js 15.5 + React 19，提供用户界面
2. **后端层**: FastAPI + Python 3.11，提供REST API服务
3. **数据库层**: MySQL 8.0 + Redis 6.x，数据存储和缓存
4. **部署层**: Docker + Docker Compose，容器化部署

### 2.2 服务端口说明

| 服务 | 开发端口 | 生产端口 | 说明 |
|------|----------|----------|------|
| 前端 (Next.js) | 3000 | 3030 | Web界面 |
| 后端 (FastAPI) | 8080 | 8080 | API服务 |
| MySQL | 3306 | 3306 | 数据库 |
| Redis | 6379 | 6380 | 缓存服务 |

### 2.3 技术栈

**前端技术**:
- Next.js 15.5.4 (React框架)
- React 19.0 (UI库)
- TypeScript 5.x (类型安全)
- Tailwind CSS v4 (样式框架)
- Redux Toolkit 2.9.0 (状态管理)
- Cornerstone.js 2.6.1 (DICOM影像查看)
- Chart.js 4.5.0 (数据可视化)

**后端技术**:
- FastAPI 0.104+ (Web框架)
- Python 3.11+ (编程语言)
- SQLAlchemy 2.0 (ORM框架)
- MySQL 8.0+ (主数据库)
- Redis 6.x+ (缓存)
- JWT (认证)

---

## 3. 环境准备

### 3.1 硬件要求

**最低配置**:
- CPU: 4核心
- 内存: 8GB RAM
- 硬盘: 100GB 可用空间
- 网络: 100Mbps

**推荐配置**:
- CPU: 8核心或以上
- 内存: 16GB RAM或以上
- 硬盘: 500GB SSD
- 网络: 1Gbps

### 3.2 软件要求

**操作系统**:
- Linux (Ubuntu 20.04+, CentOS 7+)
- Windows Server 2019+
- macOS 11+

**必需软件**:
- Docker 20.10+
- Docker Compose 2.0+
- Git 2.0+

### 3.3 安装Docker

**Ubuntu/Debian**:
```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install ca-certificates curl gnupg

# 添加Docker官方GPG密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

**Windows**:
1. 下载Docker Desktop: https://www.docker.com/products/docker-desktop
2. 运行安装程序
3. 重启计算机
4. 启动Docker Desktop

---

## 4. 系统部署

### 4.1 获取代码

```bash
# 克隆项目代码
git clone <repository-url> XieHe-System
cd XieHe-System

# 查看项目结构
ls -la
```

### 4.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**关键配置项**:
```bash
# MySQL 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=qweasd2025
DB_NAME=medical_imaging_system

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379/0

# JWT 认证配置
JWT_SECRET_KEY=dev_jwt_secret_key_2024
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 应用配置
ENVIRONMENT=production
DEBUG=false

# 前端配置
NEXT_PUBLIC_API_URL=http://your-server-ip:8080
NEXT_PUBLIC_WS_URL=ws://your-server-ip:8080
```

### 4.3 一键部署

```bash
# 构建并启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4.4 初始化数据库

```bash
# 进入后端容器
docker compose exec backend bash

# 运行数据库初始化脚本
python scripts/init_database.py

# 退出容器
exit
```

### 4.5 验证部署

**检查服务状态**:
```bash
# 查看所有容器
docker compose ps

# 应该看到以下服务运行中:
# - frontend (端口 3030)
# - backend (端口 8080)
# - mysql (端口 3306)
# - redis (端口 6380)
```

**访问系统**:
- 前端界面: http://your-server-ip:3030
- API文档: http://your-server-ip:8080/api/v1/docs
- 健康检查: http://your-server-ip:8080/health

**默认登录账号**:
- 管理员: admin / admin123
- 医生: doctor01 / doctor123

---

## 5. 系统配置

### 5.1 Docker Compose 配置

系统使用 `docker-compose.yml` 管理所有服务：

**服务列表**:
1. **redis**: Redis缓存服务
2. **mysql**: MySQL数据库服务
3. **backend**: FastAPI后端服务
4. **frontend**: Next.js前端服务

**常用命令**:
```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启特定服务
docker compose restart backend

# 查看服务日志
docker compose logs -f backend

# 进入容器
docker compose exec backend bash
```

### 5.2 数据库配置

**MySQL配置** (docker-compose.yml):
```yaml
mysql:
  image: mysql:8.0
  ports:
    - "3306:3306"
  environment:
    MYSQL_ROOT_PASSWORD: qweasd2025
    MYSQL_DATABASE: medical_imaging_system
  volumes:
    - mysql_data:/var/lib/mysql
```

**Redis配置**:
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6380:6379"
  volumes:
    - redis_data:/data
```

### 5.3 后端配置

**配置文件位置**: `backend/app/core/config.py`

**主要配置项**:
- 数据库连接
- Redis连接
- JWT密钥和过期时间
- CORS跨域设置
- 文件上传限制
- 日志级别

### 5.4 前端配置

**配置文件**: `frontend/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://your-server-ip:8080
NEXT_PUBLIC_WS_URL=ws://your-server-ip:8080
```

**Next.js配置**: `frontend/next.config.js`
- 图片优化
- 国际化
- 环境变量

---

## 6. 功能使用指南

### 6.1 用户登录

1. 访问系统首页: http://your-server-ip:3030
2. 点击"登录"按钮
3. 输入用户名和密码
4. 点击"登录"进入系统

**默认账号**:
- 管理员: `admin` / `admin123`
- 医生: `doctor01` / `doctor123`

### 6.2 患者管理

#### 6.2.1 添加患者

1. 进入"患者管理"页面
2. 点击"添加患者"按钮
3. 填写患者信息：
   - 基本信息：姓名、性别、出生日期
   - 联系方式：电话、邮箱、地址
   - 医疗信息：身份证号、医保号、血型
4. 点击"保存"完成添加

#### 6.2.2 查询患者

- **快速搜索**: 在搜索框输入患者姓名或编号
- **高级筛选**: 按性别、年龄、就诊日期等条件筛选
- **查看详情**: 点击患者卡片查看完整信息

#### 6.2.3 编辑患者信息

1. 在患者列表中找到目标患者
2. 点击"编辑"按钮
3. 修改需���更新的信息
4. 点击"保存"确认修改

### 6.3 影像管理

#### 6.3.1 上传影像

1. 进入"影像管理"页面
2. 点击"上传影像"按钮
3. 选择患者
4. 选择影像模态（CT/MR/XR等）
5. 上传DICOM文件
6. 填写检查描述
7. 点击"提交"完成上传

#### 6.3.2 查看影像

1. 在影像列表中选择检查记录
2. 点击"查看影像"进入影像查看器
3. 使用工具栏进行操作：
   - **缩放**: 鼠标滚轮或缩放按钮
   - **平移**: 鼠标右键拖动
   - **窗宽窗位**: 鼠标左键拖动
   - **测量**: 选择测量工具
   - **标注**: 添加文字或箭头标注

#### 6.3.3 影像对比

1. 进入"影像对比"页面
2. 选择两个或多个检查记录
3. 系统自动并排显示影像
4. 支持同步缩放和滚动

### 6.4 AI辅助诊断

#### 6.4.1 运行AI诊断

1. 在影像查看器中打开影像
2. 点击"AI诊断"按钮
3. 选择诊断模型（肺结节检测、骨折识别等）
4. 点击"开始诊断"
5. 等待AI分析���成
6. 查看诊断结果和置信度

#### 6.4.2 查看AI结果

- **检测区域**: 系统会在影像上标注检测到的异常区域
- **诊断建议**: 显示AI给出的诊断建议
- **置信度**: 显示每个检测结果的置信度分数
- **导出报告**: 可将AI诊断结果导出为PDF

### 6.5 诊断报告管理

#### 6.5.1 创建报告

1. 在检查记录中点击"创建报告"
2. 选择报告模板（可选）
3. 填写报告内容：
   - **检查所见**: 描述影像表现
   - **诊断印象**: 给出诊断结论
   - **建议**: 提供治疗或复查建议
4. 点击"保存草稿"或"提交审核"

#### 6.5.2 审核报告

1. 进入"报告管理"页面
2. 筛选"待审核"状态的报告
3. 点击报告查看详情
4. 审核报告内容
5. 选择"批准"或"退回修改"

#### 6.5.3 导出报告

1. 打开已批准的报告
2. 点击"导出"按钮
3. 选择导出格式（PDF/Word）
4. 下载报告文件

---

## 7. 数据库管理

### 7.1 数据库结构

系统使用MySQL 8.0作为主数据库，包含24个核心业务表：

**用户管理模块**:
- `users` - 用户表
- `roles` - 角色表
- `permissions` - 权限表
- `departments` - 部门表
- `user_roles` - 用户角色关联表
- `role_permissions` - 角色权限关联表

**患者管理模块**:
- `patients` - 患者表
- `patient_visits` - 就诊记录表
- `patient_allergies` - 过敏史表
- `patient_medical_history` - 病史表

**影像管理模块**:
- `studies` - 检查表
- `series` - 序列表
- `instances` - 实例表
- `image_annotations` - 标注表
- `ai_tasks` - AI任务表

**报告管理模块**:
- `diagnostic_reports` - 诊断报告表
- `report_templates` - 报告模板表
- `report_findings` - 报告发现表
- `report_revisions` - 报告修订表

### 7.2 数据库连接

**使用Docker连接**:
```bash
# 进入MySQL容器
docker compose exec mysql bash

# 连接数据库
mysql -u root -p
# 密码: qweasd2025

# 选择数据库
USE medical_imaging_system;

# 查看所有表
SHOW TABLES;
```

**使用外部工具连接**:
- 主机: localhost 或 服务器IP
- 端口: 3306
- 用户名: root
- 密码: qweasd2025
- 数据库: medical_imaging_system

### 7.3 数据库备份

**手动备份**:
```bash
# 备份整个数据库
docker compose exec mysql mysqldump -u root -pqweasd2025 medical_imaging_system > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份特定表
docker compose exec mysql mysqldump -u root -pqweasd2025 medical_imaging_system patients studies > backup_partial.sql
```

**自动备份脚本**:
```bash
#!/bin/bash
# 创建备份目录
mkdir -p backups

# 备份数据库
docker compose exec mysql mysqldump -u root -pqweasd2025 medical_imaging_system > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 保留最近7天的备份
find backups/ -name "backup_*.sql" -mtime +7 -delete
```

### 7.4 数据库恢复

```bash
# 从备份文件恢复
docker compose exec -T mysql mysql -u root -pqweasd2025 medical_imaging_system < backup_20260107_120000.sql

# 验证恢复
docker compose exec mysql mysql -u root -pqweasd2025 -e "SELECT COUNT(*) FROM medical_imaging_system.patients;"
```

---

## 8. 系统监控与维护

### 8.1 服务状态监控

**查看所有服务状态**:
```bash
# 查看运行中的容器
docker compose ps

# 查看容器资源使用情况
docker stats

# 查看特定服务状态
docker compose ps backend
```

**健康检查**:
```bash
# 后端健康检查
curl http://localhost:8080/health

# 前端健康检查
curl http://localhost:3030

# MySQL连接测试
docker compose exec mysql mysqladmin -u root -pqweasd2025 ping

# Redis连接测试
docker compose exec redis redis-cli ping
```

### 8.2 日志管理

**查看实时日志**:
```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend

# 查看最近100行日志
docker compose logs --tail=100 backend

# 查看特定时间段日志
docker compose logs --since="2026-01-07T10:00:00" backend
```

**日志文件位置**:
- 后端日志: `backend/logs/`
- MySQL日志: `mysql_logs/`
- Redis日志: `redis_logs/`

### 8.3 性能监控

**系统资源监控**:
```bash
# 查看容器资源使用
docker stats --no-stream

# 查看磁盘使用
df -h

# 查看Docker磁盘使用
docker system df
```

**数据库性能监控**:
```bash
# 查看MySQL进程列表
docker compose exec mysql mysql -u root -pqweasd2025 -e "SHOW PROCESSLIST;"

# 查看慢查询
docker compose exec mysql mysql -u root -pqweasd2025 -e "SHOW VARIABLES LIKE 'slow_query%';"
```

### 8.4 系统维护

**定期维护任务**:

1. **清理Docker资源**:
```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的卷
docker volume prune

# 清理所有未使用资源
docker system prune -a
```

2. **数据库优化**:
```bash
# 优化所有表
docker compose exec mysql mysqlcheck -u root -pqweasd2025 --optimize --all-databases

# 分析表
docker compose exec mysql mysqlcheck -u root -pqweasd2025 --analyze --all-databases
```

3. **日志轮转**:
```bash
# 清理旧日志（保留最近30天）
find backend/logs/ -name "*.log" -mtime +30 -delete
```

---

## 9. 故障排查

### 9.1 常见问题

#### 9.1.1 服务无法启动

**问题**: Docker容器启动失败

**排查步骤**:
```bash
# 1. 查看容器状态
docker compose ps

# 2. 查看错误日志
docker compose logs backend

# 3. 检查端口占用
netstat -tulpn | grep 8080

# 4. 检查配置文件
cat .env
```

**解决方案**:
- 确保端口未被占用
- 检查环境变量配置是否正确
- 确保Docker服务正常运行
- 重启服务: `docker compose restart`

#### 9.1.2 数据库连接失败

**问题**: 后端无法连接MySQL

**排查步骤**:
```bash
# 1. 检查MySQL容器状态
docker compose ps mysql

# 2. 测试数据库连接
docker compose exec mysql mysqladmin -u root -pqweasd2025 ping

# 3. 查看MySQL日志
docker compose logs mysql
```

**解决方案**:
- 确保MySQL容器正常运行
- 检查数据库密码是否正确
- 等待MySQL完全启动（约30秒）
- 重启MySQL: `docker compose restart mysql`

#### 9.1.3 Redis连接失败

**问题**: 后端无法连接Redis

**排查步骤**:
```bash
# 1. 检查Redis容器状态
docker compose ps redis

# 2. 测试Redis连接
docker compose exec redis redis-cli ping

# 3. 查看Redis日志
docker compose logs redis
```

**解决方案**:
- 确保Redis容器正常运行
- 检查Redis配置是否正确
- 重启Redis: `docker compose restart redis`

#### 9.1.4 前端无法访问后端API

**问题**: 前端调用API失败，出现CORS错误

**排查步骤**:
```bash
# 1. 检查后端服务状态
curl http://localhost:8080/health

# 2. 检查CORS配置
docker compose exec backend cat app/core/config.py | grep CORS

# 3. 查看后端日志
docker compose logs backend | grep CORS
```

**解决方案**:
- 检查 `.env` 文件中的 `CORS_ORIGINS` 配置
- 确保前端URL在CORS白名单中
- 重启后端服务: `docker compose restart backend`

### 9.2 性能问题

#### 9.2.1 系统响应慢

**排查步骤**:
```bash
# 1. 检查容器资源使用
docker stats

# 2. 检查数据库性能
docker compose exec mysql mysql -u root -pqweasd2025 -e "SHOW PROCESSLIST;"

# 3. 检查Redis缓存
docker compose exec redis redis-cli info stats
```

**解决方案**:
- 增加容器资源限制
- 优化数据库查询
- 清理Redis缓存
- 添加数据库索引

#### 9.2.2 磁盘空间不足

**排查步骤**:
```bash
# 1. 检查磁盘使用
df -h

# 2. 检查Docker磁盘使用
docker system df

# 3. 查找大文件
du -sh /var/lib/docker/*
```

**解决方案**:
```bash
# 清理Docker资源
docker system prune -a

# 清理旧日志
find backend/logs/ -name "*.log" -mtime +7 -delete

# 清理旧备份
find backups/ -name "*.sql" -mtime +30 -delete
```

---

## 10. 常见问题FAQ

### 10.1 部署相关

**Q: 如何修改服务端口？**

A: 编辑 `docker-compose.yml` 文件，修改对应服务的端口映射：
```yaml
frontend:
  ports:
    - "3030:3000"  # 修改左侧端口号
```

**Q: 如何更新系统？**

A: 执行以下命令：
```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker compose build

# 3. 重启服务
docker compose up -d
```

**Q: 如何重置数据库？**

A: 执行以下命令：
```bash
# 1. 停止所有服务
docker compose down

# 2. 删除数据库卷
docker volume rm xiehe-system_mysql_data

# 3. 重新启动服务
docker compose up -d

# 4. 重新初始化数据库
docker compose exec backend python scripts/init_database.py
```

---