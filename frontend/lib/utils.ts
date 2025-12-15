/**
 * 医疗影像诊断系统 - 工具函数库
 * 
 * 提供常用的工具函数，包括：
 * - cn: 用于合并和条件化 Tailwind CSS 类名
 * 
 * @author 医疗影像团队
 * @version 1.0.0
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名
 * 
 * 使用 clsx 进行条件化类名处理，使用 tailwind-merge 解决类名冲突
 * 
 * @param inputs - 类名或类名数组
 * @returns 合并后的类名字符串
 * 
 * @example
 * ```tsx
 * cn('px-2 py-1', isActive && 'bg-blue-500')
 * cn('px-2', 'px-4') // 'px-4' - tailwind-merge 会自动解决冲突
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
