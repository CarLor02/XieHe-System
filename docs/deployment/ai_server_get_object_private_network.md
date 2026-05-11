# AI 模型服务改为内网 object_key 拉图部署步骤

这一步把 AI 测量链路从“前端下载图片后再上传给模型服务”改为“后端传
`bucket/object_key`，模型服务通过内网受控入口拉取原图”。

本文件只写服务器执行步骤。当前域名暂未上线时，以下配置直接使用服务器内网 IP。

涉及机器：

```text
<COMPOSE_PRIVATE_IP>       运行 frontend/backend/storage-service/minio 的机器
<FRONT_MODEL_PRIVATE_IP>   正位模型服务器
<LATERAL_MODEL_PRIVATE_IP> 侧位模型服务器
```

涉及 token：

```text
<STORAGE_SERVICE_TOKEN>    storage-service 和模型服务共享的内部 token
```

`STORAGE_SERVICE_TOKEN` 不要放进任何 `NEXT_PUBLIC_*` 配置，也不要放进前端构建变量。

## 1. 进入维护窗口

部署期间会重建 `storage-service`、`backend`、`frontend` 和两个模型容器。建议先停止用户执行 AI 测量。

先记录当前版本：

```shell
git rev-parse HEAD
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

如果需要留存配置备份：

```shell
export BACKUP_ROOT=/srv/xiehe-backups/ai-object-access-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_ROOT"
cp -a dotenv "$BACKUP_ROOT/dotenv"
```

## 2. 在 Compose 机器更新代码

```shell
cd /path/to/XieHe-System
git pull
```

确认已经包含本次改动：

```shell
git log -1 --oneline
```

## 3. 配置 storage-service token

编辑 Compose 机器上的 `dotenv/.env.storage`：

```shell
STORAGE_SERVICE_TOKEN=<STORAGE_SERVICE_TOKEN>
STORAGE_SERVICE_URL=http://storage-service:8090
IMAGE_FILE_BUCKET=medical-image-files
USER_AVATAR_BUCKET=medical-user-avatars
```

这个 token 后面要复制到正位、侧位模型服务器的 `.env.build`，三处必须一致。

## 4. 配置 backend 到模型服务的 object 接口

编辑 Compose 机器上的 `dotenv/.env.backend`，增加或确认：

```shell
AI_FRONT_PREDICT_OBJECT_URL=http://<FRONT_MODEL_PRIVATE_IP>:8001/predict_object
AI_FRONT_KEYPOINTS_OBJECT_URL=http://<FRONT_MODEL_PRIVATE_IP>:8001/detect_keypoints_object
AI_LATERAL_PREDICT_OBJECT_URL=http://<LATERAL_MODEL_PRIVATE_IP>:8002/api/detect_and_keypoints_object
AI_LATERAL_DETECT_OBJECT_URL=http://<LATERAL_MODEL_PRIVATE_IP>:8002/api/detect_object
```

不要再把这四个 object URL 配到 `dotenv/.env.frontend` 的 `NEXT_PUBLIC_*` 中。前端现在只调用后端 `/api/v1/image-files/{file_id}/ai/*`。

## 5. 配置 frontend Nginx 的内网拉图 allowlist

编辑 Compose 机器上的 `dotenv/.env.frontend`：

```shell
MODEL_STORAGE_ALLOWED_CIDR=<FRONT_MODEL_PRIVATE_IP>/32
```

如果正位和侧位模型不在同一台机器，而当前只使用一个 Nginx allow 变量，可以先放行模型服务器所在内网网段：

```shell
MODEL_STORAGE_ALLOWED_CIDR=<MODEL_PRIVATE_CIDR>
```

例如：

```shell
MODEL_STORAGE_ALLOWED_CIDR=10.0.1.0/24
```

更严格的做法是在外层防火墙或上游 Nginx 对两台模型服务器 IP 分别放行。

## 6. 重建 Compose 侧服务

在 Compose 机器执行：

```shell
./scripts/compose.sh up -d --build storage-service backend frontend
./scripts/compose.sh ps
```

查看关键日志：

```shell
./scripts/compose.sh logs --tail=100 storage-service
./scripts/compose.sh logs --tail=100 backend
./scripts/compose.sh logs --tail=100 frontend
```

确认 frontend Nginx 已生成内部入口：

```shell
docker exec medical_frontend nginx -T | grep -A12 '/internal/model-storage/'
```

期望看到：

```text
allow <MODEL_STORAGE_ALLOWED_CIDR>;
deny all;
proxy_pass http://storage-service:8090/objects/;
```

## 7. 配置并部署正位模型服务器

在正位模型服务器编辑 `model/zhengmian/.env.build`：

```shell
IMAGE_NAME=spine-analysis-api
CONTAINER_NAME=spine-api
PORT=8001

STORAGE_SERVICE_URL=http://<COMPOSE_PRIVATE_IP>:3030/internal/model-storage
STORAGE_SERVICE_TOKEN=<STORAGE_SERVICE_TOKEN>
STORAGE_SERVICE_TIMEOUT=30
NO_PROXY=localhost,127.0.0.1,.local,<COMPOSE_PRIVATE_IP>
no_proxy=localhost,127.0.0.1,.local,<COMPOSE_PRIVATE_IP>
```

如果这台服务器构建镜像需要代理，才额外配置：

```shell
PROXY_HOST=host.docker.internal
PROXY_PORT=<proxy-port>
```

部署：

```shell
cd /path/to/XieHe-System/model/zhengmian
./deploy.sh
```

验证：

```shell
curl -fsS http://127.0.0.1:8001/health
docker logs --tail=100 spine-api
```

## 8. 配置并部署侧位模型服务器

在侧位模型服务器编辑 `model/cemian/.env.build`：

```shell
IMAGE_NAME=spine-scoliosis-api
CONTAINER_NAME=spine-scoliosis-api
PORT=8002

STORAGE_SERVICE_URL=http://<COMPOSE_PRIVATE_IP>:3030/internal/model-storage
STORAGE_SERVICE_TOKEN=<STORAGE_SERVICE_TOKEN>
STORAGE_SERVICE_TIMEOUT=30
NO_PROXY=localhost,127.0.0.1,.local,<COMPOSE_PRIVATE_IP>
no_proxy=localhost,127.0.0.1,.local,<COMPOSE_PRIVATE_IP>
```

如果这台服务器构建镜像需要代理，才额外配置：

```shell
PROXY_HOST=host.docker.internal
PROXY_PORT=<proxy-port>
```

部署：

```shell
cd /path/to/XieHe-System/model/cemian
./deploy.sh
```

验证：

```shell
curl -fsS http://127.0.0.1:8002/health
docker logs --tail=100 spine-scoliosis-api
```

## 9. 验证模型服务器可以通过内网拉图

在模型服务器执行。先找一个真实存在的 `object_key`，可以从 `image_files.object_key` 查。

```shell
curl -i \
    -H "X-Storage-Service-Token: <STORAGE_SERVICE_TOKEN>" \
    "http://<COMPOSE_PRIVATE_IP>:3030/internal/model-storage/medical-image-files/<object_key>" \
    -o /tmp/model-storage-test.img
```

期望：

```text
HTTP/1.1 200 OK
Content-Type: image/...
```

并确认文件非空：

```shell
ls -lh /tmp/model-storage-test.img
```

从非模型服务器访问同一路径应返回 `403`。从允许 IP 访问但不带
`X-Storage-Service-Token` 应返回 `401`。

## 10. 验证后端 AI 接口

找一个状态为 `UPLOADED` 或 `PROCESSED` 的影像文件 ID，并使用有效登录 token。

关键点检测：

```shell
curl -i \
    -X POST \
    -H "Authorization: Bearer <ACCESS_TOKEN>" \
    "http://<COMPOSE_PRIVATE_IP>:8080/api/v1/image-files/<file_id>/ai/detect-keypoints"
```

AI 测量：

```shell
curl -i \
    -X POST \
    -H "Authorization: Bearer <ACCESS_TOKEN>" \
    "http://<COMPOSE_PRIVATE_IP>:8080/api/v1/image-files/<file_id>/ai/predict"
```

如果返回 `409 影像文件尚未完成上传`，说明该文件状态还不是 `UPLOADED` 或 `PROCESSED`。

如果返回 `503 AI模型 object 接口未配置`，检查 `dotenv/.env.backend` 里的四个
`AI_*_OBJECT_URL` 并重启 backend。

## 11. 验证前端链路

打开影像页面，点击 AI 测量。

浏览器 Network 里应只看到：

```text
POST /api/v1/image-files/<file_id>/ai/predict
POST /api/v1/image-files/<file_id>/ai/detect-keypoints
```

浏览器不应再直接请求模型服务器地址，也不应再上传整张图片给模型服务。

## 12. 常见失败处理

`403 Forbidden`：`MODEL_STORAGE_ALLOWED_CIDR` 没有包含模型服务器请求到 Compose 机器时的源 IP。修改 `dotenv/.env.frontend` 后执行：

```shell
./scripts/compose.sh up -d --build frontend
```

`401 Unauthorized`：模型服务器 `.env.build` 的 `STORAGE_SERVICE_TOKEN` 与 Compose 机器 `dotenv/.env.storage` 不一致。对齐 token 后重启 `storage-service` 和模型容器。

`502 AI模型服务不可用`：后端访问不到模型服务，或模型服务访问内网拉图入口失败。分别在 Compose 机器和模型服务器上执行：

```shell
curl -fsS http://<FRONT_MODEL_PRIVATE_IP>:8001/health
curl -fsS http://<LATERAL_MODEL_PRIVATE_IP>:8002/health
docker logs --tail=100 spine-api
docker logs --tail=100 spine-scoliosis-api
```

## 13. 回滚

如果需要回滚代码：

```shell
git revert <object-mode-commit>
./scripts/compose.sh up -d --build storage-service backend frontend
```

模型服务器同步回滚代码后，分别重新执行：

```shell
cd /path/to/XieHe-System/model/zhengmian
./deploy.sh

cd /path/to/XieHe-System/model/cemian
./deploy.sh
```

如果只是临时阻断模型服务内网拉图，在 Compose 机器设置：

```shell
MODEL_STORAGE_ALLOWED_CIDR=127.0.0.1/32
```

然后重启 frontend：

```shell
./scripts/compose.sh up -d --build frontend
```
