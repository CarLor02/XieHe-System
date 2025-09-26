# 医疗影像诊断系统项目管理 Makefile

.PHONY: help progress summary query update-task start-task complete-task test-task setup-git report dashboard

# 默认目标
help:
	@echo "医疗影像诊断系统项目管理命令"
	@echo ""
	@echo "可用命令:"
	@echo "  help          显示此帮助信息"
	@echo "  progress      查看项目进度文档"
	@echo "  summary       显示任务统计摘要"
	@echo "  query         查询任务 (需要参数)"
	@echo "  update-task   更新任务状态 (需要参数)"
	@echo "  start-task    开始任务 (需要TASK_ID参数)"
	@echo "  complete-task 完成任务 (需要TASK_ID参数)"
	@echo "  test-task     测试任务 (需要TASK_ID和TEST_STATUS参数)"
	@echo "  setup-git     配置Git环境和hooks"
	@echo "  report        生成项目进度报告"
	@echo "  dashboard     生成项目仪表板"
	@echo ""
	@echo "示例:"
	@echo "  make summary"
	@echo "  make query ARGS='--stage 1'"
	@echo "  make start-task TASK_ID=hBx19u6Pgd8yb2QMuuXP2V"
	@echo "  make complete-task TASK_ID=hBx19u6Pgd8yb2QMuuXP2V"
	@echo "  make test-task TASK_ID=hBx19u6Pgd8yb2QMuuXP2V TEST_STATUS=TEST_PASSED"

# 查看项目进度文档
progress:
	@if [ -f docs/project-progress.md ]; then \
		cat docs/project-progress.md; \
	else \
		echo "❌ 找不到项目进度文档"; \
	fi

# 显示任务统计摘要
summary:
	@python3 scripts/query_tasks.py --summary

# 查询任务 (需要通过ARGS传递参数)
query:
	@python3 scripts/query_tasks.py $(ARGS)

# 更新任务状态 (需要通过ARGS传递参数)
update-task:
	@python3 scripts/update_task_status.py $(ARGS)

# 开始任务 (标记为进行中)
start-task:
	@if [ -z "$(TASK_ID)" ]; then \
		echo "❌ 请提供TASK_ID参数"; \
		echo "示例: make start-task TASK_ID=hBx19u6Pgd8yb2QMuuXP2V"; \
	else \
		python3 scripts/update_task_status.py $(TASK_ID) IN_PROGRESS; \
	fi

# 完成任务 (标记为已完成)
complete-task:
	@if [ -z "$(TASK_ID)" ]; then \
		echo "❌ 请提供TASK_ID参数"; \
		echo "示例: make complete-task TASK_ID=hBx19u6Pgd8yb2QMuuXP2V"; \
	else \
		python3 scripts/update_task_status.py $(TASK_ID) COMPLETED; \
	fi

# 测试任务 (更新测试状态)
test-task:
	@if [ -z "$(TASK_ID)" ] || [ -z "$(TEST_STATUS)" ]; then \
		echo "❌ 请提供TASK_ID和TEST_STATUS参数"; \
		echo "示例: make test-task TASK_ID=hBx19u6Pgd8yb2QMuuXP2V TEST_STATUS=TEST_PASSED"; \
	else \
		python3 scripts/update_task_status.py $(TASK_ID) COMPLETED $(TEST_STATUS); \
	fi

# 查看特定阶段的任务
stage1:
	@python3 scripts/query_tasks.py --stage 1

stage2:
	@python3 scripts/query_tasks.py --stage 2

stage3:
	@python3 scripts/query_tasks.py --stage 3

stage4:
	@python3 scripts/query_tasks.py --stage 4

stage5:
	@python3 scripts/query_tasks.py --stage 5

stage6:
	@python3 scripts/query_tasks.py --stage 6

# 查看不同状态的任务
todo:
	@python3 scripts/query_tasks.py --status NOT_STARTED

doing:
	@python3 scripts/query_tasks.py --status IN_PROGRESS

done:
	@python3 scripts/query_tasks.py --status COMPLETED

# 项目初始化
init:
	@echo "🚀 初始化项目环境..."
	@mkdir -p docs/api docs/architecture docs/deployment docs/user-guide
	@mkdir -p backend/app backend/models backend/api backend/core backend/tests
	@mkdir -p frontend/lib frontend/hooks frontend/types frontend/utils
	@mkdir -p tests/unit tests/integration tests/e2e
	@mkdir -p docker scripts
	@chmod +x scripts/*.py
	@echo "✅ 项目目录结构已创建"

# 检查Python环境
check-env:
	@echo "🔍 检查Python环境..."
	@python3 --version
	@echo "📁 检查项目文件..."
	@ls -la docs/project-progress.md scripts/
	@echo "✅ 环境检查完成"

# 配置Git环境
setup-git:
	@echo "🔧 配置Git环境..."
	@if [ -f scripts/setup-git.sh ]; then \
		bash scripts/setup-git.sh; \
	else \
		echo "❌ 找不到Git配置脚本"; \
	fi

# 生成项目进度报告
report:
	@echo "📊 生成项目进度报告..."
	@python3 scripts/progress_tracker.py --full

# 生成项目仪表板
dashboard:
	@echo "📈 生成项目仪表板..."
	@python3 scripts/generate_dashboard.py
	@echo "🌐 在浏览器中打开 dashboard.html 查看仪表板"

# 清理临时文件
clean:
	@echo "🧹 清理临时文件..."
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete
	@echo "✅ 清理完成"
