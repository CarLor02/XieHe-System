/**
 * 工具相关的工具函数
 * 处理工具类型判断、工具切换等逻辑
 */

import {
  AUXILIARY_TOOL_TYPES,
  HORIZONTAL_LINE_TOOLS,
  VERTICAL_LINE_TOOLS,
  STANDARD_DISTANCE_DEPENDENT_TYPES,
} from './constants';

/**
 * 检查是否为辅助工具
 * @param toolId 工具ID
 * @returns 是否为辅助工具
 */
export function isAuxiliaryTool(toolId: string): boolean {
  return AUXILIARY_TOOL_TYPES.includes(toolId as any);
}

/**
 * 检查测量类型是否为辅助图形
 * @param measurementType 测量类型名称
 * @returns 是否为辅助图形
 */
export function isAuxiliaryShape(measurementType: string): boolean {
  const auxiliaryShapeNames = [
    '圆形标注',
    '椭圆标注',
    '矩形标注',
    '箭头标注',
    '多边形标注',
    '锥体中心',
    '距离标注',
    '角度标注',
  ];
  return auxiliaryShapeNames.includes(measurementType);
}

/**
 * 检查工具是否需要水平参考线
 * @param toolId 工具ID
 * @returns 是否需要水平参考线
 */
export function needsHorizontalLine(toolId: string): boolean {
  return HORIZONTAL_LINE_TOOLS.some(tool => toolId.includes(tool));
}

/**
 * 检查工具是否需要垂直参考线
 * @param toolId 工具ID
 * @returns 是否需要垂直参考线
 */
export function needsVerticalLine(toolId: string): boolean {
  return VERTICAL_LINE_TOOLS.some(tool => toolId.includes(tool));
}

/**
 * 检查测量类型是否依赖标准距离
 * @param measurementType 测量类型
 * @returns 是否依赖标准距离
 */
export function dependsOnStandardDistance(measurementType: string): boolean {
  return STANDARD_DISTANCE_DEPENDENT_TYPES.includes(measurementType as any);
}

/**
 * 检查工具是否需要标准距离
 * @param toolId 工具ID
 * @returns 是否需要标准距离
 */
export function requiresStandardDistance(toolId: string): boolean {
  return toolId === 'avt' || toolId === 'ts';
}

/**
 * 获取工具的显示名称
 * @param toolId 工具ID
 * @returns 显示名称
 */
export function getToolDisplayName(toolId: string): string {
  const toolNames: Record<string, string> = {
    hand: '移动',
    circle: '圆形',
    ellipse: '椭圆',
    rectangle: '矩形',
    arrow: '箭头',
    polygon: '多边形',
    cobb: 'Cobb角',
    ca: '肩部角度',
    avt: 'AVT',
    ts: 'TS',
    sva: 'SVA',
    tk: 'TK',
    ll: 'LL',
    pi: 'PI',
    pt: 'PT',
    ss: 'SS',
    't1-tilt': 'T1倾斜',
    't1-slope': 'T1斜率',
    pelvic: '骨盆倾斜',
    sacral: '骶骨倾斜',
  };

  return toolNames[toolId] || toolId;
}

/**
 * 检查是否应该清理工具状态
 * @param oldTool 旧工具ID
 * @param newTool 新工具ID
 * @returns 是否应该清理状态
 */
export function shouldClearToolState(oldTool: string, newTool: string): boolean {
  // 如果从辅助工具切换到其他工具，需要清理状态
  const isLeavingAuxiliaryTool =
    isAuxiliaryTool(oldTool) && !isAuxiliaryTool(newTool);

  // 如果工具类型不同，需要清理状态
  const isDifferentToolType = oldTool !== newTool;

  return isLeavingAuxiliaryTool || isDifferentToolType;
}

/**
 * 获取工具所需的点数
 * @param tool 工具配置
 * @returns 所需点数
 */
export function getRequiredPointsCount(tool: { pointsNeeded: number }): number {
  return tool.pointsNeeded;
}

/**
 * 检查点数是否满足工具要求
 * @param currentPoints 当前点数
 * @param requiredPoints 所需点数
 * @returns 是否满足要求
 */
export function hasEnoughPoints(
  currentPoints: number,
  requiredPoints: number
): boolean {
  return currentPoints >= requiredPoints;
}

/**
 * 获取工具的图标类名
 * @param toolId 工具ID
 * @returns 图标类名
 */
export function getToolIcon(toolId: string): string {
  const toolIcons: Record<string, string> = {
    hand: 'ri-hand-line',
    circle: 'ri-checkbox-blank-circle-line',
    ellipse: 'ri-stop-line',
    rectangle: 'ri-checkbox-blank-line',
    arrow: 'ri-arrow-right-up-line',
    polygon: 'ri-shape-line',
    cobb: 'ri-ruler-line',
    ca: 'ri-ruler-2-line',
    avt: 'ri-align-vertically',
    ts: 'ri-align-vertically',
    sva: 'ri-align-vertically',
  };

  return toolIcons[toolId] || 'ri-tools-line';
}

