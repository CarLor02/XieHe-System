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
  const previousById = new Map(
    previous?.measurements.map(item => [item.id, item])
  );
  return {
    ...snapshot,
    measurements: snapshot.measurements.map(measurement => {
      const before = previousById.get(measurement.id);
      // 点位编辑只重算改变的几何；标定只影响长度，保留无关项的历史/AI 数值。
      const changed = before
        ? before.points.length !== measurement.points.length ||
          before.points.some(
            (point, index) =>
              point.x !== measurement.points[index].x ||
              point.y !== measurement.points[index].y
          ) ||
          JSON.stringify(before.pelvicMetadata) !==
            JSON.stringify(measurement.pelvicMetadata)
        : previous !== undefined;
      if (previous)
        return changed
          ? {
              ...measurement,
              value: measurementCalculator.calculateMeasurement(
                measurement,
                context
              ),
            }
          : measurement;
      const outcome = calculateMeasurementResults(measurement, context);
      const result =
        outcome.status === 'calculated' ? outcome.results[0] : null;
      return result &&
        outcome.status === 'calculated' &&
        outcome.results.some(item => item.unit === 'mm')
        ? { ...measurement, value: `${result.value}${result.unit}` }
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
  const previousPoints = new Map(
    snapshot.keypoints.map(keypoint => [keypoint.id, keypoint.point])
  );
  const changedKeypointIds = new Set<string>();
  for (const keypoint of keypoints) {
    const before = previousPoints.get(keypoint.id);
    if (
      !before ||
      before.x !== keypoint.point.x ||
      before.y !== keypoint.point.y
    )
      changedKeypointIds.add(keypoint.id);
    previousPoints.delete(keypoint.id);
  }
  previousPoints.forEach((_, id) => changedKeypointIds.add(id));
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
    changedKeypointIds,
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
