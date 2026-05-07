import { Tool } from '@/app/imaging/features/image-viewer/shared/types';
import { VERTEBRA_CENTER_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary/vertebra-center';
import { AVT_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/avt';
import { CA_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/ca';
import { COBB1_CONFIG, COBB2_CONFIG, COBB3_CONFIG, COBB_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/cobb';
import { CSS_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/css';
import { LLD_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/lld';
import { PO_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/po';
import { T1_TILT_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/t1-tilt';
import { TS_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/ts';
import { TTS_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/tts';

export { AVT_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/avt';
export {
  COBB_CONFIG,
  COBB_THORACIC_CONFIG,
  COBB_LUMBAR_CONFIG,
  COBB1_CONFIG,
  COBB2_CONFIG,
  COBB3_CONFIG,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/cobb';
export { CA_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/ca';
export { CSS_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/css';
export { LLD_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/lld';
export { PO_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/po';
export { T1_TILT_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/t1-tilt';
export { TS_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/ts';
export { TTS_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/tts';

export const AP_AUTOMATIC_MEASUREMENT_TOOL_IDS = [
  't1-tilt',
  'cobb',
  'ca',
  'po',
  'css',
  'ts',
] as const;

export const AP_SELECTION_MEASUREMENT_TOOL_IDS = [
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
] as const;

export const AP_MEASUREMENT_CONFIGS = {
  't1-tilt': T1_TILT_CONFIG,
  cobb: COBB_CONFIG,
  cobb1: COBB1_CONFIG,
  cobb2: COBB2_CONFIG,
  cobb3: COBB3_CONFIG,
  'cobb-thoracic': COBB_CONFIG,
  'cobb-lumbar': COBB_CONFIG,
  'cobb-thoracolumbar': COBB_CONFIG,
  ca: CA_CONFIG,
  po: PO_CONFIG,
  pelvic: PO_CONFIG,
  css: CSS_CONFIG,
  sacral: CSS_CONFIG,
  avt: AVT_CONFIG,
  tts: TTS_CONFIG,
  lld: LLD_CONFIG,
  ts: TS_CONFIG,
  'vertebra-center': VERTEBRA_CENTER_CONFIG,
} as const;

function toTool(toolId: string): Tool | null {
  const config =
    AP_MEASUREMENT_CONFIGS[toolId as keyof typeof AP_MEASUREMENT_CONFIGS];
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
  return AP_MEASUREMENT_TOOL_IDS.map(toTool).filter(
    (tool): tool is Tool => tool !== null
  );
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
