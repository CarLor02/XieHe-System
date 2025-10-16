"""
消息通知API端点

提供站内消息、邮件通知和消息推送功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.auth import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.services.email_service import email_service, send_system_notification
from app.core.websocket import websocket_manager

router = APIRouter()


# 请求模型
class MessageCreate(BaseModel):
    title: str
    content: str
    recipient_ids: Optional[List[int]] = None
    recipient_emails: Optional[List[EmailStr]] = None
    message_type: str = "info"  # info, warning, error, success
    priority: str = "normal"  # low, normal, high, urgent
    expires_at: Optional[datetime] = None
    action_url: Optional[str] = None
    action_text: Optional[str] = None


class EmailSendRequest(BaseModel):
    to_email: EmailStr
    subject: str
    content: str
    template_name: Optional[str] = None
    template_context: Optional[Dict[str, Any]] = None
    to_name: Optional[str] = None


class BatchEmailRequest(BaseModel):
    emails: List[EmailSendRequest]
    max_concurrent: int = 5


class NotificationSettings(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    sms_notifications: bool = False
    notification_types: List[str] = ["system", "diagnosis", "report", "reminder"]


# 响应模型
class MessageResponse(BaseModel):
    id: int
    title: str
    content: str
    message_type: str
    priority: str
    is_read: bool
    created_at: datetime
    expires_at: Optional[datetime]
    action_url: Optional[str]
    action_text: Optional[str]
    sender_name: Optional[str]


class NotificationStats(BaseModel):
    total_messages: int
    unread_messages: int
    messages_by_type: Dict[str, int]
    messages_by_priority: Dict[str, int]


# 站内消息相关API
@router.post("/messages", response_model=Dict[str, Any])
async def send_message(
    message: MessageCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """发送站内消息"""
    try:
        # 确定接收者
        recipients = []
        
        if message.recipient_ids:
            # 根据用户ID查找接收者
            recipients.extend(
                db.query(User).filter(User.id.in_(message.recipient_ids)).all()
            )
        
        if message.recipient_emails:
            # 根据邮箱查找接收者
            recipients.extend(
                db.query(User).filter(User.email.in_(message.recipient_emails)).all()
            )
        
        if not recipients:
            raise HTTPException(status_code=400, detail="未找到有效的接收者")
        
        # 创建消息记录（这里简化处理，实际应该有消息表）
        message_data = {
            "id": int(datetime.now().timestamp()),
            "title": message.title,
            "content": message.content,
            "message_type": message.message_type,
            "priority": message.priority,
            "sender_id": current_user.id,
            "sender_name": current_user.full_name or current_user.username,
            "created_at": datetime.now(),
            "expires_at": message.expires_at,
            "action_url": message.action_url,
            "action_text": message.action_text,
            "is_read": False
        }
        
        # 发送WebSocket实时通知
        for recipient in recipients:
            await websocket_manager.send_personal_message(
                message={
                    "type": "notification",
                    "data": message_data
                },
                user_id=recipient.id
            )
        
        # 如果需要，发送邮件通知
        if message.message_type in ["urgent", "error"]:
            background_tasks.add_task(
                send_email_notifications,
                recipients,
                message.title,
                message.content,
                message.action_url,
                message.action_text
            )
        
        return {
            "message": "消息发送成功",
            "recipients_count": len(recipients),
            "message_id": message_data["id"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发送消息失败: {str(e)}")


@router.get("/messages", response_model=List[MessageResponse])
@router.get("messages", response_model=List[MessageResponse])
async def get_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    message_type: Optional[str] = None,
    is_read: Optional[bool] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取用户消息列表"""
    # 这里简化处理，实际应该从消息表查询
    # 模拟消息数据
    messages = [
        {
            "id": 1,
            "title": "系统维护通知",
            "content": "系统将于今晚22:00-24:00进行维护，期间可能影响正常使用。",
            "message_type": "warning",
            "priority": "high",
            "is_read": False,
            "created_at": datetime.now() - timedelta(hours=2),
            "expires_at": None,
            "action_url": None,
            "action_text": None,
            "sender_name": "系统管理员"
        },
        {
            "id": 2,
            "title": "诊断报告已生成",
            "content": "患者张三的CT扫描诊断报告已生成，请及时查看。",
            "message_type": "info",
            "priority": "normal",
            "is_read": True,
            "created_at": datetime.now() - timedelta(hours=5),
            "expires_at": None,
            "action_url": "/reports/123",
            "action_text": "查看报告",
            "sender_name": "AI诊断系统"
        }
    ]
    
    # 应用过滤条件
    filtered_messages = messages
    if message_type:
        filtered_messages = [m for m in filtered_messages if m["message_type"] == message_type]
    if is_read is not None:
        filtered_messages = [m for m in filtered_messages if m["is_read"] == is_read]
    
    # 分页
    return filtered_messages[skip:skip + limit]


