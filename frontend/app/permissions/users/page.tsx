'use client';

import { createAuthenticatedClient } from '@/store/authStore';
import { useEffect, useState } from 'react';

interface UserPermission {
  user_id: string;
  username: string;
  direct_permissions: any[];
  role_permissions: any[];
  group_permissions: any[];
  effective_permissions: any[];
  roles: any[];
  groups: any[];
  last_updated: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: string[];
}

export default function UserPermissionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const client = createAuthenticatedClient();
      // 模拟用户数据，因为用户API还在开发中
      const mockUsers: User[] = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@xiehe.com',
          full_name: '系统管理员',
          is_active: true,
          roles: ['admin'],
        },
        {
          id: 2,
          username: 'doctor1',
          email: 'doctor1@xiehe.com',
          full_name: '张医生',
          is_active: true,
          roles: ['doctor', 'radiologist'],
        },
        {
          id: 3,
          username: 'nurse1',
          email: 'nurse1@xiehe.com',
          full_name: '李护士',
          is_active: true,
          roles: ['nurse'],
        },
      ];
      setUsers(mockUsers);
      setError(null);
    } catch (err: any) {
      console.error('获取用户列表失败:', err);
      setError(err.response?.data?.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: number) => {
    try {
      setPermissionsLoading(true);
      const client = createAuthenticatedClient();
      const response = await client.get(
        `/api/v1/permissions/users/${userId}/permissions`
      );
      setUserPermissions(response.data);
    } catch (err: any) {
      console.error('获取用户权限失败:', err);
      setError(err.response?.data?.message || '获取用户权限失败');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    fetchUserPermissions(user.id);
  };

  const filteredUsers = users.filter(
    user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">用户权限管理</h1>
          <p className="mt-2 text-gray-600">查看和管理用户的权限分配</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              重试
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 用户列表 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">用户列表</h2>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="搜索用户..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedUser?.id === user.id
                      ? 'bg-blue-50 border-blue-200'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.username}
                      </div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? '活跃' : '禁用'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {user.roles.length} 个角色
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 权限详情 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            {selectedUser ? (
              <div>
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    {selectedUser.full_name} 的权限详情
                  </h2>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>

                {permissionsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">加载权限信息中...</p>
                  </div>
                ) : userPermissions ? (
                  <div className="p-4 space-y-6">
                    {/* 角色信息 */}
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-3">
                        分配的角色
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {userPermissions.roles.map((role, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {role.name || `角色 ${index + 1}`}
                          </span>
                        ))}
                        {userPermissions.roles.length === 0 && (
                          <span className="text-gray-500 text-sm">
                            暂无分配角色
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 用户组信息 */}
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-3">
                        所属用户组
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {userPermissions.groups.map((group, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                          >
                            {group.name || `用户组 ${index + 1}`}
                          </span>
                        ))}
                        {userPermissions.groups.length === 0 && (
                          <span className="text-gray-500 text-sm">
                            暂无所属用户组
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 有效权限 */}
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-3">
                        有效权限 ({userPermissions.effective_permissions.length}
                        )
                      </h3>
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                        {userPermissions.effective_permissions.map(
                          (permission, index) => (
                            <div
                              key={index}
                              className="p-3 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name || `权限 ${index + 1}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.code || `permission_${index + 1}`}
                              </div>
                              {permission.description && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {permission.description}
                                </div>
                              )}
                            </div>
                          )
                        )}
                        {userPermissions.effective_permissions.length === 0 && (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            暂无有效权限
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 权限统计 */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {userPermissions.direct_permissions.length}
                        </div>
                        <div className="text-sm text-gray-500">直接权限</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {userPermissions.role_permissions.length}
                        </div>
                        <div className="text-sm text-gray-500">角色权限</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {userPermissions.group_permissions.length}
                        </div>
                        <div className="text-sm text-gray-500">组权限</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    点击用户查看权限详情
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                请从左侧选择一个用户查看权限详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
