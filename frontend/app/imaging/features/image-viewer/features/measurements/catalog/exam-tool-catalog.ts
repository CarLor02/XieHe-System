/**
 * 检查类型 -> 工具目录映射。
 * catalog 层负责工具清单，不再通过过渡 helper 聚合导出。
 */

import { Tool } from '@/app/imaging/features/image-viewer/shared/types';
import { ANNOTATION_CONFIGS } from '@xiehe/imaging-catalog/annotations';
import {
  AP_MEASUREMENT_TOOL_IDS,
  AUXILIARY_TOOL_IDS,
  GENERIC_MEASUREMENT_TOOL_IDS,
  LATERAL_MEASUREMENT_TOOL_IDS,
  getToolCapability,
  getToolIdsForExamType,
} from '@xiehe/imaging-core/measurements';
import { getLocalizedToolCopy } from '@xiehe/imaging-catalog/tools';

function mapToolIdsToCatalog(toolIds: readonly string[]): Tool[] {
  return toolIds
    .flatMap(toolId => {
      const config = ANNOTATION_CONFIGS[toolId];
      const capability = getToolCapability(toolId);
      const copy = getLocalizedToolCopy(toolId);
      return config && capability && copy ? [{ config, capability, copy }] : [];
    })
    .map(({ config, capability, copy }) => ({
      id: config.id,
      name: copy.name,
      icon: config.icon,
      description: copy.description,
      pointsNeeded: capability.pointsNeeded,
    }));
}

/**
 * 获取正位 X 光片的工具列表
 */
export function getAnteriorTools(): Tool[] {
  return mapToolIdsToCatalog([
    ...AP_MEASUREMENT_TOOL_IDS,
    ...AUXILIARY_TOOL_IDS,
  ]);
}

/**
 * 获取侧位 X 光片的工具列表
 */
export function getLateralTools(): Tool[] {
  return mapToolIdsToCatalog([
    ...LATERAL_MEASUREMENT_TOOL_IDS,
    ...AUXILIARY_TOOL_IDS,
  ]);
}

/**
 * 获取通用工具列表
 */
export function getGenericTools(): Tool[] {
  return mapToolIdsToCatalog([
    ...GENERIC_MEASUREMENT_TOOL_IDS,
    ...AUXILIARY_TOOL_IDS,
  ]);
}

/**
 * 根据检查类型获取工具列表
 */
export function getToolsForExamType(examType: string): Tool[] {
  return mapToolIdsToCatalog(getToolIdsForExamType(examType));
}
