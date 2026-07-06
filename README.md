# 🏥 医疗影像诊断系统 (Medical Imaging Diagnosis System)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://mysql.com)

面向脊柱 X 光片的 AI 辅助分析系统，支持正位/侧位影像上传（MinIO 对象存储）、AI 自动测量、手动标注、报告生成等功能。

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
│   ├── 影像查看器 (Cornerstone.js + DICOM 解码)
│   ├── 标注画布 (Fabric.js + Konva)
│   ├── 数据可视化 (Chart.js + Recharts)
│   └── 状态管理 (Redux Toolkit + Zustand + TanStack Query)
├── 后端 (Python 3.12 + FastAPI)
│   ├── REST API 服务
│   ├── 对象存储网关 (调用 storage-service)
│   └── AI 推理代理 (调用 ap / lat 服务)
├── storage-service (Go)          # MinIO 访问中间层
│   └── MinIO                     # 影像文件对象存储
├── AI 推理服务 (Python + YOLO)
│   ├── ap (正位, :8001)   # Cobb 角等脊柱正位指标
│   └── lat (侧位, :8002)      # SVA/PI 等脊柱侧位指标
├── communication (可选)           # 扫描机本地 DICOM 文件索引服务
├── mobile (KMP)                   # Android + iOS 移动端
├── 数据库层
│   └── MySQL 8.0+                # 主数据库
└── 安全层
    ├── JWT + OAuth2 认证
    ├── bcrypt 密码加密
    └── CORS 跨域配置
```

### 数据库设计

系统使用 Alembic 管理迁移（当前 4 个版本，0001→0004）。活跃核心表：

| 模块 | 核心表 |
|---|---|
| 用户 | `users`, `roles`, `permissions`, `departments`, `user_roles`, `role_permissions` |
| 患者 | `patients`, `patient_visits` |
| 影像 | `image_files`（含 `storage_bucket`/`object_key`）, `image_annotations`, `ai_tasks` |
| 报告 | `diagnostic_reports`, `report_templates`, `report_findings`, `report_revisions` |
| 系统 | `system_configs`, `system_logs`, `notifications` |

> `studies` / `series` / `instances` 已废弃，仅保留向后兼容。新功能使用 `image_files`。

## 📁 项目结构

```
XieHe-System/
├── 📁 frontend/          # Web 前端 (Next.js 15.5 + React 19 + TypeScript)
│   ├── app/             # App Router 页面入口
│   ├── components/      # 共享 React 组件
│   ├── services/        # API 调用层（按业务域分组）
│   ├── hooks/           # 自定义 React Hooks
│   ├── lib/             # axios 客户端、日志工具
│   ├── types/           # TypeScript 类型定义
│   ├── i18n/            # 国际化
│   └── docs/            # 前端专项文档
├── 📁 backend/           # 后端服务 (Python 3.12 + FastAPI)
│   ├── app/
│   │   ├── api/v1/      # REST API 路由与处理器
│   │   ├── core/        # 配置、数据库、AI 引擎、日志
│   │   ├── models/      # SQLAlchemy ORM 模型
│   │   └── services/    # storage-service（Go）、实时推送等
│   ├── alembic/         # 数据库迁移脚本（0001→0004）
│   └── tests/           # 单元测试 + 集成测试
├── 📁 model/             # AI 推理服务
│   ├── ap/       # 正位脊柱分析（端口 8001）
│   ├── lat/          # 侧位脊柱分析（端口 8002）
│   └── AI_HOST_DEPLOYMENT.md  # 权重下载与本地部署指南
├── 📁 mobile/            # KMP 移动端（Android + iOS）
├── 📁 communication/     # 扫描机端 DICOM 文件索引服务（可选）
├── 📁 docs/              # 项目文档
├── 📁 infrastructure/    # Docker Compose 文件、Nginx、MySQL 配置
├── 📁 dotenv/            # 环境变量模板（按服务域拆分）
├── 📄 manage_ai.sh       # AI 容器管理脚本
├── 📄 AGENTS.md          # 开发规则（移动端 + Web 前端）
└── 📄 README.md          # 本文档
```

## 🚀 本地开发快速启动

### 前置要求

| 工具 | 版本 | 用途 |
|---|---|---|
| Node.js | 18+ | 前端 |
| Python (conda) | 3.12+ | 后端 |
| Docker | 20.10+ | 基础设施服务 |

### 步骤一：启动基础设施（Docker）

```bash
# MinIO 对象存储（若与 KGraph 共用同一实例可跳过）
docker run -d --name kg-minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# MySQL 数据库
docker run -d --name xiehe-mysql \
  -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=xiehe_db \
  mysql:8.0

