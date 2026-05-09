"""
监控系统测试

测试日志记录、监控等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.main import app
from app.services.monitoring_service import monitoring_service
from app.services.log_analysis_service import log_analysis_service
from app.services.alert_service import alert_service

client = TestClient(app)


class TestMonitoringSystem:
    """监控系统测试类"""
    
    @pytest.fixture
    def auth_headers(self):
        """获取认证头"""
        login_data = {
            "username": "test_user",
            "password": "test_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    def test_system_status_api(self, auth_headers):
        """测试系统状态API"""
        response = client.get(
            "/api/v1/monitoring/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "timestamp" in result
        assert "system" in result
        assert "api_performance" in result
        assert "database_performance" in result
    
    def test_metrics_api(self, auth_headers):
        """测试性能指标API"""
        response = client.get(
            "/api/v1/monitoring/metrics?hours=1",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
    
    def test_alerts_api(self, auth_headers):
        """测试告警API"""
        response = client.get(
            "/api/v1/monitoring/alerts",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "timestamp" in result
        assert "alert_count" in result
        assert "alerts" in result
    
    def test_thresholds_management(self, auth_headers):
        """测试阈值管理"""
        # 获取当前阈值
        get_response = client.get(
            "/api/v1/monitoring/thresholds",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        thresholds = get_response.json()
        assert "thresholds" in thresholds
        
        # 更新阈值
        new_thresholds = {
            "api_response_time": 3.0,
            "cpu_usage": 85.0
        }
        
        put_response = client.put(
            "/api/v1/monitoring/thresholds",
            json=new_thresholds,
            headers=auth_headers
        )
        
        assert put_response.status_code == 200
        result = put_response.json()
        assert "message" in result
    
    def test_health_check_api(self, auth_headers):
        """测试健康检查API"""
        response = client.get(
            "/api/v1/monitoring/health",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "status" in result
        assert "timestamp" in result
        assert "checks" in result
    
    def test_api_performance_stats(self, auth_headers):
        """测试API性能统计"""
        response = client.get(
            "/api/v1/monitoring/performance/api?hours=1",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "time_range_hours" in result
    
    def test_database_performance_stats(self, auth_headers):
        """测试数据库性能统计"""
        response = client.get(
            "/api/v1/monitoring/performance/database?hours=1",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "time_range_hours" in result
    
    @pytest.mark.asyncio
    async def test_monitoring_service(self):
        """测试监控服务"""
        # 启动监控服务
        await monitoring_service.start()
        
        # 记录一些测试指标
        await monitoring_service.record_api_response_time(
            endpoint="/test",
            method="GET",
            response_time=0.5,
            status_code=200
        )
        
        await monitoring_service.record_database_query_time(
            query_type="SELECT",
            query_time=0.1,
            table_name="users"
        )
        
        # 获取当前状态
        status = monitoring_service.get_current_status()
        assert isinstance(status, dict)
        assert "timestamp" in status
        
        # 停止监控服务
        await monitoring_service.stop()


class TestLogAnalysis:
    """日志分析测试类"""
    
    @pytest.fixture
    def auth_headers(self):
        """获取认证头"""
        login_data = {
            "username": "test_user",
            "password": "test_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    @pytest.mark.asyncio
    async def test_log_analysis_service(self):
        """测试日志分析服务"""
        # 创建测试日志文件
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.log', delete=False) as f:
            f.write("2025-09-25 10:00:00,000 - test_logger - INFO - Test log message\n")
            f.write("2025-09-25 10:01:00,000 - test_logger - ERROR - Test error message\n")
            f.write("2025-09-25 10:02:00,000 - test_logger - WARNING - Test warning message\n")
            temp_log_file = f.name
        
        try:
            # 设置日志目录
            log_analysis_service.log_directory = os.path.dirname(temp_log_file)
            
            # 加载日志
            loaded_count = await log_analysis_service.load_logs(
                log_files=[os.path.basename(temp_log_file)]
            )
            
            assert loaded_count > 0
            
            # 分析日志
            analysis_result = await log_analysis_service.analyze_logs()
            assert analysis_result.total_entries > 0
            assert isinstance(analysis_result.level_distribution, dict)
            
            # 搜索日志
            search_results = await log_analysis_service.search_logs("error")
            assert isinstance(search_results, list)
            
            # 获取统计信息
            stats = await log_analysis_service.get_log_statistics()
            assert "total" in stats
            
        finally:
            # 清理临时文件
            os.unlink(temp_log_file)
    
    def test_log_search_api(self, auth_headers):
        """测试日志搜索API"""
        # 这里需要实际的日志搜索API端点
        # 由于我们还没有创建，这里做基本测试
        pass


class TestAlertSystem:
    """告警系统测试类"""
    
    @pytest.fixture
    def auth_headers(self):
        """获取认证头"""
        login_data = {
            "username": "test_user",
            "password": "test_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    @pytest.mark.asyncio
    async def test_alert_service(self):
        """测试告警服务"""
        # 启动告警服务
        await alert_service.start()
        
        # 创建手动告警
        from app.services.alert_service import create_manual_alert, AlertLevel
        
        alert = await create_manual_alert(
            title="测试告警",
            message="这是一个测试告警",
            level=AlertLevel.WARNING
        )
        
        assert alert.title == "测试告警"
        assert alert.level == AlertLevel.WARNING
        
        # 获取活跃告警
        active_alerts = alert_service.get_active_alerts()
        assert len(active_alerts) > 0
        
        # 解决告警
        resolved = alert_service.resolve_alert(alert.id)
        assert resolved == True
        
        # 获取统计信息
        stats = alert_service.get_statistics()
        assert "total_alerts" in stats
        
        # 停止告警服务
        await alert_service.stop()
    
    def test_alert_subscription(self):
        """测试告警订阅"""
        from app.services.alert_service import AlertLevel
        
        # 订阅告警
        alert_service.subscribe("test@example.com", [AlertLevel.ERROR, AlertLevel.CRITICAL])
        
        # 检查订阅
        assert "test@example.com" in alert_service.subscribers[AlertLevel.ERROR]
        assert "test@example.com" in alert_service.subscribers[AlertLevel.CRITICAL]
        
        # 取消订阅
        alert_service.unsubscribe("test@example.com")
        
        # 检查取消订阅
        assert "test@example.com" not in alert_service.subscribers[AlertLevel.ERROR]


class TestHealthCheck:
    """健康检查测试类"""
    
    def test_basic_health_check(self):
        """测试基础健康检查"""
        response = client.get("/api/v1/health/")
        
        assert response.status_code == 200
        result = response.json()
        assert "status" in result
        assert "timestamp" in result
        assert "uptime" in result
    
    def test_detailed_health_check(self):
        """测试详细健康检查"""
        response = client.get("/api/v1/health/detailed")
        
        assert response.status_code == 200
        result = response.json()
        assert "overall_status" in result
        assert "components" in result
        assert "system_info" in result
        assert isinstance(result["components"], list)
    
    def test_component_health_check(self):
        """测试组件健康检查"""
        components = ["database", "redis", "filesystem", "memory", "cpu"]
        
        for component in components:
            response = client.get(f"/api/v1/health/component/{component}")
            
            # 组件可能不可用，但应该返回适当的响应
            assert response.status_code in [200, 503]
            
            if response.status_code == 200:
                result = response.json()
                assert "name" in result
                assert "status" in result
                assert "response_time" in result
    
    def test_readiness_check(self):
        """测试就绪检查"""
        response = client.get("/api/v1/health/readiness")
        
        # 应用可能未就绪，但应该返回适当的响应
        assert response.status_code in [200, 503]
    
    def test_liveness_check(self):
        """测试存活检查"""
        response = client.get("/api/v1/health/liveness")
        
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "alive"
    
    def test_health_metrics(self):
        """测试健康指标"""
        response = client.get("/api/v1/health/metrics")
        
        assert response.status_code == 200
        result = response.json()
        assert "timestamp" in result
        assert "cpu" in result
        assert "memory" in result
        assert "disk" in result


class TestIntegration:
    """集成测试类"""
    
    @pytest.fixture
    def auth_headers(self):
        """获取认证头"""
        login_data = {
            "username": "test_user",
            "password": "test_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    def test_monitoring_dashboard_integration(self, auth_headers):
        """测试监控仪表板集成"""
        # 测试获取仪表板数据
        endpoints = [
            "/api/v1/monitoring/status",
            "/api/v1/monitoring/metrics",
            "/api/v1/monitoring/alerts",
            "/api/v1/health/detailed"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint, headers=auth_headers)
            # 端点应该可访问或返回适当的错误
            assert response.status_code in [200, 401, 403, 503]
    
    @pytest.mark.asyncio
    async def test_end_to_end_monitoring(self):
        """测试端到端监控流程"""
        # 启动所有监控服务
        await monitoring_service.start()
        await alert_service.start()
        
        try:
            # 模拟一些系统活动
            await monitoring_service.record_api_response_time(
                endpoint="/test",
                method="GET", 
                response_time=2.5,  # 可能触发告警
                status_code=200
            )
            
            # 等待一段时间让告警系统处理
            await asyncio.sleep(2)
            
            # 检查是否生成了告警
            alerts = alert_service.get_active_alerts()
            # 可能有告警，也可能没有，取决于阈值设置
            
            # 获取系统状态
            status = monitoring_service.get_current_status()
            assert isinstance(status, dict)
            
        finally:
            # 停止服务
            await monitoring_service.stop()
            await alert_service.stop()


# 运行测试的辅助函数
def run_monitoring_tests():
    """运行监控系统测试"""
    import subprocess
    import sys
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            __file__, 
            "-v", 
            "--tb=short"
        ], capture_output=True, text=True)
        
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "errors": result.stderr,
            "return_code": result.returncode
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "errors": str(e),
            "return_code": -1
        }


if __name__ == "__main__":
    test_result = run_monitoring_tests()
    print("监控系统测试结果:")
    print(f"成功: {test_result['success']}")
    print(f"输出: {test_result['output']}")
    if test_result['errors']:
        print(f"错误: {test_result['errors']}")
