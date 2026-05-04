import { Tool } from '../../types';
import { ANNOTATION_CONFIGS } from '../shared/annotation-config';

const AUXILIARY_TOOL_IDS = [
  'circle',
  'ellipse',
  'rectangle',
  'arrow',
  'polygon',
  'aux-length',
  'aux-angle',
  'aux-horizontal-line',
  'aux-vertical-line',
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

export function getAuxiliaryTools(): Tool[] {
  return AUXILIARY_TOOL_IDS
    .map(toTool)
    .filter((tool): tool is Tool => tool !== null);
}

export function isAuxiliaryTool(toolId: string): boolean {
  return AUXILIARY_TOOL_IDS.includes(
    toolId as (typeof AUXILIARY_TOOL_IDS)[number]
  );
}
