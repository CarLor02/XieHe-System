# 数据库 ORM 模型文档

## 📋 概述

协和医疗影像诊断系统使用 SQLAlchemy ORM 框架，为数据库的所有 24 个表创建了对应的 Python 模型类。

## 📊 模型文件结构

| 文件路径 | 说明 | 包含模型数量 |
|---------|------|-------------|
| `backend/app/models/__init__.py` | 模型包初始化文件 | - |
| `backend/app/models/base.py` | 基础模型类和混入类 | 1 |
| `backend/app/models/user.py` | 用户管理相关模型 | 6 |
| `backend/app/models/patient.py` | 患者管理相关模型 | 4 |
| `backend/app/models/image.py` | 影像管理相关模型 | 5 |
| `backend/app/models/report.py` | 报告管理相关模型 | 4 |
| `backend/app/models/system.py` | 系统管理相关模型 | 5 |

## 🗂️ 数据库表与模型映射

### 用户管理模块 (6 个表)

1. `departments` → `Department` (部门表)
2. `roles` → `Role` (角色表)
3. `permissions` → `Permission` (权限表)
4. `users` → `User` (用户表)
5. `user_roles` → `UserRole` (用户角色关联表)
6. `role_permissions` → `RolePermission` (角色权限关联表)

### 患者管理模块 (4 个表)

7. `patients` → `Patient` (患者表)
8. `patient_visits` → `PatientVisit` (就诊记录表)
9. `patient_allergies` → `PatientAllergy` (过敏史表)
10. `patient_medical_history` → `PatientMedicalHistory` (病史表)

### 影像管理模块 (5 个表)

11. `studies` → `Study` (检查表)
12. `series` → `Series` (序列表)
13. `instances` → `Instance` (实例表)
14. `image_annotations` → `ImageAnnotation` (影像标注表)
15. `ai_tasks` → `AITask` (AI任务表)

### 报告管理模块 (4 个表)

16. `diagnostic_reports` → `DiagnosticReport` (诊断报告表)
17. `report_templates` → `ReportTemplate` (报告模板表)
18. `report_findings` → `ReportFinding` (报告所见表)
19. `report_revisions` → `ReportRevision` (修订历史表)

### 系统管理模块 (5 个表)

20. `system_configs` → `SystemConfig` (系统配置表)
21. `system_logs` → `SystemLog` (系统日志表)
22. `system_monitors` → `SystemMonitor` (系统监控表)
23. `system_alerts` → `SystemAlert` (系统告警表)
24. `notifications` → `Notification` (通知消息表)

## 🎯 模型特性

### 1. 完整的字段映射

- ✅ 所有数据库字段都已映射到模型属性
- ✅ 字段类型完全匹配数据库定义
- ✅ 包含字段注释 (comment)
- ✅ 正确设置 nullable、unique、default 等约束

### 2. 枚举类型定义

系统定义了 30+ 个枚举类型，包括：

**患者模块**:
- `GenderEnum` - 性别 (male, female, other, unknown)
- `BloodTypeEnum` - 血型 (A, B, AB, O, unknown)
- `RhFactorEnum` - RH因子 (positive, negative, unknown)
- `MaritalStatusEnum` - 婚姻状况
- `PatientStatusEnum` - 患者状态 (active, inactive, deceased, merged)
- `VisitTypeEnum` - 就诊类型
- `VisitStatusEnum` - 就诊状态
- `SeverityEnum` - 严重程度 (mild, moderate, severe, critical)

**影像模块**:
- `ModalityEnum` - 影像模态 (CT, MR, CR, DX, US, etc.)
- `BodyPartEnum` - 身体部位
- `StudyStatusEnum` - 检查状态 (scheduled, in_progress, completed, cancelled)
- `SeriesStatusEnum` - 序列状态
- `InstanceStatusEnum` - 实例状态
- `QualityEnum` - 质量等级
- `AnnotationTypeEnum` - 标注类型
- `AITaskStatusEnum` - AI任务状态

