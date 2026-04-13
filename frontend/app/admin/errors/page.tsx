/**
 * 错误监控仪表板页面
 *
 * 提供系统错误监控和统计功能
 *
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { authenticatedJsonFetch } from '@/lib/api';
import React, { useEffect, useState } from 'react';

// 错误统计数据接口
interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: Array<{
    id: string;
    message: string;
    type: string;
    severity: string;
    timestamp: string;
    url: string;
    userId?: string;
  }>;
  timeRange: string;
}

const ErrorMonitoringPage: React.FC = () => {
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // 默认24小时
  const { handleApiError } = useErrorHandler();

  // 加载错误统计数据
  const loadErrorStats = async () => {
    setIsLoading(true);
    try {
      const data = await authenticatedJsonFetch<ErrorStats>(
        `/api/v1/errors/stats?hours=${timeRange}`
      );
      setErrorStats(data);
    } catch (error) {
      handleApiError(error, 'load_error_stats');
    } finally {
      setIsLoading(false);
    }
  };

  // 清空错误日志
  const clearErrorLogs = async () => {
    if (!confirm('确定要清空所有错误日志吗？此操作不可撤销。')) {
      return;
    }

    try {
      const result = await authenticatedJsonFetch<{ message?: string }>(
        '/api/v1/errors/clear',
        { method: 'DELETE' }
      );
      alert(result.message);
      loadErrorStats(); // 重新加载数据
    } catch (error) {
      handleApiError(error, 'clear_error_logs');
    }
  };

  useEffect(() => {
    loadErrorStats();
  }, [timeRange]);

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-red-500 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // 获取错误类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'network':
        return 'text-blue-600 bg-blue-100';
      case 'authentication':
        return 'text-purple-600 bg-purple-100';
      case 'validation':
        return 'text-orange-600 bg-orange-100';
      case 'server':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <main className="ml-64 pt-16 p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">加载错误统计数据中...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 pt-16 p-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">错误监控</h1>
              <p className="text-gray-600 mt-1">系统错误统计和监控</p>
            </div>

            <div className="flex items-center space-x-4">
              {/* 时间范围选择 */}
              <select
                value={timeRange}
                onChange={e => setTimeRange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>最近1小时</option>
                <option value={6}>最近6小时</option>
                <option value={24}>最近24小时</option>
                <option value={72}>最近3天</option>
                <option value={168}>最近7天</option>
              </select>

              <button
                onClick={loadErrorStats}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                刷新
              </button>

              <button
                onClick={clearErrorLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                清空日志
              </button>
            </div>
          </div>
        </div>

        {errorStats && (
          <div className="space-y-6">
            {/* 统计概览 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                      <span className="text-red-600 text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        总错误数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {errorStats.totalErrors}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">🔥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        严重错误
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {(errorStats.errorsBySeverity.critical || 0) +
                          (errorStats.errorsBySeverity.high || 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <span className="text-blue-600 text-lg">🌐</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        网络错误
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {errorStats.errorsByType.network || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <span className="text-green-600 text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        统计时间
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {errorStats.timeRange}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 错误分类统计 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 按类型分组 */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    错误类型分布
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {Object.entries(errorStats.errorsByType).map(
                      ([type, count]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(type)}`}
                            >
                              {type}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* 按严重程度分组 */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    错误严重程度分布
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {Object.entries(errorStats.errorsBySeverity).map(
                      ([severity, count]) => (
                        <div
                          key={severity}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(severity)}`}
                            >
                              {severity}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 最近错误列表 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">最近错误</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        错误信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        类型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        严重程度
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {errorStats.recentErrors.map(error => (
                      <tr key={error.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className="text-sm text-gray-900 max-w-xs truncate"
                            title={error.message}
                          >
                            {error.message}
                          </div>
                          <div
                            className="text-xs text-gray-500 max-w-xs truncate"
                            title={error.url}
                          >
                            {error.url}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(error.type)}`}
                          >
                            {error.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(error.severity)}`}
                          >
                            {error.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(error.timestamp).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {error.userId || '匿名'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {errorStats.recentErrors.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">暂无错误记录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ErrorMonitoringPage;
