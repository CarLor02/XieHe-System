# Backend Tests

`backend/tests/` 只放测试和测试辅助脚本。自动化测试、手工脚本、数据库检查脚本和历史脚本必须分开，避免 pytest 误收集不可重复运行的工具脚本。

## 目录约定

```
tests/
├── unit/             # 快速、无外部服务依赖的单元测试
├── integration/      # 使用真实 MySQL 测试库或服务边界的集成测试
├── fixtures/         # 测试数据构造和夹具辅助，不直接被 pytest 收集
├── manual/           # 需要人工启动服务后运行的脚本，不直接被 pytest 收集
├── db_tools/         # 数据库检查/维护脚本，不直接被 pytest 收集
└── legacy/           # 历史测试脚本，仅作重写参考，不直接被 pytest 收集
```

pytest 当前只收集 `unit/` 和 `integration/` 中符合 `test_*.py` / `*_test.py` 规则的文件。`legacy`、`manual`、`db_tools`、`fixtures` 已在 `backend/pytest.ini` 中通过 `norecursedirs` 排除。

## 测试数据库

数据库测试统一使用真实 MySQL 测试库：`medical_imaging_system_test`。

`tests/conftest.py` 会在首次使用数据库 fixture 时执行以下动作：

- 从 `TEST_DATABASE_URL` 读取测试库连接；如果未设置，则基于 `DATABASE_URL` 派生并强制切到 `medical_imaging_system_test`。
- 当派生出的主机名为 `mysql` 且测试运行在宿主机时，自动改用 `127.0.0.1`，以便连接 compose 暴露的 MySQL 端口。
- 创建 `medical_imaging_system_test`，然后对该库执行 `alembic upgrade head`。
- 每个使用 `db_session` / `test_session_factory` 的测试前后清空业务表，保留 `alembic_version`。
- 清库逻辑带硬保护，只允许操作库名严格等于 `medical_imaging_system_test` 的连接。

推荐在本地或容器内显式配置：

```bash
TEST_DATABASE_URL=mysql+pymysql://root:<password>@127.0.0.1:3306/medical_imaging_system_test
```

如果使用权限较低的数据库用户，需先手动创建测试库并授予权限。

## 当前自动化测试

| 路径 | 覆盖内容 |
| --- | --- |
| `unit/test_auth_security.py` | 密码哈希、JWT、刷新 token 完整 claims、token blacklist、API key |
| `integration/test_image_file_visibility.py` | `image_files` 患者/团队可见性规则 |
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

## FastAPI TestClient

当前 Codex sandbox 中，最小 FastAPI 应用的 `fastapi.testclient.TestClient` 和 `httpx.ASGITransport` 都会卡住；同样代码脱离 sandbox 后可以正常返回。因此根因不是应用 lifespan、路由或 FastAPI/httpx/starlette 版本不匹配，而是 sandbox 对 AnyIO/ASGI 测试运行时的限制。

后续恢复 API 级测试时，建议：

- 在普通宿主机 shell、compose 后端容器或 CI 环境运行 TestClient/API 测试。
- 给 API 测试加明确 marker，例如 `api`，避免和服务层数据库测试混在一起排障。
- 保留服务层测试的 `db_session` 夹具，API 测试再额外覆盖 `get_db` 依赖。
- 如需在本地长期运行 API 测试，安装并启用超时插件，避免卡住时无限等待。

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
- 需要数据库的测试使用 `db_session` 或 `test_session_factory`，不要再引入 SQLite。
- 手工脚本和数据库工具不要使用 `test_` 前缀。
- 文件名只使用英文、数字、下划线和短横线。
- 接口测试要显式隔离认证和数据库依赖，避免依赖开发机或服务器现有数据。
- 如果测试的是统一响应格式，断言应先进入 `data` 字段，不要按旧的裸响应结构写断言。
