#!/bin/bash
echo "🚀 激活协和医疗影像诊断系统开发环境..."
source venv/bin/activate
echo "✅ 虚拟环境已激活!"
echo "💡 使用 'deactivate' 命令退出虚拟环境"
exec "$SHELL"
