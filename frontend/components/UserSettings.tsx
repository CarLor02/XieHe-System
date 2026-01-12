'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, updateCurrentUser, UserInfo } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'profile' | 'organization' | 'password' | 'system' | null;
}

export default function UserSettings({ isOpen, onClose, type }: UserSettingsProps) {
  const [activeTab, setActiveTab] = useState(type || 'profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    real_name: '',
    department: '',
    department_id: null as number | null,
    position: '',
    title: '',
    organization: 'xiehe-wu-team',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 获取 authStore 的 fetchUserInfo 方法
  const { fetchUserInfo } = useAuthStore();

  // 当 type 改变时，更新 activeTab
  useEffect(() => {
    if (type) {
      setActiveTab(type);
    }
  }, [type]);

  // 加载用户信息
  useEffect(() => {
    if (isOpen) {
      loadUserInfo();
    }
  }, [isOpen]);

  const loadUserInfo = async () => {
    try {
      setLoading(true);
      console.log('开始加载用户信息...');
      const data = await getCurrentUser();
      console.log('用户信息加载成功:', data);
      console.log('详细字段值:', {
        username: data.username,
        email: data.email,
        phone: data.phone,
        real_name: data.real_name,
        department: data.department,
        department_id: data.department_id,
        position: data.position,
        title: data.title
      });

      setUserInfo(data);

      const newFormData = {
        ...formData,
        username: data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        real_name: data.real_name || '',
        department: data.department || '',
        department_id: data.department_id || null,
        position: data.position || '',
        title: data.title || ''
      };

      console.log('设置表单数据:', newFormData);
      setFormData(newFormData);
    } catch (error: any) {
      console.error('加载用户信息失败:', error);
      console.error('错误详情:', error.response?.data);

      // 检查是否是认证错误
      if (error.message?.includes('认证') || error.message?.includes('凭据')) {
        alert('登录已过期，请重新登录');
        window.location.href = '/auth/login';
        return;
      }

      alert('加载用户信息失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updateData = {
        phone: formData.phone || undefined,
        real_name: formData.real_name || undefined,
        department_id: formData.department_id || undefined,
        position: formData.position || undefined,
        title: formData.title || undefined
      };
      console.log('准备保存用户信息:', updateData);

      const result = await updateCurrentUser(updateData);
      console.log('保存成功，返回数据:', result);

      alert('保存成功！');

      // 重新加载用户信息以确保显示最新数据
      await loadUserInfo();

      // 同时更新 authStore 中的用户信息，这样 Header 组件也会更新
      console.log('更新 authStore 中的用户信息...');
      await fetchUserInfo();
      console.log('authStore 用户信息已更新');
    } catch (error: any) {
      console.error('保存失败:', error);
      console.error('错误详情:', error.response?.data);

      // 检查是否是认证错误
      if (error.message?.includes('认证') || error.message?.includes('凭据')) {
        alert('登录已过期，请重新登录');
        // 可以在这里跳转到登录页
        window.location.href = '/auth/login';
        return;
      }

      const errorMsg = error.response?.data?.detail || error.message || '保存失败，请重试';
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const organizations = [
    { id: 'xiehe-wu-team', name: '协和吴主任团队', type: '医疗团队' },
    { id: 'xiehe-zhang-team', name: '协和张主任团队', type: '医疗团队' },
    { id: 'qilu-liu-team', name: '齐鲁刘主任团队', type: '医疗团队' }
  ];

  const tabs: Array<{ id: 'profile' | 'organization' | 'password' | 'system'; name: string; icon: string }> = [
    { id: 'profile', name: '个人信息', icon: 'ri-user-line' },
    { id: 'organization', name: '组织设置', icon: 'ri-building-line' },
    { id: 'password', name: '密码安全', icon: 'ri-lock-line' },
    { id: 'system', name: '系统偏好', icon: 'ri-settings-line' }
  ];

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-gray-900/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
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

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">加载中...</div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-2xl font-bold text-white">
                            {formData.real_name ? formData.real_name.charAt(0).toUpperCase() :
                             formData.username ? formData.username.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                        <div>
                          <button
                            disabled
                            className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                            title="头像上传功能即将推出"
                          >
                            更换头像
                          </button>
                          <p className="text-xs text-gray-500 mt-2">头像上传功能即将推出</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                          <input
                            type="text"
                            value={formData.username}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 mt-1">用户名不可修改</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">邮箱地址</label>
                          <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 mt-1">邮箱不可修改</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">真实姓名</label>
                          <input
                            type="text"
                            value={formData.real_name}
                            onChange={(e) => handleInputChange('real_name', e.target.value)}
                            placeholder="请输入真实姓名"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">手机号码</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            placeholder="请输入手机号码"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">职位</label>
                          <input
                            type="text"
                            value={formData.position}
                            onChange={(e) => handleInputChange('position', e.target.value)}
                            placeholder="如：主治医师"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">职称</label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="如：副主任医师"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {formData.department && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">当前部门</h4>
                          <p className="text-sm text-blue-700">{formData.department}</p>
                          <p className="text-xs text-blue-600 mt-1">如需更改部门，请联系系统管理员</p>
                        </div>
                      )}
                    </div>
                  )}
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
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                {activeTab === 'profile' && (
                  <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : '保存更改'}
                  </button>
                )}
                {activeTab === 'password' && (
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    修改密码
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
