# AI 模型服务部署指南

本文档说明当前 AI 测量服务的部署方式。现在生产链路只保留一个模型服务接口：

- 正位模型服务：`POST /api/measurement`
- 侧位模型服务：`POST /api/measurement`

前端点击“AI 测量”时只调用后端：

```text
POST /api/v1/image-files/{file_id}/ai/predict
```

后端根据影像类型选择正位或侧位模型服务，把 `bucket/object_key` 传给模型服务。模型服务再使用 `STORAGE_SERVICE_URL` 和 `STORAGE_SERVICE_TOKEN` 拉取原图，完成测量项预测、关键点预测和派生测量项计算。

## 需要修改的 dotenv

系统侧 dotenv 在 `dotenv/` 下，模型侧 dotenv 在 `model/ap/.env.build` 和 `model/lat/.env.build`。

系统侧通常只需要关注这几个文件：

```text
dotenv/.env.storage     storage-service 内部访问 token 和桶名
dotenv/.env.backend     backend 调用模型服务的地址
dotenv/.env.frontend    frontend Nginx 的模型拉图 allowlist
dotenv/.env.ai          deploy_pc.sh --with-ai 使用的 AI compose 运行参数
```

模型侧分别编辑：

```text
model/ap/.env.build     正位模型服务独立部署参数
model/lat/.env.build    侧位模型服务独立部署参数
```

`STORAGE_SERVICE_TOKEN` 是内部 token，不要写入任何 `NEXT_PUBLIC_*` 配置，也不要暴露给浏览器。

## 方式一：单机部署系统和 AI 服务

单机部署有两种常见方式：使用 `deploy_pc.sh --with-ai` 让 AI 容器和系统容器在同一个 Docker 网络内运行，或者用 `model/ap/deploy.sh`、`model/lat/deploy.sh` 把模型服务作为独立容器部署在同一台机器上。

### 1. 使用 deploy_pc.sh 同机启动 AI 服务

这种方式下，AI 容器和 `storage-service` 同在 `medical_network`，模型服务直接访问：

```text
http://storage-service:8090
```

编辑或生成 `dotenv/.env.storage`：

```dotenv
STORAGE_SERVICE_TOKEN=<storage-service-token>
STORAGE_SERVICE_URL=http://storage-service:8090
STORAGE_SERVICE_TIMEOUT=30
IMAGE_FILE_BUCKET=medical-image-files
USER_AVATAR_BUCKET=medical-user-avatars
```

编辑或创建 `dotenv/.env.ai`：

```dotenv
AI_AP_PORT_BIND=0.0.0.0:8001:8001
AI_LAT_PORT_BIND=0.0.0.0:8002:8002
STORAGE_SERVICE_URL=http://storage-service:8090
STORAGE_SERVICE_TOKEN=<storage-service-token>
STORAGE_SERVICE_TIMEOUT=30
```

编辑 `dotenv/.env.backend`。如果后端也在同一个 compose 网络内，优先使用服务名：

```dotenv
AI_AP_MEASUREMENT_OBJECT_URL=http://ai-ap:8001/api/measurement
AI_LAT_MEASUREMENT_OBJECT_URL=http://ai-lat:8002/api/measurement
```

如果你希望后端通过宿主机端口访问模型服务，也可以使用宿主机内网 IP：

```dotenv
AI_AP_MEASUREMENT_OBJECT_URL=http://<HOST_PRIVATE_IP>:8001/api/measurement
AI_LAT_MEASUREMENT_OBJECT_URL=http://<HOST_PRIVATE_IP>:8002/api/measurement
```

启动：

```shell
./deploy_pc.sh --with-ai
```

如果机器有 GPU 且 Docker NVIDIA runtime 已配置：

```shell
./deploy_pc.sh --with-ai --gpu
```

验证：

```shell
curl -fsS http://127.0.0.1:8001/health
curl -fsS http://127.0.0.1:8002/health
./scripts/compose.sh ps
```

### 2. 同机使用 model/ap 和 model/lat 独立部署

这种方式适合系统由 compose 管理，但模型服务用各自目录下的 `deploy.sh` 单独构建和启动。

先编辑 `model/ap/.env.build`：

```dotenv
IMAGE_NAME=xiehe-system-ai-ap-api
CONTAINER_NAME=medical_ai_ap_api
PORT=16000

STORAGE_SERVICE_URL=http://host.docker.internal:3030/internal/model-storage
STORAGE_SERVICE_TOKEN=<storage-service-token>
STORAGE_SERVICE_TIMEOUT=30
NO_PROXY=localhost,127.0.0.1,.local,host.docker.internal
no_proxy=localhost,127.0.0.1,.local,host.docker.internal
```

再编辑 `model/lat/.env.build`：

