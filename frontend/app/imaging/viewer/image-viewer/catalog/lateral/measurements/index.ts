import { Tool } from '../../../types';
import { VERTEBRA_CENTER_CONFIG } from '../../auxiliary/vertebra-center';
import { CL_CONFIG } from './cl';
import { LL_L1_L4_CONFIG } from './ll-l1-l4';
import { LL_L1_S1_CONFIG } from './ll-l1-s1';
import { LL_L4_S1_CONFIG } from './ll-l4-s1';
import { PI_CONFIG } from './pi';
import { PT_CONFIG } from './pt';
import { SS_CONFIG } from './ss';
import { SVA_CONFIG } from './sva';
import { T10_L2_CONFIG } from './t10-l2';
import { T1_SLOPE_CONFIG } from './t1-slope';
import { TK_T2_T5_CONFIG } from './tk-t2-t5';
import { TK_T5_T12_CONFIG } from './tk-t5-t12';
import { TPA_CONFIG } from './tpa';

export { CL_CONFIG } from './cl';
export { LL_L1_L4_CONFIG } from './ll-l1-l4';
export { LL_L1_S1_CONFIG } from './ll-l1-s1';
export { LL_L4_S1_CONFIG } from './ll-l4-s1';
export { PI_CONFIG } from './pi';
export { PT_CONFIG } from './pt';
export { SS_CONFIG } from './ss';
export { SVA_CONFIG } from './sva';
export { T10_L2_CONFIG } from './t10-l2';
export { T1_SLOPE_CONFIG } from './t1-slope';
export { TK_T2_T5_CONFIG } from './tk-t2-t5';
export { TK_T5_T12_CONFIG } from './tk-t5-t12';
export { TPA_CONFIG } from './tpa';

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

export const LATERAL_SELECTION_MEASUREMENT_TOOL_IDS = [] as const;

export const LATERAL_RESTORABLE_MEASUREMENT_TOOL_IDS = [
  ...LATERAL_AUTOMATIC_MEASUREMENT_TOOL_IDS,
  ...LATERAL_DEPENDENT_MEASUREMENT_TOOL_IDS,
] as const;

const LATERAL_MEASUREMENT_TOOL_IDS = [
  ...LATERAL_AUTOMATIC_MEASUREMENT_TOOL_IDS,
  ...LATERAL_DEPENDENT_MEASUREMENT_TOOL_IDS,
] as const;

export const LATERAL_MEASUREMENT_CONFIGS = {
  't1-slope': T1_SLOPE_CONFIG,
  cl: CL_CONFIG,
  'c2-c7-cl': CL_CONFIG,
  'tk-t2-t5': TK_T2_T5_CONFIG,
  'tk-t5-t12': TK_T5_T12_CONFIG,
  't10-l2': T10_L2_CONFIG,
  'll-l1-s1': LL_L1_S1_CONFIG,
  'll-l1-l4': LL_L1_L4_CONFIG,
  'll-l4-s1': LL_L4_S1_CONFIG,
  tpa: TPA_CONFIG,
  sva: SVA_CONFIG,
  pi: PI_CONFIG,
  pt: PT_CONFIG,
  ss: SS_CONFIG,
  'vertebra-center': VERTEBRA_CENTER_CONFIG,
} as const;

function toTool(toolId: string): Tool | null {
  const config =
    LATERAL_MEASUREMENT_CONFIGS[
      toolId as keyof typeof LATERAL_MEASUREMENT_CONFIGS
    ];
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
  return LATERAL_MEASUREMENT_TOOL_IDS.map(toTool).filter(
    (tool): tool is Tool => tool !== null
  );
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
