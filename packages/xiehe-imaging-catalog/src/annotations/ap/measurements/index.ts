import type { Tool } from '../../shared/annotation-config-types';
import { VERTEBRA_CENTER_CONFIG } from '../../auxiliary/vertebra-center';
import { AVT_CONFIG } from './avt';
import { CA_CONFIG } from './ca';
import { COBB1_CONFIG, COBB2_CONFIG, COBB3_CONFIG, COBB_CONFIG } from './cobb';
import { CSS_CONFIG } from './css';
import { HEMIPELVIC_WIDTH_RATIO_CONFIG } from './hemipelvic-width-ratio';
import { LLD_CONFIG } from './lld';
import { PO_CONFIG } from './po';
import { T1_TILT_CONFIG } from './t1-tilt';
import { TS_CONFIG } from './ts';
import { TTS_CONFIG } from './tts';
import {
  AP_MEASUREMENT_TOOL_IDS,
  getToolCapability,
} from '@xiehe/imaging-core/measurements';
import { getLocalizedToolCopy } from '../../../tools';

export { AVT_CONFIG } from './avt';
export { COBB_CONFIG, COBB1_CONFIG, COBB2_CONFIG, COBB3_CONFIG } from './cobb';
export { CA_CONFIG } from './ca';
export { CSS_CONFIG } from './css';
export { HEMIPELVIC_WIDTH_RATIO_CONFIG } from './hemipelvic-width-ratio';
export { LLD_CONFIG } from './lld';
export { PO_CONFIG } from './po';
export { T1_TILT_CONFIG } from './t1-tilt';
export { TS_CONFIG } from './ts';
export { TTS_CONFIG } from './tts';

export const AP_MEASUREMENT_CONFIGS = {
  't1-tilt': T1_TILT_CONFIG,
  cobb: COBB_CONFIG,
  cobb1: COBB1_CONFIG,
  cobb2: COBB2_CONFIG,
  cobb3: COBB3_CONFIG,
  'cobb-thoracic': COBB_CONFIG,
  'cobb-lumbar': COBB_CONFIG,
  'cobb-thoracolumbar': COBB_CONFIG,
  'cobb-auto1': COBB_CONFIG,
  'cobb-auto2': COBB_CONFIG,
  'cobb-auto3': COBB_CONFIG,
  ca: CA_CONFIG,
  po: PO_CONFIG,
  pelvic: PO_CONFIG,
  css: CSS_CONFIG,
  sacral: CSS_CONFIG,
  avt: AVT_CONFIG,
  tts: TTS_CONFIG,
  lld: LLD_CONFIG,
  'hemipelvic-width-ratio': HEMIPELVIC_WIDTH_RATIO_CONFIG,
  ts: TS_CONFIG,
  'vertebra-center': VERTEBRA_CENTER_CONFIG,
} as const;

function toTool(toolId: string): Tool | null {
  const config =
    AP_MEASUREMENT_CONFIGS[toolId as keyof typeof AP_MEASUREMENT_CONFIGS];
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
