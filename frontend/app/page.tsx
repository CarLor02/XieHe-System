'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { createAuthenticatedClient, useUser } from '@/store/authStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(
    null
  );
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取仪表板数据
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 如果用户已登录，使用认证客户端；否则使用普通客户端
      let dashboardResult;
      if (isAuthenticated) {
        const client = createAuthenticatedClient();
        const dashboardResponse = await client.get('/api/v1/dashboard/stats');
        dashboardResult = dashboardResponse.data;
      } else {
        // 未登录用户显示默认数据
        dashboardResult = {
          total_reports: 0,
          pending_analysis: 0,
          total_patients: 0,
          today_processed: 0,
          average_processing_time: 0,
        };
      }

      // 转换数据格式
      const overview: DashboardOverview = {
        total_reports: dashboardResult.total_reports || 0,
        pending_reports: dashboardResult.pending_analysis || 0,
        completed_reports:
          (dashboardResult.total_reports || 0) -
          (dashboardResult.pending_analysis || 0),
        overdue_reports: 0,
        total_patients: dashboardResult.total_patients || 0,
        new_patients_today: dashboardResult.today_processed || 0,
        active_users: 1,
        system_alerts: 0,
        completion_rate: Math.round(
          (((dashboardResult.total_reports || 0) -
            (dashboardResult.pending_analysis || 0)) /
            (dashboardResult.total_reports || 1)) *
          100
        ),
        average_processing_time: dashboardResult.average_processing_time || 0,
      };

      setDashboardData(overview);

      // 获取最近任务（仅在已登录时）
      if (isAuthenticated) {
        try {
          const client = createAuthenticatedClient();
          const tasksResponse = await client.get(
            '/api/v1/studies/?status=pending&page=1&page_size=5'
          );
          const tasksData = tasksResponse.data;

          if (tasksData && tasksData.studies) {
            const tasks: TaskItem[] = tasksData.studies.map(
              (study: any, index: number) => ({
                task_id: `TASK_${study.id || index}`,
                title: `处理${study.modality || 'X线'}影像`,
                description: `患者: ${study.patient_name || '未知'} - ${study.study_description || '影像检查'}`,
                status: 'pending' as const,
                priority: 'normal' as const,
                created_at: study.created_at || new Date().toISOString(),
                progress: 0,
                tags: [study.modality || 'X线', '待处理'],
                estimated_hours: 1.0,
              })
            );
            setRecentTasks(tasks);
          }
        } catch (taskError) {
          console.warn('获取任务数据失败:', taskError);
          setRecentTasks([]);
        }
      } else {
        // 未登录用户不显示任务
        setRecentTasks([]);
      }
    } catch (err: any) {
      console.error('获取仪表板数据失败:', err);
      setError(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 认证检查 - 简化逻辑，允许未登录用户访问主页
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      // 不强制重定向，允许访客查看主页
      console.log('用户未登录，显示访客模式');
    }
  }, [mounted, isAuthenticated, router]);

  // 加载数据
  useEffect(() => {
    if (mounted) {
      // 无论是否登录都尝试加载数据
      fetchDashboardData();
    }
  }, [mounted]);

  // 如果组件未挂载，显示加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-8">
        {/* Hero Banner - 参考设计图的渐变横幅 */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 rounded-2xl p-10 text-white overflow-hidden">
            {/* 装饰性波浪背景 */}
            <div className="absolute inset-0 opacity-20">
              <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,0 C150,100 350,0 600,50 C850,100 1050,0 1200,50 L1200,120 L0,120 Z" fill="currentColor" />
              </svg>
            </div>

            <div className="relative z-10 max-w-4xl">
              <h1 className="text-4xl font-bold mb-3">
                欢迎使用协和医疗影像诊断系统
              </h1>
              <p className="text-blue-50 text-lg mb-8 leading-relaxed">
                专业的医疗影像管理和AI辅助诊断平台，为医疗工作者提供高效、准确的诊断支持
              </p>
              <div className="flex space-x-4">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 font-medium transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center"
                    >
                      进入工作台
                    </Link>
                    <Link
                      href="/upload"
                      className="bg-blue-500/80 backdrop-blur-sm text-white px-8 py-3 rounded-lg hover:bg-blue-500 font-medium transition-all border border-white/30 inline-flex items-center justify-center"
                    >
                      上传影像
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 font-medium transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center"
                    >
                      立即登录
                    </Link>
                    <Link
                      href="/auth/register"
                      className="bg-blue-500/80 backdrop-blur-sm text-white px-8 py-3 rounded-lg hover:bg-blue-500 font-medium transition-all border border-white/30 inline-flex items-center justify-center"
                    >
                      注册账号
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 系统概览 - 参考设计图的卡片样式 */}
        {loading ? (
          <div className="mb-10">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-xl h-32"></div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="mb-10">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600 mb-3">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        ) : dashboardData ? (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-5">系统概览</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* 总患者数 */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">总患者数</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData.total_patients}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <i className="ri-user-line text-2xl text-blue-600"></i>
                  </div>
                </div>
                <p className="text-xs text-green-600 flex items-center">
                  <i className="ri-arrow-up-line mr-1"></i>
                  今日新增 {dashboardData.new_patients_today}
                </p>
              </div>

              {/* 总报告数 */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">总报告数</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData.total_reports}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <i className="ri-file-list-3-line text-2xl text-green-600"></i>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  完成率 {dashboardData.completion_rate}%
                </p>
              </div>

              {/* 待处理报告 */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">待处理报告</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData.pending_reports}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                    <i className="ri-time-line text-2xl text-orange-600"></i>
                  </div>
                </div>
                <p className="text-xs text-orange-600">需要关注</p>
              </div>

              {/* 已完成报告 */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">已完成报告</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData.completed_reports}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <i className="ri-check-line text-2xl text-purple-600"></i>
                  </div>
                </div>
                <p className="text-xs text-purple-600">质量优秀</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* 最近任务 */}
        {recentTasks.length > 0 && (
          <div className="mb-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">
                    最近任务
                  </h3>
                  <Link
                    href="/dashboard"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    查看全部
                    <i className="ri-arrow-right-line ml-1"></i>
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {recentTasks.slice(0, 3).map(task => (
                    <div
                      key={task.task_id}
                      className="border border-gray-100 rounded-lg p-5 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            {task.title}
                          </h4>
                          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                            {task.description}
                          </p>
                          <div className="flex items-center space-x-2">
                            {task.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                            待处理
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 快捷功能 - 参考设计图的功能卡片 */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-800 mb-5">快捷功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Link
              href="/dashboard"
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
                  <i className="ri-dashboard-line text-2xl text-blue-600"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">工作台</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    查看系统概览和统计
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/patients"
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors flex-shrink-0">
                  <i className="ri-user-line text-2xl text-green-600"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">患者管理</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    管理患者信息和档案
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/imaging"
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors flex-shrink-0">
                  <i className="ri-image-line text-2xl text-purple-600"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">影像中心</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    查看和管理医学影像
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/model-center"
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors flex-shrink-0">
                  <i className="ri-cpu-line text-2xl text-orange-600"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">模型中心</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    AI模型管理和配置
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 系统特性 - 参考设计图的特性展示 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            系统特性
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <i className="ri-shield-check-line text-3xl text-blue-600"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                安全可靠
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                采用先进的安全技术，确保医疗数据的安全性和隐私保护，符合医疗行业标准
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <i className="ri-speed-line text-3xl text-green-600"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                高效处理
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                智能化的工作流程，AI辅助诊断，大幅提升医疗影像诊断的效率和准确性
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <i className="ri-team-line text-3xl text-purple-600"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                协作便捷
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                支持多用户协作，实现医疗团队之间的高效沟通和协作，提升工作效率
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
