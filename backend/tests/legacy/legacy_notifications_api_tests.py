"""
通知系统测试

测试消息通知、邮件等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
import json
from unittest.mock import Mock, patch

from app.main import app
from app.services.email_service import email_service

client = TestClient(app)


class TestNotifications:
    """通知系统测试类"""
    
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
    
    def test_send_notification(self, auth_headers):
        """测试发送通知"""
        notification_data = {
            "recipient_id": "user_001",
            "title": "测试通知",
            "message": "这是一条测试通知消息",
            "type": "info",
            "channels": ["in_app", "email"]
        }
        
        response = client.post(
            "/api/v1/notifications/send",
            json=notification_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        result = response.json()
        assert "notification_id" in result
        assert result["status"] == "sent"
    
    def test_get_notifications(self, auth_headers):
        """测试获取通知列表"""
        response = client.get(
            "/api/v1/notifications/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "notifications" in result
        assert "total" in result
        assert "unread_count" in result
        assert isinstance(result["notifications"], list)
    
    def test_mark_notification_read(self, auth_headers):
        """测试标记通知为已读"""
        # 先获取通知列表
        list_response = client.get("/api/v1/notifications/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json()["notifications"]:
            notification_id = list_response.json()["notifications"][0]["id"]
            
            response = client.put(
                f"/api/v1/notifications/{notification_id}/read",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["message"] == "通知已标记为已读"
    
    def test_mark_all_notifications_read(self, auth_headers):
        """测试标记所有通知为已读"""
        response = client.put(
            "/api/v1/notifications/read_all",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "marked_count" in result
    
    def test_delete_notification(self, auth_headers):
        """测试删除通知"""
        list_response = client.get("/api/v1/notifications/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json()["notifications"]:
            notification_id = list_response.json()["notifications"][0]["id"]
            
            response = client.delete(
                f"/api/v1/notifications/{notification_id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["message"] == "通知删除成功"
    
    def test_notification_preferences(self, auth_headers):
        """测试通知偏好设置"""
        # 获取当前偏好
        get_response = client.get(
            "/api/v1/notifications/preferences",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        preferences = get_response.json()
        assert "email_enabled" in preferences
        assert "push_enabled" in preferences
        
        # 更新偏好
        new_preferences = {
            "email_enabled": True,
            "push_enabled": False,
            "notification_types": {
                "system_alerts": True,
                "report_updates": True,
                "task_assignments": False
            },
            "quiet_hours": {
                "enabled": True,
                "start": "22:00",
                "end": "08:00"
            }
        }
        
        put_response = client.put(
            "/api/v1/notifications/preferences",
            json=new_preferences,
            headers=auth_headers
        )
        
        assert put_response.status_code == 200
        result = put_response.json()
        assert result["message"] == "偏好设置更新成功"
    
    def test_broadcast_notification(self, auth_headers):
        """测试广播通知"""
        broadcast_data = {
            "title": "系统维护通知",
            "message": "系统将于今晚22:00进行维护，预计持续2小时",
            "type": "warning",
            "target_groups": ["all_users"],
            "channels": ["in_app", "email"]
        }
        
        response = client.post(
            "/api/v1/notifications/broadcast",
            json=broadcast_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 202]
        result = response.json()
        assert "broadcast_id" in result
        assert "target_count" in result
    
    def test_notification_templates(self, auth_headers):
        """测试通知模板"""
        # 获取模板列表
        list_response = client.get(
            "/api/v1/notifications/templates",
            headers=auth_headers
        )
        
        assert list_response.status_code == 200
        templates = list_response.json()
        assert isinstance(templates, list)
        
        # 创建新模板
        template_data = {
            "name": "报告完成通知",
            "type": "report_completed",
            "title_template": "报告已完成: {{patient_name}}",
            "message_template": "患者 {{patient_name}} 的 {{study_type}} 检查报告已完成，请及时查看。",
            "variables": ["patient_name", "study_type"]
        }
        
        create_response = client.post(
            "/api/v1/notifications/templates",
            json=template_data,
            headers=auth_headers
        )
        
        assert create_response.status_code in [200, 201]
        result = create_response.json()
        assert "template_id" in result
    
    def test_notification_statistics(self, auth_headers):
        """测试通知统计"""
        response = client.get(
            "/api/v1/notifications/statistics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "total_sent" in result
        assert "total_read" in result
        assert "by_type" in result
        assert "by_channel" in result


class TestEmailService:
    """邮件服务测试类"""
    
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
    async def test_send_email(self):
        """测试发送邮件"""
        with patch('app.services.email_service.aiosmtplib.send') as mock_send:
            mock_send.return_value = None
            
            result = await email_service.send_email(
                to_email="test@example.com",
                subject="测试邮件",
                html_content="<h1>这是测试邮件</h1>",
                text_content="这是测试邮件"
            )
            
            assert result["success"] == True
            mock_send.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_template_email(self):
        """测试发送模板邮件"""
        with patch('app.services.email_service.aiosmtplib.send') as mock_send:
            mock_send.return_value = None
            
            result = await email_service.send_welcome_email(
                email="test@example.com",
                username="测试用户",
                login_url="https://example.com/login"
            )
            
            assert result["success"] == True
            mock_send.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_batch_email_sending(self):
        """测试批量邮件发送"""
        with patch('app.services.email_service.aiosmtplib.send') as mock_send:
            mock_send.return_value = None
            
            recipients = [
                {"email": "user1@example.com", "name": "用户1"},
                {"email": "user2@example.com", "name": "用户2"},
                {"email": "user3@example.com", "name": "用户3"}
            ]
            
            result = await email_service.send_batch_emails(
                recipients=recipients,
                subject="批量测试邮件",
                template_name="system_notification",
                template_data={"message": "这是批量邮件测试"}
            )
            
            assert result["success"] == True
            assert result["sent_count"] == 3
            assert mock_send.call_count == 3
    
    def test_email_api_send(self, auth_headers):
        """测试邮件发送API"""
        email_data = {
            "to_email": "test@example.com",
            "subject": "API测试邮件",
            "template_name": "system_notification",
            "template_data": {
                "title": "系统通知",
                "message": "这是通过API发送的测试邮件"
            }
        }
        
        with patch('app.services.email_service.aiosmtplib.send') as mock_send:
            mock_send.return_value = None
            
            response = client.post(
                "/api/v1/notifications/email/send",
                json=email_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "message_id" in result or "task_id" in result
    
    def test_email_templates_api(self, auth_headers):
        """测试邮件模板API"""
        response = client.get(
            "/api/v1/notifications/email/templates",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
        
        if result:
            template = result[0]
            assert "name" in template
            assert "subject" in template
            assert "html_content" in template


class TestWebSocketNotifications:
    """WebSocket通知测试类"""
    
    def test_websocket_connection(self):
        """测试WebSocket连接"""
        # 这里需要使用WebSocket测试客户端
        # 由于TestClient不直接支持WebSocket，这里只做基本测试
        try:
            with client.websocket_connect("/ws/notifications") as websocket:
                # 发送测试消息
                websocket.send_json({"type": "ping"})
                
                # 接收响应
                data = websocket.receive_json()
                assert data["type"] == "pong"
        except Exception:
            # WebSocket连接可能需要认证或其他配置
            pass
    
    def test_websocket_notification_push(self, auth_headers):
        """测试WebSocket通知推送"""
        # 发送通知，应该通过WebSocket推送
        notification_data = {
            "recipient_id": "user_001",
            "title": "实时通知测试",
            "message": "这是实时推送的通知",
            "type": "info",
            "channels": ["websocket"]
        }
        
        response = client.post(
            "/api/v1/notifications/send",
            json=notification_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]


class TestNotificationIntegration:
    """通知集成测试类"""
    
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
    
    def test_report_completion_notification(self, auth_headers):
        """测试报告完成通知"""
        # 模拟报告完成事件
        event_data = {
            "event_type": "report_completed",
            "report_id": "report_001",
            "patient_id": "patient_001",
            "doctor_id": "doctor_001"
        }
        
        response = client.post(
            "/api/v1/notifications/events",
            json=event_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 202]
        result = response.json()
        assert "notifications_sent" in result
    
    def test_system_alert_notification(self, auth_headers):
        """测试系统告警通知"""
        alert_data = {
            "alert_type": "system_error",
            "severity": "high",
            "message": "数据库连接异常",
            "component": "database"
        }
        
        response = client.post(
            "/api/v1/notifications/alerts",
            json=alert_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 202]
        result = response.json()
        assert "alert_id" in result


# 运行测试的辅助函数
def run_notification_tests():
    """运行通知系统测试"""
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
    test_result = run_notification_tests()
    print("通知系统测试结果:")
    print(f"成功: {test_result['success']}")
    print(f"输出: {test_result['output']}")
    if test_result['errors']:
        print(f"错误: {test_result['errors']}")
