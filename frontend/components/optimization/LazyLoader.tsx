/**
 * 前端性能优化 - 懒加载组件
 * 
 * 提供代码分割、懒加载、性能监控等功能
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react'
import { ErrorBoundary } from '../common/ErrorBoundary'

// 性能监控接口
interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  componentName: string
  timestamp: number
}

// 懒加载配置
interface LazyLoadConfig {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

// 性能监控Hook
export const usePerformanceMonitor = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      setMetrics({
        loadTime,
        renderTime: loadTime,
        componentName,
        timestamp: Date.now()
      })
      
      // 发送性能数据到监控系统
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'performance_timing', {
          event_category: 'Component',
          event_label: componentName,
          value: Math.round(loadTime)
        })
      }
    }
  }, [componentName])

  return metrics
}

// 懒加载组件包装器
export const LazyComponent: React.FC<{
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
  componentName?: string
}> = ({ 
  children, 
  fallback = <div className="loading-spinner">加载中...</div>,
  errorFallback = <div className="error-message">加载失败</div>,
  componentName = 'LazyComponent'
}) => {
  const metrics = usePerformanceMonitor(componentName)

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// 图片懒加载组件
export const LazyImage: React.FC<{
  src: string
  alt: string
  className?: string
  placeholder?: string
  config?: LazyLoadConfig
}> = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = '/images/placeholder.jpg',
  config = {}
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [imgRef, setImgRef] = useState<HTMLImageElement | null>(null)

  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = config

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            if (triggerOnce) {
              observer.unobserve(entry.target)
            }
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    observer.observe(imgRef)

    return () => {
      if (imgRef) {
        observer.unobserve(imgRef)
      }
    }
  }, [imgRef, threshold, rootMargin, triggerOnce])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  const handleError = useCallback(() => {
    console.error(`Failed to load image: ${src}`)
  }, [src])

  return (
    <div className={`lazy-image-container ${className}`}>
      <img
        ref={setImgRef}
        src={isInView ? src : placeholder}
        alt={alt}
        className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
      {!isLoaded && isInView && (
        <div className="image-loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  )
}

// 虚拟滚动组件
export const VirtualList: React.FC<{
  items: any[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: any, index: number) => React.ReactNode
  overscan?: number
}> = ({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem, 
  overscan = 5 
}) => {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  )

  const startIndex = Math.max(0, visibleStart - overscan)
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan)

  const visibleItems = items.slice(startIndex, endIndex + 1)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div
      className="virtual-list-container"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div
        className="virtual-list-spacer"
        style={{ height: items.length * itemHeight }}
      >
        <div
          className="virtual-list-content"
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              className="virtual-list-item"
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 代码分割工具函数
export const createLazyComponent = (importFunc: () => Promise<any>) => {
  return lazy(importFunc)
}

// 预加载工具函数
export const preloadComponent = (importFunc: () => Promise<any>) => {
  return importFunc()
}

// 批量预加载
export const preloadComponents = (importFuncs: (() => Promise<any>)[]) => {
  return Promise.all(importFuncs.map(func => func()))
}

// 性能优化Hook
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps)
}

export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return React.useMemo(factory, deps)
}

// 防抖Hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// 节流Hook
export const useThrottle = <T>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = React.useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, limit - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
    }
  }, [value, limit])

  return throttledValue
}

// 资源预加载Hook
export const useResourcePreload = () => {
  const preloadImage = useCallback((src: string) => {
    const img = new Image()
    img.src = src
  }, [])

  const preloadScript = useCallback((src: string) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'script'
    link.href = src
    document.head.appendChild(link)
  }, [])

  const preloadStyle = useCallback((href: string) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    document.head.appendChild(link)
  }, [])

  return {
    preloadImage,
    preloadScript,
    preloadStyle
  }
}

// 内存优化Hook
export const useMemoryOptimization = () => {
  const [memoryUsage, setMemoryUsage] = useState<number>(0)

  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryUsage(memory.usedJSHeapSize / memory.jsHeapSizeLimit)
      }
    }

    const interval = setInterval(updateMemoryUsage, 5000)
    updateMemoryUsage()

    return () => clearInterval(interval)
  }, [])

  const clearCache = useCallback(() => {
    // 清理缓存的逻辑
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
  }, [])

  return {
    memoryUsage,
    clearCache
  }
}

// 性能监控组件
export const PerformanceMonitor: React.FC<{
  children: React.ReactNode
  onMetrics?: (metrics: PerformanceMetrics) => void
}> = ({ children, onMetrics }) => {
  const [renderTime, setRenderTime] = useState<number>(0)

  useEffect(() => {
    const startTime = performance.now()

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          const metrics: PerformanceMetrics = {
            loadTime: entry.duration,
            renderTime: performance.now() - startTime,
            componentName: entry.name,
            timestamp: Date.now()
          }
          
          setRenderTime(metrics.renderTime)
          onMetrics?.(metrics)
        }
      })
    })

    observer.observe({ entryTypes: ['measure'] })

    return () => {
      observer.disconnect()
    }
  }, [onMetrics])

  return (
    <div className="performance-monitor">
      {children}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-info">
          渲染时间: {renderTime.toFixed(2)}ms
        </div>
      )}
    </div>
  )
}

// 导出所有优化工具
export const OptimizationUtils = {
  LazyComponent,
  LazyImage,
  VirtualList,
  createLazyComponent,
  preloadComponent,
  preloadComponents,
  usePerformanceMonitor,
  useOptimizedCallback,
  useOptimizedMemo,
  useDebounce,
  useThrottle,
  useResourcePreload,
  useMemoryOptimization,
  PerformanceMonitor
}