**报告模块**:
- `ReportTypeEnum` - 报告类型 (diagnostic, consultation, follow_up)
- `ReportStatusEnum` - 报告状态 (draft, pending, approved, rejected)
- `PriorityEnum` - 优先级 (low, normal, high, urgent)
- `DiagnosisLevelEnum` - 诊断级别

**系统模块**:
- `LogLevelEnum` - 日志级别 (debug, info, warning, error, critical)
- `LogCategoryEnum` - 日志分类
- `AlertLevelEnum` - 告警级别
- `NotificationTypeEnum` - 通知类型
- `NotificationStatusEnum` - 通知状态
- `ConfigTypeEnum` - 配置类型
- `DataTypeEnum` - 数据类型

### 3. 关系映射

- ✅ 一对多关系 (One-to-Many)
- ✅ 多对多关系 (Many-to-Many)
- ✅ 自引用关系 (Self-referential)
- ✅ 双向关系 (Bidirectional)

示例:
```python
# 患者与就诊记录 (一对多)
Patient.visits → PatientVisit
PatientVisit.patient → Patient

# 用户与角色 (多对多)
User.roles → UserRole → Role
Role.users → UserRole → User

# 部门自引用 (树形结构)
Department.parent → Department
Department.children → [Department]
```

### 4. 通用功能

所有模型都包含:
- ✅ 时间戳 (created_at, updated_at)
- ✅ 软删除 (is_deleted, deleted_at, deleted_by)
- ✅ 用户追踪 (created_by, updated_by)
- ✅ 自动更新时间戳

## 📝 使用示例

### 导入模型

```python
from app.models import (
    User, Role, Permission, Department,
    Patient, PatientVisit, PatientAllergy,
    Study, Series, Instance,
    DiagnosticReport, ReportTemplate,
    SystemConfig, SystemLog, Notification
)
```

### 创建记录

```python
from app.models.patient import Patient, GenderEnum, PatientStatusEnum
from datetime import date

patient = Patient(
    patient_id="P20251013001",
    name="张三",
    gender=GenderEnum.MALE,
    birth_date=date(1980, 1, 1),
    phone="13800138000",
    status=PatientStatusEnum.ACTIVE
)
db.add(patient)
db.commit()
```

### 查询记录

```python
# 查询单个
patient = db.query(Patient).filter(Patient.patient_id == "P20251013001").first()

# 查询多个
patients = db.query(Patient).filter(
    Patient.status == PatientStatusEnum.ACTIVE,
    Patient.is_deleted == False
).all()

# 关联查询
patient_with_visits = db.query(Patient).join(PatientVisit).filter(
    Patient.id == 1
).first()
```

## 📚 相关文档

- 详细使用文档: `backend/app/models/README.md`
- 数据库设计文档: `docs/architecture/database-design.md`
- API 接口文档: `docs/api/README.md`

## 📊 统计信息

- **总表数**: 24 个
- **总模型数**: 24 个
- **枚举类型**: 30+ 个
- **关系映射**: 20+ 个
- **代码行数**: 约 1500+ 行
- **文档行数**: 约 500+ 行

## 🔧 数据库初始化

### 完整初始化

```bash
cd backend
python scripts/init_database.py
```

这将创建所有表并插入初始数据（管理员、角色、权限、部门等）。

### 重建数据库

```bash
cd backend
python tests/db_tools/recreate_database.py
```

### 插入测试数据

```bash
cd backend
python tests/fixtures/patient_data.py
```

## ✨ 总结

系统为所有 24 个数据库表创建了完整的 ORM 模型类，包括:

1. ✅ 完整的字段映射
2. ✅ 丰富的枚举类型
3. ✅ 清晰的关系定义
4. ✅ 通用的基础功能
5. ✅ 详细的文档说明
6. ✅ 完整的测试验证

所有模型都遵循最佳实践，代码结构清晰，易于维护和扩展。

