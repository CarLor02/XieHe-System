import {
  hitTestCanvasMeasurement,
  imageToScreen,
  type DrawingPrimitive,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import {
  getInteractivePointsCount,
  isEditableAuxiliaryAnnotationType,
} from '@xiehe/imaging-catalog/annotations';
import type { Point } from '@xiehe/imaging-core/contracts';
import {
  getBoundingBoxCenter,
  pointToLineDistance,
} from '@xiehe/imaging-core/geometry';
import { getBilateralPelvicGeometryForMeasurement } from '@xiehe/imaging-core/measurements/lateral';
import { resolveTtsMeasurement } from '@xiehe/imaging-core/measurements/ap';
import type { ImageEditorSession } from '@/features/image-editor/application/ImageEditorSession';
import { measurementGeometry } from '@/features/image-editor/components/measurementGeometry';
import type { EditorSelection } from '@/features/image-editor/application/dragAnnotation';

function touchesLine(
  primitives: DrawingPrimitive[],
  point: Point,
  radius: number
): boolean {
  return primitives.some(p => {
    if (p.kind === 'vertebra') return touchesLine(p.children, point, radius);
    return (
      p.kind === 'line' && pointToLineDistance(point, p.start, p.end) <= radius
    );
  });
}

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
      // 点、辅助图形和专用控制柄由 core 命中；其余线身直接使用画布绘制的有限线段。
      hitTestBody: measurement =>
        touchesLine(measurementGeometry(measurement, context), screenPoint, 12),
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
