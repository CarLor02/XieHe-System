/**
 * 响应式布局组件
 * 
 * 提供移动端适配的响应式布局解决方案
 * 
 * 功能特性：
 * - 移动端侧边栏折叠
 * - 响应式导航栏
 * - 触摸手势支持
 * - 屏幕尺寸适配
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// 断点定义
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

// 屏幕尺寸类型
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// 响应式布局属性
interface ResponsiveLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  className?: string
  sidebarWidth?: number
  headerHeight?: number
  enableMobileMenu?: boolean
  enableSwipeGestures?: boolean
}

// 移动端菜单覆盖层
interface MobileMenuOverlayProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const MobileMenuOverlay: React.FC<MobileMenuOverlayProps> = ({
  isOpen,
  onClose,
  children
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  if (!isOpen) return null
  
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 侧边栏内容 */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl transform transition-transform">
        {children}
      </div>
    </div>,
    document.body
  )
}

// 获取当前屏幕尺寸
const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('lg')
  
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      
      if (width >= breakpoints['2xl']) {
        setScreenSize('2xl')
      } else if (width >= breakpoints.xl) {
        setScreenSize('xl')
      } else if (width >= breakpoints.lg) {
        setScreenSize('lg')
      } else if (width >= breakpoints.md) {
        setScreenSize('md')
      } else if (width >= breakpoints.sm) {
        setScreenSize('sm')
      } else {
        setScreenSize('xs')
      }
    }
    
    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])
  
  return screenSize
}

// 滑动手势Hook
const useSwipeGestures = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 50
) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }, [])
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = Math.abs(touch.clientY - touchStart.y)
    
    // 只有水平滑动距离大于垂直滑动距离时才触发
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    }
    
    setTouchStart(null)
  }, [touchStart, threshold, onSwipeLeft, onSwipeRight])
  
  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
  className = '',
  sidebarWidth = 256,
  headerHeight = 64,
  enableMobileMenu = true,
  enableSwipeGestures = true
}) => {
  const screenSize = useScreenSize()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = screenSize === 'xs' || screenSize === 'sm' || screenSize === 'md'
  
  // 移动端菜单控制
  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true)
  }, [])
  
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])
  
  // 滑动手势支持
  useSwipeGestures(
    enableSwipeGestures ? closeMobileMenu : undefined,
    enableSwipeGestures ? openMobileMenu : undefined
  )
  
  // 响应式头部组件
  const ResponsiveHeader = () => {
    if (!header) return null
    
    return (
      <div
        className={`fixed top-0 right-0 z-40 bg-white border-b border-gray-200 ${
          isMobile ? 'left-0' : `left-${sidebarWidth}`
        }`}
        style={{
          height: headerHeight,
          left: isMobile ? 0 : sidebarWidth
        }}
      >
        <div className="flex items-center h-full px-4">
          {/* 移动端菜单按钮 */}
          {isMobile && enableMobileMenu && (
            <button
              onClick={openMobileMenu}
              className="mr-4 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="打开菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          {/* 头部内容 */}
          <div className="flex-1">
            {header}
          </div>
        </div>
      </div>
    )
  }
  
  // 响应式侧边栏组件
  const ResponsiveSidebar = () => {
    if (!sidebar) return null
    
    if (isMobile) {
      return (
        <MobileMenuOverlay isOpen={isMobileMenuOpen} onClose={closeMobileMenu}>
          <div className="h-full overflow-y-auto">
            {/* 移动端关闭按钮 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">菜单</h2>
              <button
                onClick={closeMobileMenu}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="关闭菜单"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 侧边栏内容 */}
            <div onClick={closeMobileMenu}>
              {sidebar}
            </div>
          </div>
        </MobileMenuOverlay>
      )
    }
    
    // 桌面端固定侧边栏
    return (
      <div
        className="fixed top-0 left-0 z-30 h-full bg-white border-r border-gray-200 overflow-y-auto"
        style={{ width: sidebarWidth }}
      >
        {sidebar}
      </div>
    )
  }
  
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* 响应式侧边栏 */}
      <ResponsiveSidebar />
      
      {/* 响应式头部 */}
      <ResponsiveHeader />
      
      {/* 主内容区域 */}
      <main
        className="transition-all duration-300"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          marginTop: header ? headerHeight : 0,
          minHeight: `calc(100vh - ${header ? headerHeight : 0}px)`
        }}
      >
        {children}
      </main>
    </div>
  )
}

