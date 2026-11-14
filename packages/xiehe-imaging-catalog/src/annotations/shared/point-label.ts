import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import {
  getPelvicPointDisplayLabel,
  getPelvicSharedPointLabelKey as getResolvedPelvicSharedPointLabelKey,
  shouldShowPelvicPointDisplayLabel,
} from '@xiehe/imaging-core/measurements/lateral';
import { getAnnotationTypeId } from './annotation-config';
import { shouldShowPointLabels } from './annotation-metadata';

function pointText(
  measurement: MeasurementData,
  pointIndex: number
): string | number {
  if (
    measurement.type.startsWith('AI检测-') &&
    measurement.points.length === 1
  ) {
    return measurement.value;
  }

  const pelvicLabel = getPelvicPointDisplayLabel(measurement, pointIndex);
  if (pelvicLabel !== null) return pelvicLabel;

  return pointIndex + 1;
}

function getPelvicSharedPointLabelKey(
  measurement: MeasurementData,
  pointIndex: number
): string | null {
  const typeId = getAnnotationTypeId(measurement.type);

  if (typeId === 'ss') {
    if (pointIndex === 0) return 'pelvic-s1-1';
    if (pointIndex === 1) return 'pelvic-s1-2';
  }

  return getResolvedPelvicSharedPointLabelKey(measurement, pointIndex);
}

/** 归属按整个测量列表的顺序确定，不能按选中状态或静态、拖动图层重新编号。 */
export function getMeasurementPointLabel(
  measurement: MeasurementData,
  pointIndex: number,
  allMeasurements: readonly MeasurementData[],
  measurementIndex: number
): string | undefined {
  if (
    !shouldShowPointLabels(measurement.type) ||
    !shouldShowPelvicPointDisplayLabel(measurement, pointIndex)
  )
    return;
  const key = getPelvicSharedPointLabelKey(measurement, pointIndex);
  if (key) {
    for (let i = 0; i < measurementIndex; i++) {
      const previous = allMeasurements[i];
      if (
        previous?.points.some(
          (_, index) => getPelvicSharedPointLabelKey(previous, index) === key
        )
      )
        return;
    }
  }
  return String(pointText(measurement, pointIndex));
}
