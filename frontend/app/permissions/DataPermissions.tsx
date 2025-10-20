
'use client';

import { useState } from 'react';

interface DataAccess {
  id: string;
  name: string;
  type: 'personal' | 'team';
  description: string;
  userCount: number;
  dataSize: string;
  lastAccessed: string;
  allowedRoles: string[];
}

export default function DataPermissions() {
  const [dataPermissions, setDataPermissions] = useState<DataAccess[]>([
    {
      id: 'personal',
      name: '个人数据',
      type: 'personal',
      description: '用户只能访问自己上传和处理的数据',
      userCount: 4,
      dataSize: '256MB',
      lastAccessed: '2024-03-20 14:30',
      allowedRoles: ['admin', 'senior_doctor', 'doctor', 'staff']
    },
    {
      id: 'team',
      name: '团队数据',
      type: 'team',
      description: '可以访问整个团队内的所有数据',
      userCount: 3,
      dataSize: '1.8GB',
      lastAccessed: '2024-03-20 11:15',
      allowedRoles: ['admin', 'senior_doctor', 'doctor']
    }
  ]);

  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<DataAccess | null>(null);

  const roles = [
    { id: 'admin', name: '管理员', color: 'bg-red-100 text-red-800' },
    { id: 'senior_doctor', name: '主任医师', color: 'bg-purple-100 text-purple-800' },
    { id: 'doctor', name: '主治医师', color: 'bg-blue-100 text-blue-800' },
    { id: 'staff', name: '医护人员', color: 'bg-gray-100 text-gray-800' }
  ];

  const users = [
    { id: '1', name: '吴医生', role: 'admin', dataAccess: ['personal', 'team'] },
    { id: '2', name: '张医生', role: 'senior_doctor', dataAccess: ['personal', 'team'] },
    { id: '3', name: '李医生', role: 'doctor', dataAccess: ['personal', 'team'] },
    { id: '4', name: '王护士', role: 'staff', dataAccess: ['personal'] }
  ];

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case 'personal':
        return 'ri-user-line';
      case 'team':
        return 'ri-team-line';
      default:
        return 'ri-database-line';
    }
  };

  const getDataTypeColor = (type: string) => {
    switch (type) {
      case 'personal':
        return 'bg-blue-100 text-blue-600';
      case 'team':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const toggleRolePermission = (dataId: string, roleId: string) => {
    setDataPermissions(prev => prev.map(data => {
      if (data.id === dataId) {
        const hasRole = data.allowedRoles.includes(roleId);
        return {
          ...data,
          allowedRoles: hasRole 
            ? data.allowedRoles.filter(r => r !== roleId)
            : [...data.allowedRoles, roleId]
        };
      }
      return data;
    }));
  };

  const getRoleName = (roleId: string) => {
    return roles.find(role => role.id === roleId)?.name || roleId;
  };

  const getRoleColor = (roleId: string) => {
    return roles.find(role => role.id === roleId)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">数据权限管理</h2>
        <p className="text-sm text-gray-600">控制团队成员对不同级别数据的访问权限</p>
      </div>

      {/* 数据访问概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">总数据量</p>
              <p className="text-2xl font-bold text-gray-900">2.1GB</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-database-line text-blue-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">活跃用户</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-settings-line text-green-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">访问级别</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="ri-shield-user-line text-purple-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">今日访问</p>
              <p className="text-2xl font-bold text-gray-900">89</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <i className="ri-eye-line text-orange-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 数据权限设置 */}
      <div className="space-y-6">
        {dataPermissions.map((data) => (
          <div key={data.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getDataTypeColor(data.type)}`}>
                  <i className={`${getDataTypeIcon(data.type)} w-6 h-6 flex items-center justify-center`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{data.name}</h3>
                  <p className="text-gray-600 mt-1">{data.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>授权用户: {data.userCount}</span>
                    <span>数据大小: {data.dataSize}</span>
                    <span>最后访问: {data.lastAccessed}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setSelectedDataType(data);
                  setShowAccessModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-settings-line w-4 h-4 flex items-center justify-center"></i>
                <span>管理权限</span>
              </button>
            </div>

            {/* 角色权限显示 */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">可访问角色</h4>
              <div className="flex flex-wrap gap-2">
                {data.allowedRoles.map((roleId) => (
                  <span key={roleId} className={`text-xs px-3 py-1 rounded-full ${getRoleColor(roleId)}`}>
                    {getRoleName(roleId)}
                  </span>
                ))}
              </div>
            </div>

            {/* 用户访问列表 */}
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-3">有权限的用户</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {users.filter(user => data.allowedRoles.includes(user.role)).map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <i className="ri-user-line w-4 h-4 flex items-center justify-center text-gray-600"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleName(user.role)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 权限管理弹窗 */}
      {showAccessModal && selectedDataType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">管理数据权限 - {selectedDataType.name}</h2>
                <button
                  onClick={() => setShowAccessModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line w-6 h-6 flex items-center justify-center"></i>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getDataTypeColor(selectedDataType.type)}`}>
                      <i className={`${getDataTypeIcon(selectedDataType.type)} w-5 h-5 flex items-center justify-center`}></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedDataType.name}</h3>
                      <p className="text-sm text-gray-600">{selectedDataType.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">数据大小:</span>
                      <span className="ml-2 font-medium">{selectedDataType.dataSize}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">用户数:</span>
                      <span className="ml-2 font-medium">{selectedDataType.userCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">最后访问:</span>
                      <span className="ml-2 font-medium">{selectedDataType.lastAccessed}</span>
                    </div>
                  </div>
                </div>

                {/* 角色权限设置 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">角色权限设置</h4>
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedDataType.allowedRoles.includes(role.id)}
                            onChange={() => toggleRolePermission(selectedDataType.id, role.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{role.name}</p>
                            <p className="text-sm text-gray-600">
                              {role.id === 'admin' && '拥有团队内所有数据访问权限'}
                              {role.id === 'senior_doctor' && '可访问团队级别数据'}
                              {role.id === 'doctor' && '可访问个人和部分团队数据'}
                              {role.id === 'staff' && '仅可访问个人数据'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${role.color}`}>
                          {users.filter(u => u.role === role.id).length} 人
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 数据操作权限 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">数据操作权限</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-gray-700">查看数据</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" defaultChecked={selectedDataType.type !== 'team' && selectedDataType.type !== 'personal'} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-gray-700">下载数据</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" defaultChecked={selectedDataType.type === 'personal'} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-gray-700">编辑数据</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" defaultChecked={selectedDataType.type === 'personal'} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-gray-700">删除数据</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAccessModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  取消
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap">
                  保存设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
