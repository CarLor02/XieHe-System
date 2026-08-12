'use client';

/* eslint-disable @next/next/no-img-element */

import UserSettings from '@/components/UserSettings';
import { useAuth, useUser } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { useEffect, useState } from 'react';
import AppDropdown from './common/AppDropdown';

const logger = createLogger('components.header');

interface HeaderProps {
  className?: string;
  showMenuButton?: boolean;
  onOpenSidebar?: () => void;
}

export default function Header({
  className = '',
  showMenuButton = false,
  onOpenSidebar,
}: HeaderProps) {
  const { user } = useUser();
  const { logout } = useAuth();
  const [showMessages, setShowMessages] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [settingsType, setSettingsType] = useState<
    'profile' | 'organization' | 'password' | 'system' | null
  >(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className={`bg-white border-b border-gray-200 px-4 py-4 sm:px-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {showMenuButton && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 lg:hidden"
                aria-label="打开侧边导航"
              >
                <i className="ri-menu-line text-lg"></i>
              </button>
            )}
            <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-800">
              智慧门诊系统
            </h1>
            <p className="text-sm text-gray-500 mt-1">专业的医疗影像管理平台</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="ri-notification-line w-4 h-4 flex items-center justify-center text-blue-600"></i>
            </div>

            <div className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg">
	                  <div className="w-8 h-8 overflow-hidden bg-gray-300 rounded-full flex items-center justify-center">
	                    {user?.avatar_url ? (
	                      <img src={user.avatar_url} alt="用户头像" className="h-full w-full object-cover" />
	                    ) : (
	                      <i className="ri-user-line w-4 h-4 flex items-center justify-center text-gray-600"></i>
	                    )}
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

  const handleUserSettingsClick = (
    type: 'profile' | 'organization' | 'password' | 'system'
  ) => {
    setSettingsType(type);
    setShowUserSettings(true);
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    try {
      setShowUserMenu(false);
      void logout({ redirectToLogin: true });
    } catch (error) {
      logger.warn('Logout error', error);
      void logout({ redirectToLogin: true });
    }
  };

  const handleMessagesOpenChange = (open: boolean) => {
    setShowMessages(open);
    if (open) {
      setShowUserMenu(false);
    }
  };

  const handleUserMenuOpenChange = (open: boolean) => {
    setShowUserMenu(open);
    if (open) {
      setShowMessages(false);
    }
  };

  return (
    <>
      <header className={`bg-white border-b border-gray-200 px-4 py-4 sm:px-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {showMenuButton && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 lg:hidden"
                aria-label="打开侧边导航"
              >
                <i className="ri-menu-line text-lg"></i>
              </button>
            )}
            <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-800">
              智慧门诊系统
            </h1>
            <p className="text-sm text-gray-500 mt-1">专业的医疗影像管理平台</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <AppDropdown
              open={showMessages}
              onOpenChange={handleMessagesOpenChange}
              align="end"
              contentClassName="w-[calc(100vw-2rem)] max-w-96 overflow-hidden"
              trigger={
                <button
                  type="button"
                  aria-label="消息通知"
                  className="relative"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                    <i className="ri-notification-line w-4 h-4 flex items-center justify-center text-blue-600"></i>
                  </div>
                </button>
              }
            >
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">系统消息</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowMessages(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 text-center text-gray-500">
                    <i className="ri-notification-off-line w-8 h-8 flex items-center justify-center mx-auto mb-2 text-2xl"></i>
                    <p>暂无新消息</p>
                  </div>
            </AppDropdown>

            <AppDropdown
              open={showUserMenu}
              onOpenChange={handleUserMenuOpenChange}
              align="end"
              contentClassName="w-72 max-w-[calc(100vw-1rem)] overflow-hidden"
              trigger={
                <button
                  type="button"
                  className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
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
              }
            >
                  {/* 用户信息头部 */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
	                      <div className="w-12 h-12 overflow-hidden bg-gray-300 rounded-full flex items-center justify-center">
	                        {user?.avatar_url ? (
	                          <img src={user.avatar_url} alt="用户头像" className="h-full w-full object-cover" />
	                        ) : (
	                          <i className="ri-user-line w-6 h-6 flex items-center justify-center text-gray-600"></i>
	                        )}
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
            </AppDropdown>
          </div>
        </div>
      </header>

      {/* UserSettings Modal */}
      <UserSettings
        key={showUserSettings ? settingsType ?? 'profile' : 'closed'}
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
