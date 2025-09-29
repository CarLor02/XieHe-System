"""
WebSocket实时数据推送API端点

提供实时数据推送功能，包括：
- 仪表板数据实时更新
- 系统状态监控
- 任务进度通知
- 用户消息推送

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import json
import asyncio
from typing import Dict, List, Set, Optional, Any
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.websockets import WebSocketState
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.cache import get_cache_manager
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# WebSocket连接管理器
class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # 活跃连接：{user_id: {connection_id: websocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # 订阅管理：{channel: {user_id: set(connection_ids)}}
        self.subscriptions: Dict[str, Dict[str, Set[str]]] = {}
        # 连接元数据：{connection_id: metadata}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str):
        """建立WebSocket连接"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        
        self.active_connections[user_id][connection_id] = websocket
        self.connection_metadata[connection_id] = {
            "user_id": user_id,
            "connected_at": datetime.now(),
            "last_ping": datetime.now(),
            "subscriptions": set()
        }
        
        logger.info(f"WebSocket连接建立: user_id={user_id}, connection_id={connection_id}")
        
        # 发送连接确认消息
        await self.send_personal_message({
            "type": "connection_established",
            "connection_id": connection_id,
            "timestamp": datetime.now().isoformat(),
            "message": "WebSocket连接已建立"
        }, user_id, connection_id)
    
    def disconnect(self, user_id: str, connection_id: str):
        """断开WebSocket连接"""
        try:
            # 移除连接
            if user_id in self.active_connections:
                if connection_id in self.active_connections[user_id]:
                    del self.active_connections[user_id][connection_id]
                
                # 如果用户没有其他连接，移除用户
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # 移除订阅
            if connection_id in self.connection_metadata:
                subscriptions = self.connection_metadata[connection_id].get("subscriptions", set())
                for channel in subscriptions:
                    self.unsubscribe(user_id, connection_id, channel)
                
                del self.connection_metadata[connection_id]
            
            logger.info(f"WebSocket连接断开: user_id={user_id}, connection_id={connection_id}")
            
        except Exception as e:
            logger.error(f"断开连接时发生错误: {e}")
    
    async def send_personal_message(self, message: dict, user_id: str, connection_id: str = None):
        """发送个人消息"""
        if user_id not in self.active_connections:
            return False
        
        message_str = json.dumps(message, ensure_ascii=False, default=str)
        
        if connection_id:
            # 发送到指定连接
            if connection_id in self.active_connections[user_id]:
                websocket = self.active_connections[user_id][connection_id]
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(message_str)
                        return True
                except Exception as e:
                    logger.error(f"发送个人消息失败: {e}")
                    self.disconnect(user_id, connection_id)
        else:
            # 发送到用户的所有连接
            success_count = 0
            connections_to_remove = []
            
            for conn_id, websocket in self.active_connections[user_id].items():
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(message_str)
                        success_count += 1
                    else:
                        connections_to_remove.append(conn_id)
                except Exception as e:
                    logger.error(f"发送消息到连接 {conn_id} 失败: {e}")
                    connections_to_remove.append(conn_id)
            
            # 清理失效连接
            for conn_id in connections_to_remove:
                self.disconnect(user_id, conn_id)
            
            return success_count > 0
        
        return False
    
    async def broadcast_to_channel(self, message: dict, channel: str):
        """向频道广播消息"""
        if channel not in self.subscriptions:
            return 0
        
        message_str = json.dumps(message, ensure_ascii=False, default=str)
        success_count = 0
        
        for user_id, connection_ids in self.subscriptions[channel].items():
            if user_id not in self.active_connections:
                continue
                
            for connection_id in connection_ids.copy():
                if connection_id not in self.active_connections[user_id]:
                    connection_ids.discard(connection_id)
                    continue
                
                websocket = self.active_connections[user_id][connection_id]
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(message_str)
                        success_count += 1
                    else:
                        self.disconnect(user_id, connection_id)
                except Exception as e:
                    logger.error(f"广播消息失败: {e}")
                    self.disconnect(user_id, connection_id)
        
        return success_count
    
    def subscribe(self, user_id: str, connection_id: str, channel: str):
        """订阅频道"""
        if channel not in self.subscriptions:
            self.subscriptions[channel] = {}
        
        if user_id not in self.subscriptions[channel]:
            self.subscriptions[channel][user_id] = set()
        
        self.subscriptions[channel][user_id].add(connection_id)
        
        # 更新连接元数据
        if connection_id in self.connection_metadata:
            self.connection_metadata[connection_id]["subscriptions"].add(channel)
        
        logger.info(f"用户订阅频道: user_id={user_id}, connection_id={connection_id}, channel={channel}")
    
    def unsubscribe(self, user_id: str, connection_id: str, channel: str):
        """取消订阅频道"""
        if channel in self.subscriptions and user_id in self.subscriptions[channel]:
            self.subscriptions[channel][user_id].discard(connection_id)
            
            # 如果用户在该频道没有其他连接，移除用户
            if not self.subscriptions[channel][user_id]:
                del self.subscriptions[channel][user_id]
            
            # 如果频道没有订阅者，移除频道
            if not self.subscriptions[channel]:
                del self.subscriptions[channel]
        
        # 更新连接元数据
        if connection_id in self.connection_metadata:
            self.connection_metadata[connection_id]["subscriptions"].discard(channel)
        
        logger.info(f"用户取消订阅频道: user_id={user_id}, connection_id={connection_id}, channel={channel}")
    
    def get_connection_stats(self) -> dict:
        """获取连接统计信息"""
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        total_users = len(self.active_connections)
        total_channels = len(self.subscriptions)
        
        return {
            "total_connections": total_connections,
            "total_users": total_users,
            "total_channels": total_channels,
            "active_users": list(self.active_connections.keys()),
            "channels": list(self.subscriptions.keys())
        }

