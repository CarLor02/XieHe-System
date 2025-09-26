#!/bin/bash
# Git 配置脚本
# 用于设置项目的Git配置和hooks

set -e

echo "🔧 配置Git环境..."

# 检查是否在Git仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ 当前目录不是Git仓库"
    exit 1
fi

# 设置提交信息模板
echo "📝 设置提交信息模板..."
git config commit.template .gitmessage
echo "✅ 提交信息模板已设置"

# 设置Git hooks
echo "🪝 设置Git hooks..."
HOOKS_DIR=".git/hooks"

# 复制commit-msg hook
if [ -f "scripts/git-hooks/commit-msg" ]; then
    cp scripts/git-hooks/commit-msg "$HOOKS_DIR/commit-msg"
    chmod +x "$HOOKS_DIR/commit-msg"
    echo "✅ commit-msg hook已安装"
else
    echo "⚠️  commit-msg hook文件不存在"
fi

# 设置项目级Git配置
echo "⚙️  设置项目Git配置..."

# 设置默认分支
git config init.defaultBranch main

# 设置推送策略
git config push.default simple

# 启用rerere（重用记录的冲突解决）
git config rerere.enabled true

# 设置分支自动跟踪
git config branch.autosetupmerge always
git config branch.autosetuprebase always

# 启用颜色输出
git config color.ui auto

echo "✅ 项目Git配置完成"

# 显示当前配置
echo ""
echo "📋 当前Git配置:"
echo "提交模板: $(git config commit.template)"
echo "默认分支: $(git config init.defaultBranch)"
echo "推送策略: $(git config push.default)"
echo "Rerere启用: $(git config rerere.enabled)"
echo "颜色输出: $(git config color.ui)"

echo ""
echo "🎉 Git环境配置完成！"
echo ""
echo "📖 使用说明:"
echo "1. 提交时会自动使用模板格式"
echo "2. 提交信息会自动检查格式"
echo "3. 使用 'git commit' 会打开编辑器显示模板"
echo "4. 遵循提交信息规范: <type>(<scope>): <subject>"
echo ""
echo "💡 提示:"
echo "- 查看提交模板: cat .gitmessage"
echo "- 查看Git工作流规范: docs/git-workflow.md"
