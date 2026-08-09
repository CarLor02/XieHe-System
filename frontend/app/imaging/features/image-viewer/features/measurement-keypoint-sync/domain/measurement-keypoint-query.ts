import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  type AvtTarget,
} from '@xiehe/imaging-core/contracts';
import {
  isAvtMetadata,
  isSameAvtTarget,
} from '@xiehe/imaging-core/measurements/ap';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';

import { DERIVED_ID_PREFIX } from './vertebrae-derive';

function normalizeVertebraLabel(label: string): string {
  return label.trim().toUpperCase();
}

/** 判断测量项是否为由关键点绑定维护的 Cobb。 */
export function isDerivedCobbMeasurement(
  measurement: MeasurementData
): boolean {
  const isKeypointBoundCobb =
    measurement.id.startsWith(`${DERIVED_ID_PREFIX}cobb-`) ||
    measurement.keypointSynced === true;
  return (
    isKeypointBoundCobb &&
    isCobbMeasurement(measurement) &&
    Boolean(measurement.upperVertebra && measurement.lowerVertebra)
  );
}

export function isCobbMeasurement(measurement: MeasurementData): boolean {
  const typeId = getAnnotationTypeId(measurement.type);
  return (
    typeId === 'cobb' ||
    typeId === 'lateral-cobb' ||
    /^(?:lateral-)?cobb\d+$/i.test(typeId)
  );
}

export function isBoundAvtMeasurement(measurement: MeasurementData): boolean {
  return (
    getAnnotationTypeId(measurement.type) === 'avt' &&
    (Boolean(measurement.apexVertebra) ||
      isAvtMetadata(measurement.avtMetadata))
  );
}

export function hasAvtMeasurementForTarget(
  measurements: MeasurementData[],
  target: AvtTarget
): boolean {
  return measurements.some(
    measurement =>
      isBoundAvtMeasurement(measurement) && isSameAvtTarget(measurement, target)
  );
}

export function hasAvtMeasurementForApex(
  measurements: MeasurementData[],
  apexVertebra: string
): boolean {
  return hasAvtMeasurementForTarget(measurements, {
    type: 'vertebra',
    vertebra: normalizeVertebraLabel(apexVertebra),
  });
}

export function hasCobbMeasurementForEndpoints(
  measurements: MeasurementData[],
  upperVertebra: string,
  lowerVertebra: string
): boolean {
  const normalizedUpper = normalizeVertebraLabel(upperVertebra);
  const normalizedLower = normalizeVertebraLabel(lowerVertebra);
  return measurements.some(
    measurement =>
      isCobbMeasurement(measurement) &&
      measurement.upperVertebra != null &&
      measurement.lowerVertebra != null &&
      normalizeVertebraLabel(measurement.upperVertebra) === normalizedUpper &&
      normalizeVertebraLabel(measurement.lowerVertebra) === normalizedLower
  );
}
