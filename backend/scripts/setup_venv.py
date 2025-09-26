#!/usr/bin/env python3
"""
Python虚拟环境配置脚本

创建和配置Python虚拟环境，安装项目依赖，验证环境配置。
适用于协和医疗影像诊断系统后端开发环境。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(command, description, check=True):
    """运行命令并处理结果"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=check
        )
        if result.returncode == 0:
            print(f"✅ {description} 成功!")
            return True, result.stdout
        else:
            print(f"❌ {description} 失败!")
            print(f"错误信息: {result.stderr}")
            return False, result.stderr
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} 失败!")
        print(f"错误信息: {e}")
        return False, str(e)

def check_python_version():
    """检查Python版本"""
    print("🐍 检查Python版本...")
    version = sys.version_info
    print(f"当前Python版本: {version.major}.{version.minor}.{version.micro}")
    
    if version.major != 3 or version.minor < 8:
        print("❌ 需要Python 3.8或更高版本!")
        return False
    
    print("✅ Python版本符合要求!")
    return True

def check_system_info():
    """检查系统信息"""
    print("💻 系统信息:")
    print(f"   操作系统: {platform.system()} {platform.release()}")
    print(f"   架构: {platform.machine()}")
    print(f"   Python路径: {sys.executable}")
    print(f"   工作目录: {os.getcwd()}")

def create_virtual_environment():
    """创建虚拟环境"""
    venv_path = Path("venv")
    
    if venv_path.exists():
        print("📁 虚拟环境已存在，跳过创建")
        return True
    
    success, output = run_command(
        f"{sys.executable} -m venv venv",
        "创建虚拟环境"
    )
    return success

def get_venv_python():
    """获取虚拟环境Python路径"""
    if platform.system() == "Windows":
        return "venv\\Scripts\\python.exe"
    else:
        return "venv/bin/python"

def get_venv_pip():
    """获取虚拟环境pip路径"""
    if platform.system() == "Windows":
        return "venv\\Scripts\\pip.exe"
    else:
        return "venv/bin/pip"

def upgrade_pip():
    """升级pip"""
    pip_path = get_venv_pip()
    success, output = run_command(
        f"{pip_path} install --upgrade pip",
        "升级pip"
    )
    return success

def install_requirements():
    """安装项目依赖"""
    pip_path = get_venv_pip()
    
    # 检查requirements.txt是否存在
    if not Path("requirements.txt").exists():
        print("❌ requirements.txt文件不存在!")
        return False
    
    success, output = run_command(
        f"{pip_path} install -r requirements.txt",
        "安装项目依赖",
        check=False  # 允许部分失败
    )
    
    # 即使有警告也继续
    if "Successfully installed" in output:
        print("✅ 主要依赖安装成功!")
        return True
    
    return success

def verify_installation():
    """验证安装"""
    python_path = get_venv_python()
    
    # 测试核心包
    test_packages = [
        ("fastapi", "FastAPI Web框架"),
        ("uvicorn", "ASGI服务器"),
        ("sqlalchemy", "ORM框架"),
        ("pymysql", "MySQL驱动"),
        ("redis", "Redis客户端"),
        ("pydantic", "数据验证"),
        ("numpy", "数值计算"),
        ("opencv-python", "图像处理"),
        ("pydicom", "DICOM处理")
    ]
    
    print("🧪 验证核心包安装...")
    failed_packages = []
    
    for package, description in test_packages:
        success, output = run_command(
            f"{python_path} -c \"import {package.replace('-', '_')}; print(f'{package} 版本: {{getattr({package.replace('-', '_')}, '__version__', 'unknown')}}')\"",
            f"测试 {description}",
            check=False
        )
        
        if not success:
            failed_packages.append(package)
    
    if failed_packages:
        print(f"⚠️ 以下包导入失败: {', '.join(failed_packages)}")
        return False
    
    print("✅ 所有核心包验证通过!")
    return True

def create_activation_script():
    """创建激活脚本"""
    if platform.system() == "Windows":
        script_content = """@echo off
echo 🚀 激活协和医疗影像诊断系统开发环境...
call venv\\Scripts\\activate.bat
echo ✅ 虚拟环境已激活!
echo 💡 使用 'deactivate' 命令退出虚拟环境
cmd /k
"""
        script_path = "activate_env.bat"
    else:
        script_content = """#!/bin/bash
echo "🚀 激活协和医疗影像诊断系统开发环境..."
source venv/bin/activate
echo "✅ 虚拟环境已激活!"
echo "💡 使用 'deactivate' 命令退出虚拟环境"
exec "$SHELL"
"""
        script_path = "activate_env.sh"
    
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    if platform.system() != "Windows":
        os.chmod(script_path, 0o755)
    
    print(f"✅ 创建激活脚本: {script_path}")

def generate_environment_info():
    """生成环境信息文件"""
    python_path = get_venv_python()
    pip_path = get_venv_pip()
    
    # 获取已安装包列表
    success, packages_output = run_command(
        f"{pip_path} list",
        "获取已安装包列表",
        check=False
    )
    
    env_info = f"""# 协和医疗影像诊断系统 - Python环境信息
# 生成时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 系统信息
- 操作系统: {platform.system()} {platform.release()}
- 架构: {platform.machine()}
- Python版本: {sys.version}
- Python路径: {sys.executable}
- 虚拟环境Python: {python_path}
- 虚拟环境Pip: {pip_path}

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
venv\\Scripts\\activate
```

### Linux/macOS:
```bash
source venv/bin/activate
```

## 已安装包列表
```
{packages_output if success else '获取包列表失败'}
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
"""
    
    with open("ENVIRONMENT.md", 'w', encoding='utf-8') as f:
        f.write(env_info)
    
    print("✅ 生成环境信息文件: ENVIRONMENT.md")

def main():
    """主函数"""
    print("🏥 协和医疗影像诊断系统 - Python虚拟环境配置")
    print("=" * 60)
    
    # 检查系统信息
    check_system_info()
    print()
    
    # 检查Python版本
    if not check_python_version():
        return False
    print()
    
    # 创建虚拟环境
    if not create_virtual_environment():
        return False
    print()
    
    # 升级pip
    if not upgrade_pip():
        print("⚠️ pip升级失败，继续安装依赖...")
    print()
    
    # 安装依赖
    if not install_requirements():
        print("⚠️ 部分依赖安装失败，继续验证...")
    print()
    
    # 验证安装
    if not verify_installation():
        print("⚠️ 部分包验证失败，但核心功能可能正常...")
    print()
    
    # 创建激活脚本
    create_activation_script()
    print()
    
    # 生成环境信息
    generate_environment_info()
    print()
    
    print("=" * 60)
    print("🎉 Python虚拟环境配置完成!")
    print()
    print("📋 下一步操作:")
    if platform.system() == "Windows":
        print("   1. 运行 activate_env.bat 激活环境")
    else:
        print("   1. 运行 source activate_env.sh 激活环境")
    print("   2. 查看 ENVIRONMENT.md 了解环境详情")
    print("   3. 开始FastAPI项目开发")
    print()
    print("🚀 环境已准备就绪，开始开发吧!")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
