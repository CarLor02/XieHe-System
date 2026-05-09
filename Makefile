# 医疗影像诊断系统项目管理 Makefile

.PHONY: help setup start stop status logs test format lint clean backup restore

# 默认目标
help:
	@echo "🏥 医疗影像诊断系统项目管理命令"
	@echo ""
	@echo "🚀 开发环境:"
	@echo "  setup         初始化项目环境"
	@echo "  start         启动所有服务"
	@echo "  stop          停止所有服务"
	@echo "  status        查看服务状态"
	@echo "  logs          查看服务日志"
	@echo ""
	@echo "🧪 测试相关:"
	@echo "  test          运行所有测试"
	@echo "  test-frontend 运行前端测试"
	@echo "  test-backend  运行后端测试"
	@echo "  test-e2e      运行端到端测试"
	@echo ""
	@echo "🔧 代码质量:"
	@echo "  format        格式化代码"
	@echo "  lint          代码检查"
	@echo "  type-check    类型检查"
	@echo ""
	@echo "🗄️ 数据管理:"
	@echo "  backup        备份数据库"
	@echo "  restore       恢复数据库"
	@echo "  clean         清理临时文件"
	@echo ""
	@echo "📊 项目管理:"
	@echo "  progress      查看项目进度"
	@echo "  dashboard     生成项目仪表板"

# 🚀 开发环境管理
setup:
	@echo "🔧 初始化项目环境..."
	@npm install
	@cd frontend && npm install
	@cd backend && pip install -r requirements.txt
	@echo "✅ 环境初始化完成"

start:
	@echo "🚀 启动所有服务..."
	@./scripts/compose.sh up -d
	@echo "✅ 服务启动完成"
	@echo "🌐 前端: http://localhost:3000"
	@echo "🔌 后端: http://localhost:8080"
	@echo "📚 API文档: http://localhost:8080/docs"

stop:
	@echo "🛑 停止所有服务..."
	@./scripts/compose.sh down
	@echo "✅ 服务已停止"

status:
	@echo "📊 服务状态:"
	@./scripts/compose.sh ps

logs:
	@echo "📋 查看服务日志:"
	@./scripts/compose.sh logs -f

# 🧪 测试相关
test:
	@echo "🧪 运行所有测试..."
	@npm run test

test-frontend:
	@echo "🧪 运行前端测试..."
	@npm run test:frontend

test-backend:
	@echo "🧪 运行后端测试..."
	@npm run test:backend

test-e2e:
	@echo "🧪 运行端到端测试..."
	@npm run test:e2e

# 🔧 代码质量
format:
	@echo "🎨 格式化代码..."
	@npm run format

lint:
	@echo "🔍 代码检查..."
	@npm run lint

type-check:
	@echo "🔍 类型检查..."
	@cd frontend && npm run type-check

# 🗄️ 数据管理
backup:
	@echo "💾 备份数据库..."
	@if [ -f scripts/backup_database.sh ]; then \
		bash scripts/backup_database.sh; \
	else \
		echo "❌ 找不到备份脚本"; \
	fi

restore:
	@echo "🔄 恢复数据库..."
	@if [ -f scripts/restore_database.sh ]; then \
		bash scripts/restore_database.sh; \
	else \
		echo "❌ 找不到恢复脚本"; \
	fi

# 📊 项目管理
progress:
	@echo "📈 查看项目进度..."
	@if [ -f docs/project-progress.md ]; then \
		head -50 docs/project-progress.md; \
	else \
		echo "❌ 找不到项目进度文档"; \
	fi

dashboard:
	@echo "📊 生成项目仪表板..."
	@if [ -f scripts/generate_dashboard.py ]; then \
		python3 scripts/generate_dashboard.py; \
		echo "🌐 在浏览器中打开 dashboard.html 查看仪表板"; \
	else \
		echo "❌ 找不到仪表板生成脚本"; \
	fi

# 🧹 清理
clean:
	@echo "🧹 清理临时文件..."
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.log" -delete
	@find . -name ".DS_Store" -delete
	@docker system prune -f
	@echo "✅ 清理完成"

# 🔧 开发工具
dev:
	@echo "🚀 启动开发环境..."
	@npm run dev

build:
	@echo "🏗️ 构建项目..."
	@npm run build

deploy:
	@echo "🚀 部署项目..."
	@if [ -f scripts/deploy.sh ]; then \
		bash scripts/deploy.sh; \
	else \
		echo "❌ 找不到部署脚本"; \
	fi

# 📋 信息查看
info:
	@echo "ℹ️ 项目信息:"
	@echo "  名称: 医疗影像诊断系统"
	@echo "  技术栈: Next.js + FastAPI + MySQL + Redis"
	@echo "  前端端口: 3000"
	@echo "  后端端口: 8000"
	@echo "  数据库: MySQL (3306)"
	@echo "  缓存: Redis (6379)"
