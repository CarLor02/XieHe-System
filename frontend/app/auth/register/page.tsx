'use client';

/**
 * 注册页面
 *
 * 用户注册界面，支持用户信息填写和验证
 *
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import { useAuth, useUser } from '@/store/authStore';
import { Building2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, error, isLoading, clearError } = useAuth();
  const { isAuthenticated } = useUser();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSuccess, setIsSuccess] = useState(false);

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

    // 用户名验证
    if (!formData.username.trim()) {
      errors.username = '请输入用户名';
    } else if (formData.username.length < 3) {
      errors.username = '用户名至少3位';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = '用户名只能包含字母、数字和下划线';
    }

    // 邮箱验证
    if (!formData.email.trim()) {
      errors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    // 密码验证
    if (!formData.password) {
      errors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      errors.password = '密码至少6位';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = '密码必须包含字母和数字';
    }

    // 确认密码验证
    if (!formData.confirm_password) {
      errors.confirm_password = '请确认密码';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = '两次输入的密码不一致';
    }

    // 姓名验证
    if (!formData.full_name.trim()) {
      errors.full_name = '请输入姓名';
    } else if (formData.full_name.length < 2) {
      errors.full_name = '姓名至少2位';
    }

    // 手机号验证（可选）
    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '请输入有效的手机号';
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

    try {
      const success = await register(formData);
      if (success) {
        // 使用 setTimeout 确保状态更新在下一个事件循环中执行
        setTimeout(() => {
          setIsSuccess(true);
        }, 0);

        // 延迟跳转
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (err) {
      // 错误已经在 authStore 中处理
      console.error('注册失败:', err);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
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

  // 成功页面
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">注册成功！</h2>
          <p className="text-gray-600 mb-4">
            您的账号已创建成功，即将跳转到登录页面...
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 px-4 py-2 text-sm"
          >
            立即登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">协和医疗</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">注册账号</h1>
          <p className="text-gray-600 mt-2">创建您的医疗影像诊断系统账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              用户名 *
            </label>
            <input
              id="username"
              type="text"
              placeholder="请输入用户名"
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

          {/* 邮箱输入 */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              邮箱 *
            </label>
            <input
              id="email"
              type="email"
              placeholder="请输入邮箱地址"
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {validationErrors.email && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* 姓名输入 */}
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              姓名 *
            </label>
            <input
              id="full_name"
              type="text"
              placeholder="请输入真实姓名"
              value={formData.full_name}
              onChange={e => handleInputChange('full_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.full_name
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {validationErrors.full_name && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.full_name}
              </p>
            )}
          </div>

          {/* 手机号输入 */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              手机号
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="请输入手机号（可选）"
              value={formData.phone}
              onChange={e => handleInputChange('phone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {validationErrors.phone && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.phone}
              </p>
            )}
          </div>

          {/* 密码输入 */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              密码 *
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

          {/* 确认密码输入 */}
          <div>
            <label
              htmlFor="confirm_password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              确认密码 *
            </label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="请再次输入密码"
                value={formData.confirm_password}
                onChange={e =>
                  handleInputChange('confirm_password', e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                  validationErrors.confirm_password
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {validationErrors.confirm_password && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.confirm_password}
              </p>
            )}
          </div>

          {/* 注册按钮 */}
          <button
            type="submit"
            className="w-full mt-6 inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 px-4 py-2 text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                注册中...
              </>
            ) : (
              '注册账号'
            )}
          </button>

          {/* 登录链接 */}
          <div className="text-center text-sm mt-4">
            <span className="text-gray-600">已有账号？</span>
            <Link
              href="/auth/login"
              className="ml-1 text-blue-600 hover:text-blue-800 hover:underline"
            >
              立即登录
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
