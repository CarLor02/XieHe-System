'use client';

import { useRef, useState, useEffect } from 'react';
import {
  changeCurrentUserPassword,
  deleteCurrentUserAvatar,
  getCurrentUser,
  uploadCurrentUserAvatar,
  updateCurrentUser,
  UserInfo,
} from '@/services/userService';
import { useSessionStore } from '@/lib/api';
import { getMyTeams } from '@/services/teamService';
import type { TeamSummary } from '@/services/teamService';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'profile' | 'organization' | 'password' | 'system' | null;
}

export default function UserSettings({
  isOpen,
  onClose,
  type,
}: UserSettingsProps) {
  const [activeTab, setActiveTab] = useState(type || 'profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    real_name: '',
    department: '',
    department_id: null as number | null,
    position: '',
    title: '',
    organization: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 获取 authStore 的 fetchUserInfo 方法
  const { fetchUserInfo, forceLogout } = useSessionStore();

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
      loadMyTeams();
    }
  }, [isOpen]);

  // 加载用户所属的团队
  const loadMyTeams = async () => {
    setLoadingTeams(true);
    try {
      const response = await getMyTeams();
      setMyTeams(response.items || []);

      // 如果用户有团队，设置第一个团队为默认选中
      if (
        response.items &&
        response.items.length > 0 &&
        !formData.organization
      ) {
        setFormData(prev => ({
          ...prev,
          organization: response.items[0].id.toString(),
        }));
      }
    } catch (error) {
      console.error('加载团队列表失败:', error);
      setMyTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

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
        title: data.title,
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
        title: data.title || '',
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
        title: formData.title || undefined,
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

      const errorMsg =
        error.response?.data?.detail || error.message || '保存失败，请重试';
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelected = async (file?: File) => {
    if (!file) return;
    try {
      setAvatarUploading(true);
      const nextUser = await uploadCurrentUserAvatar(file);
      setUserInfo(nextUser);
      await fetchUserInfo();
    } catch (error: any) {
      console.error('头像上传失败:', error);
      alert(error.message || '头像上传失败，请重试');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setAvatarUploading(true);
      const nextUser = await deleteCurrentUserAvatar();
      setUserInfo(nextUser);
      await fetchUserInfo();
    } catch (error: any) {
      console.error('头像删除失败:', error);
      alert(error.message || '头像删除失败，请重试');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword) {
      alert('请输入当前密码');
      return;
    }
    if (!formData.newPassword) {
      alert('请输入新密码');
      return;
    }
    if (formData.newPassword.length < 6) {
      alert('新密码至少6位');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      alert('两次输入的新密码不一致');
      return;
    }

    try {
      setSaving(true);
      await changeCurrentUserPassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
      });
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      alert('密码修改成功，请重新登录');
      forceLogout({ source: 'UserSettings.passwordChanged' });
    } catch (error: unknown) {
      const responseError = error as {
        message?: string;
        response?: { data?: { detail?: string; message?: string } };
      };
      const errorMsg =
        responseError.response?.data?.detail ||
        responseError.response?.data?.message ||
        responseError.message ||
        '修改密码失败，请重试';
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{
    id: 'profile' | 'organization' | 'password' | 'system';
    name: string;
    icon: string;
  }> = [
    { id: 'profile', name: '个人信息', icon: 'ri-user-line' },
    { id: 'organization', name: '组织设置', icon: 'ri-building-line' },
    { id: 'password', name: '密码安全', icon: 'ri-lock-line' },
    { id: 'system', name: '系统偏好', icon: 'ri-settings-line' },
  ];

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 p-2 backdrop-blur-sm sm:p-6">
      <div className="h-[calc(100vh-2rem)] max-h-[56rem] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl sm:h-[calc(100vh-3rem)]">
        <div className="flex h-full min-h-0 flex-col md:flex-row">
          {/* 左侧导航 */}
          <div className="flex w-full flex-shrink-0 flex-col bg-gray-50 md:h-full md:w-64 md:border-r md:border-gray-200">
            <div className="border-b border-gray-200 p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900">用户设置</h2>
              <p className="text-sm text-gray-500 mt-1">
                管理您的账户和偏好设置
              </p>
            </div>

            <nav className="flex gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col md:gap-0 md:space-y-1 md:overflow-y-auto md:p-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-max items-center space-x-3 rounded-lg px-4 py-3 text-left transition-colors md:w-full md:min-w-0 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <i
                    className={`${tab.icon} w-5 h-5 flex items-center justify-center`}
                  ></i>
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
              {/* 个人信息 */}
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    个人信息
                  </h3>

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">加载中...</div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                          {userInfo?.avatar_url ? (
                            <div
                              aria-label="用户头像"
                              className="h-full w-full bg-cover bg-center"
                              role="img"
                              style={{
                                backgroundImage: `url(${userInfo.avatar_url})`,
                              }}
                            />
                          ) : (
                            <span className="text-2xl font-bold text-white">
                              {formData.real_name
                                ? formData.real_name.charAt(0).toUpperCase()
                                : formData.username
                                  ? formData.username.charAt(0).toUpperCase()
                                  : 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={event =>
                              void handleAvatarSelected(event.target.files?.[0])
                            }
                          />
                          <button
                            type="button"
                            disabled={avatarUploading}
                            onClick={() => avatarInputRef.current?.click()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {avatarUploading ? '处理中...' : '更换头像'}
                          </button>
                          {userInfo?.avatar_url && (
                            <button
                              type="button"
                              disabled={avatarUploading}
                              onClick={() => void handleDeleteAvatar()}
                              className="ml-2 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              删除头像
                            </button>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            支持 PNG、JPEG、WebP
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            用户名
                          </label>
                          <input
                            type="text"
                            value={formData.username}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            用户名不可修改
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            邮箱地址
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            邮箱不可修改
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            真实姓名
                          </label>
                          <input
                            type="text"
                            value={formData.real_name}
                            onChange={e =>
                              handleInputChange('real_name', e.target.value)
                            }
                            placeholder="请输入真实姓名"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            手机号码
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={e =>
                              handleInputChange('phone', e.target.value)
                            }
                            placeholder="请输入手机号码"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            职位
                          </label>
                          <input
                            type="text"
                            value={formData.position}
                            onChange={e =>
                              handleInputChange('position', e.target.value)
                            }
                            placeholder="如：主治医师"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            职称
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={e =>
                              handleInputChange('title', e.target.value)
                            }
                            placeholder="如：副主任医师"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {formData.department && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">
                            当前部门
                          </h4>
                          <p className="text-sm text-blue-700">
                            {formData.department}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            如需更改部门，请联系系统管理员
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 组织设置 */}
              {activeTab === 'organization' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    组织设置
                  </h3>

                  {loadingTeams ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">加载团队信息中...</div>
                    </div>
                  ) : myTeams.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <div className="flex items-start space-x-3">
                        <i className="ri-information-line text-yellow-600 text-xl mt-0.5"></i>
                        <div>
                          <h4 className="font-medium text-yellow-900 mb-1">
                            您还未加入任何团队
                          </h4>
                          <p className="text-sm text-yellow-700 mb-3">
                            加入团队后，您可以与团队成员协作处理影像数据。
                          </p>
                          <p className="text-sm text-yellow-700">
                            请联系系统管理员创建团队，或申请加入现有团队。
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          当前组织
                        </label>
                        <select
                          value={formData.organization}
                          onChange={e =>
                            handleInputChange('organization', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={myTeams.length === 0}
                        >
                          {myTeams.map(team => (
                            <option key={team.id} value={team.id.toString()}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          您共加入了 {myTeams.length} 个团队
                        </p>
                      </div>

                      {formData.organization &&
                        myTeams.find(
                          t => t.id.toString() === formData.organization
                        ) && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">
                              组织信息
                            </h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <span className="font-medium">组织名称:</span>{' '}
                                {
                                  myTeams.find(
                                    t =>
                                      t.id.toString() === formData.organization
                                  )?.name
                                }
                              </p>
                              <p>
                                <span className="font-medium">成员数量:</span>{' '}
                                {myTeams.find(
                                  t => t.id.toString() === formData.organization
                                )?.member_count || 0}{' '}
                                人
                              </p>
                              {myTeams.find(
                                t => t.id.toString() === formData.organization
                              )?.creator_name && (
                                <p>
                                  <span className="font-medium">创建者:</span>{' '}
                                  {
                                    myTeams.find(
                                      t =>
                                        t.id.toString() ===
                                        formData.organization
                                    )?.creator_name
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {/* 密码安全 */}
              {activeTab === 'password' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    密码安全
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        当前密码
                      </label>
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={e =>
                          handleInputChange('currentPassword', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入当前密码"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        新密码
                      </label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={e =>
                          handleInputChange('newPassword', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入新密码"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        确认新密码
                      </label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={e =>
                          handleInputChange('confirmPassword', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请再次输入新密码"
                      />
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        密码安全提示
                      </h4>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    系统偏好
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        界面设置
                      </h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            defaultChecked
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            启用暗色主题
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            defaultChecked
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            显示系统通知
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            自动保存草稿
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        语言和地区
                      </h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            语言
                          </label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="zh-CN">简体中文</option>
                            <option value="en-US">English</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            时区
                          </label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="Asia/Shanghai">
                              北京时间 (UTC+8)
                            </option>
                            <option value="America/New_York">
                              纽约时间 (UTC-5)
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* 底部按钮 */}
            <div className="flex flex-shrink-0 justify-end space-x-4 border-t border-gray-200 bg-white px-4 py-4 sm:px-8 sm:py-5">
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
                  onClick={handleChangePassword}
                  disabled={saving || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '修改中...' : '修改密码'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
