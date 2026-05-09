# 🏥 医疗影像诊断系统 (Medical Imaging Diagnosis System)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.3-black.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://mysql.com)
[![Redis](https://img.shields.io/badge/Redis-6.x+-red.svg)](https://redis.io)

一个基于 AI 的医疗影像诊断系统，支持 DICOM 影像处理、智能诊断、报告生成等功能。

## 📋 项目概述

本系统是一个完整的医疗影像诊断解决方案，包含：

- 🖼️ **影像管理**: DICOM 格式影像的上传、存储、查看
- 🤖 **AI 诊断**: 集成深度学习模型进行智能诊断
- 📊 **报告生成**: 自动生成和编辑诊断报告
- 👥 **用户管理**: 多角色权限管理（医生、技师、管理员）
- 📈 **数据统计**: 诊断数据分析和统计报表

## 🏗️ 系统架构

```
协和医疗影像诊断系统
├── 前端 (Next.js 15.5 + React 19 + TypeScript)
│   ├── 用户界面 (Tailwind CSS v4)
│   ├── 影像查看器 (Cornerstone.js)
│   ├── 数据可视化 (Chart.js + Recharts)
│   └── 状态管理 (Redux Toolkit + Zustand)
├── 后端 (Python 3.11 + FastAPI)
│   ├── REST API 服务
│   ├── 业务逻辑层
│   ├── AI 模型集成
│   └── 实时数据推送 (WebSocket)
├── 数据库层
│   ├── MySQL 8.0+ (主数据库，24个业务表)
│   └── Redis 6.x+ (缓存 + 会话存储)
├── 部署层 (Docker + Nginx)
│   ├── 容器化部署
│   ├── 反向代理
│   └── 负载均衡
└── 安全层
    ├── JWT + OAuth2 认证
    ├── bcrypt 密码加密
    └── CORS 跨域配置
```

### 数据库设计

系统包含 **24 个核心数据表**，分为 5 个功能模块：

**用户管理模块** (6个表):
- users, roles, permissions, departments, user_roles, role_permissions

**患者管理模块** (4个表):
- patients, patient_visits, patient_allergies, patient_medical_history

**影像管理模块** (5个表):
- studies, series, instances, image_annotations, ai_tasks

**报告管理模块** (4个表):
- diagnostic_reports, report_templates, report_findings, report_revisions

**系统管理模块** (5个表):
- system_configs, system_logs, system_monitors, system_alerts, notifications

## 📁 项目结构

```
XieHe-System/
├── 📁 frontend/          # 前端应用 (Next.js 15.3 + React 19)
│   ├── app/             # 页面和路由 (App Router)
│   ├── components/      # React组件库
│   ├── hooks/          # 自定义React Hooks
│   ├── services/       # API服务层
│   ├── store/          # 状态管理 (Redux/Zustand)
│   ├── styles/         # 样式文件 (Tailwind CSS)
│   ├── types/          # TypeScript类型定义
│   └── tests/          # 前端测试
├── 📁 backend/           # 后端服务 (Python FastAPI)
│   ├── app/            # 应用主目录
│   │   ├── api/        # API路由
│   │   ├── core/       # 核心配置和工具
│   │   ├── db/         # 数据库配置
│   │   ├── schemas/    # Pydantic数据模型
│   │   ├── services/   # 业务逻辑服务
│   │   └── utils/      # 工具函数
│   ├── scripts/        # 数据库脚本
│   └── tests/          # 后端测试
├── 📁 docs/              # 项目文档
│   ├── api/            # API接口文档
│   ├── architecture/   # 系统架构文档
│   ├── deployment/     # 部署运维文档
│   └── user-guide/     # 用户使用手册
├── 📁 infrastructure/    # 部署基础设施配置
│   ├── docker/         # Compose 文件和容器启动脚本
│   ├── mysql/          # MySQL配置
│   ├── nginx/          # Nginx配置归档
│   └── redis/          # Redis配置
├── 📁 dotenv/            # 按服务域拆分的环境变量模板
├── 📁 scripts/           # 项目管理脚本
│   ├── backup_database.sh    # 数据库备份
│   ├── deploy.sh            # 部署脚本
│   └── docker_start_all.sh  # Docker启动脚本
├── 📁 backups/           # 数据备份目录
├── 📄 Makefile          # 项目管理命令
└── 📄 README.md          # 项目说明文档
```

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0+ (推荐 18.x LTS)
- **Python**: 3.11+ (推荐使用 Conda 环境管理)
- **MySQL**: 8.0+ (生产环境必需)
- **Redis**: 6.x+ (生产环境必需)
- **Docker**: 20.10+ (可选，推荐使用Docker部署)
- **Git**: 2.x+ (版本控制)

### 默认测试账号

系统提供以下测试账号用于开发和测试：

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 系统管理员 | `admin` 或 `admin@xiehe.com` | `admin123` | 用户管理、患者管理、系统管理 |
| 医生 | `doctor01` 或 `doctor01@xiehe.com` | `doctor123` | 患者管理、影像查看 |

### 安装步骤

#### 方式一：标准启动（推荐）

标准启动方式适合开发和测试环境。

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd XieHe-System
   ```

2. **安装前端依赖**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **安装后端依赖**
   ```bash
   cd backend
   # 推荐使用 conda 环境
   conda create -n xiehe python=3.11
   conda activate xiehe
   pip install -r requirements.txt
   cd ..
   ```

4. **配置数据库**
   ```bash
   # 启动 MySQL 和 Redis（使用 Docker）
   docker compose up -d mysql redis

   # 或者使用本地安装的 MySQL 和 Redis
   # 确保 MySQL 运行在 3307 端口，Redis 运行在 6380 端口
   ```

5. **初始化数据库**
   ```bashcd
   cd backend
   conda activate xiehe
   python scripts/init_database.py
   cd ..
   ```

6. **启动服务**
   ```bash
   # 启动后端
   cd backend
   conda activate xiehe
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

   # 新开终端，启动前端
   cd frontend
   npm run dev
   ```

7. **访问应用**
   - 前端应用: http://localhost:3000
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/api/v1/docs
   - 健康检查: http://localhost:8000/health

#### 方式二：Docker 一键部署（推荐生产环境）

使用 Docker Compose 一键启动所有服务，包括 MySQL 数据库自动初始化。

**📖 详细部署指南**: 查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

1. **标准部署**
   ```bash
   # 一键部署所有服务
   ./deploy.sh
   ```

2. **安全部署（推荐生产环境）**
   ```bash
   # 包含恶意软件检查的安全部署
   ./scripts/secure_deploy.sh
   ```

**部署脚本功能:**
- ✅ 自动环境检查（Docker、磁盘空间）
- ✅ 代码拉取和服务备份
- ✅ Docker 镜像构建
- ✅ **MySQL 数据库自动初始化**（首次部署自动创建表和测试数据）
- ✅ 服务启动和健康检查
- ✅ 安全扫描（secure_deploy.sh）

**访问地址:**
   - 前端应用: http://your-server-ip:3030
   - 后端API: http://your-server-ip:8080
   - API文档: http://your-server-ip:8080/docs
   - MySQL: localhost:3307
   - Redis: localhost:6380

**停止服务:**
   ```bash
   docker compose down
   ```

**查看日志:**
   ```bash
   docker compose logs -f
   ```

### 常用命令

```bash
# 查看所有可用命令
make help

# 快速启动（Docker 模式）
make start

# 开发环境启动
make dev

# 停止所有服务
make stop

# 查看服务状态
make status

# 查看日志
make logs

# 代码格式化
make format

# 运行测试
make test

# 清理环境
make clean
```

### 故障排除

#### 1. 后端启动问题

**问题**: `ModuleNotFoundError: No module named 'app'`

**解决**:
```bash
# 确保在 backend 目录下运行
cd backend
pwd  # 确认当前目录

# 使用正确的启动方式
uvicorn app.main:app --reload
# 而不是: python app/main.py
```

**问题**: 端口 8000 已被占用

**解决**:
```bash
# Windows
netstat -ano | findstr "8000"
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8000
kill -9 <PID>

# 或使用其他端口
uvicorn app.main:app --reload --port 8001
```

#### 2. 数据库连接问题

**问题**: 数据库连接失败

**解决**:
```bash
# 检查 dotenv 文件配置
ls dotenv/.env.*

# 测试数据库连接
cd backend
python scripts/test_database.py

# 检查数据库服务是否运行
mysql -h 115.190.121.59 -u root -p
```

#### 3. 登录/注册问题

**问题**: 登录时报错"用户名或密码错误"

**解决**: 使用默认测试账号
- 管理员: `admin` / `admin123`
- 医生: `doctor01` / `doctor123`

**问题**: 注册失败

**解决**: 确保数据库已正确初始化
```bash
cd backend
python scripts/init_database.py
```

#### 4. 前端样式问题

**问题**: 前端页面没有样式

**解决**:
```bash
cd frontend
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 检查 Tailwind CSS 配置
npm run build
```

#### 5. CORS 跨域问题

**解决**: 已在后端自动配置，确保：
- 前端运行在 http://localhost:3000
- 后端运行在 http://localhost:8000
- 检查浏览器控制台错误信息

## 🛠️ 开发指南

### 技术栈详情

#### 前端技术栈
- **框架**: Next.js 15.5.4 (App Router)
- **UI库**: React 19.0 + TypeScript 5.x
- **样式**: Tailwind CSS v4.1.14 + PostCSS
- **状态管理**: Redux Toolkit + Zustand
- **数据获取**: TanStack Query + SWR
- **图表**: Chart.js + Recharts
- **医学影像**: Cornerstone.js + DICOM.js
- **测试**: Jest + Testing Library + Cypress
- **构建工具**: Webpack 5 + Turbopack

#### 后端技术栈
- **框架**: FastAPI 0.104+ (Python 3.9+)
- **数据库**: MySQL 8.0+ + SQLAlchemy 2.0
- **缓存**: Redis 6.x+ + aioredis
- **认证**: JWT + OAuth2 + bcrypt
- **文件处理**: DICOM + Pillow + NumPy
- **API文档**: OpenAPI 3.0 + Swagger UI
- **测试**: pytest + httpx
- **ASGI服务器**: Uvicorn + Gunicorn

#### 部署技术栈
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **进程管理**: Gunicorn + Uvicorn
- **监控**: 自定义监控服务

### 代码规范

- **Python**: PEP 8 + Black + isort + flake8
- **TypeScript**: ESLint + Prettier + 严格类型检查
- **Git**: Conventional Commits 规范
- **API**: RESTful 设计 + OpenAPI 规范

详细规范请参考：[编码规范文档](docs/coding-standards.md)

## 📚 文档

- [📖 项目文档总览](docs/README.md)
- [🏗️ 系统架构设计](docs/architecture/)
- [🔌 API 接口文档](docs/api/)
- [📋 用户使用手册](docs/user-guide/)
- [🚀 部署运维文档](docs/deployment/)

## 🧪 测试

### 运行测试

```bash
# 前端测试
cd frontend
npm run test              # Jest单元测试
npm run test:watch        # 监听模式
npm run test:coverage     # 覆盖率报告

# 后端自动化测试
cd backend
pytest                    # 运行所有测试
pytest -v                 # 详细输出
pytest --cov=app          # 覆盖率报告
pytest tests/test_auth.py # 运行特定测试

# 后端手动测试（需要后端服务运行）
cd backend
python tests/manual/test_auth_manual.py           # 所有认证测试
python tests/manual/test_auth_manual.py login     # 只测试登录
python tests/manual/test_auth_manual.py register  # 只测试注册
python tests/manual/test_auth_manual.py full      # 完整流程

# 数据库工具
cd backend
python tests/db_tools/check_users.py                      # 查看用户列表
python tests/db_tools/check_table_structure.py            # 查看表结构
python tests/db_tools/check_table_structure.py patients   # 查看指定表
python tests/db_tools/recreate_database.py                # 重建数据库

# 端到端测试
npm run test:e2e          # Cypress E2E测试
npm run test:e2e:open     # 打开Cypress界面
```

### 测试结构

```
backend/tests/
├── README.md                    # 测试文档
├── unit/                        # 单元测试
│   └── test_*.py
├── integration/                 # 集成测试
│   └── test_*.py
├── manual/                      # 手动测试工具
│   └── test_auth_manual.py     # 认证功能手动测试
├── db_tools/                    # 数据库工具
│   ├── check_users.py          # 用户检查
│   ├── check_table_structure.py # 表结构检查
│   └── recreate_database.py    # 数据库重建
├── fixtures/                    # 测试数据夹具
│   └── patient_data.py         # 测试患者数据
└── test_*.py                    # 自动化测试

frontend/tests/
├── unit.test.tsx               # 单元测试
└── integration.test.tsx        # 集成测试
```

## 📊 项目特性

### 核心功能
- ✅ **用户认证**: JWT + OAuth2 多角色权限管理
- ✅ **影像管理**: DICOM格式支持，影像上传、存储、查看
- ✅ **智能诊断**: AI模型集成，自动诊断建议
- ✅ **报告生成**: 可视化报告，PDF导出
- ✅ **数据统计**: 实时仪表板，统计分析
- ✅ **系统监控**: 性能监控，日志管理

### 技术亮点
- 🚀 **高性能**: Redis缓存 + 数据库优化
- 🔒 **安全性**: 多层安全防护 + 数据加密
- 📱 **响应式**: 移动端适配 + PWA支持
- 🐳 **容器化**: Docker一键部署
- 📈 **可扩展**: 微服务架构设计
- 🔍 **可观测**: 完整的监控和日志系统

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持与反馈

- **问题反馈**: [GitHub Issues](https://github.com/your-org/medical-imaging-system/issues)
- **功能建议**: [GitHub Discussions](https://github.com/your-org/medical-imaging-system/discussions)
- **文档问题**: 请提交 Pull Request 或 Issue

## 🤝 参与贡献

我们欢迎任何形式的贡献！请查看 [贡献指南](docs/CONTRIBUTING.md) 了解详情。

### 快速贡献步骤
1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'feat: add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 查看 LICENSE 文件了解详情。

## ⚠️ 重要声明

**医疗数据安全**: 本系统涉及医疗数据处理，请确保：
- 遵循 HIPAA、GDPR 等相关法规
- 实施适当的数据加密和访问控制
- 定期进行安全审计和漏洞扫描
- 建立完善的数据备份和恢复机制

**免责声明**: 本系统仅供学习和研究使用，不应直接用于临床诊断。任何医疗决策都应由合格的医疗专业人员做出。
