# 医疗影像诊断系统 - 前端应用 Docker 镜像
# 生产部署环境 - 安全加固版
#
# 作者: XieHe Medical System
# 更新时间: 2026-01-06

# ============================================
# 阶段1: 构建阶段
# ============================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 构建阶段代理配置。通过 compose build.args 注入，不写入最终运行镜像。
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG APK_MIRROR

# 安装系统依赖（包括 sharp 所需的构建工具）
RUN if [ -n "$APK_MIRROR" ]; then \
        sed -i "s/dl-cdn.alpinelinux.org/${APK_MIRROR}/g" /etc/apk/repositories; \
    fi && \
    apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    vips-dev \
    pkgconfig

# 复制package文件；使用根 lockfile 固定 workspace 依赖版本
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json

# 配置 npm 使用国内镜像，并避免构建阶段访问额外下载/审计服务
ENV CYPRESS_INSTALL_BINARY=0
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set replace-registry-host always && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 600000

ARG NPM_LOGLEVEL=warn
ARG NPM_FOREGROUND_SCRIPTS=false
ARG NPM_TIMING=false

# 安装前端 workspace 依赖（使用 --legacy-peer-deps 解决 React 19 兼容性问题）
# --mount=type=cache 把 npm 缓存留在宿主机，重建时跳过已下载的包
RUN --mount=type=cache,target=/root/.npm \
    if [ "$NPM_FOREGROUND_SCRIPTS" = "true" ]; then \
      npm ci --workspace frontend --legacy-peer-deps --no-audit --no-fund \
        --loglevel="$NPM_LOGLEVEL" --timing="$NPM_TIMING" --foreground-scripts; \
    else \
      npm ci --workspace frontend --legacy-peer-deps --no-audit --no-fund \
        --loglevel="$NPM_LOGLEVEL" --timing="$NPM_TIMING"; \
    fi

# 复制源代码
COPY frontend/ ./frontend/

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_VERSION
ARG NEXT_PUBLIC_AI_DETECT_URL
ARG NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL
ARG NEXT_PUBLIC_AI_DETECT_LATERAL_URL
ARG NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL
ARG NEXT_PUBLIC_SYNC_SERVICE_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_API_VERSION=${NEXT_PUBLIC_API_VERSION}
ENV NEXT_PUBLIC_AI_DETECT_URL=${NEXT_PUBLIC_AI_DETECT_URL}
ENV NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL=${NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL}
ENV NEXT_PUBLIC_AI_DETECT_LATERAL_URL=${NEXT_PUBLIC_AI_DETECT_LATERAL_URL}
ENV NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL=${NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL}
ENV NEXT_PUBLIC_SYNC_SERVICE_URL=${NEXT_PUBLIC_SYNC_SERVICE_URL}

# 删除API路由健康检查(改用主页检查)
RUN rm -rf frontend/app/api || true

# 安全加固: 构建前清理可疑文件和目录
RUN find frontend -name "*.sh" -type f ! -name "entrypoint.sh" ! -name "startup.sh" -delete 2>/dev/null || true && \
    find frontend -name "javae" -delete 2>/dev/null || true && \
    find frontend -name "xmrig" -delete 2>/dev/null || true && \
    rm -rf /tmp/.XIN-unix /tmp/.X11-unix /var/tmp/.unix 2>/dev/null || true

# 构建应用 - 输出到 out 目录（静态导出）
RUN npm run build --workspace frontend

# 安全加固: 构建后清理临时文件和可疑目录
RUN rm -rf /tmp/* /var/tmp/* 2>/dev/null || true

# ============================================
# 阶段2: 生产运行时 - Nginx 静态服务器 (无Node.js，更安全)
# ============================================
FROM nginx:alpine AS production

# 运行时镜像构建阶段同样需要 apk 下载 curl。
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG APK_MIRROR

# 安全加固: 移除所有可能被利用的工具
RUN rm -f /usr/bin/wget /bin/wget \
          /usr/bin/nc /bin/nc \
          /usr/bin/bash /bin/bash \
          /usr/bin/base64 /bin/base64 \
          /usr/bin/nohup /bin/nohup \
          /usr/bin/pkill /bin/pkill \
          /usr/bin/killall /bin/killall \
          /usr/sbin/cron /usr/sbin/crond \
          2>/dev/null || true

# 安装 curl 用于健康检查，gettext 提供 envsubst 生成运行时 Nginx 配置
RUN if [ -n "$APK_MIRROR" ]; then \
        sed -i "s/dl-cdn.alpinelinux.org/${APK_MIRROR}/g" /etc/apk/repositories; \
    fi && \
    apk add --no-cache curl gettext

# 安全加固: 清理恶意文件目录
RUN rm -rf /tmp/.XIN-unix /tmp/.X11-unix /tmp/.* \
           /var/tmp/.* /dev/shm/* \
           /etc/crontabs /var/spool/cron /etc/periodic \
           2>/dev/null || true

# 复制静态构建产物到Nginx目录
COPY --from=builder /app/frontend/out /usr/share/nginx/html

# 复制Nginx配置模板。启动时注入模型服务器 allowlist，避免把真实 IP 写进镜像。
COPY frontend/nginx.conf /etc/nginx/nginx.conf.template

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动Nginx
CMD ["/bin/sh", "-c", "export MODEL_STORAGE_ALLOWED_CIDR=\"${MODEL_STORAGE_ALLOWED_CIDR:-127.0.0.1/32}\" && envsubst '$$MODEL_STORAGE_ALLOWED_CIDR' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
