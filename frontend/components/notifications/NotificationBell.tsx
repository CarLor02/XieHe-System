/**
 * 通知铃铛组件
 * 
 * 提供通知图标和未读消息计数显示
 * 
 * 功能特性：
 * - 未读消息计数
 * - 实时更新
 * - 点击打开通知中心
 * - 动画效果
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

'use client'

import React, { useState, useEffect } from 'react'
import NotificationCenter from './NotificationCenter'
import { useWebSocket } from '@/hooks/useWebSocket'

// 通知铃铛属性
interface NotificationBellProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  size = 'md',
  showCount = true
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  
  // WebSocket连接用于实时更新
  const { isConnected } = useWebSocket({
    url: '/ws/notifications',
    onMessage: (message) => {
      if (message.type === 'notification') {
        setUnreadCount(prev => prev + 1)
        setHasNewMessage(true)
        
        // 3秒后移除新消息动画
        setTimeout(() => setHasNewMessage(false), 3000)
      } else if (message.type === 'message_read') {
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else if (message.type === 'stats_update') {
        setUnreadCount(message.data.unread_messages || 0)
      }
    }
  })
  
  // 加载未读消息数量
  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/v1/notifications/messages/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unread_messages || 0)
      }
    } catch (error) {
      console.error('加载未读消息数量失败:', error)
    }
  }
  
  // 获取尺寸样式
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 text-sm'
      case 'lg':
        return 'w-10 h-10 text-lg'
      case 'md':
      default:
        return 'w-8 h-8 text-base'
    }
  }
  
  // 获取计数徽章样式
  const getCountBadgeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4 text-xs -top-1 -right-1'
      case 'lg':
        return 'w-6 h-6 text-sm -top-2 -right-2'
      case 'md':
      default:
        return 'w-5 h-5 text-xs -top-2 -right-2'
    }
  }
  
  useEffect(() => {
    loadUnreadCount()
  }, [])
  
  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(true)}
          className={`
            relative flex items-center justify-center rounded-full
            text-gray-600 hover:text-gray-900 hover:bg-gray-100
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition-all duration-200
            ${getSizeClasses()}
            ${hasNewMessage ? 'animate-bounce' : ''}
            ${className}
          `}
          aria-label={`通知中心${unreadCount > 0 ? ` (${unreadCount}条未读)` : ''}`}
        >
          {/* 铃铛图标 */}
          <i className={`ri-notification-3-line ${hasNewMessage ? 'animate-pulse' : ''}`} />
          
          {/* 连接状态指示器 */}
          <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          
          {/* 未读消息计数徽章 */}
          {showCount && unreadCount > 0 && (
            <span className={`
              absolute flex items-center justify-center
              bg-red-500 text-white font-bold rounded-full
              animate-pulse
              ${getCountBadgeClasses()}
            `}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          
          {/* 新消息闪烁效果 */}
          {hasNewMessage && (
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" />
          )}
        </button>
      </div>
      
      {/* 通知中心面板 */}
      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

export default NotificationBell