```dotenv
IMAGE_NAME=xiehe-system-ai-lat-api
CONTAINER_NAME=medical_ai_lat_api
PORT=16001

STORAGE_SERVICE_URL=http://host.docker.internal:3030/internal/model-storage
STORAGE_SERVICE_TOKEN=<storage-service-token>
STORAGE_SERVICE_TIMEOUT=30
NO_PROXY=localhost,127.0.0.1,.local,host.docker.internal
no_proxy=localhost,127.0.0.1,.local,host.docker.internal
```

如果构建镜像需要代理，才在 `.env.build` 里增加：

```dotenv
PROXY_HOST=host.docker.internal
PROXY_PORT=7890
```

同机独立部署时，模型容器通过 frontend Nginx 的 `/internal/model-storage` 拉图。Nginx 看到的来源通常是模型容器在 Docker bridge 上的 IP，不是宿主机的内网 IP。因此 `dotenv/.env.frontend` 的 `MODEL_STORAGE_ALLOWED_CIDR` 需要允许模型容器 IP 或容器所在 Docker 网段。

可以先启动一次模型容器后查看容器 IP：

```shell
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' medical_ai_ap_api
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' medical_ai_lat_api
```

如果只部署一个模型容器，可以写该容器 IP 的 `/32`；如果正位和侧位都部署，当前只有一个 CIDR 配置项，通常建议写两个模型容器共同所在的 Docker bridge 网段，例如：

```shell
docker network inspect bridge -f '{{(index .IPAM.Config 0).Subnet}}'
```

然后编辑 `dotenv/.env.frontend`：

```dotenv
MODEL_STORAGE_ALLOWED_CIDR=172.17.0.0/16
```

如果模型容器加入的是项目 compose 网络，则查看对应网络网段：

```shell
docker network inspect xiehe-system_medical_network -f '{{(index .IPAM.Config 0).Subnet}}'
```

编辑 `dotenv/.env.backend`，让后端调用宿主机暴露的模型服务端口。Linux Docker 环境中，`host.docker.internal` 已在 backend compose 中映射到宿主机网关：

```dotenv
AI_AP_MEASUREMENT_OBJECT_URL=http://host.docker.internal:16000/api/measurement
AI_LAT_MEASUREMENT_OBJECT_URL=http://host.docker.internal:16001/api/measurement
```

如果目标环境不支持 `host.docker.internal`，使用宿主机内网 IP：

```dotenv
AI_AP_MEASUREMENT_OBJECT_URL=http://<HOST_PRIVATE_IP>:16000/api/measurement
AI_LAT_MEASUREMENT_OBJECT_URL=http://<HOST_PRIVATE_IP>:16001/api/measurement
```

重建系统侧相关容器：

```shell
./scripts/compose.sh up -d --build backend frontend storage-service
```

启动模型服务：

```shell
cd model/ap
./deploy.sh

cd ../lat
./deploy.sh
```

验证：

```shell
curl -fsS http://127.0.0.1:16000/health
curl -fsS http://127.0.0.1:16001/health
docker logs --tail=100 medical_ai_ap_api
docker logs --tail=100 medical_ai_lat_api
```

## 方式二：跨机器内网部署 AI 服务

跨机器部署时，系统服务运行在一台机器，正位和侧位模型服务可以运行在一台或两台内网机器。

示例机器：

```text
<SYSTEM_PRIVATE_IP>    运行 frontend/backend/storage-service/minio
<AP_MODEL_PRIVATE_IP>  运行正位模型服务
<LAT_MODEL_PRIVATE_IP> 运行侧位模型服务
```

### 1. 系统机器配置

编辑 `dotenv/.env.storage`：

```dotenv
STORAGE_SERVICE_TOKEN=<storage-service-token>
STORAGE_SERVICE_URL=http://storage-service:8090
STORAGE_SERVICE_TIMEOUT=30
IMAGE_FILE_BUCKET=medical-image-files
USER_AVATAR_BUCKET=medical-user-avatars
```

编辑 `dotenv/.env.backend`：

```dotenv
AI_AP_MEASUREMENT_OBJECT_URL=http://<AP_MODEL_PRIVATE_IP>:16000/api/measurement
AI_LAT_MEASUREMENT_OBJECT_URL=http://<LAT_MODEL_PRIVATE_IP>:16001/api/measurement
```

跨机器部署时，不需要在 `MODEL_STORAGE_ALLOWED_CIDR` 里写模型 Docker 容器 IP。这里有两种拉图方式：

- 如果模型服务通过 frontend Nginx 的 `/internal/model-storage` 拉图，`MODEL_STORAGE_ALLOWED_CIDR` 写模型机器的内网 IP 或模型机器所在内网网段。
- 如果模型服务可以直接访问 `storage-service` 的内网地址和端口，frontend Nginx 不参与拉图，`MODEL_STORAGE_ALLOWED_CIDR` 可以保持默认值。

