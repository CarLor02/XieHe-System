import { Tool } from '../../../types';
import { ANNOTATION_CONFIGS } from '../../shared/annotation-config';

export const AP_AUTOMATIC_MEASUREMENT_TOOL_IDS = [
  't1-tilt',
  'cobb',
  'ca',
  'po',
  'css',
  'ts',
] as const;

export const AP_SELECTION_MEASUREMENT_TOOL_IDS = [
  'vertebra-center',
  'avt',
  'tts',
] as const;

const AP_MEASUREMENT_TOOL_IDS = [
  't1-tilt',
  'cobb',
  'ca',
  'po',
  'css',
  'avt',
  'tts',
  'lld',
  'ts',
  'vertebra-center',
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

export function getApMeasurementTools(): Tool[] {
  return AP_MEASUREMENT_TOOL_IDS
    .map(toTool)
    .filter((tool): tool is Tool => tool !== null);
}

export function isApMeasurementTool(toolId: string): boolean {
  return AP_MEASUREMENT_TOOL_IDS.includes(
    toolId as (typeof AP_MEASUREMENT_TOOL_IDS)[number]
  );
}

export function isApAutomaticMeasurementTool(toolId: string): boolean {
  return AP_AUTOMATIC_MEASUREMENT_TOOL_IDS.includes(
    toolId as (typeof AP_AUTOMATIC_MEASUREMENT_TOOL_IDS)[number]
  );
}

export function isApSelectionMeasurementTool(toolId: string): boolean {
  return AP_SELECTION_MEASUREMENT_TOOL_IDS.includes(
    toolId as (typeof AP_SELECTION_MEASUREMENT_TOOL_IDS)[number]
  );
}
