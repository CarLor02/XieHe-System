# 🏥 医疗影像诊断系统 (Medical Imaging Diagnosis System)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://mysql.com)

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
├── 📁 frontend/          # 前端应用 (Next.js)
│   ├── app/             # 页面和路由
│   ├── components/      # React组件
│   ├── lib/            # 工具库
│   ├── hooks/          # 自定义Hooks
│   ├── types/          # TypeScript类型定义
│   └── utils/          # 工具函数
├── 📁 backend/           # 后端服务 (FastAPI)
│   ├── app/            # 应用主目录
│   ├── models/         # 数据模型
│   ├── api/            # API路由
│   ├── core/           # 核心配置
│   └── tests/          # 后端测试
├── 📁 docs/              # 项目文档
│   ├── api/            # API文档
│   ├── architecture/   # 架构文档
│   ├── deployment/     # 部署文档
│   └── user-guide/     # 用户手册
├── 📁 tests/             # 测试文件
│   ├── unit/           # 单元测试
│   ├── integration/    # 集成测试
│   └── e2e/            # 端到端测试
├── 📁 docker/            # Docker配置
│   ├── frontend/       # 前端容器配置
│   ├── backend/        # 后端容器配置
│   └── nginx/          # Nginx配置
├── 📁 scripts/           # 项目脚本
│   ├── setup/          # 环境配置脚本
│   ├── deploy/         # 部署脚本
│   └── utils/          # 工具脚本
└── 📄 README.md          # 项目说明
```

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.x 或更高版本
- **Python**: 3.9 或更高版本
- **MySQL**: 8.0 或更高版本
- **Redis**: 6.x 或更高版本
- **Docker**: 20.10 或更高版本 (可选)

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd XieHe-System
   ```

2. **配置 Git 环境**

   ```bash
   make setup-git
   ```

3. **安装项目依赖**

   ```bash
   # 安装根目录依赖（包含项目管理工具）
   npm install

   # 自动安装前端和后端依赖
   npm run setup
   ```

4. **配置环境变量**

   ```bash
   # 复制环境变量模板
   cp .env.example .env
   cp frontend/.env.local.example frontend/.env.local

   # 编辑环境变量
   vim .env
   vim frontend/.env.local
   ```

5. **启动开发服务器**

   ```bash
   # 同时启动前端和后端开发服务器
   npm run dev

   # 或者分别启动
   npm run dev:frontend  # 前端 (端口 3000)
   npm run dev:backend   # 后端 (端口 8000)
   ```

6. **数据库配置**

   ```bash
   # 配置MySQL数据库
   mysql -u root -p < scripts/setup/init_database.sql

   # 启动Redis
   redis-server
   ```

### Docker 部署

```bash
# 构建和启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 🛠️ 开发指南

### 代码规范

- **Python**: 遵循 PEP 8，使用 Black、isort、flake8
- **TypeScript**: 使用 ESLint、Prettier
- **Git**: 遵循 Conventional Commits 规范

详细规范请参考：[编码规范文档](docs/coding-standards.md)

### 提交规范

```bash
# 提交格式
<type>(<scope>): <subject>

# 示例
feat(auth): 添加JWT令牌刷新功能
fix(patient): 修复患者搜索分页问题
docs(api): 更新患者管理API文档
```

详细规范请参考：[Git 工作流规范](docs/git-workflow.md)

### 开发工具

```bash
# 查看项目进度
make summary

# 生成进度报告
make report

# 生成项目仪表板
make dashboard

# 查看帮助
make help
```

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
npm test

# 后端测试
cd backend
pytest

# 端到端测试
npm run test:e2e
```

### 测试覆盖率

- 单元测试覆盖率目标: ≥ 80%
- 集成测试覆盖率目标: ≥ 70%
- 端到端测试覆盖率目标: ≥ 60%

## 📊 项目状态

- **开发进度**: 2.4% (4/168 个任务完成)
- **当前阶段**: 第一阶段 - 项目规范与架构设计
- **预计完成**: 2025-12-24

查看详细进度：[项目进度文档](docs/project-progress.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系我们

- **项目负责人**: [姓名] - [邮箱]
- **技术支持**: [support@example.com]
- **问题反馈**: [GitHub Issues](https://github.com/your-repo/issues)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户。

---

**注意**: 这是一个医疗相关的系统，请确保在开发和部署过程中遵循相关的医疗数据安全和隐私保护法规。
