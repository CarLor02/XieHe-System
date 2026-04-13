import { INTERACTION_CONSTANTS } from '../../../shared/constants';
import { calculateDistance } from '../../../shared/geometry';
import { MeasurementData, Point } from '../../../types';

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
  for (let index = 0; index < measurement.points.length; index += 1) {
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

