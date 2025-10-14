# 数据库模型文档

本目录包含协和医疗影像诊断系统的所有数据库 ORM 模型定义。

## 📁 文件结构

```
models/
├── __init__.py          # 模型包初始化文件
├── base.py              # 基础模型类和混入类
├── user.py              # 用户管理相关模型
├── patient.py           # 患者管理相关模型
├── image.py             # 影像管理相关模型
├── report.py            # 报告管理相关模型
├── system.py            # 系统管理相关模型
└── README.md            # 本文档
```

## 📊 模型概览

系统共包含 **24 个数据库表模型**，分为 5 大类：

### 1. 用户管理模块 (6 个表)

| 模型名 | 表名 | 说明 |
|--------|------|------|
| `User` | `users` | 用户表 |
| `Role` | `roles` | 角色表 |
| `Permission` | `permissions` | 权限表 |
| `Department` | `departments` | 部门表 |
| `UserRole` | `user_roles` | 用户角色关联表 |
| `RolePermission` | `role_permissions` | 角色权限关联表 |

### 2. 患者管理模块 (4 个表)

| 模型名 | 表名 | 说明 |
|--------|------|------|
| `Patient` | `patients` | 患者基本信息表 |
| `PatientVisit` | `patient_visits` | 患者就诊记录表 |
| `PatientAllergy` | `patient_allergies` | 患者过敏史表 |
| `PatientMedicalHistory` | `patient_medical_history` | 患者病史表 |

### 3. 影像管理模块 (5 个表)

| 模型名 | 表名 | 说明 |
|--------|------|------|
| `Study` | `studies` | 检查表 |
| `Series` | `series` | 序列表 |
| `Instance` | `instances` | 实例表 |
| `ImageAnnotation` | `image_annotations` | 影像标注表 |
| `AITask` | `ai_tasks` | AI 任务表 |

### 4. 报告管理模块 (4 个表)

| 模型名 | 表名 | 说明 |
|--------|------|------|
| `DiagnosticReport` | `diagnostic_reports` | 诊断报告表 |
| `ReportTemplate` | `report_templates` | 报告模板表 |
| `ReportFinding` | `report_findings` | 报告所见表 |
| `ReportRevision` | `report_revisions` | 报告修订历史表 |

### 5. 系统管理模块 (5 个表)

| 模型名 | 表名 | 说明 |
|--------|------|------|
| `SystemConfig` | `system_configs` | 系统配置表 |
| `SystemLog` | `system_logs` | 系统日志表 |
| `SystemMonitor` | `system_monitors` | 系统监控表 |
| `SystemAlert` | `system_alerts` | 系统告警表 |
| `Notification` | `notifications` | 通知消息表 |

## 🔧 使用方法

### 导入模型

```python
# 导入所有模型
from app.models import (
    User, Role, Permission, Department,
    Patient, PatientVisit,
    Study, Series, Instance,
    DiagnosticReport, ReportTemplate,
    SystemConfig, SystemLog
)

# 或者按模块导入
from app.models.user import User, Role
from app.models.patient import Patient
from app.models.image import Study, Series
from app.models.report import DiagnosticReport
from app.models.system import SystemConfig
```

### 创建数据

```python
from app.models.patient import Patient, GenderEnum, PatientStatusEnum
from app.core.database import get_db
from datetime import date

# 创建患者
patient = Patient(
    patient_id="P20251013001",
    name="张三",
    gender=GenderEnum.MALE,
    birth_date=date(1980, 1, 1),
    phone="13800138000",
    status=PatientStatusEnum.ACTIVE
)

# 保存到数据库
db = next(get_db())
db.add(patient)
db.commit()
db.refresh(patient)
```

### 查询数据

```python
from app.models.patient import Patient
from app.core.database import get_db

db = next(get_db())

# 查询单个患者
patient = db.query(Patient).filter(Patient.patient_id == "P20251013001").first()

# 查询所有活跃患者
active_patients = db.query(Patient).filter(
    Patient.status == PatientStatusEnum.ACTIVE,
    Patient.is_deleted == False
).all()

# 分页查询
page = 1
page_size = 20
patients = db.query(Patient).offset((page - 1) * page_size).limit(page_size).all()
```

### 更新数据

```python
from app.models.patient import Patient
from app.core.database import get_db

db = next(get_db())

# 查询患者
patient = db.query(Patient).filter(Patient.id == 1).first()

# 更新字段
patient.phone = "13900139000"
patient.email = "zhangsan@example.com"

# 提交更改
db.commit()
```

### 软删除

```python
from app.models.patient import Patient
from app.core.database import get_db
from datetime import datetime

db = next(get_db())

# 查询患者
patient = db.query(Patient).filter(Patient.id == 1).first()

# 软删除
patient.is_deleted = True
patient.deleted_at = datetime.now()
patient.deleted_by = current_user_id

# 提交更改
db.commit()
```

## 🎯 模型特性

### 1. 基础模型类 (BaseModel)

所有模型都继承自 `BaseModel`，包含以下通用字段：

- `id`: 主键 ID
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `created_by`: 创建人 ID
- `updated_by`: 更新人 ID
- `is_deleted`: 软删除标志
- `deleted_at`: 删除时间
- `deleted_by`: 删除人 ID

### 2. 枚举类型

系统使用 Python Enum 定义了多种枚举类型，确保数据一致性：

- **患者模块**: `GenderEnum`, `BloodTypeEnum`, `PatientStatusEnum` 等
- **影像模块**: `ModalityEnum`, `BodyPartEnum`, `StudyStatusEnum` 等
- **报告模块**: `ReportTypeEnum`, `ReportStatusEnum`, `DiagnosisLevelEnum` 等
- **系统模块**: `LogLevelEnum`, `NotificationTypeEnum`, `ConfigTypeEnum` 等

### 3. 关系映射

模型之间通过 SQLAlchemy 的 `relationship` 建立关联：

```python
# 患者与就诊记录的一对多关系
class Patient(Base):
    visits = relationship("PatientVisit", back_populates="patient")

class PatientVisit(Base):
    patient = relationship("Patient", back_populates="visits")
```

### 4. JSON 字段

部分模型使用 JSON 字段存储复杂数据：

- `tags`: 标签数据
- `structured_data`: 结构化数据
- `measurements`: 测量数据
- `metadata`: 元数据

## 📝 注意事项

1. **时区处理**: 所有 `DateTime` 字段建议使用 UTC 时间
2. **软删除**: 查询时需要过滤 `is_deleted=False` 的记录
3. **枚举值**: 使用枚举类型时，数据库存储的是枚举的 value 值
4. **外键约束**: 部分表之间有外键关系，删除时需注意级联处理
5. **索引优化**: 高频查询字段已添加索引（unique, index）

## 🔄 数据库迁移

使用 Alembic 进行数据库迁移：

```bash
# 生成迁移脚本
alembic revision --autogenerate -m "描述"

# 执行迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

## 📚 相关文档

- [数据库设计文档](../../../docs/architecture/database-design.md)
- [API 接口文档](../../../docs/api/README.md)
- [开发指南](../../../docs/development/README.md)

## 👥 维护者

- XieHe Medical System Team
- 创建时间: 2025-10-13
- 最后更新: 2025-10-13

## 📄 许可证

Copyright © 2025 XieHe Medical System. All rights reserved.

