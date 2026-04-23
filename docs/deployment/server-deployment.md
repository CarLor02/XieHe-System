# 服务器部署方案

## 概述

本文档用于当前生产部署方案的落地说明，目标域名为 `xiehe.stellarmesh.net`，统一使用 `HTTPS` 对外提供服务。

当前选型如下：

- **公网入口**: `GPU1` 上的 Nginx
- **业务服务部署机**: `CPU2`
- **前端容器**: 暂时保留 `medical_frontend`，不移除其内部 Nginx
- **对外访问地址**: `https://xiehe.stellarmesh.net`

说明：

- `xiehe.stellarmesh.net` 是一个**子域名**，不是路径前缀。
- 因为它不是 `/xiehe/` 这种路径部署，所以当前前端静态导出模式可以直接使用，不需要额外的 `basePath` 改造。

## 目标架构

本次部署采用“GPU1 统一代理，CPU2 运行 Compose 服务”的方案。

流量路径如下：

```text
Browser
  -> https://xiehe.stellarmesh.net
  -> GPU1 Nginx
     -> /                  -> CPU2:3030  -> medical_frontend (Nginx, 静态页)
     -> /api/              -> CPU2:8080  -> medical_backend
     -> /api/v1/ws/        -> CPU2:8080  -> medical_backend (WebSocket)
     -> /ai/front/*        -> AI 服务 8001
     -> /ai/lateral/*      -> AI 服务 8002
```

这样做的原因：

- `GPU1` 可以继续统一管理多项目、多域名和 SSL 证书。
- `CPU2` 只负责运行本项目容器。
- 前端静态页仍由 `medical_frontend` 提供，改动最小，回滚最简单。
- API、WebSocket、AI 接口直接由 `GPU1` 分流，避免前端容器再代理后端。

## GPU1 侧部署要求

### DNS

需要保证：

- `xiehe.stellarmesh.net` 的 DNS 记录指向 `GPU1` 的公网 IP。

### 网络连通

需要保证 `GPU1` 能通过内网访问 `CPU2`：

- `CPU2:3030` 用于前端静态页
- `CPU2:8080` 用于后端 API 和 WebSocket

如果 AI 服务也不直接暴露公网，需要保证 `GPU1` 能访问：

- `<AI_FRONT_HOST>:8001`
- `<AI_LATERAL_HOST>:8002`

### 证书

建议在 `GPU1` 上申请并维护 `xiehe.stellarmesh.net` 的证书，例如：

- Let's Encrypt + Certbot
- 或已有统一证书托管方案

## GPU1 Nginx 配置

下面给出推荐配置。该配置默认：

- `GPU1` 负责 SSL 终止
- `/` 转发到 `CPU2` 的 `medical_frontend`
- `/api/` 和 `/api/v1/ws/` 直接转发到 `CPU2` 的后端
- AI 接口统一走同域名 HTTPS，避免浏览器混合内容错误

请将下面占位符替换为实际值：

- `<CPU2_PRIVATE_IP>`
- `<GPU1_PRIVATE_IP>`
- `<AI_FRONT_HOST>`
- `<AI_LATERAL_HOST>`
- 证书路径

### 推荐站点配置

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream xiehe_frontend_cpu2 {
    server <CPU2_PRIVATE_IP>:3030;
    keepalive 32;
}

upstream xiehe_backend_cpu2 {
    server <CPU2_PRIVATE_IP>:8080;
    keepalive 32;
}

upstream xiehe_ai_front {
    server <AI_FRONT_HOST>:8001;
    keepalive 16;
}

