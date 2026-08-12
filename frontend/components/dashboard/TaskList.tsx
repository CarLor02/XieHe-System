'use client';

import { getDashboardPendingTasks, type DashboardPendingTask } from '@/services/dashboardServices';
import { createLogger } from '@/lib/logger';
import PaginationControls from '@/components/common/PaginationControls';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { paginateDashboardTasks } from '@xiehe/dashboard-core';

const logger = createLogger('components.dashboard.task-list');

export default function TaskList() {
  const [tasks, setTasks] = useState<DashboardPendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMode, setFilterMode] = useState<'today' | 'all'>('all');
  const tasksPerPage = 5;

  // 加载任务数据
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const taskData = await getDashboardPendingTasks();
      setTasks(taskData);
    } catch (err: any) {
      logger.error('Failed to load tasks:', err);
      setError('加载任务失败');
      // 使用备用数据
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCurrent = true;

    getDashboardPendingTasks()
      .then(taskData => {
        if (isCurrent) setTasks(taskData);
      })
      .catch(err => {
        if (!isCurrent) return;
        logger.error('Failed to load tasks:', err);
        setError('加载任务失败');
        setTasks([]);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const taskPage = paginateDashboardTasks({
    tasks,
    filter: filterMode,
    requestedPage: currentPage,
    pageSize: tasksPerPage,
    now: new Date(),
  });
  const {
    filteredTasks,
    displayedTasks,
    totalPages,
    currentPage: visiblePage,
    startIndex,
    highPriorityCount,
  } = taskPage;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={loadTasks}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex flex-col gap-3 px-4 py-4 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h3 className="text-lg font-semibold text-gray-900">待处理任务</h3>
        <div className="flex flex-wrap items-center gap-3">
          {/* 切换按钮 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setFilterMode('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              全部任务
            </button>
            <button
              onClick={() => {
                setFilterMode('today');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                filterMode === 'today'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              今日任务
            </button>
          </div>
          <span className="text-sm text-gray-500">
            共 {filteredTasks.length} 个任务
          </span>
          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
            {highPriorityCount} 紧急
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {displayedTasks.map(task => (
          <div
            key={task.id}
            className="px-4 py-4 hover:bg-gray-50 cursor-pointer sm:px-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {task.priority === 'high' && (
                  <span className="text-red-500 text-sm flex-shrink-0">🔥</span>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {task.patient_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    患者ID: {task.patient_id}
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap flex-shrink-0">
                  {task.study_type}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-500">
                  {new Date(task.created_at).toLocaleString('zh-CN')}
                </p>
                <Link
                  href={`/imaging/viewer?id=${task.id}`}
                  className="mt-1 bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 whitespace-nowrap inline-block"
                >
                  开始审核
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页控制 */}
      <div className="px-4 py-4 border-t border-gray-200 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500">
            显示 {filteredTasks.length === 0 ? 0 : startIndex + 1}-
            {Math.min(startIndex + tasksPerPage, filteredTasks.length)} 条，共{' '}
            {filteredTasks.length} 条
          </div>

          <div className="max-w-full overflow-x-auto">
            <PaginationControls
              currentPage={visiblePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageInputLabel="待处理任务页码"
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <Link
            href="/imaging"
            className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap block"
          >
            查看全部任务
          </Link>
        </div>
      </div>
    </div>
  );
}