通过 frontend Nginx 拉图时，编辑 `dotenv/.env.frontend`：

```dotenv
MODEL_STORAGE_ALLOWED_CIDR=<MODEL_PRIVATE_CIDR>
```

例如只放行一台模型机器：

```dotenv
MODEL_STORAGE_ALLOWED_CIDR=10.0.1.20/32
```

或者放行模型服务所在内网网段：

```dotenv
MODEL_STORAGE_ALLOWED_CIDR=10.0.1.0/24
```

应用系统侧配置：

```shell
./scripts/compose.sh up -d --build backend frontend storage-service
```

### 2. 正位模型机器配置

编辑 `model/ap/.env.build`：

```dotenv
IMAGE_NAME=xiehe-system-ai-ap-api
CONTAINER_NAME=medical_ai_ap_api
PORT=16000

STORAGE_SERVICE_URL=http://<SYSTEM_PRIVATE_IP>:3030/internal/model-storage
STORAGE_SERVICE_TOKEN=<storage-service-token>
STORAGE_SERVICE_TIMEOUT=30
NO_PROXY=localhost,127.0.0.1,.local,<SYSTEM_PRIVATE_IP>
no_proxy=localhost,127.0.0.1,.local,<SYSTEM_PRIVATE_IP>
```

如果模型机器直接访问 `storage-service`，把 `STORAGE_SERVICE_URL` 改成 storage-service 对模型机器可达的内网地址，例如：

```dotenv
STORAGE_SERVICE_URL=http://<SYSTEM_PRIVATE_IP>:8090
```

启动：

```shell
cd model/ap
./deploy.sh
```

验证：

```shell
curl -fsS http://127.0.0.1:16000/health
docker logs --tail=100 medical_ai_ap_api
```

### 3. 侧位模型机器配置

编辑 `model/lat/.env.build`：

```dotenv
IMAGE_NAME=xiehe-system-ai-lat-api
CONTAINER_NAME=medical_ai_lat_api
PORT=16001

STORAGE_SERVICE_URL=http://<SYSTEM_PRIVATE_IP>:3030/internal/model-storage
STORAGE_SERVICE_TOKEN=<storage-service-token>
STORAGE_SERVICE_TIMEOUT=30
NO_PROXY=localhost,127.0.0.1,.local,<SYSTEM_PRIVATE_IP>
no_proxy=localhost,127.0.0.1,.local,<SYSTEM_PRIVATE_IP>
```

如果模型机器直接访问 `storage-service`，同样可以改为：

```dotenv
STORAGE_SERVICE_URL=http://<SYSTEM_PRIVATE_IP>:8090
```

启动：

```shell
cd model/lat
./deploy.sh
```

验证：

```shell
curl -fsS http://127.0.0.1:16001/health
docker logs --tail=100 medical_ai_lat_api
```

### 4. 从系统机器验证模型连通性

在系统机器执行：

```shell
curl -fsS http://<AP_MODEL_PRIVATE_IP>:16000/health
curl -fsS http://<LAT_MODEL_PRIVATE_IP>:16001/health
```

确认 backend 容器拿到了模型服务地址：

```shell
docker exec medical_backend printenv | grep 'AI_.*MEASUREMENT_OBJECT_URL'
```

## 调用链检查

一次完整 AI 测量调用链如下：

```text
browser
  -> backend POST /api/v1/image-files/{file_id}/ai/predict
  -> model POST /api/measurement
  -> storage-service GET /objects/{bucket}/{object_key}
  -> model 返回测量项、关键点和派生结果
  -> backend 保存并返回给前端
```

手工验证时，优先检查这几件事：

```shell
docker exec medical_backend printenv | grep 'AI_.*MEASUREMENT_OBJECT_URL'
curl -fsS http://<AP_MODEL_HOST>:<AP_PORT>/health
curl -fsS http://<LAT_MODEL_HOST>:<LAT_PORT>/health
```

如果模型服务使用 frontend Nginx 内部入口拉图，可以在模型容器里检查 token 和入口是否可达：

```shell
docker exec medical_ai_ap_api sh -lc 'python - <<PY
import os, urllib.request
url = os.environ["STORAGE_SERVICE_URL"].rstrip("/") + "/objects/medical-image-files/<object_key>"
req = urllib.request.Request(url, headers={"X-Storage-Service-Token": os.environ["STORAGE_SERVICE_TOKEN"]})
print(urllib.request.urlopen(req, timeout=10).status)
PY'
```

把 `<object_key>` 替换为数据库中真实影像的 `object_key`。

## 常见问题

### 前端点击 AI 测量返回 503：AI模型 object 接口未配置

