"""
仪表板功能测试

测试数据统计、展示等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import pytest
from fastapi.testclient import TestClient
import json
from datetime import datetime, timedelta

from app.main import app

client = TestClient(app)


class TestDashboard:
    """仪表板功能测试类"""
    
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
    
    def test_dashboard_overview(self, auth_headers):
        """测试仪表板概览"""
        response = client.get(
            "/api/v1/dashboard/overview",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "total_patients" in result
        assert "total_images" in result
        assert "total_reports" in result
        assert "pending_tasks" in result
    
    def test_dashboard_statistics(self, auth_headers):
        """测试仪表板统计数据"""
        params = {
            "period": "week",
            "date_from": (datetime.now() - timedelta(days=7)).isoformat(),
            "date_to": datetime.now().isoformat()
        }
        
        response = client.get(
            "/api/v1/dashboard/statistics",
            params=params,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "period" in result
        assert "statistics" in result
        assert isinstance(result["statistics"], dict)
    
    def test_dashboard_charts_data(self, auth_headers):
        """测试仪表板图表数据"""
        chart_params = {
            "chart_type": "patient_trends",
            "period": "month"
        }
        
        response = client.get(
            "/api/v1/dashboard/charts",
            params=chart_params,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "chart_type" in result
        assert "data" in result
        assert isinstance(result["data"], list)
    
    def test_dashboard_recent_activities(self, auth_headers):
        """测试最近活动"""
        response = client.get(
            "/api/v1/dashboard/activities",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
        
        # 检查活动项结构
        if result:
            activity = result[0]
            assert "id" in activity
            assert "type" in activity
            assert "description" in activity
            assert "timestamp" in activity
    
    def test_dashboard_task_list(self, auth_headers):
        """测试任务列表"""
        response = client.get(
            "/api/v1/dashboard/tasks",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "pending_tasks" in result
        assert "completed_tasks" in result
        assert isinstance(result["pending_tasks"], list)
        assert isinstance(result["completed_tasks"], list)
    
    def test_dashboard_quick_stats(self, auth_headers):
        """测试快速统计"""
        response = client.get(
            "/api/v1/dashboard/quick_stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "today" in result
        assert "this_week" in result
        assert "this_month" in result
    
    def test_dashboard_workload_distribution(self, auth_headers):
        """测试工作负载分布"""
        response = client.get(
            "/api/v1/dashboard/workload",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "by_department" in result
        assert "by_user" in result
        assert "by_modality" in result
    
    def test_dashboard_performance_metrics(self, auth_headers):
        """测试性能指标"""
        response = client.get(
            "/api/v1/dashboard/performance",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "avg_report_time" in result
        assert "system_uptime" in result
        assert "error_rate" in result
    
    def test_dashboard_alerts(self, auth_headers):
        """测试仪表板告警"""
        response = client.get(
            "/api/v1/dashboard/alerts",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "active_alerts" in result
        assert "alert_summary" in result
        assert isinstance(result["active_alerts"], list)
    
    def test_dashboard_customization(self, auth_headers):
        """测试仪表板个性化配置"""
        # 获取当前配置
        get_response = client.get(
            "/api/v1/dashboard/config",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        config = get_response.json()
        assert "widgets" in config
        assert "layout" in config
        
        # 更新配置
        new_config = {
            "widgets": [
                {"type": "overview", "position": {"x": 0, "y": 0, "w": 6, "h": 4}},
                {"type": "charts", "position": {"x": 6, "y": 0, "w": 6, "h": 4}},
                {"type": "tasks", "position": {"x": 0, "y": 4, "w": 12, "h": 6}}
            ],
            "layout": "grid",
            "theme": "light"
        }
        
        put_response = client.put(
            "/api/v1/dashboard/config",
            json=new_config,
            headers=auth_headers
        )
        
        assert put_response.status_code == 200
        result = put_response.json()
        assert result["message"] == "配置更新成功"
    
    def test_dashboard_export(self, auth_headers):
        """测试仪表板数据导出"""
        export_data = {
            "format": "pdf",
            "include_charts": True,
            "date_range": {
                "start": (datetime.now() - timedelta(days=30)).isoformat(),
                "end": datetime.now().isoformat()
            }
        }
        
        response = client.post(
            "/api/v1/dashboard/export",
            json=export_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 202]
        result = response.json()
        assert "download_url" in result or "task_id" in result
    
    def test_dashboard_real_time_data(self, auth_headers):
        """测试实时数据"""
        response = client.get(
            "/api/v1/dashboard/realtime",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "timestamp" in result
        assert "data" in result
        assert isinstance(result["data"], dict)
    
    def test_dashboard_filters(self, auth_headers):
        """测试仪表板过滤器"""
        filter_params = {
            "department": "放射科",
            "date_from": (datetime.now() - timedelta(days=7)).isoformat(),
            "date_to": datetime.now().isoformat(),
            "modality": "CT"
        }
        
        response = client.get(
            "/api/v1/dashboard/overview",
            params=filter_params,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "filters_applied" in result
        assert result["filters_applied"] == True


class TestDashboardCharts:
    """仪表板图表测试类"""
    
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
    
    def test_patient_trend_chart(self, auth_headers):
        """测试患者趋势图表"""
        params = {
            "chart_type": "patient_trends",
            "period": "month",
            "group_by": "day"
        }
        
        response = client.get(
            "/api/v1/dashboard/charts/patient_trends",
            params=params,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "labels" in result
        assert "datasets" in result
        assert isinstance(result["datasets"], list)
    
    def test_modality_distribution_chart(self, auth_headers):
        """测试检查类型分布图表"""
        response = client.get(
            "/api/v1/dashboard/charts/modality_distribution",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "labels" in result
        assert "data" in result
        assert isinstance(result["data"], list)
    
    def test_report_status_chart(self, auth_headers):
        """测试报告状态图表"""
        response = client.get(
            "/api/v1/dashboard/charts/report_status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "labels" in result
        assert "data" in result
    
    def test_workload_chart(self, auth_headers):
        """测试工作负载图表"""
        params = {
            "period": "week",
            "group_by": "user"
        }
        
        response = client.get(
            "/api/v1/dashboard/charts/workload",
            params=params,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "labels" in result
        assert "datasets" in result
    
    def test_performance_chart(self, auth_headers):
        """测试性能图表"""
        response = client.get(
            "/api/v1/dashboard/charts/performance",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "response_time" in result
        assert "throughput" in result
        assert "error_rate" in result


class TestDashboardWidgets:
    """仪表板组件测试类"""
    
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
    
    def test_widget_list(self, auth_headers):
        """测试组件列表"""
        response = client.get(
            "/api/v1/dashboard/widgets",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
        
        if result:
            widget = result[0]
            assert "id" in widget
            assert "type" in widget
            assert "title" in widget
    
    def test_widget_data(self, auth_headers):
        """测试组件数据"""
        # 获取组件列表
        list_response = client.get("/api/v1/dashboard/widgets", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            widget_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/dashboard/widgets/{widget_id}/data",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "data" in result
    
    def test_widget_configuration(self, auth_headers):
        """测试组件配置"""
        widget_config = {
            "type": "statistics",
            "title": "统计概览",
            "config": {
                "metrics": ["total_patients", "total_reports"],
                "refresh_interval": 30
            },
            "position": {"x": 0, "y": 0, "w": 6, "h": 4}
        }
        
        response = client.post(
            "/api/v1/dashboard/widgets",
            json=widget_config,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        result = response.json()
        assert "widget_id" in result


# 运行测试的辅助函数
def run_dashboard_tests():
    """运行仪表板功能测试"""
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
    test_result = run_dashboard_tests()
    print("仪表板功能测试结果:")
    print(f"成功: {test_result['success']}")
    print(f"输出: {test_result['output']}")
    if test_result['errors']:
        print(f"错误: {test_result['errors']}")
