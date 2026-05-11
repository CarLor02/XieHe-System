#!/bin/bash
# 宿主机启动正面模型服务脚本
# 用于在宿主机（非 Docker 容器）环境下启动 zhengmian AI 服务

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录（假设脚本在 model/zhengmian/ 下）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOTENV_DIR="$PROJECT_ROOT/dotenv"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}启动正面模型服务（宿主机模式）${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 .env.storage 文件
if [ ! -f "$DOTENV_DIR/.env.storage" ]; then
    echo -e "${RED}错误: 未找到 $DOTENV_DIR/.env.storage${NC}"
    echo -e "${YELLOW}请从 .env.storage.example 创建 .env.storage 文件${NC}"
    exit 1
fi

# 读取 STORAGE_SERVICE_TOKEN
TOKEN=$(grep "^STORAGE_SERVICE_TOKEN=" "$DOTENV_DIR/.env.storage" | cut -d= -f2)
if [ -z "$TOKEN" ]; then
    echo -e "${RED}错误: STORAGE_SERVICE_TOKEN 未设置${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 读取到 STORAGE_SERVICE_TOKEN${NC}"

# 检查 storage-service 是否可访问
echo -e "${YELLOW}检查 storage-service 连接...${NC}"
if curl -s -f http://localhost:8090/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ storage-service 连接正常 (http://localhost:8090)${NC}"
else
    echo -e "${RED}✗ 无法连接到 storage-service (http://localhost:8090)${NC}"
    echo -e "${YELLOW}请确保 storage-service 容器正在运行并暴露端口 8090${NC}"
    echo -e "${YELLOW}参考: model/AI_HOST_DEPLOYMENT.md${NC}"
    exit 1
fi

# 设置环境变量
export STORAGE_SERVICE_URL="http://localhost:8090"
export STORAGE_SERVICE_TOKEN="$TOKEN"
export STORAGE_SERVICE_TIMEOUT="30"

echo -e "${GREEN}环境变量配置:${NC}"
echo -e "  STORAGE_SERVICE_URL=$STORAGE_SERVICE_URL"
echo -e "  STORAGE_SERVICE_TOKEN=***"
echo -e "  STORAGE_SERVICE_TIMEOUT=$STORAGE_SERVICE_TIMEOUT"

# 检查 Python 虚拟环境
PYTHON_BIN="${PYTHON_BIN:-/opt/miniconda3/envs/xiehe/bin/python}"
UVICORN_BIN="${UVICORN_BIN:-/opt/miniconda3/envs/xiehe/bin/uvicorn}"

if [ ! -f "$PYTHON_BIN" ]; then
    echo -e "${RED}错误: 未找到 Python: $PYTHON_BIN${NC}"
    echo -e "${YELLOW}请设置 PYTHON_BIN 环境变量或确保安装了 xiehe conda 环境${NC}"
    exit 1
fi

if [ ! -f "$UVICORN_BIN" ]; then
    echo -e "${RED}错误: 未找到 uvicorn: $UVICORN_BIN${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python 环境: $PYTHON_BIN${NC}"

# 切换到模型目录
cd "$SCRIPT_DIR"

# 启动服务
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}启动 Uvicorn 服务 (http://0.0.0.0:8001)${NC}"
echo -e "${GREEN}========================================${NC}"

exec "$UVICORN_BIN" app:app --host 0.0.0.0 --port 8001
