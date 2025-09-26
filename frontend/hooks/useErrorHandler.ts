/**
 * 错误处理 React Hook
 * 
 * 提供统一的错误处理功能，包括错误捕获、报告和用户提示
 * 
 * 功能特性：
 * - 错误捕获和处理
 * - 自动错误报告
 * - 用户友好提示
 * - 错误重试机制
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { errorService, ErrorType, ErrorSeverity, handleError, handleApiError } from '@/services/errorService'

interface UseErrorHandlerOptions {
  enableAutoReport?: boolean
  enableToast?: boolean
  redirectOnAuthError?: boolean
  redirectPath?: string
}

interface UseErrorHandlerReturn {
  error: Error | null
  isError: boolean
  errorId: string | null
  handleError: (error: Error | string, options?: any) => string
  handleApiError: (error: any, context?: string) => string
  clearError: () => void
  retryLastAction: () => void
  reportError: (error: Error, context?: any) => Promise<void>
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    enableAutoReport = true,
    enableToast = true,
    redirectOnAuthError = true,
    redirectPath = '/auth/login'
  } = options
  
  const router = useRouter()
  const [error, setError] = useState<Error | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<(() => void) | null>(null)
  
  // 处理错误
  const handleErrorCallback = useCallback((
    error: Error | string,
    errorOptions: any = {}
  ): string => {
    const normalizedError = typeof error === 'string' ? new Error(error) : error
    setError(normalizedError)
    
    const id = handleError(normalizedError, {
      ...errorOptions,
      showToast: enableToast,
      reportError: enableAutoReport
    })
    
    setErrorId(id)
    
    // 处理认证错误重定向
    if (redirectOnAuthError && errorOptions.type === ErrorType.AUTHENTICATION) {
      setTimeout(() => {
        router.push(redirectPath)
      }, 2000)
    }
    
    return id
  }, [enableAutoReport, enableToast, redirectOnAuthError, redirectPath, router])
  
  // 处理API错误
  const handleApiErrorCallback = useCallback((
    error: any,
    context?: string
  ): string => {
    const id = handleApiError(error, context)
    
    // 如果是认证错误，设置错误状态
    if (error.response?.status === 401) {
      setError(new Error('认证失败'))
      setErrorId(id)
      
      if (redirectOnAuthError) {
        setTimeout(() => {
          router.push(redirectPath)
        }, 2000)
      }
    }
    
    return id
  }, [redirectOnAuthError, redirectPath, router])
  
  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
    setErrorId(null)
  }, [])
  
  // 重试上次操作
  const retryLastAction = useCallback(() => {
    if (lastAction) {
      clearError()
      lastAction()
    }
  }, [lastAction, clearError])
  
  // 设置重试操作
  const setRetryAction = useCallback((action: () => void) => {
    setLastAction(() => action)
  }, [])
  
  // 手动报告错误
  const reportError = useCallback(async (
    error: Error,
    context: any = {}
  ) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        context
      }
      
      await fetch('/api/v1/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })
    } catch (reportError) {
      console.error('手动错误报告失败:', reportError)
    }
  }, [])
  
  return {
    error,
    isError: !!error,
    errorId,
    handleError: handleErrorCallback,
    handleApiError: handleApiErrorCallback,
    clearError,
    retryLastAction,
    reportError
  }
}

// 异步操作错误处理Hook
export function useAsyncError() {
  const { handleError } = useErrorHandler()
  
  return useCallback((error: Error) => {
    handleError(error, {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      context: 'async_operation'
    })
  }, [handleError])
}

// API调用错误处理Hook
export function useApiErrorHandler() {
  const { handleApiError } = useErrorHandler()
  
  const wrapApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await apiCall()
    } catch (error) {
      handleApiError(error, context)
      return null
    }
  }, [handleApiError])
  
  return {
    wrapApiCall,
    handleApiError
  }
}

// 表单错误处理Hook
export function useFormErrorHandler() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const { handleApiError } = useErrorHandler()
  
  const handleFormError = useCallback((error: any) => {
    if (error.response?.status === 422) {
      // 验证错误
      const validationErrors = error.response.data.errors || []
      const newFieldErrors: Record<string, string> = {}
      
      validationErrors.forEach((err: any) => {
        if (err.field) {
          newFieldErrors[err.field] = err.message
        }
      })
      
      setFieldErrors(newFieldErrors)
      setGeneralError(null)
    } else {
      // 其他错误
      setFieldErrors({})
      setGeneralError(error.response?.data?.message || '提交失败，请重试')
      handleApiError(error, 'form_submission')
    }
  }, [handleApiError])
  
  const clearFormErrors = useCallback(() => {
    setFieldErrors({})
    setGeneralError(null)
  }, [])
  
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])
  
  return {
    fieldErrors,
    generalError,
    hasErrors: Object.keys(fieldErrors).length > 0 || !!generalError,
    handleFormError,
    clearFormErrors,
    clearFieldError
  }
}

// 网络状态错误处理Hook
export function useNetworkErrorHandler() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { handleError } = useErrorHandler()
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      handleError('网络连接已断开', {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        context: 'network_offline'
      })
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleError])
  
  return {
    isOnline,
    isOffline: !isOnline
  }
}
