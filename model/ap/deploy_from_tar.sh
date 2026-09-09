#!/bin/bash

# 脊柱分析 API - 从本地镜像部署脚本
# 使用方法: ./deploy_from_tar.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../scripts/deployment.sh"

# 配置
IMAGE_TAR="spine-analysis-api.tar"
IMAGE_NAME="spine-analysis-api:latest"
CONTAINER_NAME="spine-api"
PORT=8001

echo "🚀 开始从本地镜像部署脊柱分析 API 服务..."
echo ""

# 检查 Docker 是否已安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：未安装 Docker！"
    echo "请先安装 Docker"
    exit 1
fi

# 检查镜像文件是否存在
if [ ! -f "$IMAGE_TAR" ]; then
    echo "❌ 错误：未找到镜像文件 $IMAGE_TAR"
    echo "请先上传镜像文件到当前目录"
    exit 1
fi

# 加载 Docker 镜像
echo "📦 正在加载 Docker 镜像..."
docker load -i "$IMAGE_TAR"

# 停止并删除已存在的容器
if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    echo "🛑 正在停止现有容器..."
    docker stop "$CONTAINER_NAME"
    echo "🗑️  正在删除现有容器..."
    docker rm "$CONTAINER_NAME"
fi

# 运行容器
echo "🚀 正在启动容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:8001" \
    --restart unless-stopped \
    "$IMAGE_NAME"

echo "等待模型服务健康检查..."
wait_for_model_container "$CONTAINER_NAME"
echo "部署成功: http://localhost:$PORT"
