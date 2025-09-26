/**
 * 通知中心组件
 * 
 * 提供站内消息管理和通知展示功能
 * 
 * 功能特性：
 * - 消息列表展示
 * - 消息状态管理
 * - 实时消息推送
 * - 消息分类筛选
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import toast from 'react-hot-toast'

// 消息接口
interface Message {
  id: number
  title: string
  content: string
  message_type: 'info' | 'warning' | 'error' | 'success'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_read: boolean
  created_at: string
  expires_at?: string
  action_url?: string
  action_text?: string
  sender_name?: string
}

// 消息统计接口
interface MessageStats {
  total_messages: number
  unread_messages: number
  messages_by_type: Record<string, number>
  messages_by_priority: Record<string, number>
}

// 通知中心属性
interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState<MessageStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<{
    type?: string
    is_read?: boolean
  }>({})
  
  const { handleApiError } = useErrorHandler()
  
  // WebSocket连接用于实时消息
  const { isConnected, sendMessage } = useWebSocket({
    url: '/ws/notifications',
    onMessage: (message) => {
      if (message.type === 'notification') {
        const newMessage = message.data as Message
        setMessages(prev => [newMessage, ...prev])
        
        // 显示Toast通知
        const toastMessage = `${newMessage.title}: ${newMessage.content}`
        switch (newMessage.message_type) {
          case 'success':
            toast.success(toastMessage)
            break
          case 'warning':
            toast(toastMessage, { icon: '⚠️' })
            break
          case 'error':
            toast.error(toastMessage)
            break
          default:
            toast(toastMessage)
        }
        
        // 更新统计
        loadStats()
      }
    }
  })
  
  // 加载消息列表
  const loadMessages = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.type) params.append('message_type', filter.type)
      if (filter.is_read !== undefined) params.append('is_read', filter.is_read.toString())
      
      const response = await fetch(`/api/v1/notifications/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      handleApiError(error, 'load_messages')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 加载消息统计
  const loadStats = async () => {
    try {
      const response = await fetch('/api/v1/notifications/messages/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      handleApiError(error, 'load_stats')
    }
  }
  
  // 标记消息为已读
  const markAsRead = async (messageId: number) => {
    try {
      const response = await fetch(`/api/v1/notifications/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      // 更新本地状态
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ))
      
      // 更新统计
      loadStats()
    } catch (error) {
      handleApiError(error, 'mark_read')
    }
  }
  
  // 删除消息
  const deleteMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/v1/notifications/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      // 更新本地状态
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      
      // 更新统计
      loadStats()
      
      toast.success('消息已删除')
    } catch (error) {
      handleApiError(error, 'delete_message')
    }
  }
  
  // 获取消息类型图标
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      case 'info':
      default:
        return 'ℹ️'
    }
  }
  
  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100'
      case 'high':
        return 'text-orange-600 bg-orange-100'
      case 'normal':
        return 'text-blue-600 bg-blue-100'
      case 'low':
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }
  
  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return date.toLocaleDateString('zh-CN')
  }
  
  useEffect(() => {
    if (isOpen) {
      loadMessages()
      loadStats()
    }
  }, [isOpen, filter])
  
  if (!isOpen) return null
  
  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 通知面板 */}
      <div className="fixed inset-y-0 right-0 w-96 max-w-sm bg-white shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">通知中心</h2>
              {stats && stats.unread_messages > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {stats.unread_messages > 99 ? '99+' : stats.unread_messages}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="关闭通知中心"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>
          
          {/* 连接状态 */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center text-sm">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-gray-600">
                {isConnected ? '实时连接正常' : '连接已断开'}
              </span>
            </div>
          </div>
          
          {/* 筛选器 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex space-x-2">
              <select
                value={filter.type || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value || undefined }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有类型</option>
                <option value="info">信息</option>
                <option value="warning">警告</option>
                <option value="error">错误</option>
                <option value="success">成功</option>
              </select>
              
              <select
                value={filter.is_read === undefined ? '' : filter.is_read.toString()}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  is_read: e.target.value === '' ? undefined : e.target.value === 'true'
                }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="false">未读</option>
                <option value="true">已读</option>
              </select>
            </div>
          </div>
          
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <i className="ri-notification-off-line text-3xl mb-2" />
                <p>暂无消息</p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                      !message.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-1">
                          <span className="text-lg mr-2">{getMessageIcon(message.message_type)}</span>
                          <h3 className={`text-sm font-medium truncate ${
                            !message.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {message.title}
                          </h3>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getPriorityColor(message.priority)}`}>
                            {message.priority}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {message.content}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatTime(message.created_at)}</span>
                          {message.sender_name && (
                            <span>来自: {message.sender_name}</span>
                          )}
                        </div>
                        
                        {message.action_url && (
                          <div className="mt-2">
                            <a
                              href={message.action_url}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              onClick={() => markAsRead(message.id)}
                            >
                              {message.action_text || '查看详情'} →
                            </a>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center ml-2">
                        {!message.is_read && (
                          <button
                            onClick={() => markAsRead(message.id)}
                            className="p-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                            title="标记为已读"
                          >
                            <i className="ri-check-line text-sm" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="p-1 text-red-600 hover:text-red-800 focus:outline-none ml-1"
                          title="删除消息"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 底部统计 */}
          {stats && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between mb-1">
                  <span>总消息数:</span>
                  <span>{stats.total_messages}</span>
                </div>
                <div className="flex justify-between">
                  <span>未读消息:</span>
                  <span className="font-medium text-red-600">{stats.unread_messages}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationCenter
