import { getAnnotationConfig } from '../catalog/annotation-catalog';
import { MeasurementData, Tool } from '../types';

const UNIQUE_ANNOTATION_TOOL_IDS = new Set([
  't1-tilt',
  'ca',
  'pelvic',
  'sacral',
  'tts',
  'lld',
  'c7-offset',
]);

export function getCanonicalAnnotationId(typeOrToolId: string): string {
  const config = getAnnotationConfig(typeOrToolId);
  return config?.id || typeOrToolId.toLowerCase().replace(/\s+/g, '-');
}

export function isUniqueAnnotationTool(toolId: string): boolean {
  return UNIQUE_ANNOTATION_TOOL_IDS.has(getCanonicalAnnotationId(toolId));
}

export function measurementMatchesTool(
  measurement: Pick<MeasurementData, 'type'>,
  tool: Pick<Tool, 'id' | 'name'>
): boolean {
  return (
    getCanonicalAnnotationId(measurement.type) ===
      getCanonicalAnnotationId(tool.id) || measurement.type === tool.name
  );
}

export function hasAnnotationForTool(
  measurements: Pick<MeasurementData, 'type'>[],
  tool: Pick<Tool, 'id' | 'name'>
): boolean {
  return measurements.some(measurement =>
    measurementMatchesTool(measurement, tool)
  );
}

export function hasUniqueAnnotationForTool(
  measurements: Pick<MeasurementData, 'type'>[],
  tool: Pick<Tool, 'id' | 'name'>
): boolean {
  return (
    isUniqueAnnotationTool(tool.id) && hasAnnotationForTool(measurements, tool)
  );
}

export function filterUniqueAnnotationDuplicates<
  T extends Pick<MeasurementData, 'type'>,
>(measurements: T[]): T[] {
  const seenUniqueIds = new Set<string>();

  return measurements.filter(measurement => {
    const canonicalId = getCanonicalAnnotationId(measurement.type);
    if (!UNIQUE_ANNOTATION_TOOL_IDS.has(canonicalId)) {
      return true;
    }
    if (seenUniqueIds.has(canonicalId)) {
      return false;
    }
    seenUniqueIds.add(canonicalId);
    return true;
  });
}
