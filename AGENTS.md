# 移动端(KMP)开发规则

- Backend APIs may be incomplete or unstable; verify endpoints with tools like `curl` before implementation, and defer features that depend on broken APIs.
- Every code change must be recorded (clear commit message and/or changelog note).
- After every major change, create a Git commit immediately.
- For this repository, after each completed round of modifications, create exactly one Git commit before starting the next requested change.
- When adding a new icon token or drawable, update every platform/resource mapping at the same time. At minimum, check `IconPainterContract.kt`, Android actual mappings such as `IconPainter.android.kt`, and any other exhaustive `when` mappings for icons.
- If a required icon is missing, add it as an SVG under `composeApp/src/commonMain/composeResources/drawable/` and wire it into the shared icon token/mapping flow instead of reusing an unrelated icon.
- 使用颜色时，应该使用 `theme/ThemePalettes.kt` 颜色体系里的语义颜色，不要在界面代码中硬编码颜色值。
- Run "mobile/gradlew :composeApp:compileKotlinMetadata", "mobile/gradlew :composeApp:testAndroidHostTest", "mobile/gradlew :androidApp:assembleDebug", and "mobile/gradlew :composeApp:compileKotlinIosSimulatorArm64" after code change to check errors

# Web前端开发规则

- Web 前端代码位于 `frontend/`。新增或重构页面/模块时遵循 DDD 分层，优先按业务上下文与 feature 组织目录，避免把业务流程、状态编排、API 适配和 UI 渲染混在单个 `page.tsx` 或根组件里。
- Route `page.tsx` 只负责路由入口、权限/参数读取和 feature 组合；业务规则、数据转换、测量/标注/报告生成等流程应下沉到对应 feature 的 `domain/`、`usecases/`、`hooks/` 或 `application/` 层。
- Feature 目录应保持清晰职责：`domain/` 放实体、值对象、枚举、纯函数和业务约束；`usecases/` 放跨状态/API 的应用流程；`hooks/` 或 `application/hooks/` 放 React 状态适配；`components/` 放展示和交互组件；`shared/` 只放跨 feature 复用的稳定工具、常量和类型。
- `imaging` 及其 `image-viewer` 子功能继续按 feature 拆分；测量、标注、关键点、AI 结果、报告和工具栏逻辑不得回流到 viewer 根组件或页面入口。
- 跨 feature 复用能力应通过明确的公开出口或 service 层依赖，避免随意深层 import 其他 feature 的内部实现；只有真正稳定、无业务归属争议的代码才放入 `shared/`。
- 前端开发完成后至少运行 `npm --prefix frontend run type-check`、`npm --prefix frontend run lint` 和 `npm --prefix frontend test`；涉及路由、静态导出、Next 配置或大范围架构调整时额外运行 `npm --prefix frontend run build`。
- 如果 lint/test/type-check 因现有脚本、缺失测试环境或外部依赖失败，不要静默跳过；需要记录失败命令和关键错误，并优先在本轮修复可控的前端问题。

# Python后端开发规则

- Python 后端代码位于 `backend/`，依赖与工具配置统一维护在 `backend/pyproject.toml`，使用 uv 同步 `backend/uv.lock`，不要新增 `requirements.txt` 或独立的 Black、isort、Flake8 配置。
- 后端业务按 context-first DDD 组织：`domain/` 承载实体、值对象、纯业务规则和领域错误；`application/` 承载用例、DTO 与端口；`infrastructure/` 承载数据库、消息队列、对象存储和外部服务适配；`interface/` 承载 FastAPI router、schema 与协议转换。
- `application/ports/` 应按依赖职责拆成独立文件；`infrastructure/persistence/` 放 ORM model 与仓储实现；HTTP v1 接口放在 `interface/http/v1/`，按 routes、schemas 和依赖装配继续拆包。
- Router 只处理鉴权依赖、请求解析、响应映射与 HTTP 错误转换；事务、权限规则和跨仓储/外部服务编排必须下沉到 application 用例。
- 不把多个独立职责持续堆入单一 `ports.py`、`repository.py`、`router.py` 或 `schemas.py`；职责出现稳定边界时及时拆成包和独立文件，而不是等待文件达到固定行数。
- 包级 `__init__.py` 只暴露稳定公开入口；完成迁移后应更新调用方并删除旧模块，不保留仅为兼容深层导入的 re-export。
- 每次修改 Python 代码后，必须在仓库根目录运行 `cd backend && uv run ruff check .`、`cd backend && uv run ruff format --check .` 和 `cd backend && uv run mypy`。
- 修改后端依赖后运行 `cd backend && uv lock`，提交更新后的 `backend/uv.lock`；安装或同步环境使用 `cd backend && uv sync --frozen`。
- Ruff 与 mypy 失败时不得静默跳过；应修复本轮引入的问题，并记录无法在本轮解决的既有问题和具体命令输出。
