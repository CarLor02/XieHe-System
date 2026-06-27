# 🏥 协和医疗影像诊断系统 - 后端服务

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://mysql.com)

## 📋 项目概述

基于 FastAPI 的医疗影像诊断系统后端服务，提供完整的 REST API 接口，支持用户认证、患者管理、影像上传（MinIO 对象存储）、AI 辅助诊断、报告管理等核心功能。

### ✨ 核心特性

- 🚀 **高性能**: 基于 FastAPI 和异步编程，支持高并发请求
- 🔒 **安全认证**: JWT + OAuth2 多角色权限管理，bcrypt 密码加密
- � **对象存储**: 影像文件通过 storage-service（Go）上传/下载到 MinIO，不依赖本地文件系统
- 🤖 **AI 集成**: 正位/侧位脊柱 X 光片 AI 分析，通过 object-mode 接口直接从 MinIO 取图
- 📖 **自动文档**: OpenAPI 3.0 + Swagger UI，完整的 API 文档
- 🧪 **测试**: pytest 框架，单元测试 + 集成测试

## 📁 目录结构

```
backend/
├── .env                         # 本地环境变量（不提交 Git）
├── requirements.txt             # Python 依赖
├── alembic.ini                  # 数据库迁移配置
├── pytest.ini                   # 测试配置
├── app/
│   ├── main.py                  # FastAPI 应用入口 & 生命周期
│   ├── api/v1/
│   │   └── endpoints/
│   │       ├── access/          # 认证、用户、团队权限
│   │       ├── imaging/         # 影像上传、文件管理、AI 诊断、标注
│   │       ├── patients/        # 患者管理
│   │       ├── reports/         # 报告管理
│   │       └── system/          # 系统通知、监控
│   ├── core/
│   │   ├── config/              # 分域配置（ai_settings, storage_settings …）
│   │   ├── database/            # SQLAlchemy session 管理
│   │   ├── imaging/             # AI 诊断引擎（diagnosis.py）
│   │   └── system/              # logger、异常、并发控制
│   ├── models/                  # SQLAlchemy ORM 模型
│   ├── services/
│   │   ├── storage_gateway.py   # storage-service HTTP 客户端
│   │   ├── storage-service/     # Go 对象存储网关（独立微服务）
│   │   └── realtime_service.py  # WebSocket 实时推送
│   └── contracts/               # 与其他服务的接口契约（logging service 等）
├── alembic/versions/            # 数据库迁移脚本（0001 → 0004）
└── tests/
    ├── unit/
    └── integration/
```

## 🚀 本地开发启动

### 前置依赖

| 依赖 | 说明 |
|---|---|
| Python 3.12+ | 推荐使用 conda 管理环境 |
| MySQL 8.0+ | 主数据库 |
| Docker | 运行 MinIO、storage-service、AI 服务 |

### 第一步：Python 环境

```bash
cd XieHe-System/backend

conda create -n xiehe python=3.12
conda activate xiehe
pip install -r requirements.txt
```

### 第二步：依赖服务（Docker）

后端依赖三类外部服务，本地开发需要全部启动：

**MinIO（对象存储）**
```bash
# 如果本地已有 MinIO 实例（如 kg-minio），可直接复用
docker ps | grep minio
```

**storage-service（Go 网关）**
```bash
# 构建镜像（首次）
docker build \
  -f XieHe-System/backend/app/services/storage-service/Dockerfile \
  -t xiehe-storage-service:local \
  XieHe-System/backend/app/services/

# 启动（MINIO_INTERNAL_ENDPOINT 指向 MinIO 容器）
docker run -d \
  --name xiehe-storage-service-local \
  -p 8090:8090 \
  -e MINIO_INTERNAL_ENDPOINT=http://host.docker.internal:9000 \
  -e MINIO_ACCESS_KEY=minioadmin \
  -e MINIO_SECRET_KEY=minioadmin \
  -e STORAGE_SERVICE_ADDR=:8090 \
  -e STORAGE_SERVICE_TOKEN=dev-storage-service-token \
  xiehe-storage-service:local
```

**AI 模型服务（可选，仅 AI 分析功能需要）**

模型权重从 GitHub Releases 下载，详见 `XieHe-System/model/AI_HOST_DEPLOYMENT.md`。

```bash
# 正位模型（端口 8001）
docker build -t xiehe-ai-zhengmian:local XieHe-System/model/zhengmian/
docker run -d --name xiehe-ai-zhengmian -p 8001:8001 \
  -e STORAGE_SERVICE_URL=http://host.docker.internal:8090 \
  -e STORAGE_SERVICE_TOKEN=dev-storage-service-token \
  xiehe-ai-zhengmian:local

# 侧位模型（端口 8002）
docker build -t xiehe-ai-cemian:local XieHe-System/model/cemian/
docker run -d --name xiehe-ai-cemian -p 8002:8002 \
  -e STORAGE_SERVICE_URL=http://host.docker.internal:8090 \
  -e STORAGE_SERVICE_TOKEN=dev-storage-service-token \
  xiehe-ai-cemian:local
```

