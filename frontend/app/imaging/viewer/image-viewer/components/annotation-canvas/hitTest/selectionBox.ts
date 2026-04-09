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

