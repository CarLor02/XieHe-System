import { ANNOTATION_CONFIGS } from '../annotations';
import type { Tool } from '../annotations/shared/annotation-config-types';
import {
  AP_MEASUREMENT_TOOL_IDS,
  AUXILIARY_TOOL_IDS,
  GENERIC_MEASUREMENT_TOOL_IDS,
  LATERAL_MEASUREMENT_TOOL_IDS,
  getToolCapability,
  getToolIdsForExamType,
} from '@xiehe/imaging-core/measurements';
import { getLocalizedToolCopy } from './tool-copy';

function mapToolIdsToCatalog(toolIds: readonly string[]): Tool[] {
  return toolIds.flatMap(toolId => {
    const config = ANNOTATION_CONFIGS[toolId];
    const capability = getToolCapability(toolId);
    const copy = getLocalizedToolCopy(toolId);
    if (!config || !capability || !copy) return [];
    return [
      {
        id: config.id,
        name: copy.name,
        icon: config.icon,
        description: copy.description,
        pointsNeeded: capability.pointsNeeded,
      },
    ];
  });
}

export function getAnteriorTools(): Tool[] {
  return mapToolIdsToCatalog([
    ...AP_MEASUREMENT_TOOL_IDS,
    ...AUXILIARY_TOOL_IDS,
  ]);
}

export function getLateralTools(): Tool[] {
  return mapToolIdsToCatalog([
    ...LATERAL_MEASUREMENT_TOOL_IDS,
    ...AUXILIARY_TOOL_IDS,
  ]);
}

export function getGenericTools(): Tool[] {
  return mapToolIdsToCatalog([
    ...GENERIC_MEASUREMENT_TOOL_IDS,
    ...AUXILIARY_TOOL_IDS,
  ]);
}

export function getToolsForExamType(examType: string): Tool[] {
  return mapToolIdsToCatalog(getToolIdsForExamType(examType));
}
