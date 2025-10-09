# 🏥 医疗影像诊断系统 - 后端服务

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://mysql.com)
[![Redis](https://img.shields.io/badge/Redis-6.x+-red.svg)](https://redis.io)

## 📋 概述

基于 FastAPI 的医疗影像诊断系统后端服务，提供完整的 REST API 接口，支持用户认证、患者管理、影像处理、AI诊断等核心功能。

### ✨ 特性

- 🚀 **高性能**: 基于 FastAPI 和异步编程
- 🔒 **安全认证**: JWT + OAuth2 多角色权限管理
- 📊 **数据管理**: MySQL + Redis 双重存储
- 🤖 **AI 集成**: 支持多种医学影像 AI 模型
- 📖 **自动文档**: OpenAPI 3.0 + Swagger UI
- 🧪 **完整测试**: pytest + 覆盖率报告
- 🐳 **容器化**: Docker 一键部署

## 📁 目录结构

```
backend/
├── README.md                    # 后端项目说明
├── requirements.txt             # Python依赖包
├── requirements-dev.txt         # 开发环境依赖
├── Dockerfile                   # Docker镜像构建文件
├── docker-compose.yml           # 本地开发环境
├── .env.example                 # 环境变量示例
├── main.py                      # FastAPI应用入口
├── gunicorn.conf.py            # Gunicorn配置
├── alembic.ini                 # 数据库迁移配置
├── pytest.ini                 # 测试配置
├── app/                        # 应用核心代码
│   ├── __init__.py
│   ├── main.py                 # FastAPI应用实例
│   ├── config.py               # 应用配置
│   ├── dependencies.py         # 依赖注入
│   ├── api/                    # API路由
│   │   ├── __init__.py
│   │   ├── v1/                 # API v1版本
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # 认证相关API
│   │   │   ├── users.py        # 用户管理API
│   │   │   ├── patients.py     # 患者管理API
│   │   │   ├── images.py       # 影像管理API
│   │   │   ├── diagnosis.py    # 诊断相关API
│   │   │   ├── reports.py      # 报告管理API
│   │   │   └── system.py       # 系统管理API
│   │   └── deps.py             # API依赖
│   ├── core/                   # 核心功能模块
│   │   ├── __init__.py
│   │   ├── auth.py             # 认证核心逻辑
│   │   ├── security.py         # 安全相关功能
│   │   ├── config.py           # 配置管理
│   │   ├── database.py         # 数据库连接
│   │   ├── redis.py            # Redis连接
│   │   ├── logging.py          # 日志配置
│   │   └── exceptions.py       # 自定义异常
│   ├── models/                 # 数据库模型
│   │   ├── __init__.py
│   │   ├── base.py             # 基础模型类
│   │   ├── user.py             # 用户模型
│   │   ├── patient.py          # 患者模型
│   │   ├── image.py            # 影像模型
│   │   ├── diagnosis.py        # 诊断模型
│   │   └── report.py           # 报告模型
│   ├── schemas/                # Pydantic数据模式
│   │   ├── __init__.py
│   │   ├── base.py             # 基础模式
│   │   ├── user.py             # 用户数据模式
│   │   ├── patient.py          # 患者数据模式
│   │   ├── image.py            # 影像数据模式
│   │   ├── diagnosis.py        # 诊断数据模式
│   │   └── report.py           # 报告数据模式
│   ├── services/               # 业务逻辑服务
│   │   ├── __init__.py
│   │   ├── auth_service.py     # 认证服务
│   │   ├── user_service.py     # 用户服务
│   │   ├── patient_service.py  # 患者服务
│   │   ├── image_service.py    # 影像服务
│   │   ├── ai_service.py       # AI诊断服务
│   │   └── report_service.py   # 报告服务
│   ├── utils/                  # 工具函数
│   │   ├── __init__.py
│   │   ├── datetime.py         # 日期时间工具
│   │   ├── file_handler.py     # 文件处理工具
│   │   ├── image_processor.py  # 图像处理工具
│   │   ├── validators.py       # 数据验证工具
│   │   └── helpers.py          # 通用辅助函数
│   └── db/                     # 数据库相关
│       ├── __init__.py
│       ├── base.py             # 数据库基础配置
│       ├── session.py          # 数据库会话管理
│       └── init_db.py          # 数据库初始化
├── alembic/                    # 数据库迁移
│   ├── env.py                  # Alembic环境配置
│   ├── script.py.mako          # 迁移脚本模板
│   └── versions/               # 迁移版本文件
├── tests/                      # 测试代码
│   ├── __init__.py
│   ├── conftest.py             # pytest配置
│   ├── unit/                   # 单元测试
│   │   ├── __init__.py
│   │   ├── test_auth.py        # 认证测试
│   │   ├── test_users.py       # 用户测试
│   │   ├── test_patients.py    # 患者测试
│   │   └── test_services.py    # 服务测试
│   ├── integration/            # 集成测试
│   │   ├── __init__.py
│   │   ├── test_api.py         # API集成测试
│   │   └── test_database.py    # 数据库集成测试
│   └── fixtures/               # 测试数据
│       ├── __init__.py
│       ├── users.py            # 用户测试数据
│       └── patients.py         # 患者测试数据
└── scripts/                    # 脚本工具
    ├── init_db.py              # 数据库初始化脚本
    ├── create_superuser.py     # 创建超级用户
    ├── backup_db.py            # 数据库备份
    └── migrate.py              # 数据库迁移脚本
```

## 🚀 快速开始

### 方式一：演示模式（推荐开发）

演示模式使用内置模拟数据，无需配置外部数据库：

```bash
# 1. 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动演示服务
python start_demo.py
```

**访问地址**:
- API 服务: http://localhost:8000
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

### 方式二：完整模式（生产环境）

需要配置 MySQL 和 Redis：

```bash
# 1. 环境准备
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接

# 3. 数据库初始化（如果使用 Alembic）
alembic upgrade head

# 4. 启动完整服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 环境变量配置

主要配置项（`.env` 文件）：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=medical_imaging_system

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT 配置
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS 配置（开发环境）
# BACKEND_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 🔧 技术栈

### 核心框架
- **FastAPI**: 现代、快速的Web框架
- **Pydantic**: 数据验证和序列化
- **SQLAlchemy**: ORM数据库操作
- **Alembic**: 数据库迁移工具

### 数据库
- **MySQL**: 主数据库
- **Redis**: 缓存和会话存储
- **SQLite**: 测试数据库

### 认证授权
- **JWT**: JSON Web Token认证
- **OAuth2**: 标准认证协议
- **bcrypt**: 密码加密

### 异步处理
- **Celery**: 分布式任务队列
- **Redis**: 消息代理

### 测试工具
- **pytest**: 测试框架
- **pytest-asyncio**: 异步测试支持
- **httpx**: HTTP客户端测试

## 📊 API 接口

### 自动生成文档
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### 主要 API 端点

#### 认证相关
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `POST /api/v1/auth/refresh` - 刷新令牌

#### 患者管理
- `GET /api/v1/patients` - 获取患者列表
- `POST /api/v1/patients` - 创建患者
- `GET /api/v1/patients/{id}` - 获取患者详情
- `PUT /api/v1/patients/{id}` - 更新患者信息

#### 影像检查
- `GET /api/v1/studies/` - 获取检查列表（支持状态筛选）
- `POST /api/v1/studies/` - 创建新检查
- `GET /api/v1/studies/{id}` - 获取检查详情

#### 系统管理
- `GET /api/v1/dashboard/stats` - 获取仪表板统计
- `GET /api/v1/notifications/messages` - 获取系统消息
- `GET /api/v1/models/` - 获取 AI 模型列表
- `GET /health` - 健康检查

### API 版本管理
- **v1**: `/api/v1/` - 当前稳定版本
- **版本策略**: 语义化版本控制

## 🔒 安全特性

### 认证安全
- JWT令牌认证
- 令牌自动刷新
- 密码强度验证
- 登录失败限制

### 数据安全
- SQL注入防护
- XSS攻击防护
- CSRF保护
- 数据加密存储

### API安全
- 请求频率限制
- CORS跨域配置
- HTTPS强制重定向
- 安全头部设置

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pytest

# 运行单元测试
pytest tests/unit/

# 运行集成测试
pytest tests/integration/

# 生成覆盖率报告
pytest --cov=app --cov-report=html
```

### 测试数据库

```bash
# 设置测试数据库
export DATABASE_URL="sqlite:///./test.db"

# 运行测试
pytest
```

## 📈 性能优化

### 数据库优化
- 连接池配置
- 查询优化
- 索引策略
- 缓存机制

### API优化
- 异步处理
- 响应压缩
- 分页查询
- 字段选择

### 缓存策略
- Redis缓存
- 查询结果缓存
- 会话缓存
- 静态资源缓存

## 🔍 监控日志

### 日志配置
- 结构化日志
- 日志级别控制
- 日志轮转
- 错误追踪

### 性能监控
- 请求响应时间
- 数据库查询性能
- 内存使用情况
- API调用统计

## 🚀 部署

### Docker 部署

```bash
# 构建镜像
docker build -t medical-backend .

# 运行容器
docker run -p 8000:8000 medical-backend

# 使用 docker-compose
docker-compose up -d
```

### 生产环境

```bash
# 使用 Gunicorn + Uvicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# 使用 Supervisor 管理进程
supervisord -c supervisord.conf

# 使用 systemd 服务
sudo systemctl start medical-backend
sudo systemctl enable medical-backend
```

### 性能调优

```bash
# 生产环境推荐配置
gunicorn app.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --timeout 30 \
  --keep-alive 2
```

## 🛠️ 开发支持

### 代码规范
- 遵循 PEP 8 编码规范
- 使用 Black 代码格式化
- 使用 isort 导入排序
- 使用 mypy 类型检查

### 开发工具
- **pre-commit**: Git 提交钩子
- **Black**: 代码格式化
- **isort**: 导入排序
- **mypy**: 静态类型检查
- **flake8**: 代码检查

### 故障排除

#### CORS 配置问题
如果前端无法访问后端 API：
```bash
# 检查 CORS 配置
# 确保 start_demo.py 中的 CORS 中间件已启用
# 前端地址: http://localhost:3000
# 后端地址: http://localhost:8000
```

#### 数据库连接问题
```bash
# 检查数据库配置
# 1. 验证 .env 文件中的数据库配置
# 2. 确保 MySQL 服务正在运行
# 3. 测试数据库连接
mysql -h localhost -u username -p database_name
```

#### 依赖安装问题
```bash
# 清理并重新安装
pip uninstall -r requirements.txt -y
pip install -r requirements.txt

# 或使用虚拟环境
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 开发模式 vs 演示模式

| 特性 | 演示模式 | 开发模式 |
|------|----------|----------|
| 数据库 | 内置模拟数据 | 需要 MySQL |
| 缓存 | 内存缓存 | 需要 Redis |
| 启动命令 | `python start_demo.py` | `uvicorn app.main:app --reload` |
| 适用场景 | 快速演示、开发测试 | 完整功能开发 |

---

**注意**:
- 开发前请仔细阅读项目编码规范和 API 设计文档
- 演示模式适合快速开始和功能测试
- 生产环境请使用完整模式并配置真实数据库
