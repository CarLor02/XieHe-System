# AI 模型服务宿主机部署指南

## 问题描述

当 AI 模型服务（ap/lat）运行在**宿主机**而不是 Docker 容器内时，需要特殊的配置才能访问 Docker 内的 storage-service。

### 403 错误原因

```
INFO:     172.19.0.6:39608 - "POST /api/measurement HTTP/1.1" 403 Forbidden
```

**根本原因**：
1. AI 服务配置了错误的 `STORAGE_SERVICE_URL=http://localhost:3030/internal/model-storage`
2. 端口 3030 实际映射到**前端 Next.js 服务**（参考 `.env.ports.example`）
3. 前端没有 `/internal/model-storage` 路由，因此返回 403
4. 正确的端口应该是 **8090**（storage-service）

## 网络架构

```
┌─────────────────────────────────────────┐
│ 宿主机 (Host Machine)                    │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ AI 模型服务 (Port 8001/8002)      │   │
│  │ - ap: 8001                │   │
│  │ - lat: 8002                   │   │
│  └──────────────────────────────────┘   │
│           │                             │
│           │ 需要访问                     │
│           ↓                             │
│  ┌──────────────────────────────────┐   │
│  │ Docker Network (medical_network) │   │
│  │                                  │   │
│  │  ┌────────────────────────────┐  │   │
│  │  │ storage-service:8090       │  │   │
│  │  │ (容器内网络名)              │  │   │
│  │  └────────────────────────────┘  │   │
│  │           │                      │   │
│  │           │ 映射到                │   │
│  │           ↓                      │   │
│  │  localhost:8090 (宿主机端口映射)  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 修复步骤

### 步骤 1：确保 storage-service 暴露端口

已在 `infrastructure/docker/compose/storage-service.yml` 中配置：

```yaml
services:
  storage-service:
    # ... 其他配置
    ports:
      - '${STORAGE_SERVICE_PORT_BIND:-127.0.0.1:8090:8090}'
    # ... 其他配置
```

在 `dotenv/.env.ports` 中添加（如果没有这个文件，从 `.env.ports.example` 复制）：

```bash
STORAGE_SERVICE_PORT_BIND=127.0.0.1:8090:8090
```

### 步骤 2：重新启动 storage-service

```bash
cd ~/Documents/XieHe-System
docker compose -f infrastructure/docker/compose/base.yml \
  -f infrastructure/docker/compose/storage-service.yml \
  --env-file dotenv/.env.storage \
  --env-file dotenv/.env.ports \
  up -d storage-service
```

### 步骤 3：验证 storage-service 可访问

```bash
curl http://localhost:8090/health
# 应该返回: {"code":200,"message":"操作成功","data":{"status":"ok"},"timestamp":"..."}
```

### 步骤 4：使用正确的环境变量启动 AI 服务

**正确的启动命令**（修复 403 错误）：

```bash
cd ~/Documents/XieHe-System/model/ap

# 从 dotenv 读取 token
TOKEN=$(grep "^STORAGE_SERVICE_TOKEN=" ~/Documents/XieHe-System/dotenv/.env.storage | cut -d= -f2)

# ✅ 正确：使用 localhost:8090
STORAGE_SERVICE_URL=http://localhost:8090 \
STORAGE_SERVICE_TOKEN=$TOKEN \
STORAGE_SERVICE_TIMEOUT=30 \
PYTHONPATH=.. /opt/miniconda3/envs/xiehe/bin/uvicorn ap.interfaces.http.app:app --host 0.0.0.0 --port 8001
```

**错误的启动命令**（会导致 403）：

```bash
# ❌ 错误：3030 是前端端口，不是 storage-service
STORAGE_SERVICE_URL=http://localhost:3030/internal/model-storage \
STORAGE_SERVICE_TOKEN=$TOKEN \
PYTHONPATH=.. /opt/miniconda3/envs/xiehe/bin/uvicorn ap.interfaces.http.app:app --host 0.0.0.0 --port 8001
```

### 步骤 5：测试 AI 服务

```bash
# 健康检查
curl http://localhost:8001/health

# 测试预测接口
curl -X POST http://localhost:8001/api/measurement \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "medical-image-files",
    "object_key": "test-image.jpg",
    "image_id": "IMG001"
  }'
```

## Docker 部署（AI 在容器内）

如果 AI 服务运行在 Docker 容器内（使用 `ai.yml`），环境变量已自动配置：

```yaml
services:
  ai-ap:
    environment:
      STORAGE_SERVICE_URL: ${STORAGE_SERVICE_URL:-http://storage-service:8090}
      STORAGE_SERVICE_TOKEN: ${STORAGE_SERVICE_TOKEN:-dev-storage-service-token}
    depends_on:
      storage-service:
        condition: service_healthy
    networks:
      - medical_network
```

容器内可直接使用 Docker 内部网络名 `storage-service:8090`。

## Storage Service API 路径

Storage service 的正确路径格式：

```
GET  http://localhost:8090/objects/{bucket}/{object_key}
PUT  http://localhost:8090/objects/{bucket}/{object_key}
POST http://localhost:8090/presign/get
POST http://localhost:8090/objects/stat
```

**认证头：**
```
X-Storage-Service-Token: <your-token>
```

## 常见错误

### ❌ 错误配置 1：使用前端端口
```bash
# 错误！3030 是前端 Next.js 端口
STORAGE_SERVICE_URL=http://localhost:3030/internal/model-storage
```

### ❌ 错误配置 2：使用不存在的路径
```bash
# 错误！storage-service 没有 /internal/model-storage 路径
STORAGE_SERVICE_URL=http://localhost:8090/internal/model-storage
```

### ✅ 正确配置
```bash
# 正确！直接访问 storage-service 的根路径
STORAGE_SERVICE_URL=http://localhost:8090
```

## 验证连接

测试 storage-service 是否可访问：

```bash
# 1. 检查 storage-service 健康状态
curl http://localhost:8090/health

# 2. 测试获取对象（需要认证）
TOKEN="your-storage-service-token"
curl -H "X-Storage-Service-Token: $TOKEN" \
  http://localhost:8090/objects/medical-image-files/test.jpg
```

## 端口映射说明

参考 `dotenv/.env.ports.example`：

```
BACKEND_PORT_BIND=<ip>:8080:8080        # 后端 API
FRONTEND_PORT_BIND=<ip>:3030:3000       # 前端 Next.js
MYSQL_PORT_BIND=127.0.0.1:3306:3306
REDIS_PORT_BIND=127.0.0.1:6380:6379
MINIO_API_PORT_BIND=127.0.0.1:9000:9000
MINIO_CONSOLE_PORT_BIND=127.0.0.1:9001:9001
# 注意：storage-service 默认不暴露端口，需要手动配置
```
