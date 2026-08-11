import { Tool } from '@/app/imaging/features/image-viewer/shared/types';
import { ANGLE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/angle';
import { ARROW_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/arrow';
import { AUX_ANGLE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/aux-angle';
import { AUX_HORIZONTAL_LINE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/aux-horizontal-line';
import { AUX_LENGTH_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/aux-length';
import { AUX_VERTICAL_LINE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/aux-vertical-line';
import { CIRCLE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/circle';
import { ELLIPSE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/ellipse';
import { LENGTH_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/length';
import { POLYGON_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/polygon';
import { RECTANGLE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/rectangle';
import { VERTEBRA_CENTER_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/vertebra-center';
import {
  AUXILIARY_TOOL_IDS,
  getToolCapability,
  isAuxiliaryToolbarTool,
} from '@xiehe/imaging-core/measurements';
import { getLocalizedToolCopy } from '@xiehe/imaging-catalog/tools';

export { ANGLE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/angle';
export { ARROW_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/arrow';
export { AUX_ANGLE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/aux-angle';
export { AUX_HORIZONTAL_LINE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/aux-horizontal-line';
export { AUX_LENGTH_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/aux-length';
export { AUX_VERTICAL_LINE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/aux-vertical-line';
export { CIRCLE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/circle';
export { ELLIPSE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/ellipse';
export { LENGTH_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/length';
export { POLYGON_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/polygon';
export { RECTANGLE_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/rectangle';
export { VERTEBRA_CENTER_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/vertebra-center';

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
