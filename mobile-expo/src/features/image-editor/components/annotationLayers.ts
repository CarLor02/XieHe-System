import {
  imageToScreen,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import type { KeypointAnnotation } from '@xiehe/imaging-core/keypoints';
import type { EditorSelection } from '../application/dragAnnotation';
import { measurementGeometry } from './measurementGeometry';

export interface AnnotationLayer {
  measurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  calibration: Point[];
}
export const emptyLayer: AnnotationLayer = {
  measurements: [],
  keypoints: [],
  calibration: [],
};

/** 依据应用层实际产生的不可变结果分层，不在 UI 重写医学依赖规则。 */
export function partitionAnnotations(
  snapshot: AnnotationEditorSnapshot,
  baseline: AnnotationEditorSnapshot | null,
  selection: EditorSelection | null
): { static: AnnotationLayer; dynamic: AnnotationLayer } {
  if (!baseline)
    return {
      static: {
        measurements: snapshot.measurements,
        keypoints: snapshot.keypoints,
        calibration: snapshot.standardDistancePoints,
      },
      dynamic: emptyLayer,
    };
  const beforeMeasurements = new Map(
    baseline.measurements.map(item => [item.id, item])
  );
  const beforeKeypoints = new Map(
    baseline.keypoints.map(item => [item.id, item])
  );
  const result = {
    static: {
      measurements: [],
      keypoints: [],
      calibration: [],
    } as AnnotationLayer,
    dynamic: {
      measurements: [],
      keypoints: [],
      calibration: [],
    } as AnnotationLayer,
  };
  for (const item of snapshot.measurements) {
    const changed =
      item !== beforeMeasurements.get(item.id) ||
      (selection &&
        'measurementId' in selection &&
        selection.measurementId === item.id);
    result[changed ? 'dynamic' : 'static'].measurements.push(item);
  }
  for (const item of snapshot.keypoints) {
    const changed =
      item !== beforeKeypoints.get(item.id) ||
      (selection?.kind === 'keypoint' && selection.keypointId === item.id);
    result[changed ? 'dynamic' : 'static'].keypoints.push(item);
  }
  const calibrationChanged =
    snapshot.standardDistancePoints !== baseline.standardDistancePoints ||
    selection?.kind === 'calibration';
  result[calibrationChanged ? 'dynamic' : 'static'].calibration =
    snapshot.standardDistancePoints;
  return result;
}

export function sameItems<T>(a: readonly T[], b: readonly T[]) {
  return (
    a === b ||
    (a.length === b.length && a.every((item, index) => item === b[index]))
  );
}
export function sameLayer(a: AnnotationLayer, b: AnnotationLayer) {
  return (
    sameItems(a.measurements, b.measurements) &&
    sameItems(a.keypoints, b.keypoints) &&
    sameItems(a.calibration, b.calibration)
  );
}

export type DrawingBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
/** 动态 SVG 的位图只覆盖可见几何范围；文字与原生控制点不进入这个位图。 */
export function geometryBounds(
  layer: AnnotationLayer,
  context: TransformContext,
  showKeypoints: boolean,
  preview: MeasurementData | null
): DrawingBounds | null {
  const points: Point[] = [...layer.calibration];
  if (showKeypoints) points.push(...layer.keypoints.map(item => item.point));
  for (const measurement of [
    ...layer.measurements,
    ...(preview ? [preview] : []),
  ]) {
    points.push(...measurement.points);
    const geometry = measurementGeometry(
      measurement,
      context.imageNaturalSize?.height ?? 0
    );
    geometry.lines.forEach(line => points.push(line.start, line.end));
    geometry.polygons.forEach(polygon => points.push(...polygon));
    geometry.circles.forEach(circle => {
      const r = Math.hypot(
        circle.radiusHandle.x - circle.center.x,
        circle.radiusHandle.y - circle.center.y
      );
      points.push(
        { x: circle.center.x - r, y: circle.center.y - r },
        { x: circle.center.x + r, y: circle.center.y + r }
      );
    });
  }
  if (!points.length || !context.containerSize) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const point of points) {
    const projected = imageToScreen(point, context);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y))
      continue;
    minX = Math.min(minX, projected.x);
    minY = Math.min(minY, projected.y);
    maxX = Math.max(maxX, projected.x);
    maxY = Math.max(maxY, projected.y);
  }
  // 按小网格扩展边界，避免每移动一个像素都改变原生视图布局。
  const tile = 64;
  const x = Math.max(0, Math.floor((minX - 14) / tile) * tile),
    y = Math.max(0, Math.floor((minY - 14) / tile) * tile);
  const right = Math.min(
    context.containerSize.width,
    Math.ceil((maxX + 14) / tile) * tile
  );
  const bottom = Math.min(
    context.containerSize.height,
    Math.ceil((maxY + 14) / tile) * tile
  );
  return right > x && bottom > y
    ? { x, y, width: right - x, height: bottom - y }
    : null;
}
