'use client';

/**
 * 登录页面
 *
 * 用户登录界面，支持用户名/邮箱登录，记住我功能
 *
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import { useAuth, useUser } from '@/store/authStore';
import { Building2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { login, error, isLoading, clearError } = useAuth();
  const { isAuthenticated } = useUser();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    remember_me: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // 如果已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // 清除错误信息
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // 表单验证
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = '请输入用户名或邮箱';
    }

    if (!formData.password) {
      errors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      errors.password = '密码至少6位';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const success = await login(formData);
    if (success) {
      router.push('/');
    }
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // 清除对应字段的验证错误
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">协和医疗</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">登录系统</h1>
          <p className="text-gray-600 mt-2">
            请输入您的用户名和密码登录医疗影像诊断系统
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* 用户名输入 */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              用户名或邮箱
            </label>
            <input
              id="username"
              type="text"
              placeholder="请输入用户名或邮箱"
              value={formData.username}
              onChange={e => handleInputChange('username', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {validationErrors.username && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.username}
              </p>
            )}
          </div>

          {/* 密码输入 */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              密码
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入密码"
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                  validationErrors.password
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                title={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.password}
              </p>
            )}
          </div>

          {/* 记住我和忘记密码 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                checked={formData.remember_me}
                onChange={e =>
                  handleInputChange('remember_me', e.target.checked)
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label
                htmlFor="remember_me"
                className="ml-2 block text-sm text-gray-700"
              >
                记住我
              </label>
            </div>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              忘记密码？
            </Link>
          </div>

          {/* 登录按钮 */}
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 px-4 py-2 text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                登录中...
              </>
            ) : (
              '登录'
            )}
          </button>

          {/* 注册链接 */}
          <div className="text-center text-sm">
            <span className="text-gray-600">还没有账号？</span>
            <Link
              href="/auth/register"
              className="ml-1 text-blue-600 hover:text-blue-800 hover:underline"
            >
              立即注册
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
