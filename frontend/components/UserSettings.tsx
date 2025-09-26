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
              <h2 className="text-xl font-semibold text-gray-900">用户设置</h2>
              <p className="text-sm text-gray-500 mt-1">管理您的账户和偏好设置</p>
            </div>
            
            <nav className="p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <i className={`${tab.icon} w-5 h-5 flex items-center justify-center`}></i>
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {/* 个人信息 */}
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">个人信息</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                        <i className="ri-user-line w-8 h-8 flex items-center justify-center text-gray-600"></i>
                      </div>
                      <div>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                          更换头像
                        </button>
                        <p className="text-xs text-gray-500 mt-2">支持 JPG、PNG 格式，文件大小不超过 2MB</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">邮箱地址</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">手机号码</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">科室</label>
                        <select
                          value={formData.department}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="骨科">骨科</option>
                          <option value="内科">内科</option>
                          <option value="外科">外科</option>
                          <option value="儿科">儿科</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">职位</label>
                        <select
                          value={formData.position}
                          onChange={(e) => handleInputChange('position', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="主治医师">主治医师</option>
                          <option value="副主任医师">副主任医师</option>
                          <option value="主任医师">主任医师</option>
                          <option value="住院医师">住院医师</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 组织设置 */}
              {activeTab === 'organization' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">组织设置</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">当前组织</label>
                      <select
                        value={formData.organization}
                        onChange={(e) => handleInputChange('organization', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name} ({org.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">组织信息</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>组织名称: 协和吴主任团队</p>
                        <p>组织类型: 医疗团队</p>
                        <p>成员数量: 12人</p>
                        <p>创建时间: 2023-06-15</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 密码安全 */}
              {activeTab === 'password' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">密码安全</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入当前密码"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入新密码"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请再次输入新密码"
                      />
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">密码安全提示</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• 密码长度至少8位</li>
                        <li>• 包含大小写字母、数字和特殊字符</li>
                        <li>• 不要使用常见密码或个人信息</li>
                        <li>• 定期更换密码以确保安全</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 系统偏好 */}
              {activeTab === 'system' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">系统偏好</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">界面设置</h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">启用暗色主题</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">显示系统通知</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span className="ml-2 text-sm text-gray-700">自动保存草稿</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">语言和地区</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">语言</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="zh-CN">简体中文</option>
                            <option value="en-US">English</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">时区</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
                            <option value="America/New_York">纽约时间 (UTC-5)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 底部按钮 */}
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
