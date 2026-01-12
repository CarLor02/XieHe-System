"""
比较本地和远程数据库的表结构

特别关注个人设置相关的表

@author XieHe Medical System
@created 2026-01-12
"""

import os
import sys
from dotenv import load_dotenv
import pymysql

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# 加载.env文件
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)


def get_database_connection(host, port, user, password, database):
    """创建数据库连接"""
    try:
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        return connection
    except Exception as e:
        print(f"❌ 连接数据库失败 ({host}:{port}): {e}")
        return None


def get_all_tables(connection):
    """获取所有表名"""
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        tables = [list(row.values())[0] for row in cursor.fetchall()]
    return sorted(tables)


def get_table_structure(connection, table_name):
    """获取表结构"""
    with connection.cursor() as cursor:
        cursor.execute(f"DESCRIBE `{table_name}`")
        columns = cursor.fetchall()
    return columns


def get_table_indexes(connection, table_name):
    """获取表索引"""
    with connection.cursor() as cursor:
        cursor.execute(f"SHOW INDEX FROM `{table_name}`")
        indexes = cursor.fetchall()
    return indexes


def export_database_schema(connection, db_name, output_file):
    """导出数据库结构到文件"""
    tables = get_all_tables(connection)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"数据库: {db_name}\n")
        f.write(f"表数量: {len(tables)}\n")
        f.write("=" * 80 + "\n\n")

        for table in tables:
            f.write(f"表名: {table}\n")
            f.write("-" * 80 + "\n")

            # 获取表结构
            structure = get_table_structure(connection, table)
            f.write(f"{'字段名':<30} {'类型':<20} {'NULL':<10} {'键':<10} {'默认值':<20}\n")
            f.write("-" * 80 + "\n")
            for col in structure:
                f.write(f"{col['Field']:<30} {col['Type']:<20} {col['Null']:<10} {col['Key']:<10} {str(col['Default']):<20}\n")

            f.write("\n")

    print(f"✅ 数据库结构已导出到: {output_file}")


def compare_databases():
    """比较本地和远程数据库"""
    print("=" * 80)
    print("数据库表结构对比工具")
    print("=" * 80)

    # 本地数据库配置
    local_config = {
        'host': os.getenv("DB_HOST", "127.0.0.1"),
        'port': int(os.getenv("DB_PORT", "3306")),
        'user': os.getenv("DB_USER", "root"),
        'password': os.getenv("DB_PASSWORD", "123456"),
        'database': os.getenv("DB_NAME", "medical_imaging_system")
    }

    # 远程数据库配置
    remote_config = {
        'host': '115.190.121.59',
        'port': 3306,
        'user': 'root',
        'password': 'qweasd2025',
        'database': 'medical_imaging_system'
    }

    print(f"\n📍 本地数据库: {local_config['host']}:{local_config['port']}/{local_config['database']}")
    print(f"📍 远程数据库: {remote_config['host']}:{remote_config['port']}/{remote_config['database']}")
    print()

    # 连接本地数据库
    print("正在连接本地数据库...")
    local_conn = get_database_connection(**local_config)

    if not local_conn:
        print("❌ 无法连接到本地数据库，请检查配置")
        return

    print("✅ 本地数据库连接成功")

    # 尝试连接远程数据库
    print("正在连接远程数据库...")
    remote_conn = get_database_connection(**remote_config)

    if not remote_conn:
        print("❌ 无法连接到远程数据库")
        print("\n导出本地数据库结构...")
        export_database_schema(local_conn, "本地数据库", "local_schema.txt")
        local_conn.close()
        print("\n请在远程服务器上运行此脚本或手动比较")
        return

    print("✅ 远程数据库连接成功\n")

    try:
        # 获取所有表
        local_tables = get_all_tables(local_conn)
        remote_tables = get_all_tables(remote_conn)
        
        print(f"✅ 本地数据库表数量: {len(local_tables)}")
        print(f"✅ 远程数据库表数量: {len(remote_tables)}")
        print()
        
        # 比较表列表
        only_local = set(local_tables) - set(remote_tables)
        only_remote = set(remote_tables) - set(local_tables)
        common_tables = set(local_tables) & set(remote_tables)
        
        if only_local:
            print("⚠️  仅存在于本地的表:")
            for table in sorted(only_local):
                print(f"   - {table}")
            print()
        
        if only_remote:
            print("⚠️  仅存在于远程的表:")
            for table in sorted(only_remote):
                print(f"   - {table}")
            print()
        
        # 个人设置相关的表
        user_related_tables = [
            'users', 'user_roles', 'user_settings', 'user_preferences',
            'departments', 'roles', 'permissions', 'role_permissions'
        ]
        
        print("=" * 80)
        print("个人设置相关表结构对比")
        print("=" * 80)
        
        for table in user_related_tables:
            if table in common_tables:
                print(f"\n📋 表: {table}")
                print("-" * 80)
                
                local_structure = get_table_structure(local_conn, table)
                remote_structure = get_table_structure(remote_conn, table)
                
                # 比较列
                local_columns = {col['Field']: col for col in local_structure}
                remote_columns = {col['Field']: col for col in remote_structure}
                
                # 检查差异
                differences = []
                for col_name in set(list(local_columns.keys()) + list(remote_columns.keys())):
                    if col_name not in local_columns:
                        differences.append(f"  ❌ 列 '{col_name}' 仅存在于远程")
                    elif col_name not in remote_columns:
                        differences.append(f"  ❌ 列 '{col_name}' 仅存在于本地")
                    else:
                        local_col = local_columns[col_name]
                        remote_col = remote_columns[col_name]
                        if local_col['Type'] != remote_col['Type']:
                            differences.append(f"  ⚠️  列 '{col_name}' 类型不同: 本地={local_col['Type']}, 远程={remote_col['Type']}")
                        if local_col['Null'] != remote_col['Null']:
                            differences.append(f"  ⚠️  列 '{col_name}' NULL约束不同: 本地={local_col['Null']}, 远程={remote_col['Null']}")
                
                if differences:
                    print("  发现差异:")
                    for diff in differences:
                        print(diff)
                else:
                    print("  ✅ 结构一致")
            elif table in local_tables:
                print(f"\n📋 表: {table}")
                print("  ⚠️  仅存在于本地数据库")
            elif table in remote_tables:
                print(f"\n📋 表: {table}")
                print("  ⚠️  仅存在于远程数据库")
        
    finally:
        local_conn.close()
        remote_conn.close()
    
    print("\n" + "=" * 80)
    print("对比完成")
    print("=" * 80)


if __name__ == '__main__':
    compare_databases()

