"""
日志分析工具服务

提供日志查询、分析、统计功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict, Counter
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class LogEntry:
    """日志条目数据类"""
    timestamp: datetime
    level: str
    logger_name: str
    message: str
    module: str = None
    function: str = None
    line_number: int = None
    extra_data: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "level": self.level,
            "logger_name": self.logger_name,
            "message": self.message,
            "module": self.module,
            "function": self.function,
            "line_number": self.line_number,
            "extra_data": self.extra_data or {}
        }


@dataclass
class LogAnalysisResult:
    """日志分析结果"""
    total_entries: int
    time_range: Tuple[datetime, datetime]
    level_distribution: Dict[str, int]
    top_loggers: List[Tuple[str, int]]
    error_patterns: List[Dict[str, Any]]
    performance_metrics: Dict[str, Any]
    anomalies: List[Dict[str, Any]]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_entries": self.total_entries,
            "time_range": {
                "start": self.time_range[0].isoformat(),
                "end": self.time_range[1].isoformat()
            },
            "level_distribution": self.level_distribution,
            "top_loggers": self.top_loggers,
            "error_patterns": self.error_patterns,
            "performance_metrics": self.performance_metrics,
            "anomalies": self.anomalies
        }


class LogAnalysisService:
    """日志分析服务类"""
    
    def __init__(self, log_directory: str = "logs"):
        self.log_directory = Path(log_directory)
        self.log_entries: List[LogEntry] = []
        self.analysis_cache: Dict[str, Any] = {}
        self.cache_ttl = 300  # 5分钟缓存
        
        # 日志格式模式
        self.log_patterns = {
            "standard": re.compile(
                r'(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - '
                r'(?P<logger>\S+) - (?P<level>\w+) - (?P<message>.*)'
            ),
            "detailed": re.compile(
                r'(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - '
                r'(?P<logger>\S+) - (?P<level>\w+) - '
                r'(?P<module>\S+):(?P<function>\S+):(?P<line>\d+) - (?P<message>.*)'
            ),
            "json": re.compile(r'^{.*}$')
        }
        
        # 错误模式识别
        self.error_patterns = [
            {
                "name": "数据库连接错误",
                "pattern": re.compile(r'database.*connection.*error|connection.*database.*failed', re.IGNORECASE),
                "severity": "high"
            },
            {
                "name": "API超时错误",
                "pattern": re.compile(r'timeout|timed out|request timeout', re.IGNORECASE),
                "severity": "medium"
            },
            {
                "name": "内存不足",
                "pattern": re.compile(r'out of memory|memory error|insufficient memory', re.IGNORECASE),
                "severity": "high"
            },
            {
                "name": "文件系统错误",
                "pattern": re.compile(r'no such file|permission denied|disk full', re.IGNORECASE),
                "severity": "medium"
            },
            {
                "name": "认证失败",
                "pattern": re.compile(r'authentication failed|unauthorized|invalid token', re.IGNORECASE),
                "severity": "medium"
            }
        ]
    
    async def load_logs(
        self, 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        log_files: Optional[List[str]] = None
    ) -> int:
        """加载日志文件"""
        try:
            self.log_entries.clear()
            
            if not start_time:
                start_time = datetime.now() - timedelta(days=1)
            if not end_time:
                end_time = datetime.now()
            
            # 获取日志文件列表
            if log_files:
                files_to_process = [self.log_directory / f for f in log_files]
            else:
                files_to_process = list(self.log_directory.glob("*.log"))
            
            total_loaded = 0
            for log_file in files_to_process:
                if log_file.exists():
                    loaded = await self._parse_log_file(log_file, start_time, end_time)
                    total_loaded += loaded
                    logger.info(f"从 {log_file} 加载了 {loaded} 条日志")
            
            # 按时间排序
            self.log_entries.sort(key=lambda x: x.timestamp)
            
            logger.info(f"总共加载了 {total_loaded} 条日志")
            return total_loaded
            
        except Exception as e:
            logger.error(f"加载日志失败: {e}")
            return 0
    
    async def _parse_log_file(
        self, 
        log_file: Path, 
        start_time: datetime, 
        end_time: datetime
    ) -> int:
        """解析单个日志文件"""
        loaded_count = 0
        
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    
                    entry = await self._parse_log_line(line, line_num)
                    if entry and start_time <= entry.timestamp <= end_time:
                        self.log_entries.append(entry)
                        loaded_count += 1
                        
        except Exception as e:
            logger.error(f"解析日志文件 {log_file} 失败: {e}")
        
        return loaded_count
    
    async def _parse_log_line(self, line: str, line_num: int) -> Optional[LogEntry]:
        """解析单行日志"""
        try:
            # 尝试JSON格式
            if self.log_patterns["json"].match(line):
                data = json.loads(line)
                return LogEntry(
                    timestamp=datetime.fromisoformat(data.get("timestamp", "")),
                    level=data.get("level", "INFO"),
                    logger_name=data.get("logger", "unknown"),
                    message=data.get("message", ""),
                    module=data.get("module"),
                    function=data.get("function"),
                    line_number=data.get("line_number"),
                    extra_data=data.get("extra", {})
                )
            
            # 尝试详细格式
            match = self.log_patterns["detailed"].match(line)
            if match:
                return LogEntry(
                    timestamp=datetime.strptime(match.group("timestamp"), "%Y-%m-%d %H:%M:%S,%f"),
                    level=match.group("level"),
                    logger_name=match.group("logger"),
                    message=match.group("message"),
                    module=match.group("module"),
                    function=match.group("function"),
                    line_number=int(match.group("line"))
                )
            
            # 尝试标准格式
            match = self.log_patterns["standard"].match(line)
            if match:
                return LogEntry(
                    timestamp=datetime.strptime(match.group("timestamp"), "%Y-%m-%d %H:%M:%S,%f"),
                    level=match.group("level"),
                    logger_name=match.group("logger"),
                    message=match.group("message")
                )
            
            return None
            
        except Exception as e:
            logger.debug(f"解析日志行失败 (行 {line_num}): {e}")
            return None
    
    async def analyze_logs(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> LogAnalysisResult:
        """分析日志"""
        try:
            # 检查缓存
            cache_key = f"analysis_{start_time}_{end_time}"
            if cache_key in self.analysis_cache:
                cache_entry = self.analysis_cache[cache_key]
                if datetime.now() - cache_entry["timestamp"] < timedelta(seconds=self.cache_ttl):
                    return cache_entry["result"]
            
            # 过滤日志条目
            filtered_entries = self.log_entries
            if start_time or end_time:
                filtered_entries = [
                    entry for entry in self.log_entries
                    if (not start_time or entry.timestamp >= start_time) and
                       (not end_time or entry.timestamp <= end_time)
                ]
            
            if not filtered_entries:
                return LogAnalysisResult(
                    total_entries=0,
                    time_range=(datetime.now(), datetime.now()),
                    level_distribution={},
                    top_loggers=[],
                    error_patterns=[],
                    performance_metrics={},
                    anomalies=[]
                )
            
            # 基本统计
            total_entries = len(filtered_entries)
            time_range = (
                min(entry.timestamp for entry in filtered_entries),
                max(entry.timestamp for entry in filtered_entries)
            )
            
            # 日志级别分布
            level_distribution = Counter(entry.level for entry in filtered_entries)
            
            # 顶级日志记录器
            logger_counts = Counter(entry.logger_name for entry in filtered_entries)
            top_loggers = logger_counts.most_common(10)
            
            # 错误模式分析
            error_patterns = await self._analyze_error_patterns(filtered_entries)
            
            # 性能指标
            performance_metrics = await self._calculate_performance_metrics(filtered_entries)
            
            # 异常检测
            anomalies = await self._detect_anomalies(filtered_entries)
            
            result = LogAnalysisResult(
                total_entries=total_entries,
                time_range=time_range,
                level_distribution=dict(level_distribution),
                top_loggers=top_loggers,
                error_patterns=error_patterns,
                performance_metrics=performance_metrics,
                anomalies=anomalies
            )
            
            # 缓存结果
            self.analysis_cache[cache_key] = {
                "timestamp": datetime.now(),
                "result": result
            }
            
            return result
            
        except Exception as e:
            logger.error(f"日志分析失败: {e}")
            raise
    
    async def _analyze_error_patterns(self, entries: List[LogEntry]) -> List[Dict[str, Any]]:
        """分析错误模式"""
        error_entries = [entry for entry in entries if entry.level in ["ERROR", "CRITICAL"]]
        pattern_matches = []
        
        for pattern_info in self.error_patterns:
            matches = []
            for entry in error_entries:
                if pattern_info["pattern"].search(entry.message):
                    matches.append({
                        "timestamp": entry.timestamp.isoformat(),
                        "message": entry.message,
                        "logger": entry.logger_name
                    })
            
            if matches:
                pattern_matches.append({
                    "pattern_name": pattern_info["name"],
                    "severity": pattern_info["severity"],
                    "match_count": len(matches),
                    "recent_matches": matches[-5:],  # 最近5个匹配
                    "first_occurrence": matches[0]["timestamp"],
                    "last_occurrence": matches[-1]["timestamp"]
                })
        
        return pattern_matches
    
    async def _calculate_performance_metrics(self, entries: List[LogEntry]) -> Dict[str, Any]:
        """计算性能指标"""
        if not entries:
            return {}
        
        time_span = (entries[-1].timestamp - entries[0].timestamp).total_seconds()
        if time_span == 0:
            time_span = 1
        
        # 日志频率
        log_rate = len(entries) / time_span
        
        # 错误率
        error_count = len([e for e in entries if e.level in ["ERROR", "CRITICAL"]])
        error_rate = (error_count / len(entries)) * 100
        
        # 警告率
        warning_count = len([e for e in entries if e.level == "WARNING"])
        warning_rate = (warning_count / len(entries)) * 100
        
        # 按小时分组的日志量
        hourly_distribution = defaultdict(int)
        for entry in entries:
            hour_key = entry.timestamp.strftime("%Y-%m-%d %H:00")
            hourly_distribution[hour_key] += 1
        
        return {
            "time_span_seconds": time_span,
            "log_rate_per_second": log_rate,
            "error_rate_percent": error_rate,
            "warning_rate_percent": warning_rate,
            "total_errors": error_count,
            "total_warnings": warning_count,
            "hourly_distribution": dict(hourly_distribution)
        }
    
    async def _detect_anomalies(self, entries: List[LogEntry]) -> List[Dict[str, Any]]:
        """检测异常"""
        anomalies = []
        
        # 检测日志量突增
        hourly_counts = defaultdict(int)
        for entry in entries:
            hour_key = entry.timestamp.strftime("%Y-%m-%d %H")
            hourly_counts[hour_key] += 1
        
        if len(hourly_counts) > 1:
            counts = list(hourly_counts.values())
            avg_count = sum(counts) / len(counts)
            
            for hour, count in hourly_counts.items():
                if count > avg_count * 3:  # 超过平均值3倍
                    anomalies.append({
                        "type": "log_volume_spike",
                        "timestamp": hour,
                        "description": f"日志量异常增加: {count} (平均: {avg_count:.1f})",
                        "severity": "medium",
                        "value": count,
                        "threshold": avg_count * 3
                    })
        
        # 检测错误集中爆发
        error_entries = [e for e in entries if e.level in ["ERROR", "CRITICAL"]]
        if error_entries:
            # 按5分钟窗口检测错误集中
            window_errors = defaultdict(int)
            for entry in error_entries:
                window_key = entry.timestamp.strftime("%Y-%m-%d %H:%M")[:-1] + "0"  # 5分钟窗口
                window_errors[window_key] += 1
            
            for window, count in window_errors.items():
                if count >= 10:  # 5分钟内超过10个错误
                    anomalies.append({
                        "type": "error_burst",
                        "timestamp": window,
                        "description": f"错误集中爆发: 5分钟内 {count} 个错误",
                        "severity": "high",
                        "value": count,
                        "threshold": 10
                    })
        
        return anomalies
    
    async def search_logs(
        self,
        query: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        level: Optional[str] = None,
        logger_name: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """搜索日志"""
        try:
            # 过滤条件
            filtered_entries = self.log_entries
            
            if start_time:
                filtered_entries = [e for e in filtered_entries if e.timestamp >= start_time]
            if end_time:
                filtered_entries = [e for e in filtered_entries if e.timestamp <= end_time]
            if level:
                filtered_entries = [e for e in filtered_entries if e.level == level]
            if logger_name:
                filtered_entries = [e for e in filtered_entries if logger_name in e.logger_name]
            
            # 文本搜索
            if query:
                query_pattern = re.compile(re.escape(query), re.IGNORECASE)
                filtered_entries = [
                    e for e in filtered_entries 
                    if query_pattern.search(e.message)
                ]
            
            # 限制结果数量
            filtered_entries = filtered_entries[-limit:]
            
            return [entry.to_dict() for entry in filtered_entries]
            
        except Exception as e:
            logger.error(f"搜索日志失败: {e}")
            return []
    
    async def get_log_statistics(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """获取日志统计信息"""
        try:
            # 过滤日志条目
            filtered_entries = self.log_entries
            if start_time or end_time:
                filtered_entries = [
                    entry for entry in self.log_entries
                    if (not start_time or entry.timestamp >= start_time) and
                       (not end_time or entry.timestamp <= end_time)
                ]
            
            if not filtered_entries:
                return {"total": 0, "by_level": {}, "by_logger": {}, "by_hour": {}}
            
            # 按级别统计
            by_level = Counter(entry.level for entry in filtered_entries)
            
            # 按记录器统计
            by_logger = Counter(entry.logger_name for entry in filtered_entries)
            
            # 按小时统计
            by_hour = defaultdict(int)
            for entry in filtered_entries:
                hour_key = entry.timestamp.strftime("%Y-%m-%d %H:00")
                by_hour[hour_key] += 1
            
            return {
                "total": len(filtered_entries),
                "time_range": {
                    "start": filtered_entries[0].timestamp.isoformat(),
                    "end": filtered_entries[-1].timestamp.isoformat()
                },
                "by_level": dict(by_level),
                "by_logger": dict(by_logger.most_common(20)),
                "by_hour": dict(by_hour)
            }
            
        except Exception as e:
            logger.error(f"获取日志统计失败: {e}")
            return {}
    
    def clear_cache(self):
        """清理缓存"""
        self.analysis_cache.clear()
        logger.info("日志分析缓存已清理")


# 创建全局日志分析服务实例
log_analysis_service = LogAnalysisService()


# 便捷函数
async def analyze_recent_logs(hours: int = 24) -> LogAnalysisResult:
    """分析最近的日志"""
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=hours)
    
    await log_analysis_service.load_logs(start_time, end_time)
    return await log_analysis_service.analyze_logs(start_time, end_time)


async def search_error_logs(query: str, hours: int = 24) -> List[Dict[str, Any]]:
    """搜索错误日志"""
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=hours)
    
    await log_analysis_service.load_logs(start_time, end_time)
    return await log_analysis_service.search_logs(
        query=query,
        start_time=start_time,
        end_time=end_time,
        level="ERROR"
    )
