import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import {
  getAuxiliaryMeasurementValueTagName,
  getDisplayName,
  usesAuxiliaryMeasurementValueTag,
} from './annotation-metadata';

/** 与渲染平台无关的测量标签文本。 */
export function formatMeasurementText(measurement: MeasurementData): string {
  const labelName = usesAuxiliaryMeasurementValueTag(measurement.type)
    ? getAuxiliaryMeasurementValueTagName(measurement)
    : getDisplayName(measurement.type);
  return `${labelName}: ${measurement.value}`;
}
