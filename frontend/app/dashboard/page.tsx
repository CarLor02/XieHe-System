'use client';

import DashboardOverview from '@/components/dashboard/DashboardOverview';
import RealtimeDashboard from '@/components/dashboard/RealtimeDashboard';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import React, { useEffect, useState } from 'react';

const DashboardPage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');

  // 更新时间和问候语
  const updateTimeAndGreeting = () => {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setCurrentTime(timeString);

    const hour = now.getHours();
    if (hour < 6) {
      setGreeting('夜深了，注意休息');
    } else if (hour < 12) {
      setGreeting('早上好');
    } else if (hour < 14) {
      setGreeting('中午好');
    } else if (hour < 18) {
      setGreeting('下午好');
    } else {
      setGreeting('晚上好');
    }
  };

  // 处理刷新
  const handleRefresh = () => {
    updateTimeAndGreeting();
    // 这里可以添加其他刷新逻辑
  };

  useEffect(() => {
    updateTimeAndGreeting();
    const timer = setInterval(updateTimeAndGreeting, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题和欢迎信息 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {greeting}，欢迎使用协和医疗影像诊断系统
                </h1>
                <p className="text-gray-600 mt-1">当前时间：{currentTime}</p>
              </div>

              <div className="flex items-center space-x-4">
                {/* 系统状态指示器 */}
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">系统正常运行</span>
                </div>

                {/* 快捷导航 */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (window.location.href = '/reports/create')}
                  >
                    <i className="ri-file-add-line mr-2"></i>
                    新建报告
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (window.location.href = '/upload')}
                  >
                    <i className="ri-upload-line mr-2"></i>
                    上传影像
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 实时仪表板组件 */}
          <RealtimeDashboard />

          {/* 传统仪表板概览组件 */}
          <div className="mt-8">
            <DashboardOverview onRefresh={handleRefresh} />
          </div>

          {/* 底部信息 */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
                  <i className="ri-shield-check-line text-xl text-blue-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  安全可靠
                </h3>
                <p className="text-gray-600 text-sm">
                  采用先进的安全技术，确保医疗数据的安全性和隐私保护
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
                  <i className="ri-speed-line text-xl text-green-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  高效处理
                </h3>
                <p className="text-gray-600 text-sm">
                  智能化的工作流程，大幅提升医疗影像诊断的效率和准确性
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
                  <i className="ri-team-line text-xl text-purple-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  协作便捷
                </h3>
                <p className="text-gray-600 text-sm">
                  支持多用户协作，实现医疗团队之间的高效沟通和协作
                </p>
              </div>
            </div>
          </div>

          {/* 使用提示 */}
          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              💡 使用提示
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-900 mb-2">🚀 快速开始</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 点击"上传影像"开始上传医学影像文件</li>
                  <li>• 使用"新建报告"创建诊断报告</li>
                  <li>• 在"患者管理"中管理患者信息</li>
                  <li>• 通过"审核报告"进行报告审核</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-blue-900 mb-2">📊 数据分析</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 查看"统计分析"了解系统使用情况</li>
                  <li>• 监控系统性能和用户活动</li>
                  <li>• 导出统计报告进行深度分析</li>
                  <li>• 设置通知提醒重要事件</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 版本信息 */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>协和医疗影像诊断系统 v1.0.0 | 技术支持：AI Assistant</p>
            <p className="mt-1">如有问题或建议，请联系系统管理员</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
