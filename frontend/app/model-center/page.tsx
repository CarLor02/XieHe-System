'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import UserSettings from '@/components/UserSettings';
import { useState } from 'react';
import ModelCard from './ModelCard';

export default function ModelCenter() {
  const [showUserSettings, setShowUserSettings] = useState(false);

  const models = [
    {
      id: 'preop-prediction',
      title: '术前X线预测术后X线模型',
      description:
        '基于深度学习算法，通过分析术前X线影像，预测手术后的X线影像结果，帮助医生制定更精准的手术方案。',
      icon: 'ri-surgical-mask-line',
      status: '运行中',
      accuracy: '94.2%',
      lastUpdated: '2024-03-15',
      category: '预测模型',
    },
    {
      id: 'brace-effectiveness',
      title: '支具有效性预测模型',
      description:
        '智能分析患者脊柱状况和支具参数，预测支具治疗的有效性，为支具选择和调整提供科学依据。',
      icon: 'ri-shield-check-line',
      status: '运行中',
      accuracy: '91.8%',
      lastUpdated: '2024-03-12',
      category: '治疗评估',
    },
    {
      id: 'smart-annotation',
      title: '智能标注测量模型',
      description:
        '自动识别和标注X线影像中的关键解剖结构，精确测量各项脊柱参数，提高诊断效率和准确性。',
      icon: 'ri-ruler-line',
      status: '运行中',
      accuracy: '96.5%',
      lastUpdated: '2024-03-18',
      category: '辅助诊断',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">模型中心</h1>
              <p className="text-gray-600 mt-1">智能AI模型助力精准医疗诊断</p>
            </div>

            <div className="flex space-x-3">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap">
                <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
                <span>添加模型</span>
              </button>
            </div>
          </div>

          {/* 统计概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">总模型数</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-cpu-line text-blue-600 w-6 h-6 flex items-center justify-center"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">运行中模型</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-play-circle-line text-green-600 w-6 h-6 flex items-center justify-center"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">平均性能</p>
                  <p className="text-2xl font-bold text-gray-900">优秀</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="ri-medal-line text-purple-600 w-6 h-6 flex items-center justify-center"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">今日调用</p>
                  <p className="text-2xl font-bold text-gray-900">156</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="ri-api-line text-orange-600 w-6 h-6 flex items-center justify-center"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 模型列表 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">可用模型</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {models.map(model => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-cpu-line text-blue-600 w-4 h-4 flex items-center justify-center"></i>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">
                  智能标注测量模型已更新
                </p>
                <p className="text-gray-600 text-sm">更新至版本 v2.1.3</p>
                <p className="text-gray-400 text-xs mt-1">2024-03-18 14:30</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-check-line text-green-600 w-4 h-4 flex items-center justify-center"></i>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">
                  术前预测模型训练完成
                </p>
                <p className="text-gray-600 text-sm">新版本已部署到生产环境</p>
                <p className="text-gray-400 text-xs mt-1">2024-03-15 09:15</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-shield-check-line text-orange-600 w-4 h-4 flex items-center justify-center"></i>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">支具有效性模型优化</p>
                <p className="text-gray-600 text-sm">处理速度提升30%</p>
                <p className="text-gray-400 text-xs mt-1">2024-03-12 16:45</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 用户设置弹窗 */}
      <UserSettings
        isOpen={showUserSettings}
        onClose={() => setShowUserSettings(false)}
        type="profile"
      />
    </div>
  );
}
