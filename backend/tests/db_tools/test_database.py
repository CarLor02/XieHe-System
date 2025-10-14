#!/usr/bin/env python3
"""
数据库连接测试脚本
测试MySQL和Redis连接是否正常工作
"""

import sys
import os
import time
from datetime import datetime
from typing import Dict, Any

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import db_manager, SessionLocal, redis_pool
from app.core.config import settings
import redis
from sqlalchemy import text

class DatabaseTester:
    """数据库连接测试器"""
    
    def __init__(self):
        self.results = {
            "mysql": {"status": "未测试", "details": {}},
            "redis": {"status": "未测试", "details": {}},
            "overall": {"status": "未测试", "start_time": None, "end_time": None}
        }
    
    def test_mysql_connection(self) -> Dict[str, Any]:
        """测试MySQL连接"""
        print("📊 测试MySQL数据库连接...")

        try:
            start_time = time.time()

            # 基本连接测试
            with SessionLocal() as session:
                # 测试基本查询
                result = session.execute(text("SELECT 1 as test_value"))
                test_value = result.scalar()

                # 获取数据库版本信息
                result = session.execute(text("SELECT VERSION() as version"))
                version = result.scalar()

                # 获取当前时间
                result = session.execute(text("SELECT NOW() as current_time"))
                current_time = result.scalar()

                # 测试数据库名称
                result = session.execute(text("SELECT DATABASE() as db_name"))
                db_name = result.scalar()

                # 测试字符集
                result = session.execute(text("SHOW VARIABLES LIKE 'character_set_database'"))
                charset_row = result.fetchone()
                charset = charset_row[1] if charset_row else "unknown"

                # 测试连接数
                result = session.execute(text("SHOW STATUS LIKE 'Threads_connected'"))
                connections_row = result.fetchone()
                connections = connections_row[1] if connections_row else "unknown"
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            details = {
                "host": f"{settings.MYSQL_HOST}:{settings.MYSQL_PORT}",
                "database": db_name,
                "version": version,
                "charset": charset,
                "current_time": str(current_time),
                "connections": connections,
                "response_time": f"{response_time}ms",
                "test_value": test_value
            }
            
            print(f"✅ MySQL连接成功!")
            print(f"   主机: {details['host']}")
            print(f"   数据库: {details['database']}")
            print(f"   版本: {details['version']}")
            print(f"   字符集: {details['charset']}")
            print(f"   当前时间: {details['current_time']}")
            print(f"   活跃连接数: {details['connections']}")
            print(f"   响应时间: {details['response_time']}")
            
            return {"status": "成功", "details": details}
            
        except Exception as e:
            error_details = {
                "host": f"{settings.MYSQL_HOST}:{settings.MYSQL_PORT}",
                "database": settings.MYSQL_DATABASE,
                "error": str(e),
                "error_type": type(e).__name__
            }
            
            print(f"❌ MySQL连接失败!")
            print(f"   错误: {error_details['error']}")
            print(f"   错误类型: {error_details['error_type']}")
            
            return {"status": "失败", "details": error_details}
    
    def test_redis_connection(self) -> Dict[str, Any]:
        """测试Redis连接"""
        print("\n🔴 测试Redis缓存连接...")

        try:
            start_time = time.time()

            # 创建Redis客户端
            redis_client = redis.Redis(connection_pool=redis_pool)

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
            
            details = {
                "host": f"{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                "database": settings.REDIS_DB,
                "version": info.get("redis_version", "unknown"),
                "mode": info.get("redis_mode", "unknown"),
                "connected_clients": info.get("connected_clients", "unknown"),
                "used_memory": info.get("used_memory_human", "unknown"),
                "uptime": f"{info.get('uptime_in_seconds', 0)}秒",
                "response_time": f"{response_time}ms",
                "ping_result": pong,
                "read_write_test": retrieved_value == test_value,
                "counter_test": int(counter_value) == 1 if counter_value else False
            }
            
            print(f"✅ Redis连接成功!")
            print(f"   主机: {details['host']}")
            print(f"   数据库: {details['database']}")
            print(f"   版本: {details['version']}")
            print(f"   模式: {details['mode']}")
            print(f"   客户端连接数: {details['connected_clients']}")
            print(f"   内存使用: {details['used_memory']}")
            print(f"   运行时间: {details['uptime']}")
            print(f"   响应时间: {details['response_time']}")
            print(f"   读写测试: {'通过' if details['read_write_test'] else '失败'}")
            print(f"   计数器测试: {'通过' if details['counter_test'] else '失败'}")
            
            # 关闭连接
            redis_client.close()
            
            return {"status": "成功", "details": details}
            
        except Exception as e:
            error_details = {
                "host": f"{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                "database": settings.REDIS_DB,
                "error": str(e),
                "error_type": type(e).__name__
            }
            
            print(f"❌ Redis连接失败!")
            print(f"   错误: {error_details['error']}")
            print(f"   错误类型: {error_details['error_type']}")
            
            return {"status": "失败", "details": error_details}
    
    def test_database_manager(self) -> Dict[str, Any]:
        """测试数据库管理器"""
        print("\n🔧 测试数据库管理器...")

        try:
            # 连接数据库
            db_manager.connect()

            # 健康检查
            health_status = db_manager.health_check()

            print(f"✅ 数据库管理器测试成功!")
            print(f"   MySQL状态: {health_status['mysql']['status']}")
            print(f"   MySQL响应时间: {health_status['mysql'].get('response_time', 'N/A')}")
            print(f"   Redis状态: {health_status['redis']['status']}")
            print(f"   Redis响应时间: {health_status['redis'].get('response_time', 'N/A')}")

            # 断开连接
            db_manager.disconnect()

            return {"status": "成功", "details": health_status}

        except Exception as e:
            error_details = {
                "error": str(e),
                "error_type": type(e).__name__
            }

            print(f"❌ 数据库管理器测试失败!")
            print(f"   错误: {error_details['error']}")

            return {"status": "失败", "details": error_details}
    
    def run_all_tests(self) -> Dict[str, Any]:
        """运行所有测试"""
        print("🚀 开始数据库连接测试...")
        print("=" * 60)

        self.results["overall"]["start_time"] = datetime.now().isoformat()

        # 测试MySQL
        self.results["mysql"] = self.test_mysql_connection()

        # 测试Redis
        self.results["redis"] = self.test_redis_connection()

        # 测试数据库管理器
        manager_result = self.test_database_manager()

        self.results["overall"]["end_time"] = datetime.now().isoformat()

        # 判断总体状态
        mysql_ok = self.results["mysql"]["status"] == "成功"
        redis_ok = self.results["redis"]["status"] == "成功"
        manager_ok = manager_result["status"] == "成功"

        if mysql_ok and redis_ok and manager_ok:
            self.results["overall"]["status"] = "全部通过"
            print("\n🎉 所有数据库连接测试通过!")
        else:
            self.results["overall"]["status"] = "部分失败"
            print("\n⚠️  部分数据库连接测试失败!")

        print("=" * 60)
        print("📋 测试结果汇总:")
        print(f"   MySQL: {self.results['mysql']['status']}")
        print(f"   Redis: {self.results['redis']['status']}")
        print(f"   管理器: {manager_result['status']}")
        print(f"   总体状态: {self.results['overall']['status']}")

        return self.results

def main():
    """主函数"""
    tester = DatabaseTester()
    results = tester.run_all_tests()

    # 根据测试结果设置退出码
    if results["overall"]["status"] == "全部通过":
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
