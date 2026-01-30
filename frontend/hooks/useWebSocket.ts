/**
 * WebSocket Hook
 * 
 * 提供WebSocket连接管理和实时数据推送功能
 * 
 * 功能特性：
 * - 自动连接和重连
 * - 消息订阅和取消订阅
 * - 心跳检测
 * - 连接状态管理
 * - 错误处理
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'

// WebSocket连接状态
export enum WebSocketStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

// 消息类型
export interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: string
  channel?: string
  message?: string
}

// Hook配置选项
export interface UseWebSocketOptions {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  autoConnect?: boolean
  debug?: boolean
}

// Hook返回值
export interface UseWebSocketReturn {
  status: WebSocketStatus
  isConnected: boolean
  lastMessage: WebSocketMessage | null
  error: string | null
  connect: () => void
  disconnect: () => void
  sendMessage: (message: WebSocketMessage) => boolean
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
  clearError: () => void
}

const DEFAULT_OPTIONS: UseWebSocketOptions = {
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080/ws',
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  autoConnect: true,
  debug: false
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // 状态管理
  const [status, setStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // 引用管理
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const subscribedChannelsRef = useRef<Set<string>>(new Set())
  
  // 获取用户信息
  const { user, isAuthenticated } = useAuthStore()
  
  // 日志函数
  const log = useCallback((message: string, ...args: any[]) => {
    if (config.debug) {
      console.log(`[WebSocket] ${message}`, ...args)
    }
  }, [config.debug])
  
  // 清理定时器
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])
  
  // 启动心跳检测
  const startHeartbeat = useCallback(() => {
    if (!config.heartbeatInterval) return
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
        log('发送心跳包')
        startHeartbeat() // 递归调用
      }
    }, config.heartbeatInterval)
  }, [config.heartbeatInterval, log])
  
  // 处理WebSocket消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      log('收到消息:', message)
      
      setLastMessage(message)
      
      // 处理特殊消息类型
      switch (message.type) {
        case 'pong':
          log('收到心跳响应')
          break
        case 'connection_established':
          log('连接已建立')
          reconnectAttemptsRef.current = 0
          break
        case 'error':
          setError(message.message || '服务器错误')
          break
        default:
          // 其他消息类型由组件处理
          break
      }
    } catch (err) {
      log('解析消息失败:', err)
      setError('消息格式错误')
    }
  }, [log])
  
  // 连接WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated || !user?.id) {
      log('用户未认证，无法建立WebSocket连接')
      return
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('WebSocket已连接')
      return
    }
    
    try {
      setStatus(WebSocketStatus.CONNECTING)
      setError(null)
      
      const wsUrl = `${config.url}/${user.id}`
      log('连接WebSocket:', wsUrl)
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      
      ws.onopen = () => {
        log('WebSocket连接已打开')
        setStatus(WebSocketStatus.CONNECTED)
        reconnectAttemptsRef.current = 0
        
        // 重新订阅之前的频道
        subscribedChannelsRef.current.forEach(channel => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }))
        })
        
        // 启动心跳检测
        startHeartbeat()
      }
      
      ws.onmessage = handleMessage
      
      ws.onclose = (event) => {
        log('WebSocket连接已关闭:', event.code, event.reason)
        setStatus(WebSocketStatus.DISCONNECTED)
        clearTimeouts()
        
        // 自动重连
        if (reconnectAttemptsRef.current < (config.maxReconnectAttempts || 0)) {
          reconnectAttemptsRef.current++
          setStatus(WebSocketStatus.RECONNECTING)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            log(`尝试重连 (${reconnectAttemptsRef.current}/${config.maxReconnectAttempts})`)
            connect()
          }, config.reconnectInterval)
        } else {
          log('达到最大重连次数，停止重连')
          setError('连接失败，请刷新页面重试')
        }
      }
      
      ws.onerror = (event) => {
        log('WebSocket错误:', event)
        setStatus(WebSocketStatus.ERROR)
        setError('WebSocket连接错误')
      }
      
    } catch (err) {
      log('创建WebSocket连接失败:', err)
      setStatus(WebSocketStatus.ERROR)
      setError('无法创建WebSocket连接')
    }
  }, [isAuthenticated, user, config, log, handleMessage, startHeartbeat, clearTimeouts])
  
  // 断开WebSocket连接
  const disconnect = useCallback(() => {
    log('主动断开WebSocket连接')
    clearTimeouts()
    
    if (wsRef.current) {
      wsRef.current.close(1000, '用户主动断开')
      wsRef.current = null
    }
    
    setStatus(WebSocketStatus.DISCONNECTED)
    reconnectAttemptsRef.current = 0
  }, [log, clearTimeouts])
  
  // 发送消息
  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message)
        wsRef.current.send(messageStr)
        log('发送消息:', message)
        return true
      } catch (err) {
        log('发送消息失败:', err)
        setError('发送消息失败')
        return false
      }
    } else {
      log('WebSocket未连接，无法发送消息')
      setError('连接已断开，无法发送消息')
      return false
    }
  }, [log])
  
  // 订阅频道
  const subscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.add(channel)
    sendMessage({ type: 'subscribe', channel })
    log('订阅频道:', channel)
  }, [sendMessage, log])
  
  // 取消订阅频道
  const unsubscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.delete(channel)
    sendMessage({ type: 'unsubscribe', channel })
    log('取消订阅频道:', channel)
  }, [sendMessage, log])
  
  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // 自动连接
  useEffect(() => {
    if (config.autoConnect && isAuthenticated) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [config.autoConnect, isAuthenticated, connect, disconnect])
  
  // 监听认证状态变化
  useEffect(() => {
    if (!isAuthenticated && wsRef.current) {
      disconnect()
    }
  }, [isAuthenticated, disconnect])
  
  return {
    status,
    isConnected: status === WebSocketStatus.CONNECTED,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    clearError
  }
}

// 仪表板专用WebSocket Hook
export const useDashboardWebSocket = () => {
  const webSocket = useWebSocket({
    autoConnect: true,
    debug: process.env.NODE_ENV === 'development'
  })
  
  // 自动订阅仪表板频道
  useEffect(() => {
    if (webSocket.isConnected) {
      webSocket.subscribe('dashboard')
      webSocket.subscribe('system_alerts')
      webSocket.subscribe('notifications')
      
      // 请求初始仪表板数据
      webSocket.sendMessage({ type: 'get_dashboard_data' })
    }
  }, [webSocket.isConnected])
  
  return webSocket
}

export default useWebSocket