# 协和医疗影像诊断系统 - Python环境信息
# 生成时间: 2025-09-24 16:10:41

## 系统信息
- 操作系统: Linux 6.8.0-51-generic
- 架构: x86_64
- Python版本: 3.11.4 (main, Jul  5 2023, 14:15:25) [GCC 11.2.0]
- Python路径: /xinray/data/anaconda3/bin/python
- 虚拟环境Python: venv/bin/python
- 虚拟环境Pip: venv/bin/pip

## 项目信息
- 项目名称: 协和医疗影像诊断系统
- 后端框架: FastAPI
- 数据库: MySQL + Redis
- 主要功能: 医学影像处理、AI辅助诊断、报告管理

## 激活虚拟环境
### Windows:
```cmd
activate_env.bat
```

### Linux/macOS:
```bash
source activate_env.sh
```

## 手动激活
### Windows:
```cmd
venv\Scripts\activate
```

### Linux/macOS:
```bash
source venv/bin/activate
```

## 已安装包列表
```
Package    Version
---------- -------
pip        25.2
setuptools 65.5.0

```

## 开发命令
```bash
# 启动开发服务器
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 数据库迁移
alembic upgrade head

# 运行测试
pytest

# 代码格式化
black .
isort .

# 类型检查
mypy .
```
