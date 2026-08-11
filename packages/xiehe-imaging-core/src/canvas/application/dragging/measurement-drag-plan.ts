import type { MeasurementData, Point } from '../../../shared/domain/contracts';
import { getBoundingBox } from '../../../shared/domain/geometry';
import { getAnnotationTypeId } from '../../../measurements/domain';
import {
  moveManualTtsTrunkLineVertically,
  resolveTtsMeasurement,
} from '../../../measurements/domain/manual-tools/ap';

export function canDragWholeMeasurement(
  measurement: MeasurementData,
  disableBoundMeasurementWholeDrag: boolean
): boolean {
  const typeId = getAnnotationTypeId(measurement.type);
  if (typeId === 'avt') return false;

  const isManualTts = resolveTtsMeasurement(measurement)?.layout === 'manual';
  if (typeId === 'tts' && !isManualTts) return false;

  // 与关键点绑定的测量项不能整体平移；手动 TTS 只移动未绑定的躯干线，属于例外。
  return !disableBoundMeasurementWholeDrag || isManualTts;
}

export function constrainDraggedMeasurementPoint(input: {
  measurement: MeasurementData;
  pointIndex: number;
  requestedPoint: Point;
}): Point {
  const { measurement, pointIndex, requestedPoint } = input;
  const typeId = getAnnotationTypeId(measurement.type);
  const pairedPoint = measurement.points[pointIndex === 0 ? 1 : 0];

  if (typeId === 'aux-horizontal-line' && pairedPoint) {
    return { x: requestedPoint.x, y: pairedPoint.y };
  }
  if (typeId === 'aux-vertical-line' && pairedPoint) {
    return { x: pairedPoint.x, y: requestedPoint.y };
  }

  // TTS 只有躯干参考线 0-1 保持水平；骶骨参考线 2-3 必须保留原始倾斜。
  if (typeId === 'tts' && (pointIndex === 0 || pointIndex === 1)) {
    return pairedPoint
      ? { x: requestedPoint.x, y: pairedPoint.y }
      : requestedPoint;
  }

  return requestedPoint;
}

export function planWholeMeasurementDrag(
  measurement: MeasurementData,
  targetCenter: Point
): Point[] {
  const resolvedTts = resolveTtsMeasurement(measurement);
  const isManualTts = resolvedTts?.layout === 'manual';
  const centerPoints = isManualTts
    ? resolvedTts.trunkPoints
    : measurement.points;
  const bounds = getBoundingBox(centerPoints);
  const currentCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const deltaY = targetCenter.y - currentCenter.y;

  if (isManualTts) {
    return moveManualTtsTrunkLineVertically(measurement, deltaY);
  }

  const deltaX = targetCenter.x - currentCenter.x;
  return measurement.points.map(point => ({
    x: point.x + deltaX,
    y: point.y + deltaY,
  }));
}
