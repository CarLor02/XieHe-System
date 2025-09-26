
'use client';

import { useState } from 'react';

interface ModelPermission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  allowedRoles: string[];
  allowedUsers: string[];
  usageCount: number;
  lastUsed: string;
}

export default function ModelPermissions() {
  const [modelPermissions, setModelPermissions] = useState<ModelPermission[]>([
    {
      id: 'preop-prediction',
      name: '术前X线预测术后X线模型',
      description: '基于深度学习算法，通过分析术前X线影像，预测手术后的X线影像结果',
      enabled: true,
      allowedRoles: ['admin', 'senior_doctor', 'doctor'],
      allowedUsers: ['1', '2', '3'],
      usageCount: 234,
      lastUsed: '2024-03-20 14:30'
    },
    {
      id: 'brace-effectiveness',
      name: '支具有效性预测模型',
      description: '智能分析患者脊柱状况和支具参数，预测支具治疗的有效性',
      enabled: true,
      allowedRoles: ['admin', 'senior_doctor'],
      allowedUsers: ['1', '2'],
      usageCount: 89,
      lastUsed: '2024-03-19 16:45'
    },
    {
      id: 'smart-annotation',
      name: '智能标注测量模型',
      description: '自动识别和标注X线影像中的关键解剖结构，精确测量各项脊柱参数',
      enabled: true,
      allowedRoles: ['admin', 'senior_doctor', 'doctor'],
      allowedUsers: ['1', '2', '3'],
      usageCount: 156,
      lastUsed: '2024-03-20 09:15'
    }
  ]);

  const roles = [
    { id: 'admin', name: '管理员', color: 'bg-red-100 text-red-800' },
    { id: 'senior_doctor', name: '主任医师', color: 'bg-purple-100 text-purple-800' },
    { id: 'doctor', name: '主治医师', color: 'bg-blue-100 text-blue-800' },
    { id: 'staff', name: '医护人员', color: 'bg-gray-100 text-gray-800' }
  ];

  const users = [
    { id: '1', name: '吴医生', role: 'admin' },
    { id: '2', name: '张医生', role: 'senior_doctor' },
    { id: '3', name: '李医生', role: 'doctor' },
    { id: '4', name: '王护士', role: 'staff' }
  ];

  const toggleModelEnabled = (modelId: string) => {
    setModelPermissions(prev => prev.map(model => 
      model.id === modelId ? { ...model, enabled: !model.enabled } : model
    ));
  };

  const toggleRolePermission = (modelId: string, roleId: string) => {
    setModelPermissions(prev => prev.map(model => {
      if (model.id === modelId) {
        const hasRole = model.allowedRoles.includes(roleId);
        return {
          ...model,
          allowedRoles: hasRole 
            ? model.allowedRoles.filter(r => r !== roleId)
            : [...model.allowedRoles, roleId]
        };
      }
      return model;
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
        <h2 className="text-lg font-semibold text-gray-900 mb-2">模型权限管理</h2>
        <p className="text-sm text-gray-600">控制团队成员对AI模型的访问权限</p>
      </div>

      {/* 权限概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">可用模型</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-cpu-line text-blue-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">活跃模型</p>
              <p className="text-2xl font-bold text-gray-900">{modelPermissions.filter(m => m.enabled).length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-play-circle-line text-green-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">总调用次数</p>
              <p className="text-2xl font-bold text-gray-900">{modelPermissions.reduce((sum, m) => sum + m.usageCount, 0)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="ri-bar-chart-line text-purple-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">授权用户</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-settings-line text-orange-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 模型权限详情 */}
      <div className="space-y-6">
        {modelPermissions.map((model) => (
          <div key={model.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-cpu-line text-blue-600 w-6 h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
                  <p className="text-gray-600 mt-1">{model.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>调用次数: {model.usageCount}</span>
                    <span>最后使用: {model.lastUsed}</span>
                  </div>
                </div>
              </div>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={model.enabled}
                  onChange={() => toggleModelEnabled(model.id)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">启用模型</span>
              </label>
            </div>

            {model.enabled && (
              <div className="border-t border-gray-200 pt-4 space-y-4">
                {/* 角色权限 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">角色权限</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={model.allowedRoles.includes(role.id)}
                          onChange={() => toggleRolePermission(model.id, role.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 当前授权用户 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">授权用户</h4>
                  <div className="flex flex-wrap gap-2">
                    {model.allowedUsers.map((userId) => {
                      const user = users.find(u => u.id === userId);
                      return user ? (
                        <div key={userId} className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                          <span className="text-sm text-gray-700">{user.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(user.role)}`}>
                            {getRoleName(user.role)}
                          </span>
                        </div>
                      ) : null;
                    })}
                    {model.allowedUsers.length === 0 && (
                      <span className="text-sm text-gray-500">暂无授权用户</span>
                    )}
                  </div>
                </div>

                {/* 使用统计 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">使用统计</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">今日调用:</span>
                      <span className="ml-2 font-medium text-gray-900">23</span>
                    </div>
                    <div>
                      <span className="text-gray-600">本周调用:</span>
                      <span className="ml-2 font-medium text-gray-900">156</span>
                    </div>
                    <div>
                      <span className="text-gray-600">成功率:</span>
                      <span className="ml-2 font-medium text-green-600">98.5%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 批量操作 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">批量操作</h3>
        <div className="flex flex-wrap gap-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap">
            <i className="ri-check-line w-4 h-4 flex items-center justify-center"></i>
            <span>启用所有模型</span>
          </button>
          <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 whitespace-nowrap">
            <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
            <span>禁用所有模型</span>
          </button>
        </div>
      </div>
    </div>
  );
}
