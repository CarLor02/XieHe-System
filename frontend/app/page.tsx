'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import StatsCard from '@/components/StatsCard';
import TaskList from '@/components/TaskList';
import Link from 'next/link';

export default function Home() {
  const statsData = [
    {
      title: '累计患者',
      value: 1247,
      change: 8.2,
      icon: 'ri-user-line',
      color: 'blue' as const,
    },
    {
      title: '待处理影像',
      value: 23,
      change: -12.5,
      icon: 'ri-image-line',
      color: 'orange' as const,
    },
    {
      title: '累计影像',
      value: 5648,
      change: 15.3,
      icon: 'ri-gallery-line',
      color: 'green' as const,
    },
    {
      title: '今日诊断',
      value: 89,
      change: 22.1,
      icon: 'ri-stethoscope-line',
      color: 'purple' as const,
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
              <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
              <p className="text-gray-600 mt-1">
                欢迎回来，今天有 {statsData[1].value} 个影像等待您的诊断
              </p>
            </div>

            <div className="flex space-x-3">
              <Link
                href="/upload"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-upload-line w-4 h-4 flex items-center justify-center"></i>
                <span>上传影像</span>
              </Link>
              <Link
                href="/patients"
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-user-add-line w-4 h-4 flex items-center justify-center"></i>
                <span>新增患者</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TaskList />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                今日概况
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">接诊患者</span>
                  <span className="font-semibold text-gray-900">32人</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">下一张</span>
                  <span className="font-semibold text-gray-900">28份</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">平均用时</span>
                  <span className="font-semibold text-gray-900">12分钟</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                快捷操作
              </h3>
              <div className="space-y-3">
                <Link
                  href="/imaging"
                  className="w-full bg-blue-50 text-blue-700 p-3 rounded-lg hover:bg-blue-100 flex items-center space-x-3 cursor-pointer"
                >
                  <i className="ri-image-line w-5 h-5 flex items-center justify-center"></i>
                  <span>进入影像中心</span>
                </Link>
                <Link
                  href="/patients"
                  className="w-full bg-green-50 text-green-700 p-3 rounded-lg hover:bg-green-100 flex items-center space-x-3 cursor-pointer"
                >
                  <i className="ri-user-line w-5 h-5 flex items-center justify-center"></i>
                  <span>患者管理</span>
                </Link>
                <Link
                  href="/model-center"
                  className="w-full bg-purple-50 text-purple-700 p-3 rounded-lg hover:bg-purple-100 flex items-center space-x-3 cursor-pointer"
                >
                  <i className="ri-cpu-line w-5 h-5 flex items-center justify-center"></i>
                  <span>模型中心</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
