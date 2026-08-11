# 数据库 ORM 模型边界

后端采用 context-first DDD。SQLAlchemy 模型属于各业务上下文的
`infrastructure/persistence`，不通过根目录 `app.models` 聚合业务模型。

## 模型归属

| 上下文 | 持久化模型位置 |
|---|---|
| Access Control | `backend/app/contexts/access_control/infrastructure/persistence/models.py` |
| Patients | `backend/app/contexts/patients/infrastructure/persistence/models.py` |
| Teams | `backend/app/contexts/teams/infrastructure/persistence/models.py` |
| Reports | `backend/app/contexts/reports/infrastructure/persistence/models.py` |
| System Management | `backend/app/contexts/system_management/infrastructure/persistence/models.py` |
| Imaging | `backend/app/contexts/imaging/infrastructure/persistence/` |

`backend/app/models/system.py` 仅保留尚未迁入 bounded context 的旧系统日志、
监控、告警和通知模型。不得在该目录新增业务模型。

## Imaging 持久化结构

Imaging 使用独立文件表达稳定职责：

- `image_file_models.py`：影像文件及团队可见性。
- `image_import_models.py`：批量导入批次与导入项。
- `ai_task_models.py`：AI 任务及冻结的旧标注表映射。
- `annotation_models.py`：当前标注版本与逐项审计事件。
- `repositories.py`：面向 composition root 的 repository 适配器公开出口。

模型注册入口 `app.contexts.imaging.infrastructure.persistence` 只导出 ORM 模型，
不会 eager import repositories。这样其他 context 的 infrastructure 可以执行必要
联表查询，而不会触发跨 context repository 循环初始化。

影像状态、文件类型、导入状态和 AI 任务状态属于领域语言，定义在
`app.contexts.imaging.domain`。Application 层通过
`application/ports/records.py` 的持久化无关协议访问记录，不依赖 SQLAlchemy。

## 依赖规则

1. Domain 不导入 SQLAlchemy、FastAPI、repository 或 ORM 模型。
2. Application 只依赖 domain、DTO 和 ports，不导入 infrastructure 或 `app.models`。
3. Infrastructure repository 负责 ORM 查询、事务适配以及 domain/application 值与
   ORM 模型之间的转换。
4. Interface 只在 dependency/composition root 中装配 repository 实现。
5. 跨 context 联表只能出现在 infrastructure 层，并通过被依赖 context 的公开模型
   注册入口导入。

## 导入示例

```python
# 领域值和应用端口
from app.contexts.imaging.domain import ImageFileStatusEnum
from app.contexts.imaging.application.ports import ImageFileRecord

# ORM 模型，仅供 infrastructure、迁移和数据库测试使用
from app.contexts.imaging.infrastructure.persistence import ImageFile

# Repository 实现，仅供 composition root 使用
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyImageFileRepository,
)
```

## Alembic 注册

`backend/alembic/env.py` 显式导入各 context 的 persistence 模块，使所有 ORM table
进入共享的 `Base.metadata`。新增或迁移模型时必须同步更新所属 context 的公开模型
注册入口；不要通过恢复根目录 re-export 来兼容旧导入。