说明 backend 容器没有拿到模型服务 URL。检查 `dotenv/.env.backend`：

```dotenv
AI_AP_MEASUREMENT_OBJECT_URL=http://<ap-host>:<ap-port>/api/measurement
AI_LAT_MEASUREMENT_OBJECT_URL=http://<lat-host>:<lat-port>/api/measurement
```

修改后重建 backend：

```shell
./scripts/compose.sh up -d --build backend
docker exec medical_backend printenv | grep 'AI_.*MEASUREMENT_OBJECT_URL'
```

### backend 能访问 health，但 AI 测量失败

检查模型容器日志：

```shell
docker logs --tail=200 medical_ai_ap_api
docker logs --tail=200 medical_ai_lat_api
```

如果日志里是拉图失败，继续检查 `STORAGE_SERVICE_URL`、`STORAGE_SERVICE_TOKEN` 和 `MODEL_STORAGE_ALLOWED_CIDR`。

### 401 Unauthorized

`STORAGE_SERVICE_TOKEN` 不一致。保持以下位置完全一致：

```text
dotenv/.env.storage
dotenv/.env.ai                    仅 deploy_pc.sh --with-ai 时使用
model/ap/.env.build               独立部署正位模型时使用
model/lat/.env.build              独立部署侧位模型时使用
```

修改后重启对应服务。

### 403 Forbidden

模型服务通过 frontend Nginx `/internal/model-storage` 拉图时，`MODEL_STORAGE_ALLOWED_CIDR` 没有包含模型服务请求到 frontend 时的来源 IP。

- 单机独立模型容器：通常放行模型容器 Docker IP 或 Docker bridge 网段。
- 跨机器模型服务：放行模型机器内网 IP 或模型机器所在内网网段。
- 模型服务直连 `storage-service`：frontend Nginx 不参与，不看 `MODEL_STORAGE_ALLOWED_CIDR`。

修改 `dotenv/.env.frontend` 后重建 frontend：

```shell
./scripts/compose.sh up -d --build frontend
```

### 同机部署时 backend 访问不到模型服务

backend 运行在 Docker 容器内时，`localhost` 指向 backend 容器自己，不是宿主机。使用：

```dotenv
AI_AP_MEASUREMENT_OBJECT_URL=http://host.docker.internal:16000/api/measurement
AI_LAT_MEASUREMENT_OBJECT_URL=http://host.docker.internal:16001/api/measurement
```

如果当前 Linux 环境没有 `host.docker.internal`，改用宿主机内网 IP。

### 修改 .env.build 后没有生效

`model/ap/.env.build` 和 `model/lat/.env.build` 只在执行各自 `deploy.sh` 时读取。修改后需要重新部署模型服务：

```shell
cd model/ap
./deploy.sh

cd ../lat
./deploy.sh
```

## 最小配置清单

单机 `deploy_pc.sh --with-ai`：

```text
dotenv/.env.storage:  STORAGE_SERVICE_TOKEN
dotenv/.env.ai:       STORAGE_SERVICE_URL=http://storage-service:8090, STORAGE_SERVICE_TOKEN
dotenv/.env.backend:  AI_AP_MEASUREMENT_OBJECT_URL, AI_LAT_MEASUREMENT_OBJECT_URL
```

单机独立模型容器：

```text
dotenv/.env.storage:      STORAGE_SERVICE_TOKEN
dotenv/.env.backend:      AI_AP_MEASUREMENT_OBJECT_URL, AI_LAT_MEASUREMENT_OBJECT_URL
dotenv/.env.frontend:     MODEL_STORAGE_ALLOWED_CIDR=<model-container-docker-cidr>
model/ap/.env.build:      IMAGE_NAME, CONTAINER_NAME, PORT, STORAGE_SERVICE_URL, STORAGE_SERVICE_TOKEN
model/lat/.env.build:     IMAGE_NAME, CONTAINER_NAME, PORT, STORAGE_SERVICE_URL, STORAGE_SERVICE_TOKEN
```

跨机器内网模型服务：

```text
dotenv/.env.storage:      STORAGE_SERVICE_TOKEN
dotenv/.env.backend:      AI_AP_MEASUREMENT_OBJECT_URL, AI_LAT_MEASUREMENT_OBJECT_URL
dotenv/.env.frontend:     仅模型服务走 /internal/model-storage 时配置模型机器 IP/CIDR
model/ap/.env.build:      IMAGE_NAME, CONTAINER_NAME, PORT, STORAGE_SERVICE_URL, STORAGE_SERVICE_TOKEN
model/lat/.env.build:     IMAGE_NAME, CONTAINER_NAME, PORT, STORAGE_SERVICE_URL, STORAGE_SERVICE_TOKEN
```
