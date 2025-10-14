#!/usr/bin/env python3
"""
验证测试工具集

快速验证所有测试工具是否正常工作

使用方法:
    cd backend
    python tests/验证测试工具.py

@author XieHe Medical System
@created 2025-10-14
"""

import os
import sys
import subprocess


def print_header(title):
    """打印标题"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def print_success(message):
    """打印成功消息"""
    print(f"✅ {message}")


def print_error(message):
    """打印错误消息"""
    print(f"❌ {message}")


def print_info(message):
    """打印信息"""
    print(f"ℹ️  {message}")


def check_file_exists(filepath):
    """检查文件是否存在"""
    if os.path.exists(filepath):
        print_success(f"文件存在: {filepath}")
        return True
    else:
        print_error(f"文件不存在: {filepath}")
        return False


def check_directory_structure():
    """检查目录结构"""
    print_header("检查目录结构")
    
    required_dirs = [
        "tests",
        "tests/manual",
        "tests/db_tools",
        "tests/unit",
        "tests/integration",
        "tests/fixtures",
    ]
    
    all_exist = True
    for dir_path in required_dirs:
        if os.path.isdir(dir_path):
            print_success(f"目录存在: {dir_path}")
        else:
            print_error(f"目录不存在: {dir_path}")
            all_exist = False
    
    return all_exist


def check_required_files():
    """检查必需文件"""
    print_header("检查必需文件")
    
    required_files = [
        "tests/README.md",
        "tests/__init__.py",
        "tests/manual/__init__.py",
        "tests/manual/test_auth_manual.py",
        "tests/db_tools/__init__.py",
        "tests/db_tools/check_users.py",
        "tests/db_tools/check_table_structure.py",
        "tests/test_auth.py",
    ]
    
    all_exist = True
    for file_path in required_files:
        if not check_file_exists(file_path):
            all_exist = False
    
    return all_exist


def check_old_files_removed():
    """检查旧文件是否已删除"""
    print_header("检查旧文件是否已删除")
    
    old_paths = [
        "dev_tools",
        "临时测试文件清单.md",
    ]
    
    all_removed = True
    for path in old_paths:
        if os.path.exists(path):
            print_error(f"旧文件/目录仍存在: {path}")
            all_removed = False
        else:
            print_success(f"已删除: {path}")
    
    return all_removed


def test_import_modules():
    """测试导入模块"""
    print_header("测试导入模块")
    
    try:
        # 测试导入手动测试工具
        sys.path.insert(0, os.path.dirname(__file__))
        from manual.test_auth_manual import AuthManualTester
        print_success("成功导入: manual.test_auth_manual.AuthManualTester")
        
        # 测试实例化
        tester = AuthManualTester()
        print_success("成功实例化: AuthManualTester")
        
        return True
    except Exception as e:
        print_error(f"导入失败: {e}")
        return False


def check_python_syntax():
    """检查 Python 语法"""
    print_header("检查 Python 语法")
    
    python_files = [
        "tests/manual/test_auth_manual.py",
        "tests/db_tools/check_users.py",
        "tests/db_tools/check_table_structure.py",
    ]
    
    all_valid = True
    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
                compile(code, file_path, 'exec')
            print_success(f"语法正确: {file_path}")
        except SyntaxError as e:
            print_error(f"语法错误: {file_path} - {e}")
            all_valid = False
    
    return all_valid


def main():
    """主函数"""
    print_header("测试工具集验证")
    print_info("验证测试工具整理是否成功")
    
    # 切换到 backend 目录
    if os.path.basename(os.getcwd()) == 'tests':
        os.chdir('..')
    
    print_info(f"当前目录: {os.getcwd()}")
    
    # 执行检查
    results = []
    
    results.append(("目录结构", check_directory_structure()))
    results.append(("必需文件", check_required_files()))
    results.append(("旧文件删除", check_old_files_removed()))
    results.append(("Python语法", check_python_syntax()))
    results.append(("模块导入", test_import_modules()))
    
    # 总结
    print_header("验证总结")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name:<15} {status}")
    
    print("\n" + "-" * 80)
    print(f"  总计: {passed}/{total} 项通过")
    
    if passed == total:
        print_success("\n🎉 所有验证通过！测试工具整理成功！")
        return 0
    else:
        print_error(f"\n⚠️  有 {total - passed} 项验证失败，请检查！")
        return 1


if __name__ == "__main__":
    sys.exit(main())

