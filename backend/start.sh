#!/bin/bash
# XieHe 医疗影像诊断系统 - 启动脚本
# 用于 Linux/Mac

echo ""
echo "========================================"
echo "  XieHe 医疗影像诊断系统"
echo "  Medical Imaging Diagnosis System"
echo "========================================"
echo ""

# 检查是否在 backend 目录
if [ ! -f "app/main.py" ]; then
    echo "❌ 错误: 请在 backend 目录下运行此脚本"
    echo ""
    echo "正确的运行方式:"
    echo "  cd backend"
    echo "  ./start.sh"
    echo ""
    exit 1
fi

echo "✅ 当前目录正确"
echo ""

# 检查 uvicorn 是否安装
echo "🔍 检查依赖..."
if ! python -c "import uvicorn" 2>/dev/null; then
    echo "❌ uvicorn 未安装，正在安装..."
    pip install uvicorn
fi

echo "✅ 依赖检查完成"
echo ""

# 显示启动信息
echo "========================================"
echo "🚀 启动应用..."
echo "========================================"
echo ""
echo "📍 访问地址:"
echo "   - API 文档:    http://localhost:8000/api/v1/docs"
echo "   - ReDoc 文档:  http://localhost:8000/api/v1/redoc"
echo "   - 健康检查:    http://localhost:8000/health"
echo "   - 根路径:      http://localhost:8000/"
echo ""
echo "⚙️  配置信息:"
echo "   - 环境: xiehe"
echo "   - 端口: 8000"
echo "   - 热重载: 启用"
echo ""
echo "💡 提示: 按 Ctrl+C 停止服务器"
echo ""
echo "========================================"
echo ""

# 启动应用
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

