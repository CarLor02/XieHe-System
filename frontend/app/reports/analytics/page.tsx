'use client';

import Header from '@/components/Header';
import ReportAnalytics from '@/components/reports/ReportAnalytics';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import React, { useState } from 'react';

const ReportAnalyticsPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  // 处理导出
  const handleExport = async (format: string) => {
    try {
      setIsExporting(true);

      // 模拟导出API调用
      console.log(`开始导出${format.toUpperCase()}格式的统计报告...`);

      // 模拟导出延迟
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 模拟下载
      const fileName = `report_analytics_${new Date().toISOString().split('T')[0]}.${format}`;
      console.log(`导出完成: ${fileName}`);

      // 显示成功消息
      alert(`统计报告已成功导出为${format.toUpperCase()}格式！`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  报告统计分析
                </h1>
                <p className="text-gray-600 mt-1">全面的报告数据统计与分析</p>
              </div>

              <div className="flex items-center space-x-4">
                {/* 刷新按钮 */}
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  disabled={isExporting}
                >
                  <i className="ri-refresh-line mr-2"></i>
                  刷新数据
                </Button>

                {/* 设置按钮 */}
                <Button
                  variant="outline"
                  onClick={() => alert('统计设置功能开发中...')}
                  disabled={isExporting}
                >
                  <i className="ri-settings-line mr-2"></i>
                  设置
                </Button>
              </div>
            </div>
          </div>

          {/* 导出状态提示 */}
          {isExporting && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <div>
                  <p className="text-blue-800 font-medium">
                    正在导出统计报告...
                  </p>
                  <p className="text-blue-600 text-sm">
                    请稍候，导出完成后将自动下载
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 统计分析组件 */}
          <ReportAnalytics onExport={handleExport} />

          {/* 底部信息 */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
                  <i className="ri-bar-chart-line text-xl text-blue-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  实时数据
                </h3>
                <p className="text-gray-600 text-sm">
                  所有统计数据均为实时更新，确保数据的准确性和时效性
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
                  <i className="ri-download-line text-xl text-green-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  多格式导出
                </h3>
                <p className="text-gray-600 text-sm">
                  支持Excel、PDF等多种格式导出，满足不同的报告需求
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
                  <i className="ri-shield-check-line text-xl text-purple-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  数据安全
                </h3>
                <p className="text-gray-600 text-sm">
                  严格的权限控制和数据加密，确保统计数据的安全性
                </p>
              </div>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              使用说明
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">📊 统计功能</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 报告数量统计和完成率分析</li>
                  <li>• 医生工作量和效率评估</li>
                  <li>• 患者分布和就诊频次分析</li>
                  <li>• 时间趋势和性能指标监控</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">⚙️ 操作指南</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 选择时间范围查看不同周期的数据</li>
                  <li>• 切换标签页查看不同维度的分析</li>
                  <li>• 使用导出功能生成统计报告</li>
                  <li>• 定期刷新数据获取最新统计信息</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportAnalyticsPage;
