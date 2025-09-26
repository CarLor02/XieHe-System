"use client"

/**
 * 监控仪表板组件
 * 
 * 提供系统运行状态展示、性能监控、告警管理等功能
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Memory,
  Network,
  Server,
  TrendingUp,
  Users,
  Zap,
  RefreshCw
} from 'lucide-react'

interface SystemStatus {
  timestamp: string
  system: {
    cpu_usage: number
    memory_usage: number
    disk_usage: number
    uptime: number
  }
  api_performance: {
    avg: number
    p95: number
    requests_per_second: number
  }
  database_performance: {
    avg: number
    active_connections: number
    query_count: number
  }
  thresholds: {
    api_response_time: number
    db_query_time: number
    cpu_usage: number
    memory_usage: number
    disk_usage: number
  }
  alerts: string[]
}

interface MetricPoint {
  timestamp: string
  metric_type: string
  metric_name: string
  value: number
  unit: string
  tags: Record<string, string>
}

interface Alert {
  id: string
  title: string
  message: string
  level: 'info' | 'warning' | 'error' | 'critical'
  source: string
  timestamp: string
  status: 'active' | 'resolved' | 'suppressed'
}

const MonitoringDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [metrics, setMetrics] = useState<MetricPoint[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h')

  // 获取系统状态
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSystemStatus(data)
      }
    } catch (error) {
      console.error('获取系统状态失败:', error)
    }
  }

  // 获取性能指标
  const fetchMetrics = async (timeRange: string) => {
    try {
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24
      const response = await fetch(`/api/v1/monitoring/metrics?hours=${hours}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('获取性能指标失败:', error)
    }
  }

  // 获取告警信息
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('获取告警信息失败:', error)
    }
  }

  // 刷新数据
  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchSystemStatus(),
      fetchMetrics(selectedTimeRange),
      fetchAlerts()
    ])
    setRefreshing(false)
  }

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await refreshData()
      setLoading(false)
    }
    loadData()
  }, [])

  // 时间范围变化
  useEffect(() => {
    fetchMetrics(selectedTimeRange)
  }, [selectedTimeRange])

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(refreshData, 30000) // 30秒刷新一次
    return () => clearInterval(interval)
  }, [selectedTimeRange])

  // 获取状态颜色
  const getStatusColor = (value: number, threshold: number, reverse = false) => {
    if (reverse) {
      return value < threshold * 0.5 ? 'text-green-600' : 
             value < threshold * 0.8 ? 'text-yellow-600' : 'text-red-600'
    }
    return value < threshold * 0.5 ? 'text-green-600' : 
           value < threshold * 0.8 ? 'text-yellow-600' : 'text-red-600'
  }

  // 获取告警级别颜色
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive'
      case 'error': return 'destructive'
      case 'warning': return 'default'
      case 'info': return 'secondary'
      default: return 'secondary'
    }
  }

  // 格式化指标数据用于图表
  const formatMetricsForChart = (metricType: string) => {
    return metrics
      .filter(m => m.metric_type === metricType)
      .map(m => ({
        timestamp: new Date(m.timestamp).toLocaleTimeString(),
        value: m.value,
        name: m.metric_name
      }))
      .slice(-20) // 最近20个数据点
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">系统监控</h1>
          <p className="text-gray-600">实时监控系统运行状态和性能指标</p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 告警信息 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <Alert key={alert.id} variant={getAlertColor(alert.level) as any}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 系统状态概览 */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU 使用率</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={getStatusColor(systemStatus.system.cpu_usage, systemStatus.thresholds.cpu_usage)}>
                  {systemStatus.system.cpu_usage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={systemStatus.system.cpu_usage} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">内存使用率</CardTitle>
              <Memory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={getStatusColor(systemStatus.system.memory_usage, systemStatus.thresholds.memory_usage)}>
                  {systemStatus.system.memory_usage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={systemStatus.system.memory_usage} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">磁盘使用率</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={getStatusColor(systemStatus.system.disk_usage, systemStatus.thresholds.disk_usage)}>
                  {systemStatus.system.disk_usage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={systemStatus.system.disk_usage} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">系统运行时间</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {Math.floor(systemStatus.system.uptime / 3600)}h
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.floor((systemStatus.system.uptime % 3600) / 60)}m
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 详细监控 */}
      <Tabs value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="1h">1小时</TabsTrigger>
            <TabsTrigger value="6h">6小时</TabsTrigger>
            <TabsTrigger value="24h">24小时</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={selectedTimeRange} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API 性能图表 */}
            <Card>
              <CardHeader>
                <CardTitle>API 响应时间</CardTitle>
                <CardDescription>
                  平均响应时间: {systemStatus?.api_performance.avg.toFixed(2)}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatMetricsForChart('api_response')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="响应时间 (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 数据库性能图表 */}
            <Card>
              <CardHeader>
                <CardTitle>数据库性能</CardTitle>
                <CardDescription>
                  平均查询时间: {systemStatus?.database_performance.avg.toFixed(2)}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatMetricsForChart('database')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="查询时间 (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 系统资源使用趋势 */}
            <Card>
              <CardHeader>
                <CardTitle>系统资源使用趋势</CardTitle>
                <CardDescription>CPU、内存、磁盘使用率变化</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={formatMetricsForChart('system')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8"
                      name="使用率 (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 告警统计 */}
            <Card>
              <CardHeader>
                <CardTitle>告警统计</CardTitle>
                <CardDescription>当前活跃告警: {alerts.length}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-green-600">
                      <CheckCircle className="h-8 w-8 mr-2" />
                      <span>系统运行正常，无活跃告警</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.slice(0, 5).map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getAlertColor(alert.level) as any}>
                              {alert.level}
                            </Badge>
                            <span className="text-sm">{alert.title}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 性能指标详情 */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle>性能指标详情</CardTitle>
            <CardDescription>系统各项性能指标的详细信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <Network className="h-4 w-4 mr-2" />
                  API 性能
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>平均响应时间:</span>
                    <span>{systemStatus.api_performance.avg.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P95 响应时间:</span>
                    <span>{systemStatus.api_performance.p95.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>请求频率:</span>
                    <span>{systemStatus.api_performance.requests_per_second.toFixed(1)}/s</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  数据库性能
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>平均查询时间:</span>
                    <span>{systemStatus.database_performance.avg.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>活跃连接数:</span>
                    <span>{systemStatus.database_performance.active_connections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>查询总数:</span>
                    <span>{systemStatus.database_performance.query_count}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <Server className="h-4 w-4 mr-2" />
                  系统阈值
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>API响应阈值:</span>
                    <span>{systemStatus.thresholds.api_response_time}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DB查询阈值:</span>
                    <span>{systemStatus.thresholds.db_query_time}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU使用阈值:</span>
                    <span>{systemStatus.thresholds.cpu_usage}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MonitoringDashboard
