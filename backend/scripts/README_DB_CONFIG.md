# 数据库初始化脚本配置说明

## 修改内容

所有数据库初始化脚本已修改为从backend项目目录的 `.env` 文件读取数据库配置。

### 修改的文件列表

1. `backend/scripts/init_user_tables.py` - 用户权限表初始化
2. `backend/scripts/init_patient_tables.py` - 患者管理表初始化
3. `backend/scripts/init_image_tables.py` - 影像管理表初始化
4. `backend/scripts/init_report_tables.py` - 诊断报告表初始化
5. `backend/scripts/init_system_tables.py` - 系统配置表初始化

### 配置读取方式

所有脚本现在使用以下方式读取数据库配置：

```python
from dotenv import load_dotenv

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 加载.env文件
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# 从环境变量读取数据库配置
MYSQL_HOST = os.getenv("DB_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("DB_PORT", "3306"))
MYSQL_USER = os.getenv("DB_USER", "root")
MYSQL_PASSWORD = os.getenv("DB_PASSWORD", "123456")
MYSQL_DATABASE = os.getenv("DB_NAME", "medical_imaging_system")
```

### .env 文件配置

在backend项目目录的 `.env` 文件中配置以下数据库参数：

```env
DB_HOST=115.190.121.59
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=medical_imaging_system
```

### 优势

1. **统一配置管理**：所有数据库配置集中在 `.env` 文件中
2. **环境隔离**：不同环境可以使用不同的 `.env` 文件
3. **安全性**：敏感信息不会硬编码在代码中
4. **易于维护**：修改配置只需修改 `.env` 文件，无需修改代码

### 使用方法

1. 确保项目根目录存在 `.env` 文件
2. 在 `.env` 文件中配置正确的数据库连接信息
3. 运行初始化脚本：

```bash
# 初始化用户权限表
python backend/scripts/init_user_tables.py

# 初始化患者管理表
python backend/scripts/init_patient_tables.py

# 初始化影像管理表
python backend/scripts/init_image_tables.py

# 初始化诊断报告表
python backend/scripts/init_report_tables.py

# 初始化系统配置表
python backend/scripts/init_system_tables.py

# 或者运行完整初始化
python backend/scripts/init_database.py
```

### 依赖要求

确保已安装 `python-dotenv` 包：

```bash
pip install python-dotenv
```

### 注意事项

1. `.env` 文件不应提交到版本控制系统（已在 `.gitignore` 中配置）
2. 每个环境应该有自己的 `.env` 文件
3. 如果 `.env` 文件不存在或配置项缺失，脚本会使用默认值
4. 默认值为本地开发环境配置（127.0.0.1）

## 修改总结

### 已完成的修改

1. ✅ 所有初始化脚本从 `.env` 文件读取数据库配置
2. ✅ 添加 UTF-8 编码支持，解决 Windows 下 emoji 显示问题
3. ✅ 数据库连接测试成功（115.190.121.59）

### 修改的文件

- `backend/scripts/init_user_tables.py`
- `backend/scripts/init_patient_tables.py`
- `backend/scripts/init_image_tables.py`
- `backend/scripts/init_report_tables.py`
- `backend/scripts/init_system_tables.py`
- `backend/scripts/init_database.py`

每个文件都添加了：
- 从 `.env` 读取数据库配置
- UTF-8 编码设置（Windows 兼容）

## 当前问题

运行初始化脚本时遇到外键约束不兼容的问题：

```
(pymysql.err.OperationalError) (3780, "Referencing column 'user_id' and referenced column 'id' in foreign key constraint 'user_roles_ibfk_1' are incompatible.")
```

**原因**：数据库中已存在 `users` 表，其 `id` 列类型与脚本中定义的 `INTEGER` 类型不兼容（可能是 `BIGINT`）。

### 解决方案

#### 方案1：删除现有表（会丢失数据）

```sql
-- 连接到数据库
USE medical_imaging_system;

-- 禁用外键检查
SET FOREIGN_KEY_CHECKS = 0;

-- 删除所有表
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS patient_visits;
DROP TABLE IF EXISTS patient_allergies;
DROP TABLE IF EXISTS patient_medical_history;
-- ... 其他表

-- 启用外键检查
SET FOREIGN_KEY_CHECKS = 1;
```

然后重新运行初始化脚本：
```bash
python backend/scripts/init_database.py
```

#### 方案2：修改脚本使用 BIGINT

如果需要保留现有数据，可以修改脚本中的 `Integer` 为 `BigInteger`：

```python
from sqlalchemy import BigInteger

# 修改所有模型的 id 字段
id = Column(BigInteger, primary_key=True)
```

#### 方案3：使用数据库迁移工具（推荐）

使用 Alembic 进行版本化的数据库迁移管理：

```bash
# 安装 Alembic
pip install alembic

# 初始化 Alembic
cd backend
alembic init alembic

# 配置并生成迁移脚本
alembic revision --autogenerate -m "Initial migration"

# 应用迁移
alembic upgrade head
```

### 建议

对于开发环境，建议使用**方案1**（删除现有表）快速重建数据库。

对于生产环境，必须使用**方案3**（数据库迁移工具）来保证数据安全和版本控制。

