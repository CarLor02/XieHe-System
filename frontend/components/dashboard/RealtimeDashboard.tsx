/**
 * 实时仪表板组件
 * 
 * 使用WebSocket接收实时数据并展示仪表板信息
 * 
 * 功能特性：
 * - 实时数据更新
 * - 连接状态指示
 * - 数据可视化
 * - 错误处理
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDashboardWebSocket } from '@/hooks/useWebSocket'
import { WebSocketStatus, WebSocketMessage } from '@/hooks/useWebSocket'

// 数据类型定义
interface DashboardOverview {
  total_patients: number
  new_patients_today: number
  new_patients_week: number
  active_patients: number
  total_images: number
  images_today: number
  images_week: number
  pending_images: number
  processed_images: number
  completion_rate: number
  average_processing_time: number
  system_alerts: number
}

interface SystemMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_io: {
    bytes_sent: number
    bytes_recv: number
  }
  database_connections: number
  active_sessions: number
  api_response_time: number
  error_rate: number
  uptime: string
}

interface RecentActivity {
  id: string
  type: string
  message: string
  timestamp: string
}

interface DashboardData {
  overview: DashboardOverview
  recent_activities: RecentActivity[]
  system_status?: SystemMetrics
}

const RealtimeDashboard: React.FC = () => {
  // WebSocket连接
  const webSocket = useDashboardWebSocket()
  
  // 状态管理
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  
  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (!message) return
    
    switch (message.type) {
      case 'dashboard_update':
        if (message.data) {
          setDashboardData(message.data)
          setLastUpdateTime(new Date())
        }
        break
      
      case 'system_metrics':
        if (message.data) {
          setSystemMetrics(message.data)
        }
        break
      
      case 'notification':
        // 处理新通知
        if (message.data) {
          const newActivity: RecentActivity = {
            id: message.data.id || `activity_${Date.now()}`,
            type: 'notification',
            message: message.data.message || message.data.title || '新通知',
            timestamp: new Date().toISOString()
          }
          setRecentActivities(prev => [newActivity, ...prev.slice(0, 9)]) // 保持最新10条
        }
        break
      
      case 'task_progress':
        // 处理任务进度更新
        if (message.data) {
          const progressActivity: RecentActivity = {
            id: message.data.task_id || `task_${Date.now()}`,
            type: 'task_progress',
            message: `${message.data.name}: ${message.data.progress}% 完成`,
            timestamp: new Date().toISOString()
          }
          setRecentActivities(prev => [progressActivity, ...prev.slice(0, 9)])
        }
        break
      
      case 'dashboard_data':
        // 初始仪表板数据
        if (message.data) {
          setDashboardData(message.data)
          if (message.data.recent_activities) {
            setRecentActivities(message.data.recent_activities)
          }
          setLastUpdateTime(new Date())
        }
        break
    }
  }, [])
  
  // 监听WebSocket消息
  useEffect(() => {
    if (webSocket.lastMessage) {
      handleWebSocketMessage(webSocket.lastMessage)
    }
  }, [webSocket.lastMessage, handleWebSocketMessage])
  
  // 连接状态指示器
  const ConnectionStatus: React.FC = () => {
    const getStatusColor = () => {
      switch (webSocket.status) {
        case WebSocketStatus.CONNECTED:
          return 'bg-green-500'
        case WebSocketStatus.CONNECTING:
        case WebSocketStatus.RECONNECTING:
          return 'bg-yellow-500'
        case WebSocketStatus.ERROR:
          return 'bg-red-500'
        default:
          return 'bg-gray-500'
      }
    }
    
    const getStatusText = () => {
      switch (webSocket.status) {
        case WebSocketStatus.CONNECTED:
          return '已连接'
        case WebSocketStatus.CONNECTING:
          return '连接中'
        case WebSocketStatus.RECONNECTING:
          return '重连中'
        case WebSocketStatus.ERROR:
          return '连接错误'
        default:
          return '未连接'
      }
    }
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm text-gray-600">{getStatusText()}</span>
        {lastUpdateTime && (
          <span className="text-xs text-gray-400">
            最后更新: {lastUpdateTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    )
  }
  
  // 概览卡片组件
  const OverviewCard: React.FC<{
    title: string
    value: number
    icon: string
    color: string
    href?: string
  }> = ({ title, value, icon, color, href }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${color}`}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center">
            <span className="text-white text-lg">{icon}</span>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-lg font-medium text-gray-900">
              {href ? (
                <Link href={href} className="hover:text-blue-600 transition-colors cursor-pointer">
                  {value.toLocaleString()}
                </Link>
              ) : (
                value.toLocaleString()
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  )
  
  // 系统指标组件
  const SystemMetricsCard: React.FC = () => {
    if (!systemMetrics) return null
    
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">系统状态</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">CPU使用率</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.cpu_usage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{systemMetrics.cpu_usage.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">内存使用率</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.memory_usage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{systemMetrics.memory_usage.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">磁盘使用率</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.disk_usage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{systemMetrics.disk_usage.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <span className="text-xs text-gray-500">活跃连接</span>
              <p className="text-sm font-medium">{systemMetrics.active_sessions}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">响应时间</span>
              <p className="text-sm font-medium">{systemMetrics.api_response_time}s</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // 最近活动组件
  const RecentActivitiesCard: React.FC = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">最近活动</h3>
      <div className="space-y-3">
        {recentActivities.length > 0 ? (
          recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">暂无活动记录</p>
        )}
      </div>
    </div>
  )
  
  // 错误处理
  if (webSocket.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">连接错误</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{webSocket.error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                onClick={() => {
                  webSocket.clearError()
                  webSocket.connect()
                }}
              >
                重新连接
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* 连接状态 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">实时仪表板</h2>
        <ConnectionStatus />
      </div>
      
      {/* 概览数据 */}
      {dashboardData?.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <OverviewCard
            title="总影像数"
            value={dashboardData.overview.total_images}
            icon="📊"
            color="bg-blue-500"
          />
          <OverviewCard
            title="待处理影像"
            value={dashboardData.overview.pending_images}
            icon="⏳"
            color="bg-yellow-500"
            href="/imaging?status=pending"
          />
          <OverviewCard
            title="已完成影像"
            value={dashboardData.overview.processed_images}
            icon="✅"
            color="bg-green-500"
            href="/imaging?review_status=reviewed"
          />
          <OverviewCard
            title="总患者数"
            value={dashboardData.overview.total_patients}
            icon="👥"
            color="bg-purple-500"
          />
        </div>
      )}
      
      {/* 详细信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemMetricsCard />
        <RecentActivitiesCard />
      </div>
    </div>
  )
}

export default RealtimeDashboard
