import type { Tool } from '../shared/annotation-config-types';
import { ANGLE_CONFIG } from './angle';
import { ARROW_CONFIG } from './arrow';
import { AUX_ANGLE_CONFIG } from './aux-angle';
import { AUX_HORIZONTAL_LINE_CONFIG } from './aux-horizontal-line';
import { AUX_LENGTH_CONFIG } from './aux-length';
import { AUX_VERTICAL_LINE_CONFIG } from './aux-vertical-line';
import { CIRCLE_CONFIG } from './circle';
import { ELLIPSE_CONFIG } from './ellipse';
import { LENGTH_CONFIG } from './length';
import { POLYGON_CONFIG } from './polygon';
import { RECTANGLE_CONFIG } from './rectangle';
import { VERTEBRA_CENTER_CONFIG } from './vertebra-center';
import {
  AUXILIARY_TOOL_IDS,
  getToolCapability,
  isAuxiliaryToolbarTool,
} from '@xiehe/imaging-core/measurements';
import { getLocalizedToolCopy } from '../../tools';

export { ANGLE_CONFIG } from './angle';
export { ARROW_CONFIG } from './arrow';
export { AUX_ANGLE_CONFIG } from './aux-angle';
export { AUX_HORIZONTAL_LINE_CONFIG } from './aux-horizontal-line';
export { AUX_LENGTH_CONFIG } from './aux-length';
export { AUX_VERTICAL_LINE_CONFIG } from './aux-vertical-line';
export { CIRCLE_CONFIG } from './circle';
export { ELLIPSE_CONFIG } from './ellipse';
export { LENGTH_CONFIG } from './length';
export { POLYGON_CONFIG } from './polygon';
export { RECTANGLE_CONFIG } from './rectangle';
export { VERTEBRA_CENTER_CONFIG } from './vertebra-center';

export const AUXILIARY_CONFIGS = {
  length: LENGTH_CONFIG,
  angle: ANGLE_CONFIG,
  circle: CIRCLE_CONFIG,
  ellipse: ELLIPSE_CONFIG,
  rectangle: RECTANGLE_CONFIG,
  arrow: ARROW_CONFIG,
  polygon: POLYGON_CONFIG,
  'vertebra-center': VERTEBRA_CENTER_CONFIG,
  'aux-length': AUX_LENGTH_CONFIG,
  'aux-angle': AUX_ANGLE_CONFIG,
  'aux-horizontal-line': AUX_HORIZONTAL_LINE_CONFIG,
  'aux-vertical-line': AUX_VERTICAL_LINE_CONFIG,
} as const;

function toTool(toolId: string): Tool | null {
  const config = AUXILIARY_CONFIGS[toolId as keyof typeof AUXILIARY_CONFIGS];
  const capability = getToolCapability(toolId);
  const copy = getLocalizedToolCopy(toolId);
  if (!config || !capability || !copy) return null;

  return {
    id: config.id,
    name: copy.name,
    icon: config.icon,
    description: copy.description,
    pointsNeeded: capability.pointsNeeded,
  };
}

export function getAuxiliaryTools(): Tool[] {
  return AUXILIARY_TOOL_IDS.map(toTool).filter(
    (tool): tool is Tool => tool !== null
  );
}

export function isAuxiliaryTool(toolId: string): boolean {
  return isAuxiliaryToolbarTool(toolId);
}
