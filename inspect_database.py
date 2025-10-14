"""检查数据库中的所有表结构"""
import pymysql
from pymysql.cursors import DictCursor

# 数据库连接配置
DB_CONFIG = {
    'host': '115.190.121.59',
    'port': 3306,
    'user': 'root',
    'password': 'qweasd2025',
    'database': 'medical_imaging_system',
    'charset': 'utf8mb4'
}

try:
    # 连接数据库
    connection = pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)
    cursor = connection.cursor()
    
    # 获取所有表名
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()
    
    print("=" * 80)
    print(f"数据库: {DB_CONFIG['database']}")
    print(f"共有 {len(tables)} 个表")
    print("=" * 80)
    
    # 遍历每个表，获取表结构
    for table_dict in tables:
        table_name = list(table_dict.values())[0]
        print(f"\n表名: {table_name}")
        print("-" * 80)
        
        # 获取表结构
        cursor.execute(f"DESCRIBE `{table_name}`")
        columns = cursor.fetchall()
        
        print(f"{'字段名':<30} {'类型':<20} {'NULL':<8} {'键':<8} {'默认值':<15} {'额外'}")
        print("-" * 80)
        
        for col in columns:
            field = col['Field']
            type_ = col['Type']
            null = col['Null']
            key = col['Key']
            default = str(col['Default']) if col['Default'] is not None else 'NULL'
            extra = col['Extra']
            
            print(f"{field:<30} {type_:<20} {null:<8} {key:<8} {default:<15} {extra}")
        
        # 获取表注释
        cursor.execute(f"SHOW TABLE STATUS LIKE '{table_name}'")
        table_status = cursor.fetchone()
        if table_status and table_status.get('Comment'):
            print(f"\n表注释: {table_status['Comment']}")
    
    cursor.close()
    connection.close()
    
    print("\n" + "=" * 80)
    print("数据库检查完成")
    
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()

