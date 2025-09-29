#!/usr/bin/env python3
"""
修复导入错误的脚本
"""

import os
import re

def fix_file_imports(file_path):
    """修复单个文件的导入"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 修复导入语句
        content = re.sub(
            r'from app\.api\.deps import get_current_user, get_db',
            'from app.core.auth import get_current_active_user\nfrom app.core.database import get_db',
            content
        )
        
        content = re.sub(
            r'from app\.api\.deps import get_current_user',
            'from app.core.auth import get_current_active_user',
            content
        )
        
        content = re.sub(
            r'from app\.core\.auth import get_current_user',
            'from app.core.auth import get_current_active_user',
            content
        )
        
        # 修复函数调用
        content = re.sub(
            r'Depends\(get_current_user\)',
            'Depends(get_current_active_user)',
            content
        )
        
        # 修复类型注解
        content = re.sub(
            r'current_user: User = Depends\(get_current_active_user\)',
            'current_user: dict = Depends(get_current_active_user)',
            content
        )
        
        content = re.sub(
            r'current_user = Depends\(get_current_active_user\)',
            'current_user: dict = Depends(get_current_active_user)',
            content
        )
        
        # 如果内容有变化，写回文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 修复了 {file_path}")
            return True
        else:
            print(f"⏭️  跳过 {file_path} (无需修复)")
            return False
            
    except Exception as e:
        print(f"❌ 修复 {file_path} 失败: {e}")
        return False

def main():
    """主函数"""
    print("🔧 开始修复导入错误...")
    
    # 需要修复的目录
    endpoints_dir = "app/api/v1/endpoints"
    
    if not os.path.exists(endpoints_dir):
        print(f"❌ 目录不存在: {endpoints_dir}")
        return
    
    fixed_count = 0
    total_count = 0
    
    # 遍历所有Python文件
    for filename in os.listdir(endpoints_dir):
        if filename.endswith('.py') and not filename.startswith('__'):
            file_path = os.path.join(endpoints_dir, filename)
            total_count += 1
            
            if fix_file_imports(file_path):
                fixed_count += 1
    
    print(f"\n📊 修复完成:")
    print(f"   - 总文件数: {total_count}")
    print(f"   - 修复文件数: {fixed_count}")
    print(f"   - 跳过文件数: {total_count - fixed_count}")

if __name__ == "__main__":
    main()
