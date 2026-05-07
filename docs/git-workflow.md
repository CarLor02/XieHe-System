# Git 工作流规范

## 📋 概述

本文档定义了医疗影像诊断系统项目的Git工作流规范，包括分支策略、提交信息规范、代码审查流程等。遵循这些规范将确保代码版本管理的规范性和团队协作的高效性。

## 🌳 分支策略

### 分支模型
我们采用 **Git Flow** 分支模型，包含以下分支类型：

```
main (生产分支)
├── develop (开发分支)
│   ├── feature/user-auth (功能分支)
│   ├── feature/patient-management (功能分支)
│   └── feature/image-processing (功能分支)
├── release/v1.0.0 (发布分支)
└── hotfix/critical-bug-fix (热修复分支)
```

### 分支说明

#### 1. main 分支
- **用途**: 生产环境代码
- **特点**: 始终保持稳定，可随时部署
- **保护**: 禁止直接推送，只能通过 PR 合并
- **标签**: 每次发布都打上版本标签

#### 2. develop 分支
- **用途**: 开发环境代码集成
- **特点**: 包含最新的开发功能
- **来源**: 从 main 分支创建
- **合并**: 接收 feature 分支的合并

#### 3. feature 分支
- **用途**: 新功能开发
- **命名**: `feature/功能名称`
- **来源**: 从 develop 分支创建
- **合并**: 完成后合并回 develop 分支

#### 4. release 分支
- **用途**: 发布准备
- **命名**: `release/版本号`
- **来源**: 从 develop 分支创建
- **合并**: 同时合并到 main 和 develop

#### 5. hotfix 分支
- **用途**: 紧急修复生产问题
- **命名**: `hotfix/问题描述`
- **来源**: 从 main 分支创建
- **合并**: 同时合并到 main 和 develop

### 分支命名规范

```bash
# 功能分支
feature/user-authentication
feature/patient-management
feature/dicom-image-viewer

# 发布分支
release/v1.0.0
release/v1.1.0

# 热修复分支
hotfix/login-security-fix
hotfix/database-connection-issue

# 修复分支
bugfix/patient-search-error
bugfix/image-upload-timeout
```

## 📝 提交信息规范

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型 (type)
- **feat**: 新功能
- **fix**: 修复bug
- **docs**: 文档更新
- **style**: 代码格式调整（不影响功能）
- **refactor**: 代码重构
- **perf**: 性能优化
- **test**: 测试相关
- **chore**: 构建过程或辅助工具的变动
- **ci**: CI/CD 相关
- **build**: 构建系统或外部依赖的变动

### 作用域 (scope)
- **auth**: 认证相关
- **patient**: 患者管理
- **image**: 影像处理
- **api**: API接口
- **ui**: 用户界面
- **db**: 数据库
- **config**: 配置文件

### 提交信息示例

#### 好的提交信息 ✅
```bash
feat(auth): 添加JWT令牌刷新功能

- 实现令牌自动刷新机制
- 添加令牌过期检查
- 更新前端认证状态管理

Closes #123
```

```bash
fix(patient): 修复患者搜索分页问题

修复在搜索患者时分页参数错误导致的查询失败问题

Fixes #456
```

```bash
docs(api): 更新患者管理API文档

- 添加新增患者接口说明
- 更新响应格式示例
- 修正参数类型描述
```

#### 不好的提交信息 ❌
```bash
# 太简单，没有说明具体做了什么
fix bug

# 没有遵循格式规范
Fixed the login issue and updated some docs

# 一次提交包含多个不相关的变更
feat: add user auth and fix patient search and update docs
```

### 提交信息模板
创建 `.gitmessage` 文件作为提交信息模板：

```bash
# <type>(<scope>): <subject>
# 
# <body>
# 
# <footer>

# type: feat, fix, docs, style, refactor, perf, test, chore, ci, build
# scope: auth, patient, image, api, ui, db, config
# subject: 简洁描述，不超过50字符，首字母小写，结尾不加句号
# 
# body: 详细描述变更内容，每行不超过72字符
# 
# footer: 关联的issue或breaking changes
# 例如: Closes #123, Fixes #456, BREAKING CHANGE: API接口变更
```

配置Git使用模板：
```bash
git config commit.template .gitmessage
```

## 🔄 工作流程

### 功能开发流程

#### 1. 创建功能分支
```bash
# 切换到develop分支并更新
git checkout develop
git pull origin develop

# 创建功能分支
git checkout -b feature/patient-management

# 推送分支到远程
git push -u origin feature/patient-management
```

#### 2. 开发和提交
```bash
# 进行开发工作
# ...

# 添加变更
git add .

# 提交变更
git commit -m "feat(patient): 实现患者信息CRUD功能

- 添加患者创建接口
- 实现患者信息查询
- 添加患者信息更新功能
- 实现患者删除功能

Closes #123"

# 推送到远程分支
git push origin feature/patient-management
```

#### 3. 创建Pull Request
- 在GitHub/GitLab上创建PR
- 填写PR模板
- 指定审查人员
- 关联相关Issue

