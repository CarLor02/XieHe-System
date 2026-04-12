import {
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
} from '../../../canvas/hit-test/shape-hit-test';
import { isAuxiliaryShape } from '../../../canvas/tools/tool-state';
import { calculateQuadrilateralCenter } from '../../../shared/geometry';
import { Measurement, Point, TransformContext } from '../../../types';
import { hitTestMeasurementLabel } from './hitTestLabel';
import { hitTestMeasurementPoint } from './hitTestPoint';

export type HitResult =
  | { kind: 'point'; measurementId: string; pointIndex: number }
  | { kind: 'whole'; measurementId: string }
  | { kind: 'label'; measurementId: string }
  | { kind: 'none' };

interface HitTestMeasurementOptions {
  measurements: Measurement[];
  screenPoint: Point;
  imageScale: number;
  imageToScreen: (point: Point) => Point;
  context: TransformContext;
  isMeasurementHidden?: (measurement: Measurement) => boolean;
  lineRadius?: number;
}

function hitTestMeasurementShape(
  measurement: Measurement,
  screenPoint: Point,
  context: TransformContext,
  lineRadius: number,
  imageToScreen: (point: Point) => Point
) {
  if (measurement.type === '圆形标注' && measurement.points.length === 2) {
    return isCircleClicked(
      screenPoint,
      measurement.points[0],
      measurement.points[1],
      context,
      lineRadius
    );
  }

  if (measurement.type === '椭圆标注' && measurement.points.length === 2) {
    return isEllipseClicked(
      screenPoint,
      measurement.points[0],
      measurement.points[1],
      context,
      lineRadius
    );
  }

  if (measurement.type === '矩形标注' && measurement.points.length === 2) {
    return isRectangleClicked(
      screenPoint,
      measurement.points[0],
      measurement.points[1],
      context,
      lineRadius
    );
  }

  if (measurement.type === '多边形标注' && measurement.points.length >= 3) {
    return isPolygonClicked(
      screenPoint,
      measurement.points,
      context,
      lineRadius
    );
  }

  if (
    (measurement.type === '箭头标注' ||
      measurement.type === '距离标注' ||
      measurement.type === '辅助水平线' ||
      measurement.type === '辅助垂直线') &&
    measurement.points.length >= 2
  ) {
    return isLineClicked(
      screenPoint,
      measurement.points[0],
      measurement.points[1],
      context,
      lineRadius
    );
  }

  if (measurement.type === '锥体中心' && measurement.points.length === 4) {
    if (
      isPolygonClicked(screenPoint, measurement.points, context, lineRadius)
    ) {
      return true;
    }

    const center = calculateQuadrilateralCenter(measurement.points);
    const centerScreen = imageToScreen(center);

    return (
      Math.hypot(screenPoint.x - centerScreen.x, screenPoint.y - centerScreen.y) <
      15
    );
  }

  if (measurement.type === '角度标注' && measurement.points.length === 3) {
    return (
      isLineClicked(
        screenPoint,
        measurement.points[0],
        measurement.points[1],
        context,
        lineRadius
      ) ||
      isLineClicked(
        screenPoint,
        measurement.points[1],
        measurement.points[2],
        context,
        lineRadius
      )
    );
  }

  return false;
}

/**
 * 统一 measurement 命中检测。
 * 入口组件只关心 point / whole / label / none，不再直接了解几何细节。
 */
export function hitTestMeasurement({
  measurements,
  screenPoint,
  imageScale,
  imageToScreen,
  context,
  isMeasurementHidden,
  lineRadius = 8,
}: HitTestMeasurementOptions): HitResult {
  for (const measurement of measurements) {
    if (isMeasurementHidden?.(measurement)) {
      continue;
    }

    const pointIndex = hitTestMeasurementPoint({
      measurement,
      screenPoint,
      imageToScreen,
    });
    if (pointIndex !== null) {
      return {
        kind: 'point',
        measurementId: measurement.id,
        pointIndex,
      };
    }

    if (isAuxiliaryShape(measurement.type)) {
      if (
        hitTestMeasurementShape(
          measurement,
          screenPoint,
          context,
          lineRadius,
          imageToScreen
        )
      ) {
        return { kind: 'whole', measurementId: measurement.id };
      }
      continue;
    }

    if (
      hitTestMeasurementLabel({
        measurement,
        screenPoint,
        imageScale,
        imageToScreen,
      })
    ) {
      return { kind: 'label', measurementId: measurement.id };
    }
  }

  return { kind: 'none' };
}

export {
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
};
