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
医疗影像诊断系统
├── 前端 (Next.js + TypeScript)
│   ├── 用户界面
│   ├── 影像查看器
│   └── 数据可视化
├── 后端 (Python + FastAPI)
│   ├── API服务
│   ├── 业务逻辑
│   └── AI模型集成
├── 数据库 (MySQL + Redis)
│   ├── 业务数据存储
│   └── 缓存服务
└── 部署 (Docker + Nginx)
    ├── 容器化部署
    └── 负载均衡
```

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
├── 📁 docker/            # Docker容器配置
│   ├── mysql/          # MySQL配置
│   ├── nginx/          # Nginx配置
│   ├── redis/          # Redis配置
│   └── monitoring/     # 监控配置
├── 📁 nginx/             # Nginx反向代理配置
├── 📁 scripts/           # 项目管理脚本
│   ├── backup_database.sh    # 数据库备份
│   ├── deploy.sh            # 部署脚本
│   └── docker_start_all.sh  # Docker启动脚本
├── 📁 backups/           # 数据备份目录
├── 📄 docker-compose.yml # Docker编排配置
├── 📄 Makefile          # 项目管理命令
└── 📄 README.md          # 项目说明文档
```

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0+ (推荐 18.x LTS)
- **Python**: 3.9+ (推荐 3.11+)
- **MySQL**: 8.0+ (可选，支持外部数据库)
- **Redis**: 6.x+ (可选，支持外部缓存)
- **Docker**: 20.10+ (推荐使用Docker部署)
- **Git**: 2.x+ (版本控制)

### 安装步骤

#### 方式一：本地开发环境（推荐）

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
   python3 -m venv venv
   source venv/bin/activate  # Linux/Mac
   # 或 venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   cd ..
   ```

4. **配置环境变量**
   ```bash
   # 后端配置（如果使用外部数据库）
   cd backend
   cp .env.example .env
   # 编辑 .env 文件，配置数据库连接信息
   vim .env
   ```

5. **启动服务**
   ```bash
   # 启动后端（演示模式，内置模拟数据）
   cd backend
   source venv/bin/activate
   python start_demo.py

   # 新开终端，启动前端
   cd frontend
   npm run dev
   ```

6. **访问应用**
   - 前端应用: http://localhost:3000
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs

#### 方式二：使用外部数据库

如果您已有 MySQL 和 Redis 服务器：

1. **配置数据库连接**
   ```bash
   cd backend
   # 编辑 .env 文件
   DB_HOST=your-mysql-host
   DB_PORT=3306
   DB_USER=your-username
   DB_PASSWORD=your-password
   DB_NAME=medical_imaging_system

   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   ```

2. **启动完整版后端**
   ```bash
   cd backend
   source venv/bin/activate
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

#### 方式三：Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 常用命令

```bash
# 查看所有可用命令
make help

# 快速启动（演示模式）
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

#### 前端样式问题
如果前端页面没有样式，请检查：
```bash
# 检查 Tailwind CSS 配置
cd frontend
npm run build  # 查看是否有编译错误

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

#### 后端 API 404 错误
如果遇到 API 404 错误：
```bash
# 使用演示模式（推荐开发阶段）
cd backend
python start_demo.py

# 或检查完整版配置
python -m uvicorn app.main:app --reload
```

#### CORS 跨域问题
前后端分离架构需要 CORS 配置，已在后端自动配置。如遇问题：
- 确保前端运行在 http://localhost:3000
- 确保后端运行在 http://localhost:8000
- 检查浏览器控制台是否有 CORS 错误

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
npm run test:frontend          # Jest单元测试
npm run test:frontend:watch    # 监听模式
npm run test:frontend:coverage # 覆盖率报告

# 后端测试
npm run test:backend          # pytest测试套件
cd backend && pytest -v      # 详细输出
cd backend && pytest --cov   # 覆盖率报告

# 端到端测试
npm run test:e2e             # Cypress E2E测试
npm run test:e2e:open        # 打开Cypress界面

# 所有测试
npm test                     # 运行所有测试
```

### 测试结构

```
tests/
├── frontend/tests/          # 前端测试
│   ├── unit.test.tsx       # 单元测试
│   └── integration.test.tsx # 集成测试
├── backend/tests/          # 后端测试
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   └── fixtures/          # 测试数据
└── e2e/                   # 端到端测试 (Cypress)
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
