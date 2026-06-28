# 脊柱 AI 辅助分析系统文档

## 📋 项目概览

基于 Next.js + Python FastAPI + MinIO 对象存储 + AI 推理服务的脊柱 X 光辅助分析系统。

**主要功能模块:**

- 用户认证与权限管理（JWT + RBAC）
- 患者信息管理
- 影像上传（MinIO 对象存储）与 DICOM 查看
- AI 自动测量（正面 Cobb 角 + 侧面 SVA/PI）
- 手动标注（Fabric.js + Konva 画布）
- 诊断报告生成与管理
- 系统日志（logging-service）

## 📁 文档结构

```
docs/
├── README.md                    # 项目文档总览
├── project-progress.md          # 项目进度跟踪文档
├── coding-standards.md          # 编码规范
├── documentation-standards.md   # 文档规范
├── git-workflow.md              # Git工作流规范
├── templates/                   # 文档模板
│   ├── api-template.md         # API文档模板
│   ├── technical-template.md   # 技术文档模板
│   ├── user-guide-template.md  # 用户手册模板
│   └── project-progress-template.md # 项目进度模板
├── api/                         # API接口文档
│   ├── README.md               # API文档总览
│   ├── schemas/                # 数据模型定义
│   └── examples/               # 请求响应示例
├── architecture/                # 系统架构文档
│   ├── README.md               # 架构文档总览
│   ├── diagrams/               # 架构图表
│   └── decisions/              # 架构决策记录
├── deployment/                  # 部署运维文档
│   ├── README.md               # 部署文档总览
│   ├── scripts/                # 部署脚本
│   └── configs/                # 配置文件模板
├── user-guide/                  # 用户使用手册
│   ├── README.md               # 用户手册总览
│   ├── screenshots/            # 界面截图
│   └── videos/                 # 操作视频
└── images/                      # 文档图片资源
```

## 🔧 技术栈

**前端:**

- Next.js 15.5 + React 19 + TypeScript
- Tailwind CSS v4
- Redux Toolkit + Zustand + TanStack Query（状态管理）
- Cornerstone.js（DICOM 影像查看）
- Fabric.js + Konva（标注画布）

**后端:**

- Python 3.12 + FastAPI
- SQLAlchemy 2.0（ORM）+ Alembic（数据库迁移）
- Pydantic（数据验证）

**存储:**

- MinIO（影像文件对象存储）
- storage-service（Go，MinIO 访问中间层）

**AI 推理:**

- YOLO（正面服务 :8001 + 侧面服务 :8002）

**数据库:**

- MySQL 8.0+（主数据库，无 Redis）

**部署:**

- Docker & Docker Compose
- Nginx（反向代理）

## 📊 项目统计

- **总任务数**: 168 个
- **预计开发周期**: 16 周
- **开始日期**: 2025-09-24
- **预计完成**: 2025-12-31

## 🚀 快速开始

详见根目录 [README.md](../README.md) 中的本地启动步骤。

## 🤝 贡献指南

1. 遵循项目编码规范（见 `coding-standards.md`）
2. 编写充分的测试用例
3. 提交清晰的 commit 信息（Conventional Commits）
4. 进行代码审查

---

**最后更新**: 2026-06-27
