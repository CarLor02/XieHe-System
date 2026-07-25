import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

const DERIVED_TTS_MEASUREMENT_ID = 'ap-keypoint-tts';

export function isManualTtsMeasurement(
  measurement: MeasurementData
): boolean {
  return (
    getAnnotationTypeId(measurement.type) === 'tts' &&
    measurement.points.length >= 2 &&
    measurement.id !== DERIVED_TTS_MEASUREMENT_ID &&
    !measurement.upperVertebra &&
    !measurement.lowerVertebra
  );
}

export function getManualTtsTrunkPoints(
  measurement: MeasurementData
): [Point, Point] | null {
  if (!isManualTtsMeasurement(measurement)) return null;
  return [measurement.points[0], measurement.points[1]];
}

export function getManualTtsTrunkCenter(
  measurement: MeasurementData
): Point | null {
  const trunkPoints = getManualTtsTrunkPoints(measurement);
  if (!trunkPoints) return null;

  return {
    x: (trunkPoints[0].x + trunkPoints[1].x) / 2,
    y: (trunkPoints[0].y + trunkPoints[1].y) / 2,
  };
}

export function moveManualTtsTrunkLineVertically(
  measurement: MeasurementData,
  deltaY: number
): Point[] {
  if (!isManualTtsMeasurement(measurement)) return measurement.points;

  return measurement.points.map((point, index) =>
    index < 2 ? { x: point.x, y: point.y + deltaY } : point
  );
}
