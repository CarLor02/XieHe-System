/**
 * 工具相关的工具函数
 * 处理工具类型判断、工具切换等逻辑
 */

import {
  AUXILIARY_TOOL_TYPES,
  HORIZONTAL_LINE_TOOLS,
  STANDARD_DISTANCE_DEPENDENT_TYPES,
  VERTICAL_LINE_TOOLS,
} from '../constants';
import type { Point } from '../../../shared/domain/contracts';
import { getAnnotationTypeId } from '../../../measurements';
import type { ReferenceLines } from '../model/canvas-state';

function includesToolId(values: readonly string[], toolId: string): boolean {
  return values.includes(toolId);
}

/**
 * 检查是否为辅助工具
 * @param toolId 工具ID
 * @returns 是否为辅助工具
 */
export function isAuxiliaryTool(toolId: string): boolean {
  return includesToolId(AUXILIARY_TOOL_TYPES, toolId);
}

/**
 * 检查测量类型是否为辅助图形
 * @param measurementType 测量类型名称
 * @returns 是否为辅助图形
 */
export function isAuxiliaryShape(measurementType: string): boolean {
  return includesToolId(
    AUXILIARY_TOOL_TYPES,
    getAnnotationTypeId(measurementType)
  );
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
  return includesToolId(
    STANDARD_DISTANCE_DEPENDENT_TYPES,
    getAnnotationTypeId(measurementType)
  );
}

/**
 * 检查工具是否需要标准距离
 * @param toolId 工具ID
 * @returns 是否需要标准距离
 */
export function requiresStandardDistance(toolId: string): boolean {
  return toolId === 'avt' || toolId === 'tts';
}

/**
 * 检查是否应该清理工具状态
 * @param oldTool 旧工具ID
 * @param newTool 新工具ID
 * @returns 是否应该清理状态
 */
export function shouldClearToolState(
  oldTool: string,
  newTool: string
): boolean {
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

export function constrainAuxiliaryLinePoint(
  toolId: string,
  anchor: Point,
  rawPoint: Point
): Point {
  if (toolId === 'aux-horizontal-line') {
    return { x: rawPoint.x, y: anchor.y };
  }
  if (toolId === 'aux-vertical-line') {
    return { x: anchor.x, y: rawPoint.y };
  }
  return rawPoint;
}

export function retainReferenceLinesForTool(
  referenceLines: ReferenceLines,
  toolId: string
): ReferenceLines {
  return {
    ...referenceLines,
    t1Tilt:
      toolId.includes('t1-tilt') || toolId.includes('t1-slope')
        ? referenceLines.t1Tilt
        : null,
    ca: toolId.includes('ca') ? referenceLines.ca : null,
    po: toolId === 'po' ? referenceLines.po : null,
    css: toolId === 'css' ? referenceLines.css : null,
    avt: toolId.includes('avt') ? referenceLines.avt : null,
    ts: toolId === 'ts' ? referenceLines.ts : null,
    lld: toolId.includes('lld') ? referenceLines.lld : null,
    ss: toolId.includes('ss') ? referenceLines.ss : null,
    sva: toolId.includes('sva') ? referenceLines.sva : null,
    horizontalLine:
      toolId === 'aux-horizontal-line' ? referenceLines.horizontalLine : null,
    verticalLine:
      toolId === 'aux-vertical-line' ? referenceLines.verticalLine : null,
  };
}
