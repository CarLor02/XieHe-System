#!/usr/bin/env python3
"""
WebSocket功能测试脚本

用于测试WebSocket实时数据推送功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import websockets
import json
from datetime import datetime

async def test_websocket_connection():
    """测试WebSocket连接"""
    uri = "ws://localhost:8000/api/v1/ws/ws/test_user"
    
    try:
        print(f"连接到WebSocket: {uri}")
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket连接成功")
            
            # 发送心跳包
            ping_message = {"type": "ping"}
            await websocket.send(json.dumps(ping_message))
            print("📤 发送心跳包")
            
            # 订阅频道
            subscribe_message = {"type": "subscribe", "channel": "dashboard"}
            await websocket.send(json.dumps(subscribe_message))
            print("📤 订阅仪表板频道")
            
            # 请求仪表板数据
            dashboard_request = {"type": "get_dashboard_data"}
            await websocket.send(json.dumps(dashboard_request))
            print("📤 请求仪表板数据")
            
            # 监听消息
            message_count = 0
            while message_count < 10:  # 接收10条消息后退出
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                    data = json.loads(message)
                    message_count += 1
                    
                    print(f"📥 收到消息 #{message_count}:")
                    print(f"   类型: {data.get('type', 'unknown')}")
                    print(f"   时间: {data.get('timestamp', 'N/A')}")
                    
                    if data.get('type') == 'dashboard_data':
                        overview = data.get('data', {}).get('overview', {})
                        print(f"   仪表板数据: 总报告数={overview.get('total_reports', 0)}")
                    elif data.get('type') == 'system_metrics':
                        metrics = data.get('data', {})
                        print(f"   系统指标: CPU={metrics.get('cpu_usage', 0):.1f}%")
                    
                    print()
                    
                except asyncio.TimeoutError:
                    print("⏰ 等待消息超时")
                    break
                except json.JSONDecodeError as e:
                    print(f"❌ JSON解析错误: {e}")
                except Exception as e:
                    print(f"❌ 处理消息错误: {e}")
            
            print("🔚 测试完成")
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket连接关闭: {e}")
    except websockets.exceptions.InvalidURI as e:
        print(f"❌ 无效的WebSocket URI: {e}")
    except Exception as e:
        print(f"❌ WebSocket连接错误: {e}")

async def test_websocket_broadcast():
    """测试WebSocket广播功能"""
    import aiohttp
    
    # 测试广播API
    broadcast_url = "http://localhost:8000/api/v1/ws/broadcast/dashboard"
    message = {
        "type": "test_broadcast",
        "message": "这是一条测试广播消息",
        "data": {
            "test_value": 123,
            "test_time": datetime.now().isoformat()
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(broadcast_url, json=message) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ 广播消息发送成功")
                    print(f"   频道: {result.get('channel')}")
                    print(f"   接收者数量: {result.get('recipients')}")
                else:
                    print(f"❌ 广播消息发送失败: {response.status}")
                    
    except Exception as e:
        print(f"❌ 广播测试错误: {e}")

async def test_user_message():
    """测试用户消息发送"""
    import aiohttp
    
    # 测试用户消息API
    user_message_url = "http://localhost:8000/api/v1/ws/send/test_user"
    message = {
        "type": "test_user_message",
        "title": "测试用户消息",
        "message": "这是一条发送给特定用户的测试消息",
        "priority": "normal"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(user_message_url, json=message) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ 用户消息发送成功")
                    print(f"   用户ID: {result.get('user_id')}")
                    print(f"   发送状态: {result.get('success')}")
                else:
                    print(f"❌ 用户消息发送失败: {response.status}")
                    
    except Exception as e:
        print(f"❌ 用户消息测试错误: {e}")

async def main():
    """主测试函数"""
    print("🚀 开始WebSocket功能测试")
    print("=" * 50)
    
    # 测试WebSocket连接
    print("1. 测试WebSocket连接...")
    await test_websocket_connection()
    
    print("\n" + "=" * 50)
    
    # 测试广播功能
    print("2. 测试广播功能...")
    await test_websocket_broadcast()
    
    print("\n" + "=" * 50)
    
    # 测试用户消息
    print("3. 测试用户消息...")
    await test_user_message()
    
    print("\n" + "=" * 50)
    print("🏁 所有测试完成")

if __name__ == "__main__":
    print("WebSocket功能测试脚本")
    print("请确保后端服务已启动 (python main.py)")
    print()
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️ 测试被用户中断")
    except Exception as e:
        print(f"\n❌ 测试执行错误: {e}")
