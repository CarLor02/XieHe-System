# 修复 AI 服务 403 错误总结

## 问题描述

AI 模型服务（zhengmian/cemian）在宿主机运行时，访问 storage-service 出现 403 Forbidden 错误：

```
INFO:     172.19.0.6:39608 - "POST /predict_object HTTP/1.1" 403 Forbidden
```

## 根本原因

**错误配置**：
```bash
STORAGE_SERVICE_URL=http://localhost:3030/internal/model-storage
```

**问题分析**：
1. ❌ 端口 **3030** 映射到**前端 Next.js 服务**（不是 storage-service）
2. ❌ 路径 **/internal/model-storage** 在前端不存在，返回 403
3. ✅ 正确端口应该是 **8090**（storage-service）

参考 `dotenv/.env.ports.example`：
```
FRONTEND_PORT_BIND=<ip>:3030:3000       # 前端 Next.js
STORAGE_SERVICE_PORT_BIND=127.0.0.1:8090:8090  # Storage Service
```

## 修复内容

### 1. 修复主启动脚本 `deploy_ai_pc.sh`

**修改位置**：第 147-151 行

```bash
# 修改前（错误）
STORAGE_URL="http://localhost:3030/internal/model-storage"

# 修改后（正确）
STORAGE_URL="http://localhost:8090"
```

### 2. 暴露 storage-service 端口

**文件**：`infrastructure/docker/compose/storage-service.yml`

```yaml
services:
  storage-service:
    # ... 其他配置
    ports:
      - '${STORAGE_SERVICE_PORT_BIND:-127.0.0.1:8090:8090}'  # 新增端口映射
```

### 3. 更新端口配置示例

**文件**：`dotenv/.env.ports.example`

```bash
STORAGE_SERVICE_PORT_BIND=127.0.0.1:8090:8090  # 新增
```

### 4. 更新环境变量示例

**文件**：`dotenv/.env.storage.example`

```bash
STORAGE_SERVICE_TIMEOUT=30  # 新增超时配置
```

### 5. 创建辅助脚本

- `model/zhengmian/start_host.sh` - 单独启动正面模型
- `model/cemian/start_host.sh` - 单独启动侧面模型
- `model/AI_HOST_DEPLOYMENT.md` - 详细部署文档

## 使用方法

### 方法 1：使用主脚本（推荐）

```bash
cd XieHe-System
./deploy_ai_pc.sh
```

### 方法 2：使用单独启动脚本

```bash
cd XieHe-System/model/zhengmian
./start_host.sh
```

### 方法 3：手动启动

```bash
cd XieHe-System/model/zhengmian

TOKEN=$(grep "^STORAGE_SERVICE_TOKEN=" ../../dotenv/.env.storage | cut -d= -f2)

STORAGE_SERVICE_URL=http://localhost:8090 \
STORAGE_SERVICE_TOKEN=$TOKEN \
STORAGE_SERVICE_TIMEOUT=30 \
uvicorn app:app --host 0.0.0.0 --port 8001
```

## 验证步骤

### 1. 验证 storage-service 可访问

```bash
curl http://localhost:8090/health
# 应返回: {"code":200,"message":"操作成功","data":{"status":"ok"},...}
```

### 2. 验证 AI 服务健康检查

```bash
curl http://localhost:8001/health  # zhengmian
curl http://localhost:8002/health  # cemian
```

### 3. 测试对象存储访问

```bash
curl -X POST http://localhost:8001/predict_object \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "medical-image-files",
    "object_key": "test-image.jpg",
    "image_id": "IMG001"
  }'
```

如果之前返回 403，修复后应该能正常访问（或返回其他有意义的错误，如文件不存在）。

## 端口映射参考

| 服务 | 容器内端口 | 宿主机端口 | 说明 |
|------|-----------|-----------|------|
| Frontend | 3000 | 3030 | Next.js 前端 |
| Backend | 8080 | 8080 | FastAPI 后端 |
| Storage Service | 8090 | 8090 | 对象存储服务 |
| MySQL | 3306 | 3306 | 数据库 |
| Redis | 6379 | 6380 | 缓存 |
| MinIO | 9000 | 9000 | S3 兼容存储 |
| AI Zhengmian | - | 8001 | 正面模型（宿主机） |
| AI Cemian | - | 8002 | 侧面模型（宿主机） |

## 相关文档

- `model/AI_HOST_DEPLOYMENT.md` - AI 宿主机部署完整指南
- `dotenv/.env.storage.example` - Storage 配置示例
- `dotenv/.env.ports.example` - 端口映射配置示例

## 技术说明

Storage Service 的 API 路径：
```
GET  /objects/{bucket}/{object_key}  - 获取对象
PUT  /objects/{bucket}/{object_key}  - 上传对象
POST /presign/get                    - 获取预签名 URL
POST /objects/stat                   - 获取对象元数据
```

所有请求需要携带认证头：
```
X-Storage-Service-Token: <your-token>
```
