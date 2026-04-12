import { Measurement, Point } from '../../../types';
import { getBoundingBox } from '../../../shared/geometry';

/**
 * 计算标注的选择边界框，供选中态与 hover 态复用。
 */
export function getMeasurementSelectionBox(
  measurement: Measurement,
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
  measurement: Measurement,
  imageToScreen: (point: Point) => Point,
  padding: number = 15
) {
  if (measurement.type === '圆形标注' && measurement.points.length >= 2) {
    const center = imageToScreen(measurement.points[0]);
    const edge = imageToScreen(measurement.points[1]);
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
    return {
      minX: center.x - radius - padding,
      maxX: center.x + radius + padding,
      minY: center.y - radius - padding,
      maxY: center.y + radius + padding,
    };
  }

  if (measurement.type === '椭圆标注' && measurement.points.length >= 2) {
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

  const screenBounds = getBoundingBox(
    measurement.points.map(point => imageToScreen(point))
  );
  return {
    minX: screenBounds.minX - padding,
    maxX: screenBounds.maxX + padding,
    minY: screenBounds.minY - padding,
    maxY: screenBounds.maxY + padding,
  };
}
