import {
  getAnnotationTypeId,
  type CalculationContext,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-calculation';
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

export function renumberCobbMeasurementsAfterDelete(
  measurements: MeasurementData[],
  calculationContext: CalculationContext
): MeasurementData[] {
  let nextSequenceNumber = 1;

  return measurements.map(measurement => {
    const currentSequenceNumber = getCobbSequenceNumber(measurement.type);
    if (currentSequenceNumber === null) return measurement;

    const prefix = getCobbTypePrefix(measurement.type) ?? 'cobb';
    const type = `${prefix}${nextSequenceNumber}`;
    nextSequenceNumber += 1;
    if (getAnnotationTypeId(measurement.type) === type) {
      return measurement;
    }

    return {
      ...measurement,
      type,
      value:
        calculateMeasurementValue(type, measurement.points, calculationContext) ||
        measurement.value,
    };
  });
}