@router.put("/messages/{message_id}/read")
async def mark_message_read(
    message_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """标记消息为已读"""
    # 这里简化处理，实际应该更新数据库
    return {"message": "消息已标记为已读", "message_id": message_id}


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除消息"""
    # 这里简化处理，实际应该从数据库删除
    return {"message": "消息已删除", "message_id": message_id}


@router.get("/messages/stats", response_model=NotificationStats)
async def get_notification_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取消息统计"""
    # 这里简化处理，实际应该从数据库统计
    return {
        "total_messages": 15,
        "unread_messages": 3,
        "messages_by_type": {
            "info": 8,
            "warning": 4,
            "error": 2,
            "success": 1
        },
        "messages_by_priority": {
            "low": 2,
            "normal": 10,
            "high": 2,
            "urgent": 1
        }
    }


# 邮件通知相关API
@router.post("/email/send")
async def send_email(
    email_request: EmailSendRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user)
):
    """发送单个邮件"""
    try:
        if email_request.template_name and email_request.template_context:
            # 使用模板发送
            success = await email_service.send_template_email(
                to_email=email_request.to_email,
                template_name=email_request.template_name,
                context=email_request.template_context,
                to_name=email_request.to_name
            )
        else:
            # 直接发送
            success = await email_service.send_email(
                to_email=email_request.to_email,
                subject=email_request.subject,
                html_content=email_request.content,
                to_name=email_request.to_name
            )
        
        if success:
            return {"message": "邮件发送成功", "to_email": email_request.to_email}
        else:
            raise HTTPException(status_code=500, detail="邮件发送失败")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"邮件发送异常: {str(e)}")


@router.post("/email/batch")
async def send_batch_emails(
    batch_request: BatchEmailRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user)
):
    """批量发送邮件"""
    try:
        # 转换请求格式
        email_data_list = []
        for email_req in batch_request.emails:
            email_data = {
                "to_email": email_req.to_email,
                "to_name": email_req.to_name
            }
            
            if email_req.template_name and email_req.template_context:
                email_data.update({
                    "template_name": email_req.template_name,
                    "context": email_req.template_context
                })
            else:
                email_data.update({
                    "subject": email_req.subject,
                    "html_content": email_req.content
                })
            
            email_data_list.append(email_data)
        
        # 批量发送
        results = await email_service.send_batch_emails(
            emails=email_data_list,
            max_concurrent=batch_request.max_concurrent
        )
        
        return {
            "message": "批量邮件发送完成",
            "total": len(batch_request.emails),
            "success": results["success"],
            "failed": results["failed"],
            "errors": results["errors"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量邮件发送异常: {str(e)}")


@router.get("/email/templates")
async def get_email_templates(current_user: dict = Depends(get_current_active_user)):
    """获取邮件模板列表"""
    templates = email_service.list_templates()
    return {"templates": templates}


@router.post("/email/test")
async def test_email_connection(current_user: dict = Depends(get_current_active_user)):
    """测试邮件服务连接"""
    try:
        success = await email_service.test_connection()
        if success:
            return {"message": "邮件服务连接正常"}
        else:
            raise HTTPException(status_code=500, detail="邮件服务连接失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"邮件服务测试异常: {str(e)}")


# 通知设置相关API
@router.get("/settings", response_model=NotificationSettings)
async def get_notification_settings(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取用户通知设置"""
    # 这里简化处理，实际应该从数据库查询用户设置
    return {
        "email_notifications": True,
        "push_notifications": True,
        "sms_notifications": False,
        "notification_types": ["system", "diagnosis", "report", "reminder"]
    }


@router.put("/settings")
async def update_notification_settings(
    settings: NotificationSettings,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新用户通知设置"""
    # 这里简化处理，实际应该更新数据库
    return {"message": "通知设置已更新", "settings": settings}


# 后台任务函数
async def send_email_notifications(
    recipients: List[User],
    title: str,
    content: str,
    action_url: Optional[str] = None,
    action_text: Optional[str] = None
):
    """发送邮件通知的后台任务"""
    for recipient in recipients:
        try:
            await send_system_notification(
                email=recipient.email,
                title=title,
                message=content,
                action_url=action_url,
                action_text=action_text,
                to_name=recipient.full_name or recipient.username
            )
        except Exception as e:
            print(f"发送邮件通知失败: {recipient.email} - {e}")


# WebSocket推送消息
@router.post("/push/{user_id}")
async def push_message_to_user(
    user_id: int,
    message: Dict[str, Any],
    current_user: dict = Depends(get_current_active_user)
):
    """向指定用户推送消息"""
    try:
        await websocket_manager.send_personal_message(
            message=message,
            user_id=user_id
        )
        return {"message": "消息推送成功", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"消息推送失败: {str(e)}")


@router.post("/broadcast")
async def broadcast_message(
    message: Dict[str, Any],
    current_user: dict = Depends(get_current_active_user)
):
    """广播消息给所有在线用户"""
    try:
        await websocket_manager.broadcast(message)
        return {"message": "消息广播成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"消息广播失败: {str(e)}")
