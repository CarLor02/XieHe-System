# Backend Tests

`backend/tests/` 只放测试和测试辅助脚本。自动化测试、手工脚本、数据库检查脚本和历史脚本必须分开，避免 pytest 误收集不可重复运行的工具脚本。

## 目录约定

```
tests/
├── unit/             # 快速、无外部服务依赖的单元测试
├── integration/      # 使用测试数据库或服务边界的集成测试
├── fixtures/         # 测试数据构造和夹具辅助，不直接被 pytest 收集
├── manual/           # 需要人工启动服务后运行的脚本，不直接被 pytest 收集
├── db_tools/         # 数据库检查/维护脚本，不直接被 pytest 收集
└── legacy/           # 历史测试脚本，仅作重写参考，不直接被 pytest 收集
```

pytest 当前只收集 `unit/` 和 `integration/` 中符合 `test_*.py` / `*_test.py` 规则的文件。`legacy`、`manual`、`db_tools`、`fixtures` 已在 `backend/pytest.ini` 中通过 `norecursedirs` 排除。

## 当前自动化测试

| 路径 | 覆盖内容 |
| --- | --- |
| `unit/test_auth_security.py` | 密码哈希、JWT、刷新 token 完整 claims、token blacklist、API key |
| `unit/test_image_file_visibility.py` | `image_files` 患者/团队可见性规则 |
| `integration/test_team_management.py` | 团队列表、申请、审核、成员、创建、邀请服务流程 |

运行方式：

```bash
cd backend
PYTHONPATH=. .venv/bin/python -m pytest tests/unit tests/integration --no-cov
```

如果只需要确认测试发现是否正常：

```bash
cd backend
PYTHONPATH=. .venv/bin/python -m pytest --collect-only tests --no-cov -q
```

## 手工脚本

手工脚本用于本地或部署环境的临时验证，不属于自动化测试。

```bash
cd backend
python tests/manual/auth_manual.py
python tests/manual/auth_manual.py login
python tests/manual/auth_manual.py register
python tests/manual/auth_manual.py full
```

## 数据库工具

数据库工具允许直接连接当前配置指向的 MySQL/Redis，因此不要放进自动测试链路。

```bash
cd backend
python tests/db_tools/check_config.py
python tests/db_tools/check_users.py
python tests/db_tools/check_table_structure.py users
python tests/db_tools/check_database.py
python tests/db_tools/recreate_database.py
```

## Legacy

`legacy/` 中的文件来自旧接口时期的宽泛 API 脚本，包含已迁移或已移除的路径，例如旧的 `/api/v1/images/*`、旧 dashboard 响应结构、旧权限接口断言等。它们当前不作为测试运行；如果要恢复某个场景，应按当前接口重新写成 `unit/` 或 `integration/` 下的明确测试，再使用 `test_*.py` 命名。

## 新增测试规则

- 自动化测试文件只放在 `unit/` 或 `integration/`。
- 手工脚本和数据库工具不要使用 `test_` 前缀。
- 文件名只使用英文、数字、下划线和短横线。
- 接口测试要显式隔离认证和数据库依赖，避免依赖开发机或服务器现有数据。
- 如果测试的是统一响应格式，断言应先进入 `data` 字段，不要按旧的裸响应结构写断言。
