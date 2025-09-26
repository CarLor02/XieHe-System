#!/usr/bin/env python3
"""
简化的数据库连接测试脚本
直接测试MySQL和Redis连接，不依赖复杂的配置系统
"""

import sys
import os
import time
from datetime import datetime

# 数据库配置
MYSQL_HOST = "127.0.0.1"
MYSQL_PORT = 3306
MYSQL_USER = "root"
MYSQL_PASSWORD = "123456"
MYSQL_DATABASE = "xiehe_medical"

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6380
REDIS_PASSWORD = None
REDIS_DB = 0

def test_mysql_connection():
    """测试MySQL连接"""
    print("📊 测试MySQL数据库连接...")
    
    try:
        import pymysql
        
        start_time = time.time()
        
        # 创建连接
        connection = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        
        with connection:
            with connection.cursor() as cursor:
                # 测试基本查询
                cursor.execute("SELECT 1 as test_value")
                result = cursor.fetchone()
                test_value = result['test_value']

                # 获取数据库版本信息
                cursor.execute("SELECT VERSION() as version")
                result = cursor.fetchone()
                version = result['version']

                # 获取当前时间
                cursor.execute("SELECT NOW() as now_time")
                result = cursor.fetchone()
                current_time = result['now_time']

                # 测试数据库名称
                cursor.execute("SELECT DATABASE() as db_name")
                result = cursor.fetchone()
                db_name = result['db_name'] if result else "unknown"

                # 测试字符集
                cursor.execute("SHOW VARIABLES LIKE 'character_set_database'")
                result = cursor.fetchone()
                charset = result['Value'] if result else "unknown"

                # 测试连接数
                cursor.execute("SHOW STATUS LIKE 'Threads_connected'")
                result = cursor.fetchone()
                connections = result['Value'] if result else "unknown"
        
        response_time = round((time.time() - start_time) * 1000, 2)
        
        print(f"✅ MySQL连接成功!")
        print(f"   主机: {MYSQL_HOST}:{MYSQL_PORT}")
        print(f"   数据库: {db_name}")
        print(f"   版本: {version}")
        print(f"   字符集: {charset}")
        print(f"   当前时间: {current_time}")
        print(f"   活跃连接数: {connections}")
        print(f"   响应时间: {response_time}ms")
        print(f"   测试值: {test_value}")
        
        return True
        
    except Exception as e:
        print(f"❌ MySQL连接失败!")
        print(f"   错误: {str(e)}")
        print(f"   错误类型: {type(e).__name__}")
        return False

def test_redis_connection():
    """测试Redis连接"""
    print("\n🔴 测试Redis缓存连接...")
    
    try:
        import redis
        
        start_time = time.time()
        
        # 创建Redis客户端
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            db=REDIS_DB,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5
        )
        
        # 基本连接测试
        pong = redis_client.ping()
        
        # 获取Redis信息
        info = redis_client.info()
        
        # 测试读写操作
        test_key = f"test_key_{int(time.time())}"
        test_value = f"test_value_{datetime.now().isoformat()}"
        
        # 写入测试
        redis_client.set(test_key, test_value, ex=60)
        
        # 读取测试
        retrieved_value = redis_client.get(test_key)
        
        # 删除测试键
        redis_client.delete(test_key)
        
        # 测试其他操作
        redis_client.incr("test_counter")
        counter_value = redis_client.get("test_counter")
        redis_client.delete("test_counter")
        
        response_time = round((time.time() - start_time) * 1000, 2)
        
        print(f"✅ Redis连接成功!")
        print(f"   主机: {REDIS_HOST}:{REDIS_PORT}")
        print(f"   数据库: {REDIS_DB}")
        print(f"   版本: {info.get('redis_version', 'unknown')}")
        print(f"   模式: {info.get('redis_mode', 'unknown')}")
        print(f"   客户端连接数: {info.get('connected_clients', 'unknown')}")
        print(f"   内存使用: {info.get('used_memory_human', 'unknown')}")
        print(f"   运行时间: {info.get('uptime_in_seconds', 0)}秒")
        print(f"   响应时间: {response_time}ms")
        print(f"   Ping结果: {pong}")
        print(f"   读写测试: {'通过' if retrieved_value == test_value else '失败'}")
        print(f"   计数器测试: {'通过' if int(counter_value) == 1 else '失败'}")
        
        # 关闭连接
        redis_client.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Redis连接失败!")
        print(f"   错误: {str(e)}")
        print(f"   错误类型: {type(e).__name__}")
        return False

def main():
    """主函数"""
    print("🚀 开始数据库连接测试...")
    print("=" * 60)
    
    start_time = datetime.now()
    
    # 测试MySQL
    mysql_ok = test_mysql_connection()
    
    # 测试Redis
    redis_ok = test_redis_connection()
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print("\n" + "=" * 60)
    print("📋 测试结果汇总:")
    print(f"   MySQL: {'✅ 成功' if mysql_ok else '❌ 失败'}")
    print(f"   Redis: {'✅ 成功' if redis_ok else '❌ 失败'}")
    print(f"   总体状态: {'🎉 全部通过' if mysql_ok and redis_ok else '⚠️ 部分失败'}")
    print(f"   测试耗时: {duration:.2f}秒")
    print(f"   测试时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')} - {end_time.strftime('%H:%M:%S')}")
    
    if mysql_ok and redis_ok:
        print("\n🎉 所有数据库连接测试通过!")
        print("✅ 系统已准备好进行下一步开发!")
        return True
    else:
        print("\n⚠️ 部分数据库连接测试失败!")
        print("❌ 请检查数据库配置和服务状态!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