# 全局连接管理器实例
manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    connection_id: str = None,
    db: Session = Depends(get_db)
):
    """WebSocket连接端点"""
    
    # 生成连接ID
    if not connection_id:
        connection_id = f"conn_{user_id}_{int(datetime.now().timestamp())}"
    
    try:
        # 验证用户身份（这里简化处理，实际应该验证token）
        # current_user = await get_current_user_websocket(websocket, db)
        # if not current_user or current_user.get("user_id") != user_id:
        #     await websocket.close(code=4001, reason="Unauthorized")
        #     return
        
        # 建立连接
        await manager.connect(websocket, user_id, connection_id)
        
        # 自动订阅用户个人频道
        manager.subscribe(user_id, connection_id, f"user_{user_id}")
        
        # 消息处理循环
        while True:
            try:
                # 接收客户端消息
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # 更新最后ping时间
                if connection_id in manager.connection_metadata:
                    manager.connection_metadata[connection_id]["last_ping"] = datetime.now()
                
                # 处理不同类型的消息
                await handle_websocket_message(message, user_id, connection_id, db)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "无效的JSON格式",
                    "timestamp": datetime.now().isoformat()
                }, user_id, connection_id)
            except Exception as e:
                logger.error(f"处理WebSocket消息时发生错误: {e}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "消息处理失败",
                    "timestamp": datetime.now().isoformat()
                }, user_id, connection_id)
    
    except Exception as e:
        logger.error(f"WebSocket连接错误: {e}")
    finally:
        manager.disconnect(user_id, connection_id)

async def handle_websocket_message(message: dict, user_id: str, connection_id: str, db: Session):
    """处理WebSocket消息"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # 心跳检测
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }, user_id, connection_id)
    
    elif message_type == "subscribe":
        # 订阅频道
        channel = message.get("channel")
        if channel:
            manager.subscribe(user_id, connection_id, channel)
            await manager.send_personal_message({
                "type": "subscribed",
                "channel": channel,
                "timestamp": datetime.now().isoformat()
            }, user_id, connection_id)
    
    elif message_type == "unsubscribe":
        # 取消订阅频道
        channel = message.get("channel")
        if channel:
            manager.unsubscribe(user_id, connection_id, channel)
            await manager.send_personal_message({
                "type": "unsubscribed",
                "channel": channel,
                "timestamp": datetime.now().isoformat()
            }, user_id, connection_id)
    
    elif message_type == "get_dashboard_data":
        # 获取仪表板数据
        await send_dashboard_data(user_id, connection_id, db)
    
    else:
        await manager.send_personal_message({
            "type": "error",
            "message": f"未知的消息类型: {message_type}",
            "timestamp": datetime.now().isoformat()
        }, user_id, connection_id)

async def send_dashboard_data(user_id: str, connection_id: str, db: Session):
    """发送仪表板数据"""
    try:
        # 这里应该从数据库获取实际数据，现在使用模拟数据
        dashboard_data = {
            "type": "dashboard_data",
            "data": {
                "overview": {
                    "total_reports": 1247,
                    "pending_reports": 98,
                    "completed_reports": 1089,
                    "overdue_reports": 15,
                    "total_patients": 2456,
                    "new_patients_today": 23,
                    "active_users": 45,
                    "system_alerts": 3
                },
                "recent_activities": [
                    {
                        "id": "activity_001",
                        "type": "report_completed",
                        "message": "张医生完成了患者李某的CT报告",
                        "timestamp": datetime.now().isoformat()
                    },
                    {
                        "id": "activity_002", 
                        "type": "new_patient",
                        "message": "新患者王某已注册",
                        "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat()
                    }
                ],
                "system_status": {
                    "cpu_usage": 45.2,
                    "memory_usage": 67.8,
                    "disk_usage": 23.1,
                    "active_connections": len(manager.active_connections)
                }
            },
            "timestamp": datetime.now().isoformat()
        }
        
        await manager.send_personal_message(dashboard_data, user_id, connection_id)
        
    except Exception as e:
        logger.error(f"发送仪表板数据失败: {e}")

# WebSocket管理API端点
@router.get("/ws/stats")
async def get_websocket_stats():
    """获取WebSocket连接统计"""
    return manager.get_connection_stats()

@router.post("/ws/broadcast/{channel}")
async def broadcast_message(channel: str, message: dict):
    """向指定频道广播消息"""
    message["timestamp"] = datetime.now().isoformat()
    success_count = await manager.broadcast_to_channel(message, channel)
    
    return {
        "success": True,
        "channel": channel,
        "recipients": success_count,
        "message": "消息已广播"
    }

@router.post("/ws/send/{user_id}")
async def send_user_message(user_id: str, message: dict):
    """向指定用户发送消息"""
    message["timestamp"] = datetime.now().isoformat()
    success = await manager.send_personal_message(message, user_id)
    
    return {
        "success": success,
        "user_id": user_id,
        "message": "消息已发送" if success else "用户不在线"
    }
