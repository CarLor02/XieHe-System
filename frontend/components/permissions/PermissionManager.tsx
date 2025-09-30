'use client';

import { Button } from '@/components/ui/Button';
import { createAuthenticatedClient } from '@/store/authStore';
import React, { useEffect, useState } from 'react';

// 枚举定义
enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

enum ResourceType {
  REPORT = 'report',
  PATIENT = 'patient',
  IMAGE = 'image',
  USER = 'user',
  SYSTEM = 'system',
  ANALYTICS = 'analytics',
}

enum RoleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

// 类型定义
interface Permission {
  permission_id: string;
  name: string;
  code: string;
  description?: string;
  resource_type: ResourceType;
  permission_type: PermissionType;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  usage_count: number;
}

interface Role {
  role_id: string;
  name: string;
  code: string;
  description?: string;
  permissions: Permission[];
  parent_role_id?: string;
  parent_role_name?: string;
  child_roles: string[];
  user_count: number;
  is_system: boolean;
  status: RoleStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface UserGroup {
  group_id: string;
  name: string;
  description?: string;
  roles: Role[];
  users: Array<{
    user_id: string;
    username: string;
    name: string;
    email: string;
    status: string;
  }>;
  user_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface PermissionAuditLog {
  log_id: string;
  action: 'grant' | 'revoke' | 'modify';
  target_type: string;
  target_id: string;
  target_name: string;
  permissions: string[];
  permission_names: string[];
  operator_id: string;
  operator_name: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface PermissionManagerProps {
  onPermissionChange?: (permissions: Permission[]) => void;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({
  onPermissionChange,
}) => {
  const [activeTab, setActiveTab] = useState<
    'permissions' | 'roles' | 'groups' | 'audit'
  >('permissions');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // 获取权限数据
  const fetchPermissions = async () => {
    try {
      const client = createAuthenticatedClient();
      const response = await client.get('/api/v1/permissions/permissions');

      // 转换API数据格式
      const apiPermissions = response.data || [];
      const convertedPermissions: Permission[] = apiPermissions.map((perm: any) => ({
        permission_id: perm.permission_id || `PERM_${perm.id}`,
        name: perm.name,
        code: perm.code,
        description: perm.description || '',
        resource_type: perm.resource_type || ResourceType.SYSTEM,
        permission_type: perm.permission_type || PermissionType.READ,
        is_system: perm.is_system || false,
        created_at: perm.created_at || new Date().toISOString(),
        updated_at: perm.updated_at || new Date().toISOString(),
        created_by: perm.created_by || 'SYSTEM',
        usage_count: perm.usage_count || 0
      }));

      setPermissions(convertedPermissions);
      if (onPermissionChange) {
        onPermissionChange(convertedPermissions);
      }
    } catch (error) {
      console.error('获取权限数据失败:', error);

      // 使用备用数据
      const fallbackPermissions: Permission[] = [
        {
          permission_id: 'PERM_001',
          name: '报告查看',
          code: 'report:read',
          description: '查看医疗报告',
          resource_type: ResourceType.REPORT,
          permission_type: PermissionType.READ,
          is_system: false,
          created_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'SYSTEM',
          usage_count: 245,
        },
        {
          permission_id: 'PERM_002',
          name: '报告创建',
          code: 'report:write',
          description: '创建医疗报告',
          resource_type: ResourceType.REPORT,
          permission_type: PermissionType.WRITE,
          is_system: false,
          created_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'SYSTEM',
          usage_count: 156,
        },
        {
          permission_id: 'PERM_003',
          name: '患者管理',
          code: 'patient:write',
          description: '管理患者信息',
          resource_type: ResourceType.PATIENT,
          permission_type: PermissionType.WRITE,
          is_system: false,
          created_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'SYSTEM',
          usage_count: 189,
        },
        {
          permission_id: 'PERM_004',
          name: '系统管理',
          code: 'system:admin',
          description: '系统管理权限',
          resource_type: ResourceType.SYSTEM,
          permission_type: PermissionType.ADMIN,
          is_system: true,
          created_at: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'SYSTEM',
          usage_count: 45,
        },
      ];

      setPermissions(fallbackPermissions);
      if (onPermissionChange) {
        onPermissionChange(fallbackPermissions);
      }
    }
  };
  };

  // 获取角色数据
  const fetchRoles = async () => {
    try {
      const mockRoles: Role[] = [
        {
          role_id: 'ROLE_001',
          name: '超级管理员',
          code: 'super_admin',
          description: '系统超级管理员',
          permissions: permissions.slice(0, 4),
          user_count: 2,
          is_system: true,
          status: RoleStatus.ACTIVE,
          child_roles: ['ROLE_002'],
          created_at: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'SYSTEM',
        },
        {
          role_id: 'ROLE_002',
          name: '医生',
          code: 'doctor',
          description: '医生角色',
          permissions: permissions.slice(0, 3),
          parent_role_id: 'ROLE_001',
          parent_role_name: '超级管理员',
          user_count: 45,
          is_system: false,
          status: RoleStatus.ACTIVE,
          child_roles: [],
          created_at: new Date(
            Date.now() - 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'ADMIN',
        },
        {
          role_id: 'ROLE_003',
          name: '护士',
          code: 'nurse',
          description: '护士角色',
          permissions: permissions.slice(0, 2),
          user_count: 78,
          is_system: false,
          status: RoleStatus.ACTIVE,
          child_roles: [],
          created_at: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'ADMIN',
        },
      ];

      setRoles(mockRoles);
    } catch (error) {
      console.error('获取角色数据失败:', error);
    }
  };

  // 获取用户组数据
  const fetchUserGroups = async () => {
    try {
      const mockGroups: UserGroup[] = [
        {
          group_id: 'GROUP_001',
          name: '放射科医生组',
          description: '放射科医生用户组',
          roles: roles.slice(1, 2),
          users: [
            {
              user_id: 'USER_001',
              username: 'doctor1',
              name: '张医生',
              email: 'doctor1@hospital.com',
              status: 'active',
            },
            {
              user_id: 'USER_002',
              username: 'doctor2',
              name: '李医生',
              email: 'doctor2@hospital.com',
              status: 'active',
            },
          ],
          user_count: 15,
          created_at: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'ADMIN',
        },
        {
          group_id: 'GROUP_002',
          name: '护理部',
          description: '护理部用户组',
          roles: roles.slice(2, 3),
          users: [
            {
              user_id: 'USER_003',
              username: 'nurse1',
              name: '王护士',
              email: 'nurse1@hospital.com',
              status: 'active',
            },
          ],
          user_count: 25,
          created_at: new Date(
            Date.now() - 8 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: 'ADMIN',
        },
      ];

      setUserGroups(mockGroups);
    } catch (error) {
      console.error('获取用户组数据失败:', error);
    }
  };

  // 获取审计日志
  const fetchAuditLogs = async () => {
    try {
      const mockLogs: PermissionAuditLog[] = [
        {
          log_id: 'AUDIT_001',
          action: 'grant',
          target_type: 'user',
          target_id: 'USER_001',
          target_name: '张医生',
          permissions: ['PERM_001', 'PERM_002'],
          permission_names: ['报告查看', '报告创建'],
          operator_id: 'ADMIN_001',
          operator_name: '系统管理员',
          reason: '新员工入职',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          log_id: 'AUDIT_002',
          action: 'revoke',
          target_type: 'role',
          target_id: 'ROLE_002',
          target_name: '医生',
          permissions: ['PERM_004'],
          permission_names: ['系统管理'],
          operator_id: 'ADMIN_001',
          operator_name: '系统管理员',
          reason: '权限调整',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
      ];

      setAuditLogs(mockLogs);
    } catch (error) {
      console.error('获取审计日志失败:', error);
    }
  };

  // 获取权限类型文本
  const getPermissionTypeText = (type: PermissionType): string => {
    const texts = {
      [PermissionType.READ]: '查看',
      [PermissionType.WRITE]: '编辑',
      [PermissionType.DELETE]: '删除',
      [PermissionType.EXECUTE]: '执行',
      [PermissionType.ADMIN]: '管理',
    };
    return texts[type] || type;
  };

  // 获取资源类型文本
  const getResourceTypeText = (type: ResourceType): string => {
    const texts = {
      [ResourceType.REPORT]: '报告',
      [ResourceType.PATIENT]: '患者',
      [ResourceType.IMAGE]: '影像',
      [ResourceType.USER]: '用户',
      [ResourceType.SYSTEM]: '系统',
      [ResourceType.ANALYTICS]: '分析',
    };
    return texts[type] || type;
  };

  // 获取权限类型颜色
  const getPermissionTypeColor = (type: PermissionType): string => {
    const colors = {
      [PermissionType.READ]: 'bg-blue-100 text-blue-800',
      [PermissionType.WRITE]: 'bg-green-100 text-green-800',
      [PermissionType.DELETE]: 'bg-red-100 text-red-800',
      [PermissionType.EXECUTE]: 'bg-purple-100 text-purple-800',
      [PermissionType.ADMIN]: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // 获取角色状态颜色
  const getRoleStatusColor = (status: RoleStatus): string => {
    const colors = {
      [RoleStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [RoleStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
      [RoleStatus.DEPRECATED]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // 获取操作类型颜色
  const getActionColor = (action: string): string => {
    const colors = {
      grant: 'bg-green-100 text-green-800',
      revoke: 'bg-red-100 text-red-800',
      modify: 'bg-blue-100 text-blue-800',
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // 格式化时间
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 处理选择
  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 处理全选
  const handleSelectAll = (items: any[]) => {
    const allIds = items.map(
      item => item.permission_id || item.role_id || item.group_id || item.log_id
    );
    setSelectedItems(prev => (prev.length === allIds.length ? [] : allIds));
  };

  // 过滤数据
  const filterData = (data: any[], searchFields: string[]) => {
    let filtered = data;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        searchFields.some(field =>
          item[field]?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(item => {
        if (activeTab === 'permissions') {
          return (
            item.resource_type === filterType ||
            item.permission_type === filterType
          );
        } else if (activeTab === 'roles') {
          return item.is_system.toString() === filterType;
        }
        return true;
      });
    }

    return filtered;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPermissions();
      await fetchRoles();
      await fetchUserGroups();
      await fetchAuditLogs();
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载权限数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">权限管理</h2>
          <p className="text-gray-600 mt-1">管理系统权限、角色和用户组</p>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            <i className="ri-download-line mr-2"></i>
            导出权限
          </Button>
          <Button size="sm">
            <i className="ri-add-line mr-2"></i>
            新建权限
          </Button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            {
              id: 'permissions',
              name: '权限管理',
              icon: 'ri-shield-line',
              count: permissions.length,
            },
            {
              id: 'roles',
              name: '角色管理',
              icon: 'ri-user-settings-line',
              count: roles.length,
            },
            {
              id: 'groups',
              name: '用户组',
              icon: 'ri-group-line',
              count: userGroups.length,
            },
            {
              id: 'audit',
              name: '审计日志',
              icon: 'ri-history-line',
              count: auditLogs.length,
            },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={`${tab.icon} mr-2`}></i>
              {tab.name}
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`搜索${activeTab === 'permissions' ? '权限' : activeTab === 'roles' ? '角色' : activeTab === 'groups' ? '用户组' : '日志'}...`}
              />
              <i className="ri-search-line absolute left-3 top-2.5 text-gray-400"></i>
            </div>
          </div>

          <div className="w-48">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              {activeTab === 'permissions' && (
                <>
                  <option value="report">报告</option>
                  <option value="patient">患者</option>
                  <option value="image">影像</option>
                  <option value="system">系统</option>
                </>
              )}
              {activeTab === 'roles' && (
                <>
                  <option value="true">系统角色</option>
                  <option value="false">自定义角色</option>
                </>
              )}
            </select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
              setSelectedItems([]);
            }}
          >
            <i className="ri-refresh-line mr-2"></i>
            重置
          </Button>
        </div>
      </div>

      {/* 权限管理标签页 */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                权限列表 (
                {
                  filterData(permissions, ['name', 'code', 'description'])
                    .length
                }
                )
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(permissions)}
                >
                  {selectedItems.length === permissions.length
                    ? '取消全选'
                    : '全选'}
                </Button>
                {selectedItems.length > 0 && (
                  <Button variant="outline" size="sm">
                    批量操作 ({selectedItems.length})
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === permissions.length}
                      onChange={() => handleSelectAll(permissions)}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    权限名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    权限代码
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    资源类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    权限类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    使用次数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filterData(permissions, ['name', 'code', 'description']).map(
                  permission => (
                    <tr
                      key={permission.permission_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(
                            permission.permission_id
                          )}
                          onChange={() =>
                            handleItemSelect(permission.permission_id)
                          }
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {permission.name}
                            </div>
                            {permission.description && (
                              <div className="text-sm text-gray-500">
                                {permission.description}
                              </div>
                            )}
                          </div>
                          {permission.is_system && (
                            <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              系统
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {permission.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getResourceTypeText(permission.resource_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPermissionTypeColor(permission.permission_type)}`}
                        >
                          {getPermissionTypeText(permission.permission_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {permission.usage_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(permission.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            编辑
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 角色管理标签页 */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              角色列表 (
              {filterData(roles, ['name', 'code', 'description']).length})
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterData(roles, ['name', 'code', 'description']).map(role => (
                <div
                  key={role.role_id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {role.name}
                      </h4>
                      <p className="text-sm text-gray-500 font-mono">
                        {role.code}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleStatusColor(role.status)}`}
                      >
                        {role.status}
                      </span>
                      {role.is_system && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          系统
                        </span>
                      )}
                    </div>
                  </div>

                  {role.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {role.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">用户数量:</span>
                      <span className="font-medium">{role.user_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">权限数量:</span>
                      <span className="font-medium">
                        {role.permissions.length}
                      </span>
                    </div>
                    {role.parent_role_name && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">父角色:</span>
                        <span className="font-medium">
                          {role.parent_role_name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      创建于 {formatTime(role.created_at)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900 text-sm">
                        编辑
                      </button>
                      <button className="text-red-600 hover:text-red-900 text-sm">
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 用户组标签页 */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              用户组列表 ({userGroups.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {userGroups.map(group => (
              <div key={group.group_id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {group.name}
                    </h4>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-900 text-sm">
                      编辑
                    </button>
                    <button className="text-red-600 hover:text-red-900 text-sm">
                      删除
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      角色 ({group.roles.length})
                    </h5>
                    <div className="space-y-1">
                      {group.roles.map(role => (
                        <span
                          key={role.role_id}
                          className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-1"
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      用户 ({group.user_count})
                    </h5>
                    <div className="space-y-1">
                      {group.users.slice(0, 3).map(user => (
                        <div
                          key={user.user_id}
                          className="text-sm text-gray-600"
                        >
                          {user.name} ({user.username})
                        </div>
                      ))}
                      {group.user_count > 3 && (
                        <div className="text-sm text-gray-500">
                          还有 {group.user_count - 3} 个用户...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  创建于 {formatTime(group.created_at)} | 更新于{' '}
                  {formatTime(group.updated_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 审计日志标签页 */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              权限审计日志 ({auditLogs.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {auditLogs.map(log => (
              <div key={log.log_id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}
                      >
                        {log.action === 'grant'
                          ? '授予'
                          : log.action === 'revoke'
                            ? '撤销'
                            : '修改'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {log.operator_name}
                      </span>
                      <span className="text-sm text-gray-500">
                        对{' '}
                        {log.target_type === 'user'
                          ? '用户'
                          : log.target_type === 'role'
                            ? '角色'
                            : '用户组'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {log.target_name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {log.action === 'grant'
                          ? '授予了'
                          : log.action === 'revoke'
                            ? '撤销了'
                            : '修改了'}
                        权限
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className="text-sm text-gray-500">权限: </span>
                      {log.permission_names.map((name, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-1"
                        >
                          {name}
                        </span>
                      ))}
                    </div>

                    {log.reason && (
                      <div className="mb-2">
                        <span className="text-sm text-gray-500">原因: </span>
                        <span className="text-sm text-gray-900">
                          {log.reason}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>时间: {formatTime(log.created_at)}</span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionManager;
