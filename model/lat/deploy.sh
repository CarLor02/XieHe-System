#!/bin/bash

# 脊柱侧弯分析 API - Docker 部署脚本
# 使用方法: ./deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$SCRIPT_DIR/.env.build" ]; then
    set -a
    source "$SCRIPT_DIR/.env.build"
    set +a
fi

: "${IMAGE_NAME:?IMAGE_NAME is required}"

# 配置
CONTAINER_NAME="${CONTAINER_NAME:-spine-scoliosis-api}"
PORT="${PORT:-8002}"

echo "🚀 开始部署脊柱侧弯分析 API 服务..."
echo ""

# 检查 Docker 是否已安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：未安装 Docker！"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 models 目录是否存在
if [ ! -d "$SCRIPT_DIR/models" ]; then
    echo "❌ 错误：未找到 models/ 目录！"
    echo "请确保模型文件在 models/ 目录中"
    exit 1
fi

# 检查模型文件是否存在
if [ ! -f "$SCRIPT_DIR/models/corner_model.pt" ] || [ ! -f "$SCRIPT_DIR/models/cfh_model.pt" ]; then
    echo "⚠️  警告：在 models/ 目录中未找到模型文件"
    echo "期望的文件: corner_model.pt, cfh_model.pt"
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 停止并删除已存在的容器
if docker ps -a | grep -q $CONTAINER_NAME; then
    echo "🛑 正在停止现有容器..."
    docker stop $CONTAINER_NAME || true
    echo "🗑️  正在删除现有容器..."
    docker rm $CONTAINER_NAME || true
fi

# 删除旧镜像
if docker images | grep -q $IMAGE_NAME; then
    echo "🗑️  正在删除旧镜像..."
    docker rmi $IMAGE_NAME || true
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

# 运行容器
echo "🚀 正在启动容器..."
RUN_ARGS=(
    -d
    --name "$CONTAINER_NAME"
    -p "$PORT:8002"
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

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查容器状态
if docker ps | grep -q $CONTAINER_NAME; then
    echo ""
    echo "✅ 部署成功！"
    echo ""
    echo "📊 容器状态："
    docker ps | grep $CONTAINER_NAME
    echo ""
    echo "🌐 服务运行地址："
    echo "   - 本地访问: http://localhost:$PORT"
    echo "   - 健康检查: http://localhost:$PORT/health"
    echo "   - API 文档: http://localhost:$PORT/docs"
    echo ""
    echo "📝 常用命令："
    echo "   - 查看日志: docker logs -f $CONTAINER_NAME"
    echo "   - 停止服务: docker stop $CONTAINER_NAME"
    echo "   - 启动服务: docker start $CONTAINER_NAME"
    echo "   - 删除容器: docker rm -f $CONTAINER_NAME"
    echo ""
else
    echo ""
    echo "❌ 部署失败！"
    echo "查看日志: docker logs $CONTAINER_NAME"
    exit 1
fi
