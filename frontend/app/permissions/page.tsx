'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// import DataPermissions from './DataPermissions'; // 暂时隐藏
import TeamManagement from './TeamManagement';

export default function PermissionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useUser();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">权限管理</h1>
              <p className="text-gray-600 mt-1">管理团队成员和权限设置</p>
            </div>
          </div>

          {/* 团队管理内容 */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="p-6">
              <TeamManagement />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
