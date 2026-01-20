'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import StatsCard from '@/components/StatsCard';
import TaskList from '@/components/TaskList';
import { createAuthenticatedClient, useUser } from '@/store/authStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DashboardOverview {
  total_patients: number;
  new_patients_today: number;
  new_patients_week: number;
  active_patients: number;
  total_images: number;
  images_today: number;
  images_week: number;
  pending_images: number;
  processed_images: number;
  completion_rate: number;
  average_processing_time: number;
  system_alerts: number;
  generated_at: string;
}

// API调用函数
const fetchDashboardOverview = async (): Promise<DashboardOverview> => {
  try {
    const client = createAuthenticatedClient();
    const response = await client.get('/api/v1/dashboard/stats');
    const data = response.data;

    console.log('工作台收到的 API 数据:', data);

    // 直接使用 API 返回的数据（字段名已匹配）
    return {
      total_patients: data.total_patients || 0,
      new_patients_today: data.new_patients_today || 0,
      new_patients_week: data.new_patients_week || 0,
      active_patients: data.active_patients || 0,
      total_images: data.total_images || 0,
      images_today: data.images_today || 0,
      images_week: data.images_week || 0,
      pending_images: data.pending_images || 0,
      processed_images: data.processed_images || 0,
      completion_rate: data.completion_rate || 0,
      average_processing_time: data.average_processing_time || 0,
      system_alerts: data.system_alerts || 0,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('获取仪表板数据错误:', error);
    throw error;
  }
};

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useUser();
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 认证检查
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [mounted, isAuthenticated, router]);

  // 加载仪表板数据
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardOverview();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载仪表板数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadDashboardData();
    }
  }, [mounted, isAuthenticated]);

  // 如果组件未挂载，显示加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  // 如果未认证，显示加载状态
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  // 根据API数据生成统计卡片数据
  const statsData = dashboardData
    ? [
      {
        title: '累计患者',
        value: dashboardData.total_patients,
        change:
          dashboardData.new_patients_week > 0
            ? (dashboardData.new_patients_week /
              Math.max(
                dashboardData.total_patients -
                dashboardData.new_patients_week,
                1
              )) *
            100
            : 0,
        icon: 'ri-user-line',
        color: 'blue' as const,
        href: '/patients', // 添加链接到患者页面
      },
      {
        title: '待处理影像',
        value: dashboardData.pending_images,
        change:
          dashboardData.images_today > 0
            ? (dashboardData.images_today /
              Math.max(
                dashboardData.total_images - dashboardData.images_today,
                1
              )) *
            100
            : 0,
        icon: 'ri-image-line',
        color: 'orange' as const,
        href: '/imaging?status=pending', // 添加链接到待审核影像
      },
      {
        title: '已完成影像',
        value: dashboardData.processed_images,
        change: dashboardData.completion_rate - 50, // 相对于50%基准的变化
        icon: 'ri-check-line',
        color: 'green' as const,
        href: '/imaging?review_status=reviewed', // 添加链接到已审核影像
      },
      {
        title: '累计影像',
        value: dashboardData.total_images,
        change:
          dashboardData.images_week > 0
            ? (dashboardData.images_week /
              Math.max(
                dashboardData.total_images - dashboardData.images_week,
                1
              )) *
            100
            : 0,
        icon: 'ri-gallery-line',
        color: 'purple' as const,
        href: '/imaging', // 添加链接到影像中心页面
      },
    ]
    : [];

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
                {loading
                  ? '加载中...'
                  : error
                    ? '数据加载失败'
                    : `欢迎回来，今天有 ${dashboardData?.pending_images || 0} 个影像等待处理`}
              </p>
            </div>

            <div className="flex space-x-3">
              <Link
                href="/upload"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                上传影像
              </Link>
              <Link
                href="/patients"
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap"
              >
                新增患者
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {loading ? (
              // 加载状态
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))
            ) : error ? (
              // 错误状态
              <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600 mb-2">{error}</p>
                <button
                  onClick={loadDashboardData}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  重试
                </button>
              </div>
            ) : (
              // 正常状态
              statsData.map((stat, index) => (
                <StatsCard key={index} {...stat} />
              ))
            )}
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
                  <span className="text-gray-600">今日新增患者</span>
                  <span className="font-semibold text-gray-900">
                    {dashboardData?.new_patients_today || 0}人
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">今日上传影像</span>
                  <span className="font-semibold text-gray-900">
                    {dashboardData?.images_today || 0}份
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">待处理影像</span>
                  <span className="font-semibold text-gray-900">
                    {dashboardData?.pending_images || 0}份
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">完成率</span>
                  <span className="font-semibold text-gray-900">
                    {dashboardData?.completion_rate || 0}%
                  </span>
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
};

export default DashboardPage;
