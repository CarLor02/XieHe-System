#!/bin/bash

# 脊柱分析 API - 从本地镜像部署脚本
# 使用方法: ./deploy_from_tar.sh

set -e

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
docker load -i $IMAGE_TAR

# 停止并删除已存在的容器
if docker ps -a | grep -q $CONTAINER_NAME; then
    echo "🛑 正在停止现有容器..."
    docker stop $CONTAINER_NAME || true
    echo "🗑️  正在删除现有容器..."
    docker rm $CONTAINER_NAME || true
fi

# 运行容器
echo "🚀 正在启动容器..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:8001 \
    --restart unless-stopped \
    $IMAGE_NAME

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
