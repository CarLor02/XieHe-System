import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-type-id';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

type CobbTypePrefix = 'cobb' | 'lateral-cobb';

function getCobbTypePrefix(type: string): CobbTypePrefix | null {
  const typeId = getAnnotationTypeId(type);
  if (/^lateral-cobb\d*$/i.test(typeId)) return 'lateral-cobb';
  if (/^cobb\d*$/i.test(typeId)) return 'cobb';
  return null;
}

export function getCobbSequenceNumber(type: string): number | null {
  const match = /^(?:lateral-)?cobb(\d+)$/i.exec(getAnnotationTypeId(type));
  if (!match) return null;

  const sequenceNumber = Number(match[1]);
  return Number.isInteger(sequenceNumber) && sequenceNumber > 0
    ? sequenceNumber
    : null;
}

export function getMaxCobbSequenceNumber(
  measurements: MeasurementData[]
): number {
  return measurements.reduce((maxSequence, measurement) => {
    const sequenceNumber = getCobbSequenceNumber(measurement.type);
    return sequenceNumber === null
      ? maxSequence
      : Math.max(maxSequence, sequenceNumber);
  }, 0);
}

export function getNextCobbType(
  measurements: MeasurementData[],
  prefix: CobbTypePrefix = 'cobb'
): string {
  return `${prefix}${getMaxCobbSequenceNumber(measurements) + 1}`;
}

/**
 * 删除后只负责生成新的 Cobb type，不在领域层重算 value。
 * value 重算属于应用流程，避免序号规则反向依赖 catalog。
 */
export function renumberCobbTypesAfterDelete(
  measurements: MeasurementData[]
): MeasurementData[] {
  let nextSequence = 1;

  return measurements.map(measurement => {
    const prefix = getCobbTypePrefix(measurement.type);
    if (!prefix || getCobbSequenceNumber(measurement.type) === null) {
      return measurement;
    }

    const type = `${prefix}${nextSequence}`;
    nextSequence += 1;
    return getAnnotationTypeId(measurement.type) === type
      ? measurement
      : { ...measurement, type };
  });
}
