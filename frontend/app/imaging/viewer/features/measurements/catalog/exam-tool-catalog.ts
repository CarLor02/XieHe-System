/**
 * 检查类型 -> 工具目录映射。
 * catalog 层负责工具清单，不再通过过渡 helper 聚合导出。
 */

import { Tool } from '@/app/imaging/viewer/shared/types';
import { getApMeasurementTools } from './ap/measurements';
import { getAuxiliaryTools } from './auxiliary';
import { getLateralMeasurementTools } from './lateral/measurements';
import { ANNOTATION_CONFIGS } from './shared/annotation-config';

function mapToolIdsToCatalog(toolIds: string[]): Tool[] {
  return toolIds
    .map(toolId => ANNOTATION_CONFIGS[toolId])
    .filter(Boolean)
    .map(config => ({
      id: config.id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      pointsNeeded: config.pointsNeeded,
    }));
}

/**
 * 获取正位 X 光片的工具列表
 */
export function getAnteriorTools(): Tool[] {
  return [...getApMeasurementTools(), ...getAuxiliaryTools()];
}

/**
 * 获取侧位 X 光片的工具列表
 */
export function getLateralTools(): Tool[] {
  return [...getLateralMeasurementTools(), ...getAuxiliaryTools()];
}

/**
 * 获取通用工具列表
 */
export function getGenericTools(): Tool[] {
  return [
    ...mapToolIdsToCatalog([
      'length',
      'angle',
      'vertebra-center',
    ]),
    ...getAuxiliaryTools(),
  ];
}

/**
 * 根据检查类型获取工具列表
 */
export function getToolsForExamType(examType: string): Tool[] {
  if (examType === '正位X光片') {
    return getAnteriorTools();
  }
  if (examType === '侧位X光片') {
    return getLateralTools();
  }
  return getGenericTools();
}