### 第三步：配置 .env

后端从 `backend/.env` 读取本地配置（见文件中的注释）。关键项：

```bash
# 数据库
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/medical_imaging_system

# storage-service
STORAGE_SERVICE_URL=http://localhost:8090
STORAGE_SERVICE_TOKEN=dev-storage-service-token

# AI 服务（使用 localhost，避免系统代理干扰）
AI_FRONT_PREDICT_OBJECT_URL=http://localhost:8001/predict_object
AI_FRONT_KEYPOINTS_OBJECT_URL=http://localhost:8001/detect_keypoints_object
AI_LATERAL_PREDICT_OBJECT_URL=http://localhost:8002/api/detect_and_keypoints_object
AI_LATERAL_DETECT_OBJECT_URL=http://localhost:8002/api/detect_object
```

> ⚠️ AI 服务 URL 必须使用 `localhost` 而非 `127.0.0.1`，否则在开启系统代理时 httpx 会将请求路由到代理导致连接失败。

### 第四步：数据库迁移

```bash
cd XieHe-System/backend
alembic upgrade head
```

当前共有 4 个迁移版本（0001 初始化 → 0004 影像团队可见性）。**每次拉取代码后都应执行此命令**，确保表结构与 ORM 模型一致。

### 第五步：启动后端

```bash
cd XieHe-System/backend
conda activate xiehe

# 如果本地开启了 HTTP 代理，需要排除 localhost
NO_PROXY=localhost,127.0.0.1 uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**访问地址**

| 地址 | 说明 |
|---|---|
| http://localhost:8000 | API 服务 |
| http://localhost:8000/api/v1/docs | Swagger UI |
| http://localhost:8000/api/v1/redoc | ReDoc |
| http://localhost:8000/health | 健康检查 |

## 🔧 技术栈

| 层次 | 技术 |
|---|---|
| Web 框架 | FastAPI + Uvicorn |
| ORM / 迁移 | SQLAlchemy + Alembic |
| 数据库 | MySQL 8.0 |
| 对象存储 | MinIO（通过 storage-service Go 网关访问） |
| AI 推理 | 独立 Python 容器（zhengmian / cemian），CPU/GPU 均可 |
| 认证 | JWT（access + refresh token） |
| 测试 | pytest + pytest-asyncio + httpx |

## 📊 主要 API 端点

完整文档见 Swagger UI（启动后访问 `/api/v1/docs`）。

| 类别 | 端点 |
|---|---|
| 认证 | `POST /api/v1/auth/login` · `POST /api/v1/auth/refresh` |
| 患者 | `GET/POST /api/v1/patients` · `GET/PUT /api/v1/patients/{id}` |
| 影像上传 | `POST /api/v1/upload/initiate` · `POST /api/v1/upload/complete` |
| 影像文件 | `GET /api/v1/image-files` · `GET /api/v1/image-files/{id}` |
| AI 分析 | `POST /api/v1/image-files/{id}/ai/predict` · `POST /api/v1/image-files/{id}/ai/detect-keypoints` |
| 标注 | `PUT /api/v1/image-files/{id}/annotation` |
| 报告 | `GET/POST /api/v1/reports` |
| 健康检查 | `GET /health` |

## 🧪 测试

```bash
cd XieHe-System/backend
conda activate xiehe

# 全部测试
pytest

# 单元测试
pytest tests/unit/

# 集成测试
pytest tests/integration/

# 覆盖率报告
pytest --cov=app --cov-report=html
```

##  生产部署

```bash
# 使用 Gunicorn + Uvicorn workers
gunicorn app.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 60
```

## 🛠️ 常见问题

### `[logging-service-fallback] logging-service emit failed: timed out`

**不是错误**。后端通过 HTTP 向独立日志微服务发送结构化日志，本地未启动该服务时会打印此警告（每 30 秒一条），不影响任何业务功能，忽略即可。

### AI 预测返回 502

1. 确认 AI 容器正在运行：`docker ps | grep xiehe-ai`
2. 确认 `.env` 中 AI URL 使用 `localhost` 而非 `127.0.0.1`（系统代理会拦截后者）
3. 重启后端使新配置生效

### 数据库查询报错（列不存在）

执行迁移使表结构与代码对齐：
```bash
cd XieHe-System/backend
alembic upgrade head
```

### 影像上传 502

storage-service 容器未运行，或 MinIO 地址配置不正确。检查：
```bash
docker logs xiehe-storage-service-local
curl http://localhost:8090/health
```

---

**注意**: `.env` 文件包含本地密钥，不要提交到 Git。
