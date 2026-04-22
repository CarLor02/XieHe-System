/**
 * 检查类型 -> 工具目录映射。
 * catalog 层负责工具清单，不再通过过渡 helper 聚合导出。
 */

import { Tool } from '../types';
import { ANNOTATION_CONFIGS } from './annotation-catalog';

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
  return mapToolIdsToCatalog([
    't1-tilt',
    'cobb',
    'ca',
    'pelvic',
    'sacral',
    'avt',
    'tts',
    'lld',
    'c7-offset',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon',
    'vertebra-center',
    'aux-length',
    'aux-angle',
    'aux-horizontal-line',
    'aux-vertical-line',
  ]);
}

/**
 * 获取侧位 X 光片的工具列表
 */
export function getLateralTools(): Tool[] {
  return mapToolIdsToCatalog([
    't1-slope',
    'cl',
    'tk-t2-t5',
    'tk-t5-t12',
    't10-l2',
    'll-l1-s1',
    'll-l1-l4',
    'll-l4-s1',
    'tpa',
    'sva',
    'pi',
    'pt',
    'ss',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon',
    'vertebra-center',
    'aux-length',
    'aux-angle',
    'aux-horizontal-line',
    'aux-vertical-line',
  ]);
}

/**
 * 获取通用工具列表
 */
export function getGenericTools(): Tool[] {
  return mapToolIdsToCatalog([
    'length',
    'angle',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon',
    'vertebra-center',
    'aux-length',
    'aux-angle',
    'aux-horizontal-line',
    'aux-vertical-line',
  ]);
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
