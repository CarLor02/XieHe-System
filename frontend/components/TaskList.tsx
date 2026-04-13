'use client';

import { apiClient } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Task {
  id: number;
  patient_name: string;
  patient_id: string;
  study_type: string;
  created_at: string;
  priority: 'high' | 'normal';
  status: string;
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
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

      const response = await apiClient.get(
        '/api/v1/image-files/?status=pending&page=1&page_size=20'
      );

      // 转换API数据为Task格式
      const items = response.data.items || [];
      const taskData: Task[] = items.map((item: any) => ({
        id: item.id,
        patient_name: item.patient_name || '未知患者',
        patient_id: item.patient_id || '',
        study_type: item.modality || '未知类型',
        created_at: item.created_at,
        priority: Math.random() > 0.5 ? 'high' : 'normal', // 临时随机分配优先级
        status: item.status || 'pending',
      }));

      setTasks(taskData);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError('加载任务失败');
      // 使用备用数据
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // 过滤今日任务
  const filteredTasks = filterMode === 'today'
    ? tasks.filter(task => {
        const taskDate = new Date(task.created_at);
        const today = new Date();
        return taskDate.toDateString() === today.toDateString();
      })
    : tasks;

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const displayedTasks = filteredTasks.slice(startIndex, startIndex + tasksPerPage);

  // 根据任务生成对应的影像ID
  const getImageIdForTask = (task: Task) => {
    // 使用任务ID作为影像ID的基础，生成对应的影像标识
    return `IMG${task.id.toString().padStart(3, '0')}`;
  };

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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">待处理任务</h3>
        <div className="flex items-center space-x-3">
          {/* 切换按钮 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setFilterMode('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs rounded transition-colors ${
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
              className={`px-3 py-1 text-xs rounded transition-colors ${
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
            {filteredTasks.filter((task: Task) => task.priority === 'high').length} 紧急
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {displayedTasks.map(task => (
          <div
            key={task.id}
            className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {task.priority === 'high' && (
                  <span className="text-red-500 text-sm">🔥</span>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {task.patient_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    患者ID: {task.patient_id}
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap">
                  {task.study_type}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {new Date(task.created_at).toLocaleString('zh-CN')}
                </p>
                <Link
                  href={`/imaging/viewer?id=${getImageIdForTask(task)}`}
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
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示 {startIndex + 1}-
            {Math.min(startIndex + tasksPerPage, filteredTasks.length)} 条，共{' '}
            {filteredTasks.length} 条
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              上一页
            </button>

            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded text-sm ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              下一页
            </button>
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