export default ResponsiveLayout

// 响应式工具Hook
export const useResponsive = () => {
  const screenSize = useScreenSize()
  
  return {
    screenSize,
    isMobile: screenSize === 'xs' || screenSize === 'sm',
    isTablet: screenSize === 'md',
    isDesktop: screenSize === 'lg' || screenSize === 'xl' || screenSize === '2xl',
    isSmall: screenSize === 'xs' || screenSize === 'sm' || screenSize === 'md',
    isLarge: screenSize === 'lg' || screenSize === 'xl' || screenSize === '2xl'
  }
}

// 响应式容器组件
export const ResponsiveContainer: React.FC<{
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}> = ({ children, className = '', maxWidth = 'xl' }) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }
  
  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  )
}

// 响应式网格组件
type ResponsiveGridBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type SupportedGridColumn = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type SupportedGridGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

const gridColumnClasses: Record<
  ResponsiveGridBreakpoint,
  Record<SupportedGridColumn, string>
> = {
  xs: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  },
  sm: {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
    7: 'sm:grid-cols-7',
    8: 'sm:grid-cols-8',
    9: 'sm:grid-cols-9',
    10: 'sm:grid-cols-10',
    11: 'sm:grid-cols-11',
    12: 'sm:grid-cols-12',
  },
  md: {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    7: 'md:grid-cols-7',
    8: 'md:grid-cols-8',
    9: 'md:grid-cols-9',
    10: 'md:grid-cols-10',
    11: 'md:grid-cols-11',
    12: 'md:grid-cols-12',
  },
  lg: {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8',
    9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10',
    11: 'lg:grid-cols-11',
    12: 'lg:grid-cols-12',
  },
  xl: {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
    7: 'xl:grid-cols-7',
    8: 'xl:grid-cols-8',
    9: 'xl:grid-cols-9',
    10: 'xl:grid-cols-10',
    11: 'xl:grid-cols-11',
    12: 'xl:grid-cols-12',
  },
  '2xl': {
    1: '2xl:grid-cols-1',
    2: '2xl:grid-cols-2',
    3: '2xl:grid-cols-3',
    4: '2xl:grid-cols-4',
    5: '2xl:grid-cols-5',
    6: '2xl:grid-cols-6',
    7: '2xl:grid-cols-7',
    8: '2xl:grid-cols-8',
    9: '2xl:grid-cols-9',
    10: '2xl:grid-cols-10',
    11: '2xl:grid-cols-11',
    12: '2xl:grid-cols-12',
  },
};

const gridGapClasses: Record<SupportedGridGap, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

function getGridColumnClass(
  breakpoint: ResponsiveGridBreakpoint,
  count?: number
) {
  if (!count) return null;
  return gridColumnClasses[breakpoint][count as SupportedGridColumn] ?? null;
}

export const ResponsiveGrid: React.FC<{
  children: React.ReactNode
  className?: string
  cols?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
      '2xl'?: number
  }
  gap?: number
}> = ({ children, className = '', cols = { xs: 1, sm: 2, md: 3, lg: 4 }, gap = 4 }) => {
  const gapClass = gridGapClasses[gap as SupportedGridGap] ?? gridGapClasses[4];
  const gridClasses = [
    'grid',
    gapClass,
    getGridColumnClass('xs', cols.xs),
    getGridColumnClass('sm', cols.sm),
    getGridColumnClass('md', cols.md),
    getGridColumnClass('lg', cols.lg),
    getGridColumnClass('xl', cols.xl),
    getGridColumnClass('2xl', cols['2xl']),
    className
  ].filter(Boolean).join(' ')
  
  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}
