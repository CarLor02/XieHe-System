'use client';

import { useUser } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function DebugUserPage() {
  const { user, isAuthenticated } = useUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main className="ml-56 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">用户数据调试</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">认证状态</h2>
            <p className="mb-2">
              <span className="font-medium">isAuthenticated:</span>{' '}
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? 'true' : 'false'}
              </span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">用户数据</h2>
            {user ? (
              <div className="space-y-2">
                <p><span className="font-medium">ID:</span> {user.id}</p>
                <p><span className="font-medium">用户名:</span> {user.username}</p>
                <p><span className="font-medium">邮箱:</span> {user.email}</p>
                <p><span className="font-medium">姓名:</span> {user.full_name}</p>
                <p><span className="font-medium">角色:</span> {user.role}</p>
                <p>
                  <span className="font-medium">is_superuser:</span>{' '}
                  <span className={user.is_superuser ? 'text-green-600 font-bold' : 'text-red-600'}>
                    {user.is_superuser ? 'true ✅' : 'false ❌'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">is_system_admin:</span>{' '}
                  <span className={user.is_system_admin ? 'text-green-600' : 'text-gray-600'}>
                    {user.is_system_admin ? 'true' : 'false'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">system_admin_level:</span> {user.system_admin_level || 0}
                </p>
                <p><span className="font-medium">权限:</span> {user.permissions?.join(', ') || '无'}</p>
              </div>
            ) : (
              <p className="text-gray-500">未登录或无用户数据</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">完整用户对象 (JSON)</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-yellow-800 mb-2">💡 提示</h3>
            <p className="text-sm text-yellow-700">
              如果 is_superuser 显示为 false，请尝试：
            </p>
            <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
              <li>退出登录</li>
              <li>清除浏览器缓存（或打开无痕模式）</li>
              <li>重新登录</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
