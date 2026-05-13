#!/usr/bin/env python3
"""
检查数据库用户工具

快速查看数据库中的用户列表和状态

使用方法:
    cd backend
    python tests/db_tools/check_users.py

@author XieHe Medical System
@created 2025-10-14
"""

from sqlalchemy import create_engine, text
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.config import settings


def check_users():
    """检查数据库中的用户"""
    # 构建数据库连接URL
    db_url = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    engine = create_engine(db_url)
    
    print("=" * 80)
    print("检查数据库中的用户")
    print("=" * 80)
    print(f"数据库: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    print("=" * 80)
    
    with engine.connect() as conn:
        # 查询用户（使用实际的表结构）
        sql = """
        SELECT 
            id, 
            username, 
            email, 
            real_name,
            status,
            is_superuser,
            is_verified,
            is_deleted,
            created_at
        FROM users 
        WHERE is_deleted = 0 OR is_deleted IS NULL
        ORDER BY id
        LIMIT 20
        """
        
        result = conn.execute(text(sql))
        users = result.fetchall()
        
        if not users:
            print("\n❌ 数据库中没有用户！")
        else:
            print(f"\n✅ 找到 {len(users)} 个用户：\n")
            
            # 表头
            print(f"{'ID':<5} {'用户名':<15} {'邮箱':<30} {'姓名':<15} {'状态':<10} {'角色':<10} {'创建时间':<20}")
            print("-" * 120)
            
            for user in users:
                user_id = user[0]
                username = user[1]
                email = user[2] or ''
                real_name = user[3] or ''
                status = user[4] or 'unknown'
                is_superuser = user[5]
                is_verified = user[6]
                is_deleted = user[7]
                created_at = user[8]
                
                # 确定角色
                role = "admin" if is_superuser else "doctor"
                
                # 状态显示
                status_display = f"{status}"
                if is_verified:
                    status_display += " ✓"
                
                print(f"{user_id:<5} {username:<15} {email:<30} {real_name:<15} {status_display:<10} {role:<10} {str(created_at):<20}")
        
        # 统计信息
        print("\n" + "=" * 80)
        print("统计信息:")
        print("=" * 80)
        
        # 总用户数
        result = conn.execute(text("SELECT COUNT(*) FROM users WHERE is_deleted = 0 OR is_deleted IS NULL"))
        total_count = result.scalar()
        print(f"总用户数: {total_count}")
        
        # 激活用户数
        result = conn.execute(text("SELECT COUNT(*) FROM users WHERE status = 'active' AND (is_deleted = 0 OR is_deleted IS NULL)"))
        active_count = result.scalar()
        print(f"激活用户: {active_count}")
        
        # 管理员数
        result = conn.execute(text("SELECT COUNT(*) FROM users WHERE is_superuser = 1 AND (is_deleted = 0 OR is_deleted IS NULL)"))
        admin_count = result.scalar()
        print(f"管理员数: {admin_count}")
        
        # 已验证用户数
        result = conn.execute(text("SELECT COUNT(*) FROM users WHERE is_verified = 1 AND (is_deleted = 0 OR is_deleted IS NULL)"))
        verified_count = result.scalar()
        print(f"已验证用户: {verified_count}")
    
    print("\n" + "=" * 80)
    print("检查完成")
    print("=" * 80)


if __name__ == "__main__":
    try:
        check_users()
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()

