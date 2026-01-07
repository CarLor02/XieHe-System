/**
 * Tooltip 组件
 * 
 * 提供人性化的提示信息，支持：
 * - 多个位置（上、下、左、右）
 * - 延迟显示
 * - 自定义样式
 * - 键盘导航支持
 * 
 * @author XieHe Medical System
 * @created 2025-01-07
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface TooltipProps {
  /**
   * 提示内容
   */
  content: string | React.ReactNode;
  /**
   * 子元素
   */
  children: React.ReactElement;
  /**
   * 位置
   */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * 延迟显示时间（毫秒）
   */
  delay?: number;
  /**
   * 是否禁用
   */
  disabled?: boolean;
  /**
   * 自定义类名
   */
  className?: string;
}

export const Tooltip = ({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false,
  className = '',
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
  };

  return (
    <div className="relative inline-block">
      {React.cloneElement(children as React.ReactElement<any>, {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
      })}
      
      {isVisible && !disabled && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`
            absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg
            whitespace-nowrap pointer-events-none
            ${positionClasses[position]}
            ${className}
            animate-in fade-in-0 zoom-in-95 duration-200
          `}
        >
          {content}
          <div
            className={`
              absolute w-0 h-0 border-4
              ${arrowClasses[position]}
            `}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;

