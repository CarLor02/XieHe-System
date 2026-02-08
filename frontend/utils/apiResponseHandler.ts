/**
 * API 响应处理工具函数
 * 用于统一处理后端 API 的响应格式
 *
 * 后端响应格式：
 * - 成功响应: { code, message, data, timestamp }
 * - 分页响应: { code, message, data: { items, pagination }, timestamp }
 * - 错误响应: { code, message, error_code, details, path, timestamp }
 */

/**
 * 标准 API 响应接口
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  timestamp: string;
}

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 分页数据接口（后端返回格式）
 */
export interface PaginatedData<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

/**
 * 提取单个对象数据
 * 兼容新旧两种响应格式
 *
 * @param response - Axios 响应对象
 * @returns 提取的数据
 */
export function extractData<T>(response: any): T {
  // 新格式: response.data.data (后端统一响应格式)
  if (response.data?.code !== undefined && response.data?.data !== undefined) {
    return response.data.data;
  }

  // 旧格式: response.data (直接返回数据)
  if (response.data !== undefined) {
    return response.data;
  }

  // 兜底：返回空对象
  return {} as T;
}

/**
 * 提取分页数据
 * 兼容新旧两种响应格式
 *
 * @param response - Axios 响应对象
 * @returns 标准化的分页结果
 */
export function extractPaginatedData<T>(response: any): PaginatedResult<T> {
  const responseData = response.data;

  // 新格式: { code, message, data: { items, pagination }, timestamp }
  if (responseData?.code !== undefined && responseData?.data?.items !== undefined) {
    const { items, pagination } = responseData.data;
    return {
      items: items || [],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      pageSize: pagination?.page_size || 20,
      totalPages: pagination?.total_pages || 1,
    };
  }

  // 旧格式兼容1: { items, total, page, page_size, total_pages }
  if (responseData?.items !== undefined) {
    return {
      items: responseData.items || [],
      total: responseData.total || 0,
      page: responseData.page || 1,
      pageSize: responseData.page_size || 20,
      totalPages: responseData.total_pages || 1,
    };
  }

  // 旧格式兼容2: { data: [...], total, page, page_size }
  if (Array.isArray(responseData?.data)) {
    return {
      items: responseData.data || [],
      total: responseData.total || 0,
      page: responseData.page || 1,
      pageSize: responseData.page_size || 20,
      totalPages: responseData.total_pages || 1,
    };
  }

  // 旧格式兼容3: 直接是数组
  if (Array.isArray(responseData)) {
    return {
      items: responseData,
      total: responseData.length,
      page: 1,
      pageSize: responseData.length,
      totalPages: 1,
    };
  }

  // 兜底：返回空结果
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  };
}

/**
 * 检查响应是否成功
 *
 * @param response - Axios 响应对象
 * @returns 是否成功
 */
export function isSuccessResponse(response: any): boolean {
  // 检查 HTTP 状态码
  if (response.status < 200 || response.status >= 300) {
    return false;
  }

  // 检查业务状态码（如果存在）
  if (response.data?.code !== undefined) {
    return response.data.code === 200;
  }

  // 检查是否有错误标识
  if (response.data?.error !== undefined) {
    return !response.data.error;
  }

  // 默认认为成功
  return true;
}

/**
 * 提取错误信息
 *
 * @param error - 错误对象
 * @returns 错误消息
 */
export function extractErrorMessage(error: any): string {
  // 从响应中提取错误消息
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // 从错误对象中提取消息
  if (error.message) {
    return error.message;
  }

  // 默认错误消息
  return '操作失败，请稍后重试';
}

/**
 * 提取错误码
 *
 * @param error - 错误对象
 * @returns 错误码（如果存在）
 */
export function extractErrorCode(error: any): string | undefined {
  return error.response?.data?.error_code;
}

/**
 * 提取错误详情
 *
 * @param error - 错误对象
 * @returns 错误详情（如果存在）
 */
export function extractErrorDetails(error: any): Record<string, any> | undefined {
  return error.response?.data?.details;
}

/**
 * 格式化字段级错误消息
 * 用于显示表单验证错误
 *
 * @param details - 错误详情对象
 * @returns 格式化的错误消息
 */
export function formatFieldErrors(details?: Record<string, any>): string {
  if (!details) {
    return '';
  }

  const errors: string[] = [];
  for (const [field, messages] of Object.entries(details)) {
    if (Array.isArray(messages)) {
      errors.push(`${field}: ${messages.join(', ')}`);
    } else {
      errors.push(`${field}: ${messages}`);
    }
  }

  return errors.join('\n');
}

/**
 * 检查是否为网络错误
 *
 * @param error - 错误对象
 * @returns 是否为网络错误
 */
export function isNetworkError(error: any): boolean {
  return !error.response && error.request;
}

/**
 * 检查是否为超时错误
 *
 * @param error - 错误对象
 * @returns 是否为超时错误
 */
export function isTimeoutError(error: any): boolean {
  return error.code === 'ECONNABORTED' || error.message?.includes('timeout');
}

/**
 * 获取 HTTP 状态码
 *
 * @param error - 错误对象
 * @returns HTTP 状态码（如果存在）
 */
export function getStatusCode(error: any): number | undefined {
  return error.response?.status;
}
