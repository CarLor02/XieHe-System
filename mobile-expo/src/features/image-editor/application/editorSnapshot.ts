import { isLateralExamType } from '@xiehe/imaging-core/anatomy';
import { validateAnnotationBindings } from '@xiehe/imaging-core/bindings';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import {
  keypointsToCfhAnnotation,
  keypointsToPersistedLayer,
  type KeypointAnnotation,
} from '@xiehe/imaging-core/keypoints';
import { recalculateExistingMeasurementsFromKeypoints } from '@xiehe/imaging-core/measurement-keypoint-sync';
import {
  calculateMeasurementResults,
  type CalculationContext,
} from '@xiehe/imaging-core/measurements';
import { measurementCalculator } from './measurementValues';

export function recalculateSnapshot(
  snapshot: AnnotationEditorSnapshot,
  context: CalculationContext,
  previous?: AnnotationEditorSnapshot
): AnnotationEditorSnapshot {
  return {
    ...snapshot,
    measurements: snapshot.measurements.map(measurement => {
      const before = previous?.measurements.find(
        item => item.id === measurement.id
      );
      const outcome = calculateMeasurementResults(measurement, context);
      // 点位编辑只重算改变的几何；标定只影响长度，保留无关项的历史/AI 数值。
      const changed = before
        ? JSON.stringify(before.points) !==
            JSON.stringify(measurement.points) ||
          JSON.stringify(before.pelvicMetadata) !==
            JSON.stringify(measurement.pelvicMetadata)
        : previous !== undefined;
      const calibratedLength =
        !previous &&
        outcome.status === 'calculated' &&
        outcome.results.some(result => result.unit === 'mm');
      return changed || calibratedLength
        ? {
            ...measurement,
            value: measurementCalculator.calculateMeasurement(
              measurement,
              context
            ),
          }
        : measurement;
    }),
  };
}

/** 一次提交点位、持久化检测层和已有测量；拖动不额外派生新的测量项。 */
export function synchronizeKeypoints(
  snapshot: AnnotationEditorSnapshot,
  keypoints: KeypointAnnotation[],
  context: CalculationContext
): AnnotationEditorSnapshot {
  const lateral = isLateralExamType(context.examType ?? '');
  const cfhAnnotation = lateral
    ? keypointsToCfhAnnotation(keypoints)
    : snapshot.cfhAnnotation;
  const measurements = recalculateExistingMeasurementsFromKeypoints({
    previousMeasurements: snapshot.measurements,
    keypoints,
    cfhAnnotation,
    examType: context.examType ?? '',
    isLateralView: lateral,
    calculationContext: context,
    aiMeasurementIds: new Set(snapshot.aiMeasurementIds),
    calculator: measurementCalculator,
  });
  return {
    ...snapshot,
    keypoints,
    vertebraeLayer: keypointsToPersistedLayer(keypoints),
    cfhAnnotation,
    measurements,
    pointBindings: validateAnnotationBindings(
      snapshot.pointBindings,
      measurements
    ),
  };
}
