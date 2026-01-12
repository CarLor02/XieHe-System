/**
 * 认证错误处理工具
 * 
 * 提供统一的认证错误检测和处理逻辑
 */

/**
 * 检查错误是否是认证错误
 */
export function isAuthError(error: any): boolean {
  // 检查 HTTP 状态码
  if (error.response?.status === 401) {
    return true;
  }
  
  // 检查错误消息
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('认证') ||
    message.includes('authentication') ||
    message.includes('unauthorized') ||
    message.includes('token') ||
    message.includes('登录')
  ) {
    return true;
  }
  
  return false;
}

/**
 * 处理认证错误
 * 显示提示并跳转到登录页
 */
export function handleAuthError(
  error: any,
  options: {
    showAlert?: boolean;
    alertMessage?: string;
    redirectDelay?: number;
  } = {}
): void {
  const {
    showAlert = true,
    alertMessage = '登录已过期，请重新登录',
    redirectDelay = 500,
  } = options;
  
  console.log('❌ 认证失败，session 已过期');
  
  // 显示提示
  if (showAlert) {
    alert(alertMessage);
  }
  
  // 跳转到登录页
  setTimeout(() => {
    window.location.href = '/auth/login';
  }, redirectDelay);
}

/**
 * 检查并处理认证错误
 * 如果是认证错误，返回 true；否则返回 false
 */
export function checkAndHandleAuthError(
  error: any,
  options?: {
    showAlert?: boolean;
    alertMessage?: string;
    redirectDelay?: number;
  }
): boolean {
  if (isAuthError(error)) {
    handleAuthError(error, options);
    return true;
  }
  return false;
}

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(error: any, defaultMessage: string = '操作失败，请重试'): string {
  // 认证错误
  if (isAuthError(error)) {
    return '登录已过期，请重新登录';
  }
  
  // 网络错误
  if (!error.response) {
    return '网络连接失败，请检查网络后重试';
  }
  
  // 服务器返回的错误消息
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // 根据状态码返回消息
  switch (error.response?.status) {
    case 400:
      return '请求参数错误';
    case 403:
      return '没有权限执行此操作';
    case 404:
      return '请求的资源不存在';
    case 500:
      return '服务器错误，请稍后重试';
    case 503:
      return '服务暂时不可用，请稍后重试';
    default:
      return defaultMessage;
  }
}

/**
 * 包装异步函数，自动处理认证错误
 */
export function withAuthErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    showAlert?: boolean;
    alertMessage?: string;
    onAuthError?: () => void;
  }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (checkAndHandleAuthError(error, options)) {
        options?.onAuthError?.();
        throw error;
      }
      throw error;
    }
  }) as T;
}

