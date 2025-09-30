'use client';

import UserSettings from '@/components/UserSettings';
import { createAuthenticatedClient, useAuth, useUser } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Message {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  time: string;
  isRead: boolean;
}

// 移除硬编码消息，将从API获取

export default function Header() {
  const router = useRouter();
  const { user } = useUser();
  const { logout } = useAuth();
  const [showMessages, setShowMessages] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [settingsType, setSettingsType] = useState<
    'profile' | 'organization' | 'password' | 'system' | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mounted, setMounted] = useState(false);

  // 从认证系统获取用户角色
  const userRole = user?.role || 'staff';

  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取消息数据
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;

      try {
        const client = createAuthenticatedClient();
        const response = await client.get('/api/v1/notifications/messages');
        const notificationData = response.data;

        // 转换API数据为消息格式
        const formattedMessages: Message[] = notificationData.map(
          (item: any) => ({
            id: item.id || Math.random().toString(),
            title: item.title || '系统通知',
            content: item.message || item.content || '',
            type: item.type || 'info',
            time: item.created_at
              ? new Date(item.created_at).toLocaleString()
              : '刚刚',
            isRead: item.is_read || false,
          })
        );

        setMessages(formattedMessages);
      } catch (error) {
        console.warn('获取消息失败:', error);
        // 设置默认消息
        setMessages([]);
      }
    };

    if (mounted && user) {
      fetchMessages();
    }
  }, [mounted, user]);

  if (!mounted) {
    return (
      <header className="bg-white border-b border-gray-200 px-6 py-4 ml-64">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              智慧门诊系统
            </h1>
            <p className="text-sm text-gray-500 mt-1">专业的医疗影像管理平台</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="ri-notification-line w-4 h-4 flex items-center justify-center text-blue-600"></i>
            </div>

            <div className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <i className="ri-user-line w-4 h-4 flex items-center justify-center text-gray-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {user?.full_name || user?.username || '用户'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? '系统管理员' : '医师'}
                </p>
              </div>
              <i className="ri-arrow-down-s-line w-4 h-4 flex items-center justify-center text-gray-400"></i>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const unreadCount = messages.filter(msg => !msg.isRead).length;

  const markAsRead = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, isRead: true } : msg))
    );
  };

  const markAllAsRead = () => {
    setMessages(prev => prev.map(msg => ({ ...msg, isRead: true })));
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'info':
        return 'ri-information-line';
      case 'warning':
        return 'ri-alert-line';
      case 'success':
        return 'ri-check-line';
      case 'error':
        return 'ri-close-line';
      default:
        return 'ri-notification-line';
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'warning':
        return 'text-orange-600 bg-orange-50';
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleUserSettingsClick = (
    type: 'profile' | 'organization' | 'password' | 'system'
  ) => {
    setSettingsType(type);
    setShowUserSettings(true);
    setShowUserMenu(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 ml-64">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              智慧门诊系统
            </h1>
            <p className="text-sm text-gray-500 mt-1">专业的医疗影像管理平台</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowMessages(!showMessages)}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="ri-notification-line w-4 h-4 flex items-center justify-center text-blue-600"></i>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* 消息弹窗 */}
              {showMessages && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">系统消息</h3>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            全部已读
                          </button>
                        )}
                        <button
                          onClick={() => setShowMessages(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {messages.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {messages.map(message => (
                          <div
                            key={message.id}
                            onClick={() => markAsRead(message.id)}
                            className={`p-4 hover:bg-gray-50 cursor-pointer ${
                              !message.isRead ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getMessageColor(message.type)}`}
                              >
                                <i
                                  className={`${getMessageIcon(message.type)} w-4 h-4 flex items-center justify-center`}
                                ></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p
                                    className={`text-sm font-medium ${!message.isRead ? 'text-gray-900' : 'text-gray-700'}`}
                                  >
                                    {message.title}
                                  </p>
                                  {!message.isRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                  {message.content}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {message.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <i className="ri-notification-off-line w-8 h-8 flex items-center justify-center mx-auto mb-2 text-2xl"></i>
                        <p>暂无新消息</p>
                      </div>
                    )}
                  </div>

                  {messages.length > 0 && (
                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                      <button className="w-full text-sm text-blue-600 hover:text-blue-700 text-center">
                        查看全部消息
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <i className="ri-user-line w-4 h-4 flex items-center justify-center text-gray-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {user?.full_name || user?.username || '用户'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 'admin' ? '系统管理员' : '医师'}
                  </p>
                </div>
                <i className="ri-arrow-down-s-line w-4 h-4 flex items-center justify-center text-gray-400"></i>
              </button>

              {/* 用户菜单弹窗 */}
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {/* 用户信息头部 */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <i className="ri-user-line w-6 h-6 flex items-center justify-center text-gray-600"></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user?.full_name || user?.username || '用户'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {user?.role === 'admin' ? '系统管理员' : '医师'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {user?.email || '协和医疗影像诊断系统'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 菜单项 */}
                  <div className="py-2">
                    <button
                      onClick={() => handleUserSettingsClick('profile')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <i className="ri-user-settings-line w-5 h-5 flex items-center justify-center text-gray-500"></i>
                      <span className="text-gray-700">个人设置</span>
                    </button>

                    <button
                      onClick={() => handleUserSettingsClick('organization')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <i className="ri-building-line w-5 h-5 flex items-center justify-center text-gray-500"></i>
                      <span className="text-gray-700">组织管理</span>
                    </button>

                    <button
                      onClick={() => handleUserSettingsClick('password')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <i className="ri-lock-line w-5 h-5 flex items-center justify-center text-gray-500"></i>
                      <span className="text-gray-700">修改密码</span>
                    </button>

                    <button
                      onClick={() => handleUserSettingsClick('system')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <i className="ri-settings-line w-5 h-5 flex items-center justify-center text-gray-500"></i>
                      <span className="text-gray-700">系统设置</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-200 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center space-x-3 text-red-600"
                    >
                      <i className="ri-logout-box-line w-5 h-5 flex items-center justify-center"></i>
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 点击外部关闭弹窗 */}
        {(showMessages || showUserMenu) && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowMessages(false);
              setShowUserMenu(false);
            }}
          ></div>
        )}
      </header>

      {/* UserSettings Modal */}
      <UserSettings
        isOpen={showUserSettings}
        onClose={() => {
          setShowUserSettings(false);
          setSettingsType(null);
        }}
        type={settingsType}
      />
    </>
  );
}
