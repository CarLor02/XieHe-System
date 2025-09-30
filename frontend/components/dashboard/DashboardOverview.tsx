'use client';

import { Button } from '@/components/ui/Button';
import React, { useEffect, useState } from 'react';

// 类型定义
interface DashboardOverview {
  total_reports: number;
  pending_reports: number;
  completed_reports: number;
  overdue_reports: number;
  total_patients: number;
  new_patients_today: number;
  active_users: number;
  system_alerts: number;
  completion_rate: number;
  average_processing_time: number;
}

interface TaskItem {
  task_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  due_date?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  progress: number;
  tags: string[];
  estimated_hours?: number;
  actual_hours?: number;
}

interface NotificationItem {
  notification_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  created_at: string;
  read: boolean;
  sender?: string;
  sender_name?: string;
  action_url?: string;
  expires_at?: string;
}

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: {
    incoming: number;
    outgoing: number;
  };
  database_connections: number;
  active_sessions: number;
  api_response_time: number;
  error_rate: number;
  uptime: string;
}

interface QuickAction {
  action_id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  category: string;
  permissions: string[];
  usage_count: number;
}

interface DashboardOverviewProps {
  onRefresh?: () => void;
}

const DashboardOverviewComponent: React.FC<DashboardOverviewProps> = ({
  onRefresh,
}) => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(
    null
  );
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 获取仪表板数据
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { createAuthenticatedClient } = await import('@/store/authStore');
      const client = createAuthenticatedClient();

      // 获取仪表板统计数据
      const statsResponse = await client.get('/api/v1/dashboard/stats');
      const overview: DashboardOverview = {
        total_reports: statsResponse.data.total_reports || 0,
        pending_reports: statsResponse.data.pending_reports || 0,
        completed_reports: statsResponse.data.completed_reports || 0,
        overdue_reports: statsResponse.data.overdue_reports || 0,
        total_patients: statsResponse.data.total_patients || 0,
        new_patients_today: statsResponse.data.new_patients_today || 0,
        active_users: statsResponse.data.active_users || 0,
        system_alerts: statsResponse.data.system_alerts || 0,
        completion_rate: statsResponse.data.completion_rate || 0,
        average_processing_time:
          statsResponse.data.average_processing_time || 0,
      };

      // 获取任务数据
      const tasksResponse = await client.get('/api/v1/dashboard/tasks');
      const tasks: TaskItem[] = (tasksResponse.data.tasks || []).map(
        (task: any) => ({
          task_id: task.task_id || task.id,
          title: task.title || '未知任务',
          description: task.description || '',
          status: task.status || 'pending',
          priority: task.priority || 'normal',
          assigned_to: task.assigned_to || '',
          assigned_to_name: task.assigned_to_name || '未分配',
          created_at: task.created_at || '',
          due_date: task.due_date || '',
          progress: task.progress || 0,
          tags: task.tags || [],
          estimated_hours: task.estimated_hours || 0,
          actual_hours: task.actual_hours || 0,
        })
      );

      // 获取通知数据
      const notificationsResponse = await client.get(
        '/api/v1/notifications/messages'
      );
      const notifications: NotificationItem[] = (
        notificationsResponse.data || []
      ).map((notif: any) => ({
        notification_id: notif.id || notif.notification_id,
        title: notif.title || '通知',
        message: notif.content || notif.message || '',
        type: notif.type || 'info',
        created_at: notif.created_at || '',
        read: notif.is_read || false,
        sender: notif.sender_id || 'SYSTEM',
        sender_name: notif.sender_name || '系统',
        action_url: notif.action_url || '',
      }));

      // 获取系统指标
      const metricsResponse = await client.get('/api/v1/system/stats');
      const metrics: SystemMetrics = {
        cpu_usage: metricsResponse.data.cpu_usage || 0,
        memory_usage: metricsResponse.data.memory_usage || 0,
        disk_usage: metricsResponse.data.disk_usage || 0,
        network_io: {
          incoming: metricsResponse.data.network_io?.incoming || 0,
          outgoing: metricsResponse.data.network_io?.outgoing || 0,
        },
        database_connections: metricsResponse.data.database_connections || 0,
        active_sessions: metricsResponse.data.active_sessions || 0,
        api_response_time: metricsResponse.data.api_response_time || 0,
        error_rate: metricsResponse.data.error_rate || 0,
        uptime: metricsResponse.data.system_uptime || '未知',
      };

      // 快速操作数据（可以保持静态）
      const actions: QuickAction[] = [
        {
          action_id: 'ACT_001',
          title: '创建新报告',
          description: '快速创建新的医疗报告',
          icon: 'ri-file-add-line',
          url: '/reports/create',
          category: '报告管理',
          permissions: ['report:create'],
          usage_count: 0,
        },
        {
          action_id: 'ACT_002',
          title: '上传影像',
          description: '上传新的医疗影像文件',
          icon: 'ri-upload-line',
          url: '/upload',
          category: '影像管理',
          permissions: ['image:upload'],
          usage_count: 0,
        },
        {
          action_id: 'ACT_003',
          title: '患者管理',
          description: '管理患者信息和档案',
          icon: 'ri-user-line',
          url: '/patients',
          category: '患者管理',
          permissions: ['patient:manage'],
          usage_count: 0,
        },
        {
          action_id: 'ACT_004',
          title: '审核报告',
          description: '审核待处理的医疗报告',
          icon: 'ri-check-line',
          url: '/reports/review',
          category: '审核管理',
          permissions: ['report:review'],
          usage_count: 0,
        },
      ];

      setOverview(overview);
      setRecentTasks(tasks);
      setNotifications(notifications);
      setSystemMetrics(metrics);
      setQuickActions(actions);
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string): string => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string): string => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  // 获取通知类型颜色
  const getNotificationColor = (type: string): string => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      success: 'bg-green-100 text-green-800',
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  // 获取通知类型图标
  const getNotificationIcon = (type: string): string => {
    const icons = {
      info: 'ri-information-line',
      warning: 'ri-alert-line',
      error: 'ri-error-warning-line',
      success: 'ri-check-line',
    };
    return icons[type as keyof typeof icons] || icons.info;
  };

  // 格式化时间
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载仪表板数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">工作台仪表板</h2>
          <p className="text-gray-600 mt-1">系统概览和快捷操作</p>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <i
              className={`ri-refresh-line mr-2 ${refreshing ? 'animate-spin' : ''}`}
            ></i>
            {refreshing ? '刷新中...' : '刷新'}
          </Button>
        </div>
      </div>

      {/* 概览统计卡片 */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="ri-file-list-3-line text-2xl text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">总报告数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.total_reports}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  完成率: {overview.completion_rate}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="ri-time-line text-2xl text-orange-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">待处理</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.pending_reports}
                </p>
                <p className="text-xs text-red-500 mt-1">
                  超期: {overview.overdue_reports}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="ri-group-line text-2xl text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">总患者数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.total_patients}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  今日新增: {overview.new_patients_today}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="ri-user-line text-2xl text-purple-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">在线用户</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.active_users}
                </p>
                <p className="text-xs text-yellow-500 mt-1">
                  系统警告: {overview.system_alerts}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近任务 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  最近任务
                </h3>
                <Button variant="outline" size="sm">
                  <i className="ri-add-line mr-2"></i>
                  新建任务
                </Button>
              </div>
            </div>
            <div className="p-6">
              {recentTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="ri-task-line text-4xl mb-4"></i>
                  <p>暂无任务</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTasks.map(task => (
                    <div
                      key={task.task_id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-900">
                              {task.title}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
                            >
                              {task.status}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}
                            >
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>分配给: {task.assigned_to_name}</span>
                            <span>创建: {formatTime(task.created_at)}</span>
                            {task.due_date && (
                              <span>
                                截止:{' '}
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {task.progress > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>进度</span>
                                <span>{task.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 通知和快捷操作 */}
        <div className="space-y-6">
          {/* 通知 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">通知</h3>
                <span className="text-sm text-gray-500">
                  {notifications.filter(n => !n.read).length} 未读
                </span>
              </div>
            </div>
            <div className="p-6">
              {notifications.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <i className="ri-notification-line text-3xl mb-2"></i>
                  <p>暂无通知</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map(notification => (
                    <div
                      key={notification.notification_id}
                      className={`p-3 rounded-lg border ${
                        notification.read
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <i
                          className={`${getNotificationIcon(notification.type)} text-lg ${
                            notification.type === 'error'
                              ? 'text-red-500'
                              : notification.type === 'warning'
                                ? 'text-yellow-500'
                                : notification.type === 'success'
                                  ? 'text-green-500'
                                  : 'text-blue-500'
                          }`}
                        ></i>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.created_at)}
                            </span>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">快捷操作</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {quickActions.slice(0, 4).map(action => (
                  <button
                    key={action.action_id}
                    className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => (window.location.href = action.url)}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <i className={`${action.icon} text-lg text-blue-600`}></i>
                      <span className="text-sm font-medium text-gray-900">
                        {action.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {action.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 系统指标 */}
      {systemMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">CPU使用率</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemMetrics.cpu_usage}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">内存使用率</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemMetrics.memory_usage}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">磁盘使用率</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemMetrics.disk_usage}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">数据库连接</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemMetrics.database_connections}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">活跃会话</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemMetrics.active_sessions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">响应时间</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemMetrics.api_response_time}s
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">错误率</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemMetrics.error_rate}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">运行时间</p>
              <p className="text-sm font-semibold text-gray-900">
                {systemMetrics.uptime}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverviewComponent;
