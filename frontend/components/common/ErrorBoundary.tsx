/**
 * React 错误边界组件
 * 
 * 捕获组件树中的JavaScript错误，记录错误并显示友好的错误界面
 * 
 * 功能特性：
 * - 错误捕获和记录
 * - 友好的错误界面
 * - 错误报告和重试机制
 * - 开发环境错误详情显示
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }
  
  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    this.setState({
      error,
      errorInfo
    })
    
    // 调用外部错误处理函数
    this.props.onError?.(error, errorInfo)
    
    // 发送错误报告到监控系统
    this.reportError(error, errorInfo)
  }
  
  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorId: this.state.errorId
      }
      
      // 发送到错误监控服务
      await fetch('/api/v1/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })
      
      console.error('错误已报告:', errorReport)
    } catch (reportError) {
      console.error('错误报告失败:', reportError)
    }
  }
  
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }
  
  private handleReload = () => {
    window.location.reload()
  }
  
  private handleGoHome = () => {
    window.location.href = '/'
  }
  
  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      // 默认错误界面
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              {/* 错误图标 */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              
              {/* 错误标题 */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  页面出现错误
                </h2>
                <p className="text-gray-600 mb-6">
                  很抱歉，页面遇到了一个意外错误。我们已经记录了这个问题，并会尽快修复。
                </p>
              </div>
              
              {/* 错误ID */}
              {this.state.errorId && (
                <div className="bg-gray-50 rounded-md p-3 mb-6">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">错误ID: </span>
                    <span className="font-mono text-gray-600">{this.state.errorId}</span>
                  </div>
                </div>
              )}
              
              {/* 开发环境错误详情 */}
              {this.props.showDetails && process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6">
                  <details className="bg-red-50 border border-red-200 rounded-md p-4">
                    <summary className="cursor-pointer font-medium text-red-800 mb-2">
                      错误详情 (开发模式)
                    </summary>
                    <div className="text-sm text-red-700 space-y-2">
                      <div>
                        <strong>错误消息:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{this.state.error.message}</pre>
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>错误堆栈:</strong>
                          <pre className="mt-1 text-xs whitespace-pre-wrap overflow-x-auto">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong>组件堆栈:</strong>
                          <pre className="mt-1 text-xs whitespace-pre-wrap overflow-x-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  重试
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={this.handleReload}
                    className="flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    刷新页面
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    返回首页
                  </button>
                </div>
              </div>
              
              {/* 联系支持 */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  如果问题持续存在，请联系技术支持
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  support@xiehe-medical.com
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return this.props.children
  }
}

export default ErrorBoundary

// 高阶组件：为组件添加错误边界
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook：在函数组件中使用错误边界
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // 在函数组件中手动触发错误边界
    throw error
  }
}
