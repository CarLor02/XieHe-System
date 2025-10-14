# 测试工具集

本目录包含项目的所有测试工具，包括自动化测试和手动测试工具。

## 📁 目录结构

```
tests/
├── __init__.py                 # 测试包初始化
├── README.md                   # 本文档
├── pytest.ini                  # pytest配置（如果有）
│
├── unit/                       # 单元测试
│   ├── __init__.py
│   └── ...                     # 各模块的单元测试
│
├── integration/                # 集成测试
│   ├── __init__.py
│   └── ...                     # 集成测试用例
│
├── fixtures/                   # 测试夹具
│   ├── __init__.py
│   └── ...                     # 共享的测试数据和夹具
│
├── manual/                     # 手动测试工具 ⭐ 新增
│   ├── __init__.py
│   └── test_auth_manual.py    # 认证功能手动测试
│
├── db_tools/                   # 数据库工具 ⭐ 新增
│   ├── __init__.py
│   ├── check_users.py         # 查看用户列表
│   └── check_table_structure.py # 查看表结构
│
└── test_*.py                   # 自动化测试文件
    ├── test_auth.py            # 认证测试
    ├── test_dashboard.py       # 仪表盘测试
    ├── test_reports.py         # 报告测试
    └── ...
```

## 🧪 自动化测试

### 运行所有测试

```bash
cd backend
pytest
```

### 运行特定测试文件

```bash
pytest tests/test_auth.py
pytest tests/test_dashboard.py
```

### 运行特定测试类或方法

```bash
pytest tests/test_auth.py::TestAuthAPI
pytest tests/test_auth.py::TestAuthAPI::test_login_success
```

### 显示详细输出

```bash
pytest -v
pytest -vv
```

### 显示打印输出

```bash
pytest -s
```

### 生成覆盖率报告

```bash
pytest --cov=app --cov-report=html
```

## 🔧 手动测试工具

手动测试工具位于 `tests/manual/` 目录，需要后端服务运行。

### 认证功能测试

```bash
cd backend

# 运行所有认证测试
python tests/manual/test_auth_manual.py

# 只测试登录
python tests/manual/test_auth_manual.py login

# 只测试注册
python tests/manual/test_auth_manual.py register

# 测试完整流程（注册+登录）
python tests/manual/test_auth_manual.py full
```

**功能**:
- ✅ 测试多个账号登录（admin, doctor01等）
- ✅ 测试用户注册
- ✅ 测试完整的注册+登录流程
- ✅ 彩色输出，易于阅读
- ✅ 详细的错误信息

## 🗄️ 数据库工具

数据库工具位于 `tests/db_tools/` 目录，用于快速查看和管理数据库。

### 查看用户列表

```bash
cd backend
python tests/db_tools/check_users.py
```

**输出示例**:
```
ID    用户名          邮箱                           姓名            状态        角色        创建时间
---------------------------------------------------------------------------------------------------
1     admin          admin@xiehe.com                系统管理员       active ✓    admin      2025-10-14 10:00:00
2     doctor01       doctor01@xiehe.com             张医生          active ✓    doctor     2025-10-14 10:05:00

统计信息:
总用户数: 10
激活用户: 8
管理员数: 2
已验证用户: 9
```

### 查看表结构

```bash
cd backend

# 查看 users 表（默认）
python tests/db_tools/check_table_structure.py

# 查看指定表
python tests/db_tools/check_table_structure.py patients
python tests/db_tools/check_table_structure.py studies

# 列出所有表
python tests/db_tools/check_table_structure.py --list
```

**输出示例**:
```
字段名                    类型                      允许NULL   键         默认值          额外
-------------------------------------------------------------------------------------------------------------------------
id                       int                       NO        PRI                       auto_increment
username                 varchar(50)               NO        UNI
email                    varchar(100)              NO        UNI
real_name                varchar(50)               YES                   NULL
password_hash            varchar(255)              NO
...

记录总数: 10

索引信息:
  PRIMARY: PRIMARY (id)
  UNIQUE: username (username)
  UNIQUE: email (email)
```

### 重建数据库 ⭐ 新增

```bash
cd backend

# 交互式重建（需要确认）
python tests/db_tools/recreate_database.py

# 强制重建（跳过确认，危险！）
python tests/db_tools/recreate_database.py --force
```

**功能**:
- ✅ 删除所有现有表
- ✅ 创建新表结构
- ✅ 插入初始数据（管理员、角色、权限、部门）
- ✅ 验证创建结果

**默认账号**:
- 用户名: admin
- 密码: admin123
- 邮箱: admin@xiehe.com

## 📊 测试文件说明

