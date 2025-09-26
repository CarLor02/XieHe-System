"""
数据库优化模块

提供查询性能分析、索引优化、数据分区等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import text, create_engine, MetaData, Table, Index
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from dataclasses import dataclass
import psutil

from app.core.database import get_db, engine
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class QueryAnalysis:
    """查询分析结果"""
    query: str
    execution_time: float
    rows_examined: int
    rows_returned: int
    index_usage: List[str]
    recommendations: List[str]
    timestamp: datetime


@dataclass
class IndexRecommendation:
    """索引推荐"""
    table_name: str
    columns: List[str]
    index_type: str
    estimated_benefit: float
    reason: str


class DatabaseOptimizer:
    """数据库优化器"""
    
    def __init__(self):
        self.engine = engine
        self.metadata = MetaData()
        self.slow_query_threshold = 1.0  # 1秒
        self.query_history: List[QueryAnalysis] = []
    
    async def analyze_slow_queries(self, hours: int = 24) -> List[QueryAnalysis]:
        """分析慢查询"""
        try:
            with Session(self.engine) as session:
                # PostgreSQL慢查询分析
                if "postgresql" in str(self.engine.url):
                    query = text("""
                        SELECT query, mean_exec_time, calls, rows, 
                               100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
                        FROM pg_stat_statements 
                        WHERE mean_exec_time > :threshold
                        ORDER BY mean_exec_time DESC 
                        LIMIT 50
                    """)
                    
                    result = session.execute(query, {"threshold": self.slow_query_threshold * 1000})
                    
                    analyses = []
                    for row in result:
                        analysis = QueryAnalysis(
                            query=row.query[:500],  # 截断长查询
                            execution_time=row.mean_exec_time / 1000,  # 转换为秒
                            rows_examined=row.rows,
                            rows_returned=row.rows,
                            index_usage=[],
                            recommendations=self._generate_query_recommendations(row.query),
                            timestamp=datetime.now()
                        )
                        analyses.append(analysis)
                    
                    return analyses
                
                # MySQL慢查询分析
                elif "mysql" in str(self.engine.url):
                    # MySQL的慢查询日志分析
                    return []
                
                # SQLite或其他数据库
                else:
                    return []
                    
        except Exception as e:
            logger.error(f"分析慢查询失败: {e}")
            return []
    
    def _generate_query_recommendations(self, query: str) -> List[str]:
        """生成查询优化建议"""
        recommendations = []
        query_lower = query.lower()
        
        # 检查是否缺少WHERE子句
        if "select" in query_lower and "where" not in query_lower and "limit" not in query_lower:
            recommendations.append("考虑添加WHERE子句限制结果集")
        
        # 检查是否使用了SELECT *
        if "select *" in query_lower:
            recommendations.append("避免使用SELECT *，只选择需要的列")
        
        # 检查是否有ORDER BY但没有LIMIT
        if "order by" in query_lower and "limit" not in query_lower:
            recommendations.append("ORDER BY查询建议添加LIMIT子句")
        
        # 检查是否有子查询
        if query_lower.count("select") > 1:
            recommendations.append("考虑使用JOIN替代子查询")
        
        # 检查是否有LIKE '%pattern%'
        if "like '%" in query_lower and query_lower.count("like '%") > 0:
            recommendations.append("避免使用前导通配符的LIKE查询，考虑全文搜索")
        
        return recommendations
    
    async def analyze_table_statistics(self) -> Dict[str, Any]:
        """分析表统计信息"""
        try:
            with Session(self.engine) as session:
                stats = {}
                
                if "postgresql" in str(self.engine.url):
                    # PostgreSQL表统计
                    query = text("""
                        SELECT 
                            schemaname,
                            tablename,
                            n_tup_ins as inserts,
                            n_tup_upd as updates,
                            n_tup_del as deletes,
                            n_live_tup as live_tuples,
                            n_dead_tup as dead_tuples,
                            last_vacuum,
                            last_autovacuum,
                            last_analyze,
                            last_autoanalyze
                        FROM pg_stat_user_tables
                        ORDER BY n_live_tup DESC
                    """)
                    
                    result = session.execute(query)
                    
                    for row in result:
                        table_key = f"{row.schemaname}.{row.tablename}"
                        stats[table_key] = {
                            "inserts": row.inserts,
                            "updates": row.updates,
                            "deletes": row.deletes,
                            "live_tuples": row.live_tuples,
                            "dead_tuples": row.dead_tuples,
                            "last_vacuum": row.last_vacuum,
                            "last_analyze": row.last_analyze,
                            "dead_tuple_ratio": (row.dead_tuples / max(row.live_tuples, 1)) * 100
                        }
                
                return stats
                
        except Exception as e:
            logger.error(f"分析表统计信息失败: {e}")
            return {}
    
    async def recommend_indexes(self) -> List[IndexRecommendation]:
        """推荐索引"""
        recommendations = []
        
        try:
            with Session(self.engine) as session:
                if "postgresql" in str(self.engine.url):
                    # 分析缺失的索引
                    query = text("""
                        SELECT 
                            schemaname,
                            tablename,
                            attname,
                            n_distinct,
                            correlation
                        FROM pg_stats 
                        WHERE schemaname = 'public'
                        AND n_distinct > 100  -- 高选择性列
                        ORDER BY n_distinct DESC
                    """)
                    
                    result = session.execute(query)
                    
                    for row in result:
                        # 检查是否已有索引
                        index_check = text("""
                            SELECT COUNT(*) 
                            FROM pg_indexes 
                            WHERE schemaname = :schema 
                            AND tablename = :table 
                            AND indexdef LIKE :column
                        """)
                        
                        index_exists = session.execute(index_check, {
                            "schema": row.schemaname,
                            "table": row.tablename,
                            "column": f"%{row.attname}%"
                        }).scalar()
                        
                        if not index_exists:
                            recommendation = IndexRecommendation(
                                table_name=f"{row.schemaname}.{row.tablename}",
                                columns=[row.attname],
                                index_type="btree",
                                estimated_benefit=min(row.n_distinct / 1000, 1.0),
                                reason=f"高选择性列 (n_distinct: {row.n_distinct})"
                            )
                            recommendations.append(recommendation)
                
                # 分析外键列
                fk_query = text("""
                    SELECT 
                        tc.table_schema,
                        tc.table_name,
                        kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = 'public'
                """)
                
                fk_result = session.execute(fk_query)
                
                for row in fk_result:
                    # 检查外键列是否有索引
                    index_check = text("""
                        SELECT COUNT(*) 
                        FROM pg_indexes 
                        WHERE schemaname = :schema 
                        AND tablename = :table 
                        AND indexdef LIKE :column
                    """)
                    
                    index_exists = session.execute(index_check, {
                        "schema": row.table_schema,
                        "table": row.table_name,
                        "column": f"%{row.column_name}%"
                    }).scalar()
                    
                    if not index_exists:
                        recommendation = IndexRecommendation(
                            table_name=f"{row.table_schema}.{row.table_name}",
                            columns=[row.column_name],
                            index_type="btree",
                            estimated_benefit=0.8,
                            reason="外键列缺少索引"
                        )
                        recommendations.append(recommendation)
                
        except Exception as e:
            logger.error(f"推荐索引失败: {e}")
        
        return recommendations
    
    async def create_recommended_indexes(self, recommendations: List[IndexRecommendation]) -> Dict[str, Any]:
        """创建推荐的索引"""
        results = {
            "created": [],
            "failed": [],
            "skipped": []
        }
        
        try:
            with Session(self.engine) as session:
                for rec in recommendations:
                    try:
                        # 生成索引名
                        table_name = rec.table_name.split('.')[-1]
                        columns_str = "_".join(rec.columns)
                        index_name = f"idx_{table_name}_{columns_str}"
                        
                        # 创建索引SQL
                        columns_list = ", ".join(rec.columns)
                        create_sql = f"CREATE INDEX CONCURRENTLY {index_name} ON {rec.table_name} ({columns_list})"
                        
                        # 执行创建索引
                        session.execute(text(create_sql))
                        session.commit()
                        
                        results["created"].append({
                            "index_name": index_name,
                            "table": rec.table_name,
                            "columns": rec.columns
                        })
                        
                        logger.info(f"成功创建索引: {index_name}")
                        
                    except Exception as e:
                        results["failed"].append({
                            "table": rec.table_name,
                            "columns": rec.columns,
                            "error": str(e)
                        })
                        logger.error(f"创建索引失败: {rec.table_name} - {e}")
                        session.rollback()
                        
        except Exception as e:
            logger.error(f"批量创建索引失败: {e}")
        
        return results
    
    async def analyze_connection_pool(self) -> Dict[str, Any]:
        """分析连接池状态"""
        try:
            pool = self.engine.pool
            
            return {
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid(),
                "status": "healthy" if pool.checkedout() < pool.size() * 0.8 else "warning"
            }
            
        except Exception as e:
            logger.error(f"分析连接池失败: {e}")
            return {"error": str(e)}
    
    async def setup_partitioning(self, table_name: str, partition_column: str, partition_type: str = "range") -> bool:
        """设置表分区"""
        try:
            with Session(self.engine) as session:
                if "postgresql" in str(self.engine.url):
                    # PostgreSQL分区设置
                    if partition_type == "range":
                        # 创建分区表
                        partition_sql = f"""
                            -- 重命名原表
                            ALTER TABLE {table_name} RENAME TO {table_name}_old;
                            
                            -- 创建分区主表
                            CREATE TABLE {table_name} (LIKE {table_name}_old INCLUDING ALL)
                            PARTITION BY RANGE ({partition_column});
                            
                            -- 创建月度分区（示例）
                            CREATE TABLE {table_name}_2025_01 PARTITION OF {table_name}
                            FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
                            
                            CREATE TABLE {table_name}_2025_02 PARTITION OF {table_name}
                            FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
                            
                            -- 迁移数据
                            INSERT INTO {table_name} SELECT * FROM {table_name}_old;
                            
                            -- 删除旧表
                            DROP TABLE {table_name}_old;
                        """
                        
                        session.execute(text(partition_sql))
                        session.commit()
                        
                        logger.info(f"成功设置表分区: {table_name}")
                        return True
                
        except Exception as e:
            logger.error(f"设置表分区失败: {table_name} - {e}")
            return False
    
    async def setup_backup_strategy(self) -> Dict[str, Any]:
        """设置备份策略"""
        backup_config = {
            "full_backup": {
                "frequency": "daily",
                "time": "02:00",
                "retention_days": 30
            },
            "incremental_backup": {
                "frequency": "hourly",
                "retention_hours": 168  # 7天
            },
            "point_in_time_recovery": {
                "enabled": True,
                "wal_retention_hours": 72
            }
        }
        
        try:
            if "postgresql" in str(self.engine.url):
                with Session(self.engine) as session:
                    # 启用WAL归档
                    session.execute(text("ALTER SYSTEM SET archive_mode = 'on'"))
                    session.execute(text("ALTER SYSTEM SET archive_command = 'cp %p /backup/wal/%f'"))
                    session.execute(text("SELECT pg_reload_conf()"))
                    
                    logger.info("PostgreSQL备份策略配置完成")
            
            return {
                "status": "configured",
                "config": backup_config,
                "message": "备份策略配置成功"
            }
            
        except Exception as e:
            logger.error(f"配置备份策略失败: {e}")
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def optimize_connection_pool(self) -> Dict[str, Any]:
        """优化连接池配置"""
        try:
            # 获取系统资源信息
            cpu_count = psutil.cpu_count()
            memory_gb = psutil.virtual_memory().total / (1024**3)
            
            # 计算推荐的连接池大小
            recommended_pool_size = min(cpu_count * 2, 20)
            recommended_max_overflow = recommended_pool_size // 2
            
            # 推荐配置
            recommendations = {
                "pool_size": recommended_pool_size,
                "max_overflow": recommended_max_overflow,
                "pool_timeout": 30,
                "pool_recycle": 3600,  # 1小时
                "pool_pre_ping": True,
                "reasoning": {
                    "cpu_count": cpu_count,
                    "memory_gb": round(memory_gb, 2),
                    "formula": "pool_size = min(cpu_count * 2, 20)"
                }
            }
            
            return {
                "current_config": await self.analyze_connection_pool(),
                "recommendations": recommendations,
                "status": "analyzed"
            }
            
        except Exception as e:
            logger.error(f"优化连接池配置失败: {e}")
            return {"error": str(e)}
    
    async def setup_read_write_splitting(self) -> Dict[str, Any]:
        """设置读写分离配置"""
        config = {
            "master": {
                "host": settings.DATABASE_HOST,
                "port": settings.DATABASE_PORT,
                "database": settings.DATABASE_NAME,
                "role": "write"
            },
            "slaves": [
                {
                    "host": f"{settings.DATABASE_HOST}-slave1",
                    "port": settings.DATABASE_PORT,
                    "database": settings.DATABASE_NAME,
                    "role": "read"
                }
            ],
            "routing_rules": {
                "write_operations": ["INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP"],
                "read_operations": ["SELECT"],
                "load_balancing": "round_robin"
            }
        }
        
        return {
            "status": "configured",
            "config": config,
            "message": "读写分离配置已生成，需要手动部署从库"
        }


# 创建全局数据库优化器实例
db_optimizer = DatabaseOptimizer()


# 便捷函数
async def run_performance_analysis() -> Dict[str, Any]:
    """运行性能分析"""
    return {
        "slow_queries": await db_optimizer.analyze_slow_queries(),
        "table_stats": await db_optimizer.analyze_table_statistics(),
        "index_recommendations": await db_optimizer.recommend_indexes(),
        "connection_pool": await db_optimizer.analyze_connection_pool()
    }


async def apply_optimizations() -> Dict[str, Any]:
    """应用优化建议"""
    # 获取索引推荐
    recommendations = await db_optimizer.recommend_indexes()
    
    # 创建推荐的索引
    index_results = await db_optimizer.create_recommended_indexes(recommendations)
    
    # 优化连接池
    pool_optimization = await db_optimizer.optimize_connection_pool()
    
    return {
        "indexes": index_results,
        "connection_pool": pool_optimization,
        "timestamp": datetime.now().isoformat()
    }
