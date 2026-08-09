import type { MeasurementData } from '../../contracts';
import { getAnnotationTypeId } from '../annotation-type-id';

export interface AnnotationToolIdentity {
  id: string;
  name: string;
}

const UNIQUE_ANNOTATION_TOOL_IDS = new Set([
  // 正位标注：Cobb、椎体中心、AVT 和辅助图形允许多个实例。
  't1-tilt',
  'ca',
  'po',
  'css',
  'tts',
  'lld',
  'hemipelvic-width-ratio',
  'ts',
  // 侧位标注：除椎体中心、辅助图形外唯一。
  't1-slope',
  'cl',
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
]);

export function getCanonicalAnnotationId(typeOrToolId: string): string {
  return getAnnotationTypeId(typeOrToolId);
}

export function isUniqueAnnotationTool(toolId: string): boolean {
  return UNIQUE_ANNOTATION_TOOL_IDS.has(getCanonicalAnnotationId(toolId));
}

export function measurementMatchesTool(
  measurement: Pick<MeasurementData, 'type'>,
  tool: AnnotationToolIdentity
): boolean {
  return (
    getCanonicalAnnotationId(measurement.type) ===
    getCanonicalAnnotationId(tool.id)
  );
}

export function hasAnnotationForTool(
  measurements: Pick<MeasurementData, 'type'>[],
  tool: AnnotationToolIdentity
): boolean {
  return measurements.some(measurement =>
    measurementMatchesTool(measurement, tool)
  );
}

export function hasUniqueAnnotationForTool(
  measurements: Pick<MeasurementData, 'type'>[],
  tool: AnnotationToolIdentity
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