#### 4. 代码审查
- 审查人员进行代码审查
- 提出修改建议
- 开发者根据建议修改代码
- 重新推送更新

#### 5. 合并分支
```bash
# 审查通过后，合并到develop分支
# 使用Squash and Merge保持提交历史清洁

# 删除功能分支
git branch -d feature/patient-management
git push origin --delete feature/patient-management
```

### 发布流程

#### 1. 创建发布分支
```bash
# 从develop创建发布分支
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0
git push -u origin release/v1.0.0
```

#### 2. 发布准备
```bash
# 更新版本号
# 更新CHANGELOG.md
# 进行最终测试
# 修复发现的问题

git add .
git commit -m "chore(release): 准备v1.0.0发布

- 更新版本号到1.0.0
- 更新变更日志
- 修复发布前发现的问题"
```

#### 3. 合并到主分支
```bash
# 合并到main分支
git checkout main
git pull origin main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# 合并回develop分支
git checkout develop
git merge --no-ff release/v1.0.0
git push origin develop

# 删除发布分支
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

### 热修复流程

#### 1. 创建热修复分支
```bash
# 从main创建热修复分支
git checkout main
git pull origin main
git checkout -b hotfix/login-security-fix
git push -u origin hotfix/login-security-fix
```

#### 2. 修复问题
```bash
# 进行紧急修复
# ...

git add .
git commit -m "fix(auth): 修复登录安全漏洞

修复JWT令牌验证绕过的安全问题

Fixes #789"
git push origin hotfix/login-security-fix
```

#### 3. 合并和发布
```bash
# 合并到main分支
git checkout main
git merge --no-ff hotfix/login-security-fix
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

# 合并到develop分支
git checkout develop
git merge --no-ff hotfix/login-security-fix
git push origin develop

# 删除热修复分支
git branch -d hotfix/login-security-fix
git push origin --delete hotfix/login-security-fix
```

## 👥 代码审查规范

### Pull Request 模板
```markdown
## 变更描述
简要描述本次变更的内容和目的

## 变更类型
- [ ] 新功能 (feature)
- [ ] 修复bug (fix)
- [ ] 文档更新 (docs)
- [ ] 代码重构 (refactor)
- [ ] 性能优化 (perf)
- [ ] 测试相关 (test)
- [ ] 其他 (chore)

## 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成
- [ ] 添加了新的测试用例

## 检查清单
- [ ] 代码遵循项目编码规范
- [ ] 提交信息符合规范
- [ ] 文档已更新
- [ ] 无明显的性能问题
- [ ] 无安全隐患

## 关联Issue
Closes #123
Fixes #456

## 截图/演示
如果有UI变更，请提供截图或演示视频

## 其他说明
其他需要说明的内容
```

### 审查要点
1. **代码质量**
   - 代码逻辑正确
   - 遵循编码规范
   - 无明显性能问题
   - 错误处理完善

2. **测试覆盖**
   - 关键功能有测试
   - 测试用例充分
   - 边界条件考虑

3. **文档更新**
   - API文档更新
   - 用户文档更新
   - 代码注释完善

4. **安全考虑**
   - 输入验证
   - 权限检查
   - 敏感信息保护

## 🛠️ Git 配置

### 全局配置
```bash
# 设置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 设置默认编辑器
git config --global core.editor "code --wait"

# 设置提交信息模板
git config --global commit.template ~/.gitmessage

# 设置默认分支名
git config --global init.defaultBranch main

# 启用颜色输出
git config --global color.ui auto

# 设置换行符处理
git config --global core.autocrlf input  # Linux/Mac
git config --global core.autocrlf true   # Windows
```

### 项目配置
```bash
# 设置上游分支自动跟踪
git config branch.autosetupmerge always
git config branch.autosetuprebase always

# 设置推送策略
git config push.default simple

# 启用rerere（重用记录的冲突解决）
git config rerere.enabled true
```

## 📊 分支保护规则

### main 分支保护
- 禁止直接推送
- 要求Pull Request审查
- 要求状态检查通过
- 要求分支是最新的
- 限制推送权限

### develop 分支保护
- 要求Pull Request审查
- 要求状态检查通过
- 允许管理员绕过

### 状态检查
- CI/CD 构建通过
- 单元测试通过
- 代码质量检查通过
- 安全扫描通过

## 🚨 常见问题和解决方案

### 1. 提交信息写错了
```bash
# 修改最后一次提交信息
git commit --amend -m "正确的提交信息"

# 如果已经推送，需要强制推送（谨慎使用）
git push --force-with-lease origin branch-name
```

### 2. 需要撤销提交
```bash
# 撤销最后一次提交，保留变更
git reset --soft HEAD~1

# 撤销最后一次提交，丢弃变更
git reset --hard HEAD~1
```

### 3. 分支合并冲突
```bash
# 解决冲突后
git add .
git commit -m "resolve merge conflicts"
```

### 4. 忘记切换分支就开始开发
```bash
# 暂存当前变更
git stash

# 切换到正确分支
git checkout correct-branch

# 恢复变更
git stash pop
```

---

**版本**: v1.0  
**最后更新**: 2025-09-24  
**适用项目**: 医疗影像诊断系统