upstream xiehe_ai_lateral {
    server <AI_LATERAL_HOST>:8002;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name xiehe.stellarmesh.net;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name xiehe.stellarmesh.net;

    ssl_certificate     /etc/letsencrypt/live/xiehe.stellarmesh.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xiehe.stellarmesh.net/privkey.pem;

    client_max_body_size 100M;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    location /api/v1/ws/ {
        proxy_pass http://xiehe_backend_cpu2;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location /api/ {
        proxy_pass http://xiehe_backend_cpu2;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location = /ai/front/predict {
        proxy_pass http://xiehe_ai_front/predict;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location = /ai/front/detect_keypoints {
        proxy_pass http://xiehe_ai_front/detect_keypoints;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location = /ai/lateral/detect_and_keypoints {
        proxy_pass http://xiehe_ai_lateral/api/detect_and_keypoints;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location = /ai/lateral/detect {
        proxy_pass http://xiehe_ai_lateral/api/detect;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location / {
        proxy_pass http://xiehe_frontend_cpu2;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

### 配置说明

- `location /` 只负责前端静态资源和页面路由。
- `location /api/` 直接代理到 `CPU2` 后端，不经过 `medical_frontend`。
- `location /api/v1/ws/` 单独列出来，便于明确启用 WebSocket 升级和长连接超时。
- AI 接口全部挂到同域名 HTTPS 下，避免浏览器从 HTTPS 页面访问 HTTP AI 接口时被拦截。

## CPU2 上的 Compose 调整

### 总体原则

`CPU2` 继续使用根目录 `docker-compose.yml` 部署，但要收紧对外暴露方式：

- 保留 `frontend` 服务
- 保留 `backend` 服务
- `frontend` 对 `GPU1` 开放 `3030`
- `backend` 对 `GPU1` 开放 `8080`
- `mysql` 和 `redis` 不再暴露公网

### 推荐修改项

#### 1. frontend 服务

保留 `frontend` 服务，但建议只绑定到 `CPU2` 的内网地址，或通过防火墙仅允许 `GPU1` 访问 `3030`。

当前：

```yaml
frontend:
  ports:
    - '3030:3000'
```

推荐：

```yaml
frontend:
  ports:
    - '<CPU2_PRIVATE_IP>:3030:3000'
```

如果 Docker 环境不方便直接写死内网 IP，也至少要在 `CPU2` 防火墙限制：

- 仅允许 `GPU1` 访问 `3030`

#### 2. backend 服务

当前：

```yaml
backend:
  ports:
    - '0.0.0.0:8080:8080'
```

推荐：

```yaml
backend:
  environment:
    - FORWARDED_ALLOW_IPS=<GPU1_PRIVATE_IP>
  ports:
    - '<CPU2_PRIVATE_IP>:8080:8080'
```

说明：

- `FORWARDED_ALLOW_IPS` 必须配置，否则后端运行时默认只信任 `127.0.0.1` 转发头。
- 配置后，后端才能正确识别 `GPU1` 传入的 `X-Forwarded-Proto: https` 等头部。

如果后续需要先快速联通、再逐步收紧，可以临时用：

```yaml
- FORWARDED_ALLOW_IPS=*
```

但稳定后建议改回 `GPU1` 的内网 IP。

#### 3. mysql 服务

当前：

```yaml
mysql:
  ports:
    - '3306:3306'
```

推荐二选一：

```yaml
mysql:
  ports:
    - '127.0.0.1:3306:3306'
```

或直接不映射主机端口，只在 Docker 网络内部使用。

#### 4. redis 服务

当前：

```yaml
redis:
  ports:
    - '6380:6379'
```

推荐二选一：

```yaml
redis:
  ports:
    - '127.0.0.1:6380:6379'
```

或直接不映射主机端口，只在 Docker 网络内部使用。

### 推荐后的 Compose 暴露策略

建议最终只保留：

- `CPU2:3030` 给 `GPU1` 访问
- `CPU2:8080` 给 `GPU1` 访问

不建议继续公网开放：

- `3306`
- `6380`

## 前端变量改动

### 关键说明

当前前端是 **静态导出** 模式，构建产物写入 `frontend/out`。

因此：

- 推荐通过根目录 `.env` 配合 `docker-compose.yml` 的 `build.args` 注入前端构建变量
- `frontend/.env.production` 作为前端仓库内的默认生产配置，可作为手动构建时的兜底值
- 如果修改了前端对外地址，必须重新构建前端镜像

### 需要修改的文件

- 根目录 `.env`
- `frontend/.env.production`

### 推荐配置

将下列变量改为最终线上值：

```dotenv
NEXT_PUBLIC_API_URL=https://xiehe.stellarmesh.net
NEXT_PUBLIC_API_BASE_URL=https://xiehe.stellarmesh.net
NEXT_PUBLIC_API_VERSION=v1

NEXT_PUBLIC_WEBSOCKET_URL=wss://xiehe.stellarmesh.net/api/v1/ws/ws

NEXT_PUBLIC_AI_DETECT_URL=https://xiehe.stellarmesh.net/ai/front/predict
NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL=https://xiehe.stellarmesh.net/ai/front/detect_keypoints

NEXT_PUBLIC_AI_DETECT_LATERAL_URL=https://xiehe.stellarmesh.net/ai/lateral/detect_and_keypoints
NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL=https://xiehe.stellarmesh.net/ai/lateral/detect
```

### 变量说明

- `NEXT_PUBLIC_API_URL`
  - 前端 Axios 基础地址
  - 应设置为站点根域名，不要再写旧公网 IP

- `NEXT_PUBLIC_WEBSOCKET_URL`
  - 当前主 WebSocket Hook 会在这个值后面自动拼接 `/{user_id}`
  - 因此这里应配置为 WebSocket **基础前缀**
  - 不要手动把用户 ID 写进去

- `NEXT_PUBLIC_AI_DETECT_*`
  - 页面使用 HTTPS 时，不能继续保留 `http://IP:8001` 或 `http://IP:8002`
  - 否则浏览器会出现混合内容拦截

## docker-compose.yml 中 frontend 环境变量的处理建议

推荐做法：

```yaml
frontend:
  build:
    args:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_WEBSOCKET_URL: ${NEXT_PUBLIC_WEBSOCKET_URL}
```

建议后续实施时按下面原则处理：

- 不再在 `frontend.environment` 中直接写 `NEXT_PUBLIC_*` 变量
- 使用根目录 `.env` 作为 Compose 和前端构建的统一变量来源
- 当前代码实际读取的是 `NEXT_PUBLIC_WEBSOCKET_URL`，不是 `NEXT_PUBLIC_WS_URL`
- `frontend/.env.production` 保留为默认生产配置，但实际 Docker 构建以 Compose 传入的 build args 为准

可选做法：

1. 统一只维护根目录 `.env`
2. 同步维护 `frontend/.env.production` 作为手动构建的默认值

## 实施顺序

推荐按以下顺序执行。

### 1. 修改根目录 `.env` 和前端生产变量

先更新：

- 根目录 `.env`
- `frontend/.env.production`

### 2. 修改 CPU2 的 docker-compose.yml

重点修改：

- `frontend` 端口绑定策略
- `backend` 端口绑定策略
- `backend.environment` 中加入 `FORWARDED_ALLOW_IPS`
- `mysql` 和 `redis` 不再暴露公网

### 3. 在 GPU1 上部署 Nginx 配置和证书

确认：

- `xiehe.stellarmesh.net` 已解析到 `GPU1`
- `GPU1` 可访问 `CPU2:3030`
- `GPU1` 可访问 `CPU2:8080`
- `GPU1` 可访问 AI 服务目标地址

### 4. 在 CPU2 重新构建并重启前端

由于前端是静态导出，修改根目录 `.env` 或 `frontend/.env.production` 后都必须重建：

```bash
docker compose build frontend
docker compose up -d frontend backend mysql redis
```

如果本次也改了 Compose 端口绑定，建议直接：

```bash
docker compose up -d --build
```

### 5. 验证 GPU1 入口

验证：

- `https://xiehe.stellarmesh.net` 页面可访问
- 前端静态资源可正常加载
- 登录、列表、上传等 `/api/` 请求正常
- WebSocket 功能正常
- AI 相关功能不出现浏览器 mixed content 错误

## 验证清单

### GPU1 验证

```bash
nginx -t
systemctl reload nginx
curl -I https://xiehe.stellarmesh.net
```

### CPU2 验证

```bash
docker compose ps
docker compose logs frontend --tail=100
docker compose logs backend --tail=100
curl http://<CPU2_PRIVATE_IP>:3030/health
curl http://<CPU2_PRIVATE_IP>:8080/health
```

### 浏览器验证

至少验证以下功能：

- 首页和登录页能打开
- 登录后基础页面能正常加载数据
- 文件上传能成功
- 实时数据和通知相关 WebSocket 能建立连接
- AI 测量和 AI 检测接口能正常返回

## 风险与注意事项

### 1. 前端变量是构建时生效

这是当前部署中最容易出错的点。

- 改了根目录 `.env` 或 `frontend/.env.production`
- 但没有重新 `build frontend`

则页面仍然会继续访问旧地址。

### 2. HTTPS 页面不能调用 HTTP AI 接口

如果页面通过 `https://xiehe.stellarmesh.net` 打开，而 AI 接口仍写成：

- `http://...:8001`
- `http://...:8002`

浏览器会直接拦截请求。

### 3. WebSocket 路径需要联调确认

当前代码里 WebSocket 相关路径存在多处写法，部署时应重点验证：

- 仪表板实时数据
- 通知中心
- 通知铃铛

本方案默认主 WebSocket 基础地址按当前 Hook 行为配置为：

```text
wss://xiehe.stellarmesh.net/api/v1/ws/ws
```

如果后续代码侧统一了 WebSocket 路径，文档也需要同步更新。

### 4. 建议用防火墙限制 CPU2 暴露面

即使 Compose 绑定在内网 IP 上，也建议在 `CPU2` 防火墙中限制：

- 仅允许 `GPU1` 访问 `3030`
- 仅允许 `GPU1` 访问 `8080`
- 禁止公网直接访问数据库和 Redis 端口

## 后续可选优化

当前方案以“最小改动上线”为目标。后续如果要继续收敛部署复杂度，可以再做第二阶段：

- 移除 `medical_frontend` 容器中的 Nginx
- 让 `GPU1` 直接托管前端静态文件
- `CPU2` 只保留 `backend/mysql/redis`

但这不属于本轮实施范围。
