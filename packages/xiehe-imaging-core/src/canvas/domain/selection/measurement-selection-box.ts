import type {
  MeasurementData,
  Point,
} from '../../../shared/domain/contracts';
import {
  circleGeometryFromPoints,
  getCircleBounds,
  getBoundingBox,
} from '../../../shared/domain/geometry';
import { getAnnotationTypeId } from '../../../measurements';
import { resolveTtsMeasurement } from '../../../measurements/domain/manual-tools/ap';

/**
 * 计算标注的选择边界框，供选中态与 hover 态复用。
 */
export function getMeasurementSelectionBox(
  measurement: MeasurementData,
  padding: number = 0
) {
  const bounds = getBoundingBox(measurement.points);

  return {
    minX: bounds.minX - padding,
    maxX: bounds.maxX + padding,
    minY: bounds.minY - padding,
    maxY: bounds.maxY + padding,
  };
}

export function isPointInSelectionBox(
  point: Point,
  bounds: ReturnType<typeof getMeasurementSelectionBox>
) {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

export function getMeasurementSelectionBoxInScreen(
  measurement: MeasurementData,
  imageToScreen: (point: Point) => Point,
  padding: number = 15
) {
  const typeId = getAnnotationTypeId(measurement.type);

  if (typeId === 'circle' && measurement.points.length >= 2) {
    const imageCircle = circleGeometryFromPoints(measurement.points)!;
    return getCircleBounds(
      {
        center: imageToScreen(imageCircle.center),
        radiusHandle: imageToScreen(imageCircle.radiusHandle),
      },
      padding
    );
  }

  if (typeId === 'ellipse' && measurement.points.length >= 2) {
    const center = imageToScreen(measurement.points[0]);
    const edge = imageToScreen(measurement.points[1]);
    const radiusX = Math.abs(edge.x - center.x);
    const radiusY = Math.abs(edge.y - center.y);
    return {
      minX: center.x - radiusX - padding,
      maxX: center.x + radiusX + padding,
      minY: center.y - radiusY - padding,
      maxY: center.y + radiusY + padding,
    };
  }

  const resolvedTts = resolveTtsMeasurement(measurement);
  const interactionPoints =
    resolvedTts?.layout === 'manual'
      ? resolvedTts.trunkPoints
      : measurement.points;
  const screenBounds = getBoundingBox(
    interactionPoints.map(point => imageToScreen(point))
  );
  return {
    minX: screenBounds.minX - padding,
    maxX: screenBounds.maxX + padding,
    minY: screenBounds.minY - padding,
    maxY: screenBounds.maxY + padding,
  };
}
