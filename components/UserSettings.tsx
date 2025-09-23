
'use client';

import { useState } from 'react';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'profile' | 'organization' | 'password' | 'system' | null;
}

export default function UserSettings({ isOpen, onClose, type }: UserSettingsProps) {
  const [activeTab, setActiveTab] = useState(type || 'profile');
  const [formData, setFormData] = useState({
    username: '吴医生',
    email: 'wu.doctor@hospital.com',
    phone: '138****1234',
    department: '骨科',
    position: '主治医师',
    organization: 'xiehe-wu-team',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const organizations = [
    { id: 'xiehe-wu-team', name: '协和吴主任团队', type: '医疗团队' },
    { id: 'xiehe-zhang-team', name: '协和张主任团队', type: '医疗团队' },
    { id: 'qilu-liu-team', name: '齐鲁刘主任团队', type: '医疗团队' }
  ];

  const tabs = [
    { id: 'profile', name: '个人信息', icon: 'ri-user-line' },
    { id: 'organization', name: '组织设置', icon: 'ri-building-line' },
    { id: 'password', name: '密码安全', icon: 'ri-lock-line' },
    { id: 'system', name: '系统偏好', icon: 'ri-settings-line' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex">
          {/* 左侧导航 */}
          <div className="w-64 bg-gray-50 border-r border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">用户设置</h2>
            </div>
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <i className={`${tab.icon} w-5 h-5 flex items-center justify-center`}></i>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {tabs.find(tab => tab.id === activeTab)?.name}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line w-6 h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* 个人信息 */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                      <i className="ri-user-line w-10 h-10 flex items-center justify-center text-gray-600 text-4xl"></i>
                    </div>
                    <div>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        更换头像
                      </button>
                      <p className="text-sm text-gray-500 mt-2">建议尺寸：200x200 像素</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">邮箱地址</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">手机号码</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">科室</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">职位</label>
                      <select
                        value={formData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                      >
                        <option value="住院医师">住院医师</option>
                        <option value="主治医师">主治医师</option>
                        <option value="副主任医师">副主任医师</option>
                        <option value="主任医师">主任医师</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 组织设置 */}
              {activeTab === 'organization' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">当前组织</label>
                    <div className="grid grid-cols-1 gap-3">
                      {organizations.map((org) => (
                        <label key={org.id} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="organization"
                            value={org.id}
                            checked={formData.organization === org.id}
                            onChange={(e) => handleInputChange('organization', e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900">{org.name}</p>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{org.type}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <i className="ri-alert-line w-5 h-5 flex items-center justify-center text-yellow-600 mt-0.5"></i>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">切换组织说明</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          切换组织后，您将失去对当前组织数据的访问权限，请谨慎操作。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 密码设置 */}
              {activeTab === 'password' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                    <input
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入当前密码"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => handleInputChange('newPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入新密码"
                    />
                    <p className="text-sm text-gray-500 mt-1">密码长度至少8位，包含字母和数字</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请再次输入新密码"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <i className="ri-shield-check-line w-5 h-5 flex items-center justify-center text-blue-600 mt-0.5"></i>
                      <div>
                        <p className="text-sm font-medium text-blue-800">密码安全建议</p>
                        <ul className="text-sm text-blue-700 mt-1 space-y-1">
                          <li>• 使用8位以上字符</li>
                          <li>• 包含大小写字母、数字和特殊字符</li>
                          <li>• 不要使用常见的密码组合</li>
                          <li>• 定期更换密码</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 系统设置 */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">通知设置</h4>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-gray-700">新消息通知</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-gray-700">系统更新通知</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">语言与时区</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">界面语言</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8">
                          <option value="zh-CN">简体中文</option>
                          <option value="en-US">English</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">时区</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8">
                          <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
                          <option value="America/New_York">纽约时间 (UTC-5)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  取消
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap">
                  保存更改
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}