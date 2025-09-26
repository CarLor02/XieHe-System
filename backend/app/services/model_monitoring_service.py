"""
AI模型性能监控服务

提供模型推理性能监控、错误统计和模型健康检查功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from collections import defaultdict, deque
import statistics

logger = logging.getLogger(__name__)


@dataclass
class ModelMetric:
    """模型指标数据类"""
    model_id: str
    model_name: str
    metric_type: str  # inference_time, accuracy, error_rate, throughput
    value: float
    timestamp: datetime
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "model_name": self.model_name,
            "metric_type": self.metric_type,
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata or {}
        }


@dataclass
class ModelError:
    """模型错误记录"""
    model_id: str
    model_name: str
    error_type: str
    error_message: str
    timestamp: datetime
    input_data: Dict[str, Any] = None
    stack_trace: str = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "model_name": self.model_name,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "timestamp": self.timestamp.isoformat(),
            "input_data": self.input_data or {},
            "stack_trace": self.stack_trace
        }


class ModelMonitoringService:
    """模型监控服务类"""
    
    def __init__(self):
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.errors: Dict[str, deque] = defaultdict(lambda: deque(maxlen=500))
        self.model_status: Dict[str, Dict[str, Any]] = {}
        self.is_running = False
        self.monitoring_task = None
        self.check_interval = 60  # 秒
        
        # 性能阈值
        self.thresholds = {
            "inference_time": 5.0,  # 秒
            "error_rate": 5.0,      # 百分比
            "memory_usage": 80.0,   # 百分比
            "gpu_usage": 90.0       # 百分比
        }
    
    async def start(self):
        """启动模型监控服务"""
        if not self.is_running:
            self.is_running = True
            self.monitoring_task = asyncio.create_task(self._monitor_models())
            logger.info("模型监控服务已启动")
    
    async def stop(self):
        """停止模型监控服务"""
        if self.is_running:
            self.is_running = False
            if self.monitoring_task:
                self.monitoring_task.cancel()
                try:
                    await self.monitoring_task
                except asyncio.CancelledError:
                    pass
            logger.info("模型监控服务已停止")
    
    async def record_inference_time(
        self, 
        model_id: str, 
        model_name: str, 
        inference_time: float,
        input_size: int = None,
        output_size: int = None
    ):
        """记录模型推理时间"""
        metric = ModelMetric(
            model_id=model_id,
            model_name=model_name,
            metric_type="inference_time",
            value=inference_time,
            timestamp=datetime.now(),
            metadata={
                "input_size": input_size,
                "output_size": output_size
            }
        )
        
        self.metrics[model_id].append(metric)
        
        # 检查是否超过阈值
        if inference_time > self.thresholds["inference_time"]:
            logger.warning(f"模型 {model_name} 推理时间过长: {inference_time:.2f}s")
    
    async def record_model_accuracy(
        self, 
        model_id: str, 
        model_name: str, 
        accuracy: float,
        test_samples: int = None
    ):
        """记录模型准确率"""
        metric = ModelMetric(
            model_id=model_id,
            model_name=model_name,
            metric_type="accuracy",
            value=accuracy,
            timestamp=datetime.now(),
            metadata={"test_samples": test_samples}
        )
        
        self.metrics[model_id].append(metric)
    
    async def record_model_error(
        self,
        model_id: str,
        model_name: str,
        error_type: str,
        error_message: str,
        input_data: Dict[str, Any] = None,
        stack_trace: str = None
    ):
        """记录模型错误"""
        error = ModelError(
            model_id=model_id,
            model_name=model_name,
            error_type=error_type,
            error_message=error_message,
            timestamp=datetime.now(),
            input_data=input_data,
            stack_trace=stack_trace
        )
        
        self.errors[model_id].append(error)
        logger.error(f"模型 {model_name} 发生错误: {error_type} - {error_message}")
    
    async def record_throughput(
        self,
        model_id: str,
        model_name: str,
        requests_per_second: float
    ):
        """记录模型吞吐量"""
        metric = ModelMetric(
            model_id=model_id,
            model_name=model_name,
            metric_type="throughput",
            value=requests_per_second,
            timestamp=datetime.now()
        )
        
        self.metrics[model_id].append(metric)
    
    async def _monitor_models(self):
        """监控模型状态"""
        while self.is_running:
            try:
                # 更新所有模型的状态
                for model_id in self.metrics.keys():
                    await self._update_model_status(model_id)
                
                # 检查告警条件
                await self._check_model_alerts()
                
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"模型监控失败: {e}")
                await asyncio.sleep(10)
    
    async def _update_model_status(self, model_id: str):
        """更新模型状态"""
        try:
            model_metrics = list(self.metrics[model_id])
            model_errors = list(self.errors[model_id])
            
            if not model_metrics:
                return
            
            # 获取最近的指标
            recent_metrics = [m for m in model_metrics 
                            if m.timestamp > datetime.now() - timedelta(hours=1)]
            
            if not recent_metrics:
                return
            
            # 计算统计信息
            inference_times = [m.value for m in recent_metrics 
                             if m.metric_type == "inference_time"]
            accuracies = [m.value for m in recent_metrics 
                         if m.metric_type == "accuracy"]
            throughputs = [m.value for m in recent_metrics 
                          if m.metric_type == "throughput"]
            
            # 计算错误率
            recent_errors = [e for e in model_errors 
                           if e.timestamp > datetime.now() - timedelta(hours=1)]
            total_requests = len(recent_metrics)
            error_rate = (len(recent_errors) / total_requests * 100) if total_requests > 0 else 0
            
            # 更新状态
            status = {
                "model_id": model_id,
                "last_updated": datetime.now().isoformat(),
                "total_requests": total_requests,
                "error_count": len(recent_errors),
                "error_rate": error_rate,
                "status": "healthy" if error_rate < self.thresholds["error_rate"] else "unhealthy"
            }
            
            if inference_times:
                status["avg_inference_time"] = statistics.mean(inference_times)
                status["p95_inference_time"] = statistics.quantiles(inference_times, n=20)[18] if len(inference_times) >= 20 else max(inference_times)
            
            if accuracies:
                status["latest_accuracy"] = accuracies[-1]
                status["avg_accuracy"] = statistics.mean(accuracies)
            
            if throughputs:
                status["avg_throughput"] = statistics.mean(throughputs)
            
            self.model_status[model_id] = status
            
        except Exception as e:
            logger.error(f"更新模型 {model_id} 状态失败: {e}")
    
    async def _check_model_alerts(self):
        """检查模型告警"""
        for model_id, status in self.model_status.items():
            alerts = []
            
            # 检查推理时间
            if status.get("avg_inference_time", 0) > self.thresholds["inference_time"]:
                alerts.append(f"推理时间过长: {status['avg_inference_time']:.2f}s")
            
            # 检查错误率
            if status.get("error_rate", 0) > self.thresholds["error_rate"]:
                alerts.append(f"错误率过高: {status['error_rate']:.1f}%")
            
            # 记录告警
            for alert in alerts:
                logger.warning(f"模型 {model_id} 告警: {alert}")
    
    def get_model_status(self, model_id: str) -> Dict[str, Any]:
        """获取模型状态"""
        return self.model_status.get(model_id, {})
    
    def get_all_models_status(self) -> Dict[str, Dict[str, Any]]:
        """获取所有模型状态"""
        return self.model_status.copy()
    
    def get_model_metrics(
        self, 
        model_id: str, 
        metric_type: str = None,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """获取模型指标历史"""
        if model_id not in self.metrics:
            return []
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        model_metrics = list(self.metrics[model_id])
        
        # 过滤时间范围
        filtered_metrics = [m for m in model_metrics if m.timestamp >= cutoff_time]
        
        # 过滤指标类型
        if metric_type:
            filtered_metrics = [m for m in filtered_metrics if m.metric_type == metric_type]
        
        return [m.to_dict() for m in filtered_metrics]
    
    def get_model_errors(
        self, 
        model_id: str, 
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """获取模型错误历史"""
        if model_id not in self.errors:
            return []
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        model_errors = list(self.errors[model_id])
        
        # 过滤时间范围
        filtered_errors = [e for e in model_errors if e.timestamp >= cutoff_time]
        
        return [e.to_dict() for e in filtered_errors]
    
    def get_model_statistics(self, model_id: str) -> Dict[str, Any]:
        """获取模型统计信息"""
        if model_id not in self.metrics:
            return {}
        
        model_metrics = list(self.metrics[model_id])
        model_errors = list(self.errors[model_id])
        
        # 按类型分组指标
        metrics_by_type = defaultdict(list)
        for metric in model_metrics:
            metrics_by_type[metric.metric_type].append(metric.value)
        
        # 计算统计信息
        stats = {
            "model_id": model_id,
            "total_requests": len(model_metrics),
            "total_errors": len(model_errors),
            "metrics_by_type": {}
        }
        
        for metric_type, values in metrics_by_type.items():
            if values:
                stats["metrics_by_type"][metric_type] = {
                    "count": len(values),
                    "min": min(values),
                    "max": max(values),
                    "avg": statistics.mean(values),
                    "median": statistics.median(values)
                }
        
        # 错误统计
        if model_errors:
            error_types = defaultdict(int)
            for error in model_errors:
                error_types[error.error_type] += 1
            stats["errors_by_type"] = dict(error_types)
        
        return stats
    
    def update_thresholds(self, new_thresholds: Dict[str, float]):
        """更新性能阈值"""
        self.thresholds.update(new_thresholds)
        logger.info(f"模型监控阈值已更新: {new_thresholds}")
    
    def get_healthy_models(self) -> List[str]:
        """获取健康的模型列表"""
        return [
            model_id for model_id, status in self.model_status.items()
            if status.get("status") == "healthy"
        ]
    
    def get_unhealthy_models(self) -> List[str]:
        """获取不健康的模型列表"""
        return [
            model_id for model_id, status in self.model_status.items()
            if status.get("status") == "unhealthy"
        ]


# 创建全局模型监控服务实例
model_monitoring_service = ModelMonitoringService()


# 便捷函数
async def monitor_model_inference(model_id: str, model_name: str):
    """模型推理监控装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                inference_time = time.time() - start_time
                
                await model_monitoring_service.record_inference_time(
                    model_id=model_id,
                    model_name=model_name,
                    inference_time=inference_time
                )
                
                return result
            except Exception as e:
                inference_time = time.time() - start_time
                
                await model_monitoring_service.record_model_error(
                    model_id=model_id,
                    model_name=model_name,
                    error_type=type(e).__name__,
                    error_message=str(e)
                )
                
                await model_monitoring_service.record_inference_time(
                    model_id=model_id,
                    model_name=model_name,
                    inference_time=inference_time
                )
                
                raise e
        
        return wrapper
    return decorator
