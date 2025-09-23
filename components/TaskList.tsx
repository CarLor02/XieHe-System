
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Task {
  id: string;
  patientName: string;
  patientId: string;
  type: string;
  uploadTime: string;
  priority: 'high' | 'normal';
}

const mockTasks: Task[] = [
  {
    id: '1',
    patientName: '李明',
    patientId: 'P202401001',
    type: '正位X光片',
    uploadTime: '2024-01-15 14:30',
    priority: 'high',
  },
  {
    id: '2',
    patientName: '王芳',
    patientId: 'P202401002',
    type: '侧位X光片',
    uploadTime: '2024-01-15 13:45',
    priority: 'high',
  },
  {
    id: '3',
    patientName: '张伟',
    patientId: 'P202401003',
    type: '左侧曲位',
    uploadTime: '2024-01-15 12:20',
    priority: 'normal',
  },
  {
    id: '4',
    patientName: '赵敏',
    patientId: 'P202401004',
    type: '右侧曲位',
    uploadTime: '2024-01-15 11:15',
    priority: 'normal',
  },
  {
    id: '5',
    patientName: '刘涛',
    patientId: 'P202401005',
    type: '正位X光片',
    uploadTime: '2024-01-15 10:30',
    priority: 'high',
  },
  {
    id: '6',
    patientName: '陈雪',
    patientId: 'P202401006',
    type: '体态照片',
    uploadTime: '2024-01-15 09:45',
    priority: 'normal',
  },
  {
    id: '7',
    patientName: '黄强',
    patientId: 'P202401007',
    type: '侧位X光片',
    uploadTime: '2024-01-15 09:20',
    priority: 'normal',
  },
  {
    id: '8',
    patientName: '吴丽',
    patientId: 'P202401008',
    type: '左侧曲位',
    uploadTime: '2024-01-15 08:15',
    priority: 'high',
  },
  {
    id: '9',
    patientName: '郑华',
    patientId: 'P202401009',
    type: '右侧曲位',
    uploadTime: '2024-01-14 17:30',
    priority: 'normal',
  },
  {
    id: '10',
    patientName: '孙鹏',
    patientId: 'P202401010',
    type: '正位X光片',
    uploadTime: '2024-01-14 16:45',
    priority: 'normal',
  },
];

export default function TaskList() {
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 5;

  const totalPages = Math.ceil(mockTasks.length / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const displayedTasks = mockTasks.slice(startIndex, startIndex + tasksPerPage);

  // 根据任务生成对应的影像ID
  const getImageIdForTask = (task: Task) => {
    // 使用任务ID作为影像ID的基础，生成对应的影像标识
    return `IMG${task.id.padStart(3, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">待处理任务</h3>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            共 {mockTasks.length} 个任务
          </span>
          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
            {mockTasks.filter(task => task.priority === 'high').length} 紧急
          </span>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {displayedTasks.map((task) => (
          <div key={task.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {task.priority === 'high' && (
                  <span className="text-red-500 text-sm">🔥</span>
                )}
                <div>
                  <p className="font-medium text-gray-900">{task.patientName}</p>
                  <p className="text-sm text-gray-500">患者ID: {task.patientId}</p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap">
                  {task.type}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-500">{task.uploadTime}</p>
                <Link
                  href={`/imaging/${getImageIdForTask(task)}/viewer`}
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
            显示 {startIndex + 1}-{Math.min(startIndex + tasksPerPage, mockTasks.length)} 条，共 {mockTasks.length} 条
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
