import { INTERACTION_CONSTANTS } from '@/app/imaging/viewer/shared/constants';
import { calculateDistance } from '@/app/imaging/viewer/shared/geometry';
import { getInteractivePointsCount } from '@/app/imaging/viewer/features/measurements/domain/annotation-metadata';
import { MeasurementData, Point } from '@/app/imaging/viewer/shared/types';

interface HitTestMeasurementPointOptions {
  measurement: MeasurementData;
  screenPoint: Point;
  imageToScreen: (point: Point) => Point;
  radius?: number;
}

export function hitTestMeasurementPoint({
  measurement,
  screenPoint,
  imageToScreen,
  radius = INTERACTION_CONSTANTS.POINT_CLICK_RADIUS,
}: HitTestMeasurementPointOptions): number | null {
  // 仅命中前 N 个交互点（interactivePointsCount 控制）
  const interactiveCount = getInteractivePointsCount(measurement.type);
  const limit =
    interactiveCount === undefined
      ? measurement.points.length
      : interactiveCount;

  for (let index = 0; index < limit; index += 1) {
    const pointScreen = imageToScreen(measurement.points[index]);
    if (calculateDistance(screenPoint, pointScreen) < radius) {
      return index;
    }
  }

  return null;
}

interface HitTestWorkingPointOptions {
  points: Point[];
  screenPoint: Point;
  imageToScreen: (point: Point) => Point;
  radius?: number;
}

export function hitTestWorkingPoint({
  points,
  screenPoint,
  imageToScreen,
  radius = INTERACTION_CONSTANTS.POINT_CLICK_RADIUS,
}: HitTestWorkingPointOptions): number | null {
  for (let index = 0; index < points.length; index += 1) {
    const pointScreen = imageToScreen(points[index]);
    if (calculateDistance(screenPoint, pointScreen) < radius) {
      return index;
    }
  }

  return null;
}

