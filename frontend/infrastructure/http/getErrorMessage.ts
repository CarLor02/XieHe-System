import { getApiErrorMessage, getApiErrorStatus } from '@xiehe/api-client';

export function getErrorMessage(
  error: unknown,
  defaultMessage = '操作失败，请重试'
): string {
  const status = getApiErrorStatus(error);
  if (status === 401) return '登录已过期，正在跳转到登录页...';
  if (status === 400) return '请求参数错误';
  if (status === 403) return '没有权限执行此操作';
  if (status === 404) return '请求的资源不存在';
  if (status === 500) return '服务器错误，请稍后重试';
  if (status === 503) return '服务暂时不可用，请稍后重试';
  return getApiErrorMessage(error, defaultMessage);
}