### 自动化测试文件

| 文件 | 说明 | 测试内容 |
|------|------|---------|
| `test_auth.py` | 认证测试 | 登录、注册、令牌、权限 |
| `test_dashboard.py` | 仪表盘测试 | 数据统计、图表 |
| `test_reports.py` | 报告测试 | 报告生成、查询、更新 |
| `test_ai_models.py` | AI模型测试 | 模型推理、结果处理 |
| `test_image_display.py` | 影像显示测试 | 影像加载、渲染 |
| `test_monitoring.py` | 监控测试 | 系统监控、告警 |
| `test_notifications.py` | 通知测试 | 消息推送、通知 |
| `test_permissions.py` | 权限测试 | 权限验证、角色 |
| `test_unit.py` | 单元测试 | 基础功能单元测试 |

### 手动测试工具

| 文件 | 说明 | 用途 |
|------|------|------|
| `manual/test_auth_manual.py` | 认证手动测试 | 快速验证登录、注册功能 |

### 数据库工具

| 文件 | 说明 | 用途 |
|------|------|------|
| `db_tools/check_users.py` | 用户检查工具 | 查看用户列表和统计 |
| `db_tools/check_table_structure.py` | 表结构检查工具 | 查看表结构和数据 |
| `db_tools/recreate_database.py` | 数据库重建工具 ⭐ | 重建数据库和初始数据 |

### 测试数据夹具 ⭐ 新增

| 文件 | 说明 | 用途 |
|------|------|------|
| `fixtures/patient_data.py` | 测试患者数据 | 提供测试用患者和检查数据 |

## 🎯 测试最佳实践

### 1. 自动化测试

- ✅ 使用 pytest 框架
- ✅ 遵循 AAA 模式（Arrange, Act, Assert）
- ✅ 使用有意义的测试名称
- ✅ 每个测试只测试一个功能点
- ✅ 使用 fixtures 共享测试数据
- ✅ 测试覆盖率 > 80%

### 2. 手动测试

- ✅ 用于快速验证功能
- ✅ 不替代自动化测试
- ✅ 适合开发调试阶段
- ✅ 需要后端服务运行

### 3. 数据库工具

- ✅ 只读操作，不修改数据
- ✅ 用于快速检查数据状态
- ✅ 开发和调试时使用

## 🔄 从 dev_tools 迁移

原 `dev_tools/` 目录已整合到 `tests/` 目录：

| 原文件 | 新位置 | 说明 |
|--------|--------|------|
| `dev_tools/test_login.py` | `tests/manual/test_auth_manual.py` | 整合为手动测试工具 |
| `dev_tools/test_register.py` | `tests/manual/test_auth_manual.py` | 整合为手动测试工具 |
| `dev_tools/test_full_register_login.py` | `tests/manual/test_auth_manual.py` | 整合为手动测试工具 |
| `dev_tools/check_users.py` | `tests/db_tools/check_users.py` | 改进并移动 |
| `dev_tools/check_table_structure.py` | `tests/db_tools/check_table_structure.py` | 改进并移动 |

**改进点**:
- ✅ 更好的代码组织
- ✅ 统一的命令行接口
- ✅ 彩色输出
- ✅ 更详细的错误处理
- ✅ 使用配置文件而非硬编码

## 📝 添加新测试

### 添加自动化测试

1. 在 `tests/` 目录创建 `test_*.py` 文件
2. 使用 pytest 编写测试用例
3. 运行 `pytest` 验证

示例:
```python
# tests/test_example.py
import pytest

class TestExample:
    def test_something(self):
        assert 1 + 1 == 2
```

### 添加手动测试工具

1. 在 `tests/manual/` 目录创建脚本
2. 添加命令行接口
3. 更新本 README

### 添加数据库工具

1. 在 `tests/db_tools/` 目录创建脚本
2. 使用 settings 获取数据库配置
3. 只进行只读操作

## 🚀 快速开始

### 开发者第一次使用

```bash
# 1. 安装依赖
cd backend
pip install -r requirements.txt

# 2. 运行自动化测试
pytest

# 3. 启动后端服务（另一个终端）
uvicorn app.main:app --reload

# 4. 运行手动测试
python tests/manual/test_auth_manual.py

# 5. 查看数据库状态
python tests/db_tools/check_users.py
```

## 📚 相关文档

- `backend/README.md` - 后端项目说明
- `backend/启动指南.md` - 启动指南
- `pytest.ini` - pytest 配置
- `conftest.py` - pytest 全局配置（如果有）

---

**更新时间**: 2025-10-14  
**维护者**: XieHe Medical System Team

