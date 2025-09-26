'use client'

/**
 * 认证路由守卫组件
 * 
 * 保护需要认证的路由，检查用户权限和角色
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, usePermissions } from '@/store/authStore'
import { Shield, AlertCircle, Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requiredPermissions?: string[]
  requiredRole?: string
  requireAnyPermission?: boolean // true: 需要任一权限, false: 需要所有权限
  fallbackPath?: string
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
}

export default function AuthGuard({
  children,
  requiredPermissions = [],
  requiredRole,
  requireAnyPermission = false,
  fallbackPath = '/auth/login',
  loadingComponent,
  unauthorizedComponent
}: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, user, fetchUserInfo } = useUser()
  const { hasPermission, hasRole, hasAnyPermission } = usePermissions()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)

      // 检查是否已认证
      if (!isAuthenticated) {
        router.push(fallbackPath)
        return
      }

      // 如果用户信息不存在，尝试获取
      if (!user) {
        const success = await fetchUserInfo()
        if (!success) {
          router.push(fallbackPath)
          return
        }
      }

      // 检查角色权限
      if (requiredRole && !hasRole(requiredRole)) {
        setIsAuthorized(false)
        setIsLoading(false)
        return
      }

      // 检查具体权限
      if (requiredPermissions.length > 0) {
        const hasRequiredPermissions = requireAnyPermission
          ? hasAnyPermission(requiredPermissions)
          : requiredPermissions.every(permission => hasPermission(permission))

        if (!hasRequiredPermissions) {
          setIsAuthorized(false)
          setIsLoading(false)
          return
        }
      }

      setIsAuthorized(true)
      setIsLoading(false)
    }

    checkAuth()
  }, [
    isAuthenticated,
    user,
    requiredPermissions,
    requiredRole,
    requireAnyPermission,
    router,
    fallbackPath,
    fetchUserInfo,
    hasPermission,
    hasRole,
    hasAnyPermission
  ])

  // 加载中状态
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">验证用户权限中...</p>
        </div>
      </div>
    )
  }

  // 权限不足状态
  if (!isAuthorized) {
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">访问被拒绝</h2>
          <p className="text-gray-600 mb-6">
            您没有访问此页面的权限。请联系管理员获取相应权限。
          </p>
          
          <div className="space-y-3 text-sm text-gray-500">
            {requiredRole && (
              <div className="flex items-center justify-between">
                <span>需要角色:</span>
                <span className="font-medium">{requiredRole}</span>
              </div>
            )}
            {requiredPermissions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span>需要权限:</span>
                  <span className="font-medium">
                    {requireAnyPermission ? '任一权限' : '所有权限'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  {requiredPermissions.map((permission, index) => (
                    <div key={index} className="text-xs">
                      • {permission}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 space-y-2">
            <button
              onClick={() => router.back()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              返回上一页
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 权限验证通过，渲染子组件
  return <>{children}</>
}

// 权限守卫组件
interface PermissionGuardProps {
  children: React.ReactNode
  permissions: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
}

export function PermissionGuard({
  children,
  permissions,
  requireAll = false,
  fallback
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission } = usePermissions()

  const hasRequiredPermissions = requireAll
    ? permissions.every(permission => hasPermission(permission))
    : hasAnyPermission(permissions)

  if (!hasRequiredPermissions) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-yellow-600 mr-2" />
          <p className="text-yellow-800">您没有查看此内容的权限</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// 角色守卫组件
interface RoleGuardProps {
  children: React.ReactNode
  roles: string[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, roles, fallback }: RoleGuardProps) {
  const { hasRole } = usePermissions()

  const hasRequiredRole = roles.some(role => hasRole(role))

  if (!hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">您的角色无权访问此内容</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// 认证检查 Hook
export function useAuthGuard() {
  const { isAuthenticated, user } = useUser()
  const { hasPermission, hasRole, hasAnyPermission } = usePermissions()
  const router = useRouter()

  const requireAuth = (redirectPath = '/auth/login') => {
    if (!isAuthenticated) {
      router.push(redirectPath)
      return false
    }
    return true
  }

  const requirePermission = (permission: string, redirectPath?: string) => {
    if (!requireAuth(redirectPath)) return false
    
    if (!hasPermission(permission)) {
      if (redirectPath) {
        router.push(redirectPath)
      }
      return false
    }
    return true
  }

  const requireRole = (role: string, redirectPath?: string) => {
    if (!requireAuth(redirectPath)) return false
    
    if (!hasRole(role)) {
      if (redirectPath) {
        router.push(redirectPath)
      }
      return false
    }
    return true
  }

  const requireAnyPermission = (permissions: string[], redirectPath?: string) => {
    if (!requireAuth(redirectPath)) return false
    
    if (!hasAnyPermission(permissions)) {
      if (redirectPath) {
        router.push(redirectPath)
      }
      return false
    }
    return true
  }

  return {
    isAuthenticated,
    user,
    requireAuth,
    requirePermission,
    requireRole,
    requireAnyPermission,
    hasPermission,
    hasRole,
    hasAnyPermission
  }
}
