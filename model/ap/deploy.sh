#!/bin/bash

# 脊柱分析 API - Docker 部署脚本
# 使用方法: ./deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$MODEL_ROOT/scripts/deployment.sh"

if [ -f "$SCRIPT_DIR/.env.build" ]; then
    set -a
    source "$SCRIPT_DIR/.env.build"
    set +a
fi

: "${IMAGE_NAME:?IMAGE_NAME is required}"

# 配置
CONTAINER_NAME="${CONTAINER_NAME:-spine-api}"
PORT="${PORT:-8001}"

echo "🚀 开始部署脊柱分析 API 服务..."
echo ""

# 检查 Docker 是否已安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：未安装 Docker！"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 weights 目录是否存在
if [ ! -d "$SCRIPT_DIR/weights" ]; then
    echo "❌ 错误：未找到 weights/ 目录！"
    echo "请确保模型权重文件在 weights/ 目录中"
    exit 1
fi

# 检查模型文件是否存在
if [ ! -f "$SCRIPT_DIR/weights/pose.pt" ] || [ ! -f "$SCRIPT_DIR/weights/pose_corner.pt" ]; then
    echo "⚠️  警告：在 weights/ 目录中未找到模型权重文件"
    echo "期望的文件: pose.pt, pose_corner.pt"
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 构建 Docker 镜像
echo "🔨 正在构建 Docker 镜像..."
BUILD_ARGS=(
    --add-host=host.docker.internal:host-gateway
    --build-arg "WEIGHTS_CACHE_BUST=$(date +%s)"
)

# 只有配置了 PROXY_PORT 才启用代理
if [ -n "${PROXY_PORT:-}" ]; then
    PROXY_HOST="${PROXY_HOST:-host.docker.internal}"

    BUILD_ARGS+=(
        --build-arg "HTTP_PROXY=http://${PROXY_HOST}:${PROXY_PORT}"
        --build-arg "HTTPS_PROXY=http://${PROXY_HOST}:${PROXY_PORT}"
        --build-arg "ALL_PROXY=socks5://${PROXY_HOST}:${PROXY_PORT}"
        --build-arg "NO_PROXY=localhost,127.0.0.1,.local"
    )
fi

docker build "${BUILD_ARGS[@]}" -f "$SCRIPT_DIR/Dockerfile" -t "$IMAGE_NAME" "$MODEL_ROOT"

# 构建失败时保留旧服务；镜像构建成功后才替换容器。
if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    docker stop "$CONTAINER_NAME"
    docker rm "$CONTAINER_NAME"
fi

# 运行容器
echo "🚀 正在启动容器..."
RUN_ARGS=(
    -d
    --name "$CONTAINER_NAME"
    -p "$PORT:8001"
    --restart unless-stopped
)

if [ -n "${STORAGE_SERVICE_URL:-}" ]; then
    RUN_ARGS+=(-e "STORAGE_SERVICE_URL=${STORAGE_SERVICE_URL}")
fi

if [ -n "${STORAGE_SERVICE_TOKEN:-}" ]; then
    RUN_ARGS+=(-e "STORAGE_SERVICE_TOKEN=${STORAGE_SERVICE_TOKEN}")
fi

if [ -n "${STORAGE_SERVICE_TIMEOUT:-}" ]; then
    RUN_ARGS+=(-e "STORAGE_SERVICE_TIMEOUT=${STORAGE_SERVICE_TIMEOUT}")
fi

if [ -n "${NO_PROXY:-}" ]; then
    RUN_ARGS+=(-e "NO_PROXY=${NO_PROXY}")
fi

if [ -n "${no_proxy:-}" ]; then
    RUN_ARGS+=(-e "no_proxy=${no_proxy}")
fi

docker run "${RUN_ARGS[@]}" "$IMAGE_NAME"

echo "等待模型服务健康检查..."
wait_for_model_container "$CONTAINER_NAME"
echo "部署成功: http://localhost:$PORT"
echo "查看日志: docker logs -f $CONTAINER_NAME"
