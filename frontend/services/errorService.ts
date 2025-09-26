/**
 * 全局错误处理服务
 *
 * 提供统一的错误处理、记录和报告功能
 *
 * 功能特性：
 * - 错误分类和处理
 * - 错误报告和监控
 * - 用户友好的错误提示
 * - 错误重试机制
 *
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

import { toast } from 'react-hot-toast';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 错误信息接口
export interface ErrorInfo {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
}

// 错误处理配置
interface ErrorHandlerConfig {
  enableReporting: boolean;
  enableToast: boolean;
  enableConsoleLog: boolean;
  reportEndpoint: string;
  maxRetries: number;
  retryDelay: number;
}

class ErrorService {
  private config: ErrorHandlerConfig = {
    enableReporting: true,
    enableToast: true,
    enableConsoleLog: true,
    reportEndpoint: '/api/v1/errors/report',
    maxRetries: 3,
    retryDelay: 1000,
  };

  private errorQueue: ErrorInfo[] = [];
  private isReporting = false;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  // 设置全局错误处理器
  private setupGlobalErrorHandlers() {
    // 只在客户端设置错误处理器
    if (typeof window === 'undefined') return;

    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', event => {
      this.handleError(event.reason, {
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        context: 'unhandledrejection',
      });
    });

    // 捕获全局JavaScript错误
    window.addEventListener('error', event => {
      this.handleError(event.error || new Error(event.message), {
        type: ErrorType.CLIENT,
        severity: ErrorSeverity.MEDIUM,
        context: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }

  // 主要错误处理方法
  public handleError(
    error: Error | string | any,
    options: {
      type?: ErrorType;
      severity?: ErrorSeverity;
      context?: string;
      showToast?: boolean;
      reportError?: boolean;
      [key: string]: any;
    } = {}
  ): string {
    const errorId = this.generateErrorId();

    // 标准化错误对象
    const normalizedError = this.normalizeError(error);

    // 确定错误类型和严重程度
    const errorType = options.type || this.determineErrorType(normalizedError);
    const severity =
      options.severity || this.determineSeverity(normalizedError, errorType);

    // 创建错误信息对象
    const errorInfo: ErrorInfo = {
      id: errorId,
      type: errorType,
      severity,
      message: this.getErrorMessage(normalizedError, errorType),
      details: {
        originalError: normalizedError,
        context: options.context,
        ...options,
      },
      stack: normalizedError.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
    };

    // 控制台日志
    if (this.config.enableConsoleLog) {
      this.logError(errorInfo);
    }

    // 显示用户提示
    if (options.showToast !== false && this.config.enableToast) {
      this.showErrorToast(errorInfo);
    }

    // 报告错误
    if (options.reportError !== false && this.config.enableReporting) {
      this.reportError(errorInfo);
    }

    return errorId;
  }

  // 处理API错误
  public handleApiError(error: any, context?: string): string {
    const response = error.response;

    if (!response) {
      // 网络错误
      return this.handleError(error, {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        context: context || 'api_network_error',
      });
    }

    const status = response.status;
    const data = response.data;

    let errorType: ErrorType;
    let severity: ErrorSeverity;

    switch (status) {
      case 400:
        errorType = ErrorType.VALIDATION;
        severity = ErrorSeverity.LOW;
        break;
      case 401:
        errorType = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.MEDIUM;
        break;
      case 403:
        errorType = ErrorType.AUTHORIZATION;
        severity = ErrorSeverity.MEDIUM;
        break;
      case 404:
        errorType = ErrorType.NOT_FOUND;
        severity = ErrorSeverity.LOW;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = ErrorType.SERVER;
        severity = ErrorSeverity.HIGH;
        break;
      default:
        errorType = ErrorType.UNKNOWN;
        severity = ErrorSeverity.MEDIUM;
    }

    return this.handleError(error, {
      type: errorType,
      severity,
      context: context || 'api_error',
      apiStatus: status,
      apiData: data,
    });
  }

  // 标准化错误对象
  private normalizeError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error && typeof error === 'object') {
      return new Error(error.message || JSON.stringify(error));
    }

    return new Error('Unknown error');
  }

  // 确定错误类型
  private determineErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }

    if (
      message.includes('unauthorized') ||
      message.includes('authentication')
    ) {
      return ErrorType.AUTHENTICATION;
    }

    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorType.AUTHORIZATION;
    }

    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.NOT_FOUND;
    }

    return ErrorType.UNKNOWN;
  }

  // 确定错误严重程度
  private determineSeverity(error: Error, type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.NETWORK:
      case ErrorType.SERVER:
        return ErrorSeverity.HIGH;
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return ErrorSeverity.MEDIUM;
      case ErrorType.VALIDATION:
      case ErrorType.NOT_FOUND:
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  // 获取用户友好的错误消息
  private getErrorMessage(error: Error, type: ErrorType): string {
    const errorMessages = {
      [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
      [ErrorType.VALIDATION]: '输入数据有误，请检查后重试',
      [ErrorType.AUTHENTICATION]: '身份验证失败，请重新登录',
      [ErrorType.AUTHORIZATION]: '您没有执行此操作的权限',
      [ErrorType.NOT_FOUND]: '请求的资源不存在',
      [ErrorType.SERVER]: '服务器内部错误，请稍后重试',
      [ErrorType.CLIENT]: '页面出现错误，请刷新后重试',
      [ErrorType.UNKNOWN]: '发生未知错误，请联系技术支持',
    };

    return errorMessages[type] || error.message;
  }

  // 显示错误提示
  private showErrorToast(errorInfo: ErrorInfo) {
    const toastOptions = {
      duration: this.getToastDuration(errorInfo.severity),
      position: 'top-right' as const,
    };

    switch (errorInfo.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        toast.error(errorInfo.message, toastOptions);
        break;
      case ErrorSeverity.MEDIUM:
        toast.error(errorInfo.message, toastOptions);
        break;
      case ErrorSeverity.LOW:
        toast(errorInfo.message, toastOptions);
        break;
    }
  }

  // 获取提示持续时间
  private getToastDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 8000;
      case ErrorSeverity.HIGH:
        return 6000;
      case ErrorSeverity.MEDIUM:
        return 4000;
      case ErrorSeverity.LOW:
        return 3000;
      default:
        return 4000;
    }
  }

  // 控制台日志
  private logError(errorInfo: ErrorInfo) {
    const logMethod = this.getLogMethod(errorInfo.severity);
    logMethod(
      `[${errorInfo.severity.toUpperCase()}] ${errorInfo.type}: ${errorInfo.message}`
    );
    logMethod('Error Details:', errorInfo);
  }

  // 获取日志方法
  private getLogMethod(severity: ErrorSeverity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return console.error;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.LOW:
        return console.info;
      default:
        return console.log;
    }
  }

  // 报告错误到服务器
  private async reportError(errorInfo: ErrorInfo) {
    this.errorQueue.push(errorInfo);

    if (!this.isReporting) {
      this.processErrorQueue();
    }
  }

  // 处理错误队列
  private async processErrorQueue() {
    if (this.isReporting || this.errorQueue.length === 0) {
      return;
    }

    this.isReporting = true;

    while (this.errorQueue.length > 0) {
      const errorInfo = this.errorQueue.shift()!;

      try {
        await fetch(this.config.reportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorInfo),
        });
      } catch (reportError) {
        console.error('Failed to report error:', reportError);
        // 重新加入队列，但限制重试次数
        if (
          !errorInfo.details.retryCount ||
          errorInfo.details.retryCount < this.config.maxRetries
        ) {
          errorInfo.details.retryCount =
            (errorInfo.details.retryCount || 0) + 1;
          this.errorQueue.push(errorInfo);
        }
      }
    }

    this.isReporting = false;
  }

  // 生成错误ID
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取当前用户ID
  private getCurrentUserId(): string | undefined {
    // 这里应该从认证状态中获取用户ID
    try {
      const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
      return authStore.state?.user?.id;
    } catch {
      return undefined;
    }
  }

  // 获取会话ID
  private getSessionId(): string | undefined {
    // 这里应该从会话管理中获取会话ID
    return sessionStorage.getItem('session-id') || undefined;
  }

  // 更新配置
  public updateConfig(newConfig: Partial<ErrorHandlerConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // 获取错误统计
  public getErrorStats() {
    // 这里可以返回错误统计信息
    return {
      queueLength: this.errorQueue.length,
      isReporting: this.isReporting,
    };
  }
}

// 创建全局错误服务实例
export const errorService = new ErrorService();

// 导出便捷方法
export const handleError = errorService.handleError.bind(errorService);
export const handleApiError = errorService.handleApiError.bind(errorService);
