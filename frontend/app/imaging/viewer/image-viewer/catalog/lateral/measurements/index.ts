import { Tool } from '../../../types';
import { ANNOTATION_CONFIGS } from '../../shared/annotation-config';

export const LATERAL_AUTOMATIC_MEASUREMENT_TOOL_IDS = [
  't1-slope',
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
] as const;

export const LATERAL_DEPENDENT_MEASUREMENT_TOOL_IDS = ['cl'] as const;

export const LATERAL_SELECTION_MEASUREMENT_TOOL_IDS = [
  'vertebra-center',
] as const;

export const LATERAL_RESTORABLE_MEASUREMENT_TOOL_IDS = [
  ...LATERAL_AUTOMATIC_MEASUREMENT_TOOL_IDS,
  ...LATERAL_DEPENDENT_MEASUREMENT_TOOL_IDS,
] as const;

const LATERAL_MEASUREMENT_TOOL_IDS = [
  ...LATERAL_AUTOMATIC_MEASUREMENT_TOOL_IDS,
  ...LATERAL_DEPENDENT_MEASUREMENT_TOOL_IDS,
  ...LATERAL_SELECTION_MEASUREMENT_TOOL_IDS,
] as const;

function toTool(toolId: string): Tool | null {
  const config = ANNOTATION_CONFIGS[toolId];
  if (!config) return null;

  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    description: config.description,
    pointsNeeded: config.pointsNeeded,
  };
}

export function getLateralMeasurementTools(): Tool[] {
  return LATERAL_MEASUREMENT_TOOL_IDS
    .map(toTool)
    .filter((tool): tool is Tool => tool !== null);
}

export function isLateralMeasurementTool(toolId: string): boolean {
  return LATERAL_MEASUREMENT_TOOL_IDS.includes(
    toolId as (typeof LATERAL_MEASUREMENT_TOOL_IDS)[number]
  );
}

export function isLateralRestorableMeasurementTool(toolId: string): boolean {
  return LATERAL_RESTORABLE_MEASUREMENT_TOOL_IDS.includes(
    toolId as (typeof LATERAL_RESTORABLE_MEASUREMENT_TOOL_IDS)[number]
  );
}

export function isLateralSelectionMeasurementTool(toolId: string): boolean {
  return LATERAL_SELECTION_MEASUREMENT_TOOL_IDS.includes(
    toolId as (typeof LATERAL_SELECTION_MEASUREMENT_TOOL_IDS)[number]
  );
}
