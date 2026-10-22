import {
  hitTestCanvasMeasurement,
  imageToScreen,
  screenToImage,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import {
  getAnnotationConfig,
  getInteractivePointsCount,
  isEditableAuxiliaryAnnotationType,
} from '@xiehe/imaging-catalog/annotations';
import type { Point } from '@xiehe/imaging-core/contracts';
import { getBoundingBoxCenter } from '@xiehe/imaging-core/geometry';
import { getBilateralPelvicGeometryForMeasurement } from '@xiehe/imaging-core/measurements/lateral';
import { resolveTtsMeasurement } from '@xiehe/imaging-core/measurements/ap';
import type { ImageEditorSession } from '../../application/ImageEditorSession';
import type { EditorSelection } from '../../application/dragAnnotation';

export function findSelection(
  session: ImageEditorSession,
  screenPoint: Point,
  context: TransformContext
): EditorSelection | null {
  const snapshot = session.snapshot;
  if (!snapshot) return null;
  const project = (point: Point) => imageToScreen(point, context);
  if (session.getState().tool === 'keypoint') {
    const keypoint = snapshot.keypoints
      .map(k => ({ keypoint: k, screen: project(k.point) }))
      .sort(
        (a, b) =>
          Math.hypot(a.screen.x - screenPoint.x, a.screen.y - screenPoint.y) -
          Math.hypot(b.screen.x - screenPoint.x, b.screen.y - screenPoint.y)
      )
      .find(
        k =>
          Math.hypot(k.screen.x - screenPoint.x, k.screen.y - screenPoint.y) <
          22
      );
    return keypoint
      ? { kind: 'keypoint', keypointId: keypoint.keypoint.id }
      : null;
  }
  const selected = session.getState().selection;
  const measurements = [...snapshot.measurements].sort(
    (a, b) =>
      Number(
        !!selected &&
          'measurementId' in selected &&
          selected.measurementId === b.id
      ) -
      Number(
        !!selected &&
          'measurementId' in selected &&
          selected.measurementId === a.id
      )
  );
  const hit = hitTestCanvasMeasurement({
    measurements,
    examType: session.context.examType,
    screenPoint,
    imageToScreen: project,
    context,
    pointRadius: 20,
    lineRadius: 12,
    policy: {
      getInteractivePointsCount,
      isEditableAuxiliary: isEditableAuxiliaryAnnotationType,
      hitTestLabel: measurement => {
        const point = screenToImage(screenPoint.x, screenPoint.y, context);
        const origin = project({ x: 0, y: 0 }),
          unit = project({ x: 1, y: 0 });
        const tolerance = 12 / Math.max(0.001, unit.x - origin.x);
        return (
          getAnnotationConfig(measurement.type)?.isInSelectionRange(
            point,
            measurement.points,
            tolerance
          ) ?? false
        );
      },
    },
  });
  if (hit.kind !== 'none')
    return hit.kind === 'label'
      ? { kind: 'whole', measurementId: hit.measurementId }
      : hit;
  const calibration = snapshot.standardDistancePoints.findIndex(point => {
    const p = project(point);
    return Math.hypot(p.x - screenPoint.x, p.y - screenPoint.y) < 20;
  });
  return calibration >= 0
    ? { kind: 'calibration', pointIndex: calibration }
    : null;
}

export function selectionAnchor(
  session: ImageEditorSession,
  selection: EditorSelection,
  fallback: Point
): Point {
  const snapshot = session.snapshot!;
  if (selection.kind === 'calibration')
    return snapshot.standardDistancePoints[selection.pointIndex];
  if (selection.kind === 'keypoint')
    return (
      snapshot.keypoints.find(k => k.id === selection.keypointId)?.point ??
      fallback
    );
  const measurement = snapshot.measurements.find(
    m => m.id === selection.measurementId
  );
  if (!measurement) return fallback;
  if (selection.kind === 'point')
    return measurement.points[selection.pointIndex];
  if (selection.kind === 'effective-cfh')
    return (
      getBilateralPelvicGeometryForMeasurement(measurement)
        ?.femoralHeadCenter ?? fallback
    );
  if (selection.kind === 'line') return fallback;
  const tts = resolveTtsMeasurement(measurement);
  return getBoundingBoxCenter(
    tts?.layout === 'manual' ? [...tts.trunkPoints] : measurement.points
  );
}
