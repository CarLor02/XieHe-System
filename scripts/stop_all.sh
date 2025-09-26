#!/bin/bash

# XieHe医疗影像诊断系统 - 停止所有服务脚本

echo "🛑 停止XieHe医疗影像诊断系统所有服务..."

# 1. 停止前后端进程
if [ -f ".service_pids" ]; then
    echo "📋 读取服务进程ID..."
    source .service_pids
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo "🔧 停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || echo "   后端进程已停止或不存在"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "🌐 停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || echo "   前端进程已停止或不存在"
    fi
    
    rm -f .service_pids
else
    echo "⚠️  未找到进程ID文件，尝试通过进程名停止..."
    
    # 通过进程名停止
    echo "🔧 停止Python后端进程..."
    pkill -f "start_demo.py" 2>/dev/null || echo "   未找到后端进程"
    
    echo "🌐 停止Node.js前端进程..."
    pkill -f "npm.*dev" 2>/dev/null || echo "   未找到前端进程"
    pkill -f "next.*dev" 2>/dev/null || echo "   未找到Next.js进程"
fi

# 2. 停止Docker服务
echo "🐳 停止Docker服务..."
docker compose stop 2>/dev/null || echo "   Docker服务已停止或未运行"

# 3. 清理端口占用（可选）
echo "🧹 检查端口占用..."
for port in 3000 8000; do
    pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo "   停止占用端口 $port 的进程 (PID: $pid)..."
        kill $pid 2>/dev/null || true
    fi
done

# 4. 显示最终状态
echo ""
echo "📊 服务状态检查:"

# 检查Docker容器
if docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | grep -q "Up"; then
    echo "⚠️  仍有Docker容器在运行:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}"
else
    echo "✅ 所有Docker容器已停止"
fi

# 检查端口占用
echo ""
echo "🔍 端口占用检查:"
for port in 3000 8000 3307 6380; do
    if lsof -i:$port 2>/dev/null | grep -q LISTEN; then
        echo "⚠️  端口 $port 仍被占用:"
        lsof -i:$port 2>/dev/null | grep LISTEN
    else
        echo "✅ 端口 $port 已释放"
    fi
done

echo ""
echo "🎉 XieHe医疗影像诊断系统已停止！"
echo ""
echo "💡 提示:"
echo "   - 数据已安全保存在Docker volumes中"
echo "   - 重新启动: ./scripts/start_hybrid.sh"
echo "   - 完全清理: docker compose down -v (⚠️ 会删除数据)"
