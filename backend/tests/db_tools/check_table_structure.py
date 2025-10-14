#!/usr/bin/env python3
"""
检查数据库表结构工具

查看指定表的字段结构和示例数据

使用方法:
    cd backend
    python tests/db_tools/check_table_structure.py [table_name]
    
示例:
    python tests/db_tools/check_table_structure.py users
    python tests/db_tools/check_table_structure.py patients

@author XieHe Medical System
@created 2025-10-14
"""

from sqlalchemy import create_engine, text
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.config import settings


def check_table_structure(table_name: str = "users"):
    """检查表结构"""
    # 构建数据库连接URL
    db_url = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    engine = create_engine(db_url)
    
    print("=" * 80)
    print(f"检查表结构: {table_name}")
    print("=" * 80)
    print(f"数据库: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    print("=" * 80)
    
    with engine.connect() as conn:
        # 检查表是否存在
        check_sql = """
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = :db_name 
        AND table_name = :table_name
        """
        result = conn.execute(text(check_sql), {
            "db_name": settings.DB_NAME,
            "table_name": table_name
        })
        exists = result.scalar() > 0
        
        if not exists:
            print(f"\n❌ 表 '{table_name}' 不存在!")
            
            # 列出所有表
            print("\n可用的表:")
            result = conn.execute(text(f"SHOW TABLES FROM {settings.DB_NAME}"))
            tables = result.fetchall()
            for table in tables:
                print(f"  - {table[0]}")
            return
        
        # 查询表结构
        print(f"\n表字段:\n")
        result = conn.execute(text(f'DESCRIBE {table_name}'))
        columns = result.fetchall()
        
        # 表头
        print(f"{'字段名':<25} {'类型':<25} {'允许NULL':<10} {'键':<10} {'默认值':<15} {'额外':<20}")
        print("-" * 120)
        
        for col in columns:
            field = col[0]
            type_ = col[1]
            null = col[2]
            key = col[3] or ''
            default = str(col[4]) if col[4] is not None else 'NULL'
            extra = col[5] or ''
            
            print(f"{field:<25} {type_:<25} {null:<10} {key:<10} {default:<15} {extra:<20}")
        
        print("\n" + "=" * 80)
        
        # 查询记录数量
        result = conn.execute(text(f'SELECT COUNT(*) FROM {table_name}'))
        count = result.scalar()
        print(f"记录总数: {count}")
        
        if count > 0:
            # 查询前5条记录
            print(f"\n前 5 条记录:")
            print("-" * 120)
            
            result = conn.execute(text(f'SELECT * FROM {table_name} LIMIT 5'))
            rows = result.fetchall()
            
            # 获取列名
            column_names = [col[0] for col in columns]
            
            for i, row in enumerate(rows, 1):
                print(f"\n记录 {i}:")
                for col_name, value in zip(column_names, row):
                    # 截断长字符串
                    if isinstance(value, str) and len(value) > 50:
                        value = value[:50] + "..."
                    print(f"  {col_name}: {value}")
        
        # 索引信息
        print("\n" + "=" * 80)
        print("索引信息:")
        print("=" * 80)
        
        result = conn.execute(text(f'SHOW INDEX FROM {table_name}'))
        indexes = result.fetchall()
        
        if indexes:
            # 按索引名分组
            index_dict = {}
            for idx in indexes:
                index_name = idx[2]
                if index_name not in index_dict:
                    index_dict[index_name] = []
                index_dict[index_name].append({
                    'column': idx[4],
                    'unique': not idx[1],
                    'type': idx[10]
                })
            
            for index_name, columns in index_dict.items():
                unique = "UNIQUE" if columns[0]['unique'] else "INDEX"
                col_names = ", ".join([c['column'] for c in columns])
                print(f"  {unique}: {index_name} ({col_names})")
        else:
            print("  无索引")
    
    print("\n" + "=" * 80)
    print("检查完成")
    print("=" * 80)


def list_all_tables():
    """列出所有表"""
    db_url = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    engine = create_engine(db_url)
    
    print("=" * 80)
    print(f"数据库所有表: {settings.DB_NAME}")
    print("=" * 80)
    
    with engine.connect() as conn:
        result = conn.execute(text(f"SHOW TABLES FROM {settings.DB_NAME}"))
        tables = result.fetchall()
        
        print(f"\n共 {len(tables)} 个表:\n")
        for table in tables:
            table_name = table[0]
            
            # 获取记录数
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            count = result.scalar()
            
            print(f"  {table_name:<30} ({count} 条记录)")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    try:
        if len(sys.argv) > 1:
            if sys.argv[1] == "--list":
                list_all_tables()
            else:
                check_table_structure(sys.argv[1])
        else:
            # 默认检查 users 表
            check_table_structure("users")
            
            print("\n提示: 使用 'python check_table_structure.py <table_name>' 检查其他表")
            print("     使用 'python check_table_structure.py --list' 列出所有表")
            
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()

