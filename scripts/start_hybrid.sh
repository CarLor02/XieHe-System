#!/bin/bash

# XieHe医疗影像诊断系统 - 混合启动脚本
# 数据库使用Docker，前后端使用传统方式启动

set -e

echo "🏥 XieHe医疗影像诊断系统 - 混合模式启动"
echo "=============================================="
echo "📊 数据库: Docker容器"
echo "🔧 后端: 传统Python启动"
echo "🌐 前端: 传统Node.js启动"
echo ""

# 检查必要的工具
echo "🔍 检查系统环境..."

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker未安装"
    exit 1
fi

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: Python3未安装"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js未安装"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm未安装"
    exit 1
fi

echo "✅ 系统环境检查通过"

# 1. 启动数据库服务（Docker）
echo ""
echo "🗄️ 启动数据库服务..."
docker compose up -d mysql redis

# 等待数据库启动
echo "⏳ 等待数据库启动..."
timeout=60
counter=0
while ! docker exec medical_mysql mysqladmin ping -h localhost -u root -proot_password_2024 --silent 2>/dev/null; do
    if [ $counter -eq $timeout ]; then
        echo "❌ 数据库启动超时"
        docker compose logs mysql
        exit 1
    fi
    echo "   等待MySQL启动... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 1))
done

echo "✅ MySQL数据库启动成功"

# 等待Redis启动
timeout=30
counter=0
while ! docker exec medical_redis redis-cli ping 2>/dev/null | grep -q PONG; do
    if [ $counter -eq $timeout ]; then
        echo "❌ Redis启动超时"
        docker compose logs redis
        exit 1
    fi
    echo "   等待Redis启动... ($counter/$timeout)"
    sleep 1
    counter=$((counter + 1))
done

echo "✅ Redis缓存启动成功"

# 2. 启动后端服务（传统方式）
echo ""
echo "🔧 启动后端服务..."

# 检查虚拟环境
if [ ! -d "backend/venv-demo" ]; then
    echo "📦 创建Python虚拟环境..."
    cd backend
    python3 -m venv venv-demo
    source venv-demo/bin/activate
    pip install --upgrade pip
    pip install -r requirements-demo.txt
    cd ..
else
    echo "📦 使用现有虚拟环境..."
fi

# 启动后端
echo "🚀 启动FastAPI后端..."
cd backend
source venv-demo/bin/activate
python start_demo.py &
BACKEND_PID=$!
cd ..

echo "✅ 后端服务启动中... (PID: $BACKEND_PID)"

# 等待后端启动
echo "⏳ 等待后端服务启动..."
timeout=60
counter=0
while ! curl -f http://localhost:8000/health 2>/dev/null; do
    if [ $counter -eq $timeout ]; then
        echo "❌ 后端服务启动超时"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    echo "   等待后端启动... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 1))
done

echo "✅ 后端服务启动成功"

# 3. 启动前端服务（传统方式）
echo ""
echo "🌐 启动前端服务..."

# 检查node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd frontend
    npm install
    cd ..
else
    echo "📦 使用现有依赖..."
fi

# 启动前端
echo "🚀 启动Next.js前端..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ 前端服务启动中... (PID: $FRONTEND_PID)"

# 等待前端启动
echo "⏳ 等待前端服务启动..."
timeout=60
counter=0
while ! curl -f http://localhost:3000 2>/dev/null; do
    if [ $counter -eq $timeout ]; then
        echo "❌ 前端服务启动超时"
        kill $FRONTEND_PID 2>/dev/null || true
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    echo "   等待前端启动... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 1))
done

echo "✅ 前端服务启动成功"

# 4. 显示服务状态
echo ""
echo "📊 服务状态:"
echo "   🗄️  MySQL数据库: $(docker inspect medical_mysql --format='{{.State.Status}}')"
echo "   🔄 Redis缓存: $(docker inspect medical_redis --format='{{.State.Status}}')"
echo "   🔧 后端服务: 运行中 (PID: $BACKEND_PID)"
echo "   🌐 前端服务: 运行中 (PID: $FRONTEND_PID)"

# 5. 显示访问地址
echo ""
echo "🌐 访问地址:"
echo "   ✅ 前端界面: http://localhost:3000"
echo "   ✅ 后端API文档: http://localhost:8000/docs"
echo "   ✅ 健康检查: http://localhost:8000/health"
echo "   ✅ MySQL数据库: localhost:3307"
echo "   ✅ Redis缓存: localhost:6380"

# 6. 显示有用的命令
echo ""
echo "💡 管理命令:"
echo "   查看Docker日志: docker compose logs mysql redis"
echo "   停止数据库: docker compose stop mysql redis"
echo "   停止所有服务: ./scripts/stop_all.sh"
echo "   备份数据: ./scripts/backup_database.sh"

# 7. 保存进程ID
cat > .service_pids << EOF
BACKEND_PID=$BACKEND_PID
FRONTEND_PID=$FRONTEND_PID
EOF

# 8. 创建启动日志
cat > "startup_hybrid_log_$(date +%Y%m%d_%H%M%S).txt" << EOF
XieHe医疗影像诊断系统 - 混合模式启动日志
==========================================

启动时间: $(date)
启动方式: 混合模式 (数据库Docker + 应用传统)

服务状态:
- MySQL数据库: Docker容器 (端口 3307)
- Redis缓存: Docker容器 (端口 6380)  
- 后端服务: Python进程 (PID: $BACKEND_PID, 端口 8000)
- 前端服务: Node.js进程 (PID: $FRONTEND_PID, 端口 3000)

访问地址:
- 前端: http://localhost:3000
- 后端: http://localhost:8000
- 数据库: localhost:3307
- 缓存: localhost:6380

进程信息:
$(ps aux | grep -E "(start_demo|npm.*dev)" | grep -v grep || echo "进程信息获取失败")
EOF

echo ""
echo "🎉 XieHe医疗影像诊断系统启动完成！"
echo "📋 启动日志: startup_hybrid_log_$(date +%Y%m%d_%H%M%S).txt"
echo ""
echo "🔒 数据持久化说明:"
echo "   - MySQL和Redis数据存储在Docker volumes中"
echo "   - 即使容器重启，数据也不会丢失"
echo "   - 定期运行备份脚本: ./scripts/backup_database.sh"
echo ""
echo "⚠️  注意事项:"
echo "   - 使用 Ctrl+C 或 ./scripts/stop_all.sh 停止服务"
echo "   - 前后端进程在后台运行"
echo "   - 数据库使用Docker，重启系统后需要重新启动"

# 等待用户输入或信号
echo ""
echo "按 Ctrl+C 停止所有服务..."

# 捕获信号，优雅关闭
trap 'echo ""; echo "🛑 正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; docker compose stop mysql redis; echo "✅ 所有服务已停止"; exit 0' INT TERM

# 保持脚本运行
wait
