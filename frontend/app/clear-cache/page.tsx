'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ClearCachePage() {
  const [cleared, setCleared] = useState(false);
  const router = useRouter();
  const { forceLogout } = useAuthStore();

  useEffect(() => {
    // 清除所有缓存
    const clearAll = () => {
      try {
        // 1. 清除 localStorage
        localStorage.clear();
        
        // 2. 清除 sessionStorage
        sessionStorage.clear();
        
        // 3. 强制退出登录
        forceLogout();
        
        setCleared(true);
        
        // 3秒后跳转到登录页
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } catch (error) {
        console.error('清除缓存失败:', error);
      }
    };

    clearAll();
  }, [forceLogout, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {cleared ? (
          <>
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">缓存已清除</h1>
            <p className="text-gray-600 mb-4">
              所有缓存数据已清除，正在跳转到登录页...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900">正在清除缓存...</h1>
          </>
        )}
      </div>
    </div>
  );
}