# storage-service（Go 编写，MinIO 访问中间层）
docker run -d --name xiehe-storage \
  -p 8010:8010 \
  -e MINIO_ENDPOINT=host.docker.internal:9000 \
  -e MINIO_ACCESS_KEY=minioadmin \
  -e MINIO_SECRET_KEY=minioadmin \
  -e SERVICE_TOKEN=dev-storage-service-token \
  carlor02/xiehe-storage-service:latest
```

### 步骤二：配置并启动后端

```bash
cd XieHe-System/backend

# 创建 conda 环境（首次）
conda create -n xiehe python=3.12
conda activate xiehe
pip install -r requirements.txt

# 配置环境变量（复制模板后按需修改）
cp ../dotenv/.env.backend .env

# 运行数据库迁移（Alembic）
alembic upgrade head

# 启动后端
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 步骤三：启动 AI 推理服务（可选）

不启动 AI 服务时，影像上传、查看、报告等功能正常可用，AI 分析按钮会报错。

```bash
# 从 GitHub Releases 下载权重（见 model/AI_HOST_DEPLOYMENT.md）

# 构建并启动正面服务（Cobb 角等）
docker build -t xiehe-ai-ap:local model/ap/
docker run -d --name xiehe-ai-ap -p 8001:8001 xiehe-ai-ap:local

# 构建并启动侧面服务（SVA/PI 等）
docker build -t xiehe-ai-lat:local model/lat/
docker run -d --name xiehe-ai-lat -p 8002:8002 xiehe-ai-lat:local

# 确认健康
curl http://localhost:8001/health
curl http://localhost:8002/health
```

> **代理注意**: AI 服务 URL 须使用 `localhost` 而非 `127.0.0.1`，否则系统代理（如 VPN）可能拦截请求导致 502。

### 步骤四：启动前端

```bash
cd XieHe-System/frontend
npm install
npm run dev
```

### 访问地址

| 服务 | 地址 |
|---|---|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/api/v1/docs |
| MinIO 控制台 | http://localhost:9001 |

### 默认测试账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 系统管理员 | `admin` | `admin123` |
| 医生 | `doctor01` | `doctor123` |

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15.5 + React 19 + TypeScript + Tailwind CSS v4 |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0 + Alembic |
| 对象存储 | MinIO（通过 storage-service Go 网关访问）|
| AI 推理 | Python + YOLO（正面 :8001 / 侧面 :8002）|
| 数据库 | MySQL 8.0+ |
| 容器 | Docker + Docker Compose |
| 反向代理 | Nginx |

## 📚 文档

- [后端 README](backend/README.md)
- [前端 README](frontend/README.md)
- [AI 模型部署指南](model/AI_HOST_DEPLOYMENT.md)
- [项目文档](docs/README.md)
- [前端环境变量说明](frontend/docs/ENVIRONMENT_VARIABLES.md)
- [开发规则（AGENTS.md）](AGENTS.md)

## 🧪 测试

```bash
# 前端
cd frontend
npm run type-check
npm run lint
npm run test

# 后端
cd backend
conda activate xiehe
pytest
pytest --cov=app          # 覆盖率报告
```

## 📊 核心功能

- ✅ **用户认证**: JWT + OAuth2 多角色权限管理
- ✅ **影像管理**: 上传至 MinIO 对象存储，通过 storage-service 访问
- ✅ **AI 自动测量**: 正面（Cobb 角/T1 倾斜）+ 侧面（SVA/PI/PT）
- ✅ **手动标注**: Fabric.js + Konva 画布，关键点拖拽调整
- ✅ **报告生成**: 可视化报告，指标汇总
- ✅ **数据统计**: 实时仪表板
- ✅ **移动端**: KMP（Android + iOS）

## ⚠️ 免责声明

本系统仅供学习和研究使用，不应直接用于临床诊断。任何医疗决策都应由合格的医疗专业人员做出。
