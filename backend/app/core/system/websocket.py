"""
WebSocket管理器核心模块

提供WebSocket连接管理、消息推送和频道订阅功能

作者: XieHe Medical System
创建时间: 2025-09-29
"""

import json
import asyncio
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
import logging

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

logger = logging.getLogger(__name__)


class WebSocketManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # 活跃连接: {user_id: {connection_id: websocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        
        # 连接元数据: {connection_id: metadata}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
        # 频道订阅: {channel: {user_id: {connection_id}}}
        self.channel_subscriptions: Dict[str, Dict[str, Set[str]]] = {}
        
        # 用户订阅: {user_id: {connection_id: {channels}}}
        self.user_subscriptions: Dict[str, Dict[str, Set[str]]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str):
        """建立WebSocket连接"""
        try:
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
            
            if user_id not in self.user_subscriptions:
                self.user_subscriptions[user_id] = {}
            self.user_subscriptions[user_id][connection_id] = set()
            
            logger.info(f"WebSocket连接建立: user_id={user_id}, connection_id={connection_id}")
            
            # 发送连接确认消息
            await self.send_personal_message({
                "type": "connection_established",
                "connection_id": connection_id,
                "timestamp": datetime.now().isoformat(),
                "message": "WebSocket连接已建立"
            }, user_id, connection_id)
            
        except Exception as e:
            logger.error(f"WebSocket连接失败: {e}")
            raise
    
    def disconnect(self, user_id: str, connection_id: str):
        """断开WebSocket连接"""
        try:
            # 清理连接
            if user_id in self.active_connections:
                if connection_id in self.active_connections[user_id]:
                    del self.active_connections[user_id][connection_id]
                
                # 如果用户没有其他连接，删除用户记录
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # 清理订阅
            if user_id in self.user_subscriptions:
                if connection_id in self.user_subscriptions[user_id]:
                    # 取消所有频道订阅
                    for channel in self.user_subscriptions[user_id][connection_id]:
                        self.unsubscribe(user_id, connection_id, channel)
                    
                    del self.user_subscriptions[user_id][connection_id]
                
                if not self.user_subscriptions[user_id]:
                    del self.user_subscriptions[user_id]
            
            # 清理元数据
            if connection_id in self.connection_metadata:
                del self.connection_metadata[connection_id]
            
            logger.info(f"WebSocket连接断开: user_id={user_id}, connection_id={connection_id}")
            
        except Exception as e:
            logger.error(f"WebSocket断开连接失败: {e}")
    
    def subscribe(self, user_id: str, connection_id: str, channel: str):
        """订阅频道"""
        try:
            # 添加到频道订阅
            if channel not in self.channel_subscriptions:
                self.channel_subscriptions[channel] = {}
            
            if user_id not in self.channel_subscriptions[channel]:
                self.channel_subscriptions[channel][user_id] = set()
            
            self.channel_subscriptions[channel][user_id].add(connection_id)
            
            # 添加到用户订阅
            if user_id in self.user_subscriptions:
                if connection_id in self.user_subscriptions[user_id]:
                    self.user_subscriptions[user_id][connection_id].add(channel)
            
            # 更新元数据
            if connection_id in self.connection_metadata:
                self.connection_metadata[connection_id]["subscriptions"].add(channel)
            
            logger.debug(f"用户订阅频道: user_id={user_id}, connection_id={connection_id}, channel={channel}")
            
        except Exception as e:
            logger.error(f"订阅频道失败: {e}")
    
    def unsubscribe(self, user_id: str, connection_id: str, channel: str):
        """取消订阅频道"""
        try:
            # 从频道订阅中移除
            if channel in self.channel_subscriptions:
                if user_id in self.channel_subscriptions[channel]:
                    self.channel_subscriptions[channel][user_id].discard(connection_id)
                    
                    if not self.channel_subscriptions[channel][user_id]:
                        del self.channel_subscriptions[channel][user_id]
                
                if not self.channel_subscriptions[channel]:
                    del self.channel_subscriptions[channel]
            
            # 从用户订阅中移除
            if user_id in self.user_subscriptions:
                if connection_id in self.user_subscriptions[user_id]:
                    self.user_subscriptions[user_id][connection_id].discard(channel)
            
            # 更新元数据
            if connection_id in self.connection_metadata:
                self.connection_metadata[connection_id]["subscriptions"].discard(channel)
            
            logger.debug(f"用户取消订阅频道: user_id={user_id}, connection_id={connection_id}, channel={channel}")
            
        except Exception as e:
            logger.error(f"取消订阅频道失败: {e}")
    
    async def send_personal_message(self, message: dict, user_id: str, connection_id: str = None):
        """发送个人消息"""
        try:
            if user_id not in self.active_connections:
                return False
            
            if connection_id:
                # 发送给特定连接
                if connection_id in self.active_connections[user_id]:
                    websocket = self.active_connections[user_id][connection_id]
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(json.dumps(message, ensure_ascii=False))
                        return True
            else:
                # 发送给用户的所有连接
                success_count = 0
                for conn_id, websocket in self.active_connections[user_id].items():
                    if websocket.client_state == WebSocketState.CONNECTED:
                        try:
                            await websocket.send_text(json.dumps(message, ensure_ascii=False))
                            success_count += 1
                        except Exception as e:
                            logger.warning(f"发送消息失败: connection_id={conn_id}, error={e}")
                
                return success_count > 0
            
            return False
            
        except Exception as e:
            logger.error(f"发送个人消息失败: {e}")
            return False
    
    async def broadcast_to_channel(self, message: dict, channel: str):
        """向频道广播消息"""
        try:
            if channel not in self.channel_subscriptions:
                return 0
            
            success_count = 0
            for user_id, connection_ids in self.channel_subscriptions[channel].items():
                for connection_id in connection_ids:
                    if await self.send_personal_message(message, user_id, connection_id):
                        success_count += 1
            
            logger.debug(f"频道广播完成: channel={channel}, success_count={success_count}")
            return success_count
            
        except Exception as e:
            logger.error(f"频道广播失败: {e}")
            return 0
    
    async def broadcast_to_all(self, message: dict):
        """向所有连接广播消息"""
        try:
            success_count = 0
            for user_id in self.active_connections:
                if await self.send_personal_message(message, user_id):
                    success_count += 1
            
            logger.debug(f"全局广播完成: success_count={success_count}")
            return success_count
            
        except Exception as e:
            logger.error(f"全局广播失败: {e}")
            return 0
    
    def get_connection_count(self) -> int:
        """获取连接总数"""
        count = 0
        for user_connections in self.active_connections.values():
            count += len(user_connections)
        return count
    
    def get_user_count(self) -> int:
        """获取在线用户数"""
        return len(self.active_connections)
    
    def get_channel_subscribers(self, channel: str) -> int:
        """获取频道订阅者数量"""
        if channel not in self.channel_subscriptions:
            return 0
        
        count = 0
        for connection_ids in self.channel_subscriptions[channel].values():
            count += len(connection_ids)
        return count
    
    def get_status(self) -> dict:
        """获取WebSocket管理器状态"""
        return {
            "total_connections": self.get_connection_count(),
            "online_users": self.get_user_count(),
            "total_channels": len(self.channel_subscriptions),
            "channels": {
                channel: self.get_channel_subscribers(channel)
                for channel in self.channel_subscriptions
            }
        }


# 全局WebSocket管理器实例
websocket_manager = WebSocketManager()
