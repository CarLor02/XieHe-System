# 后端Docker镜像构建文件
#
# 基于Python 3.11构建FastAPI应用
#
# 作者: XieHe Medical System
# 创建时间: 2025-09-25
# 更新时间: 2025-12-15

FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.1 /uv /uvx /bin/

# 设置工作目录
WORKDIR /app

# 构建阶段代理和 Python 包索引配置。通过 compose build.args 注入，不写入最终运行环境。
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG PIP_INDEX_URL
ARG PIP_EXTRA_INDEX_URL
ARG PIP_TRUSTED_HOST
ARG PIP_TIMEOUT=120
# 可选：替换 apt 源（如 mirrors.tuna.tsinghua.edu.cn）
ARG APT_MIRROR=

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH" \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# 安装系统依赖（编译和运行时都需要）。apt 列表和下载包只保留在 builder 缓存中。
RUN --mount=type=cache,id=xiehe-backend-apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=xiehe-backend-apt-lib,target=/var/lib/apt,sharing=locked \
    if [ -n "$APT_MIRROR" ]; then \
        sed -i "s|deb.debian.org|${APT_MIRROR}|g" /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
        sed -i "s|deb.debian.org|${APT_MIRROR}|g" /etc/apt/sources.list 2>/dev/null || true; \
    fi && \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache && \
    apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    default-libmysqlclient-dev \
    pkg-config \
    libffi-dev \
    libssl-dev \
    curl

# 先按锁文件安装运行时依赖，以保持本地和镜像环境一致并复用构建缓存。
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,id=xiehe-backend-uv,target=/root/.cache/uv,sharing=locked \
    UV_INDEX_URL="${PIP_INDEX_URL:-https://pypi.org/simple}" \
    UV_EXTRA_INDEX_URL="$PIP_EXTRA_INDEX_URL" \
    UV_INSECURE_HOST="$PIP_TRUSTED_HOST" \
    UV_HTTP_TIMEOUT="$PIP_TIMEOUT" \
    uv sync --frozen --no-dev --no-install-project

# 复制应用代码
COPY backend/ .

# 复制启动脚本
COPY infrastructure/docker/backend-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 创建必要的目录
RUN mkdir -p logs storage/images storage/reports storage/temp && \
    chmod -R 755 logs storage

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 暴露端口
EXPOSE 8080

# 使用启动脚本（会自动初始化数据库）
ENTRYPOINT ["/entrypoint.sh"]
