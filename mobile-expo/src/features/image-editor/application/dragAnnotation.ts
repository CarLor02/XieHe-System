import {
  applyPointBindings,
  isMeasurementBound,
} from '@xiehe/imaging-core/bindings';
import {
  canDragWholeMeasurement,
  constrainDraggedMeasurementPoint,
  planWholeMeasurementDrag,
} from '@xiehe/imaging-core/canvas';
import { AnnotationSource, type Point } from '@xiehe/imaging-core/contracts';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import { upsertKeypoint } from '@xiehe/imaging-core/keypoints';
import {
  applyMeasurementPointToVertebrae,
  normalizePelvicDraggedMeasurementPoints,
  syncAvailableLateralCobbEndpointsToKeypoints,
  syncCobbMeasurementToKeypoints,
  writeMeasurementToKeypoints,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import {
  getAnnotationTypeId,
  type CalculationContext,
} from '@xiehe/imaging-core/measurements';
import {
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
  isAvtMetadata,
  moveHemipelvicVerticalLine,
  updateHemipelvicInteractivePoint,
  updateHorizontalDiscAnchors,
} from '@xiehe/imaging-core/measurements/ap';
import {
  getBilateralFemoralCenterPointIndices,
  getBilateralPelvicPointsForMeasurement,
  isBilateralPelvicMeasurement,
  moveBilateralPelvicEffectiveCfh,
  replaceBilateralPelvicPointsForMeasurement,
} from '@xiehe/imaging-core/measurements/lateral';
import { recalculateSnapshot, synchronizeKeypoints } from './editorSnapshot';

export type EditorSelection =
  | { kind: 'point'; measurementId: string; pointIndex: number }
  | { kind: 'whole'; measurementId: string }
  | { kind: 'effective-cfh'; measurementId: string }
  | { kind: 'line'; measurementId: string; lineIndex: number }
  | { kind: 'keypoint'; keypointId: string }
  | { kind: 'calibration'; pointIndex: number };

export function dragAnnotation(
  snapshot: AnnotationEditorSnapshot,
  selection: EditorSelection,
  point: Point,
  context: CalculationContext
): AnnotationEditorSnapshot {
  if (selection.kind === 'calibration') {
    const next = {
      ...snapshot,
      standardDistancePoints: snapshot.standardDistancePoints.map((p, index) =>
        index === selection.pointIndex ? point : p
      ),
    };
    return recalculateSnapshot(next, {
      ...context,
      standardDistancePoints: next.standardDistancePoints,
    });
  }
  if (selection.kind === 'keypoint') {
    const existing = snapshot.keypoints.find(
      k => k.id === selection.keypointId
    );
    return existing
      ? synchronizeKeypoints(
          snapshot,
          upsertKeypoint(snapshot.keypoints, {
            ...existing,
            point,
            source: AnnotationSource.MANUAL,
          }),
          context
        )
      : snapshot;
  }
  const measurement = snapshot.measurements.find(
    item => item.id === selection.measurementId
  );
  if (!measurement) return snapshot;
  const type = getAnnotationTypeId(measurement.type);
  let points = measurement.points;
  let changedIndices: number[] = [];
  if (selection.kind === 'whole') {
    if (
      !canDragWholeMeasurement(
        measurement,
        measurement.keypointSynced === true ||
          isMeasurementBound(measurement.id, snapshot.pointBindings)
      )
    )
      return snapshot;
    points = planWholeMeasurementDrag(measurement, point);
    changedIndices = points.map((_, index) => index);
  } else if (selection.kind === 'line') {
    if (type !== HEMIPELVIC_WIDTH_RATIO_TOOL_ID) return snapshot;
    points = moveHemipelvicVerticalLine(points, selection.lineIndex, point.x);
    changedIndices = points.map((_, index) => index);
  } else if (selection.kind === 'effective-cfh') {
    const pelvic = getBilateralPelvicPointsForMeasurement(measurement);
    if (!pelvic) return snapshot;
    points = replaceBilateralPelvicPointsForMeasurement(
      measurement,
      moveBilateralPelvicEffectiveCfh(pelvic, point)
    );
    changedIndices = [
      ...getBilateralFemoralCenterPointIndices(type as 'pi' | 'pt' | 'tpa'),
    ];
  } else {
    const index = selection.pointIndex;
    if (!points[index]) return snapshot;
    if (type === HEMIPELVIC_WIDTH_RATIO_TOOL_ID) {
      points = updateHemipelvicInteractivePoint(points, index, point);
    } else if (
      type === 'avt' &&
      isAvtMetadata(measurement.avtMetadata) &&
      measurement.avtMetadata.target.type === 'disc' &&
      index < 2
    ) {
      points = [
        ...updateHorizontalDiscAnchors([points[0], points[1]], index, point),
        ...points.slice(2),
      ];
    } else {
      const constrained = constrainDraggedMeasurementPoint({
        measurement,
        pointIndex: index,
        requestedPoint: point,
      });
      points = normalizePelvicDraggedMeasurementPoints(
        measurement,
        points.map((p, i) => (i === index ? constrained : p)),
        index
      );
    }
    changedIndices = [index];
  }
  let measurements = snapshot.measurements;
  for (const index of changedIndices) {
    measurements = applyPointBindings(
      measurements,
      measurement.id,
      index,
      points[index].x,
      points[index].y,
      snapshot.pointBindings
    );
  }
  const updated = { ...measurement, points };
  const pelvic = getBilateralPelvicPointsForMeasurement(updated);
  measurements = measurements.map(item =>
    item.id === measurement.id
      ? updated
      : pelvic && isBilateralPelvicMeasurement(item)
        ? {
            ...item,
            points: replaceBilateralPelvicPointsForMeasurement(item, pelvic),
          }
        : item
  );

  // 手动绑定传播到的测量也必须写回关键点，随后统一重算，避免 Web 重开后还原旧点。
  let keypoints = snapshot.keypoints;
  let vertebraeLayer = snapshot.vertebraeLayer;
  let cfhAnnotation = snapshot.cfhAnnotation;
  for (const item of measurements) {
    const previous = snapshot.measurements.find(m => m.id === item.id);
    item.points.forEach((p, index) => {
      if (
        previous?.points[index]?.x === p.x &&
        previous.points[index]?.y === p.y
      )
        return;
      keypoints = writeMeasurementToKeypoints(
        keypoints,
        item,
        item.points,
        index
      );
      const fallback = applyMeasurementPointToVertebrae(
        vertebraeLayer,
        cfhAnnotation,
        item.type,
        index,
        p,
        item.apexVertebra ?? undefined
      );
      vertebraeLayer = fallback.vertebraeLayer;
      cfhAnnotation = fallback.cfhAnnotation;
    });
    if (item !== previous && /cobb/i.test(item.type)) {
      keypoints =
        syncCobbMeasurementToKeypoints(
          keypoints,
          item,
          context.examType ?? ''
        ) ?? syncAvailableLateralCobbEndpointsToKeypoints(keypoints, item);
    }
  }
  const next = recalculateSnapshot(
    { ...snapshot, measurements, vertebraeLayer, cfhAnnotation },
    context,
    snapshot
  );
  return keypoints !== snapshot.keypoints
    ? synchronizeKeypoints(next, keypoints, context)
    : next;
}
