import type { Point } from '../../../shared/domain/contracts';
import {
  calculateAngleBetweenVectors,
  calculateDistance2D,
  circleGeometryFromPoints,
  getCircleRadius,
} from '../../../shared/domain/geometry';

import { calculateActualDistance } from '../calibration';
import type { CalculationContext, MeasurementResult } from '../calculation-types';

export function calculateLengthResults(points: Point[]): MeasurementResult[] {
  if (points.length < 2) return [];
  const distance = calculateDistance2D(points[0], points[1]) * 0.1;
  return [{ name: '长度', value: distance.toFixed(2), unit: 'mm' }];
}

export function calculateAngleResults(points: Point[]): MeasurementResult[] {
  if (points.length < 3) return [];
  const firstVector = {
    x: points[0].x - points[1].x,
    y: points[0].y - points[1].y,
  };
  const secondVector = {
    x: points[2].x - points[1].x,
    y: points[2].y - points[1].y,
  };
  const angle = calculateAngleBetweenVectors(firstVector, secondVector);
  return [{ name: '角度', value: angle.toFixed(2), unit: '°' }];
}

export function calculateAuxiliaryLengthResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  if (points.length < 2) return [];
  const pixelDistance = calculateDistance2D(points[0], points[1]);
  let distance = pixelDistance * 0.1;

  if (
    context.standardDistance &&
    context.standardDistancePoints.length === 2
  ) {
    const [start, end] = context.standardDistancePoints;
    const standardPixelLength = Math.hypot(end.x - start.x, end.y - start.y);
    distance =
      (pixelDistance / standardPixelLength) * context.standardDistance;
  }

  return [{ name: '距离', value: distance.toFixed(2), unit: 'mm' }];
}

export function calculateAuxiliaryAngleResults(
  points: Point[]
): MeasurementResult[] {
  if (points.length < 4) return [];
  const firstAngle = Math.atan2(
    points[1].y - points[0].y,
    points[1].x - points[0].x
  );
  const secondAngle = Math.atan2(
    points[3].y - points[2].y,
    points[3].x - points[2].x
  );
  let angle = Math.abs(secondAngle - firstAngle) * (180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return [{ name: '角度', value: angle.toFixed(2), unit: '°' }];
}

export function calculateAuxiliaryHorizontalLineResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  if (points.length < 2) return [];
  const distance = calculateActualDistance(
    Math.abs(points[1].x - points[0].x),
    context
  );
  return [{ name: '水平距离', value: distance.toFixed(2), unit: 'mm' }];
}

export function calculateAuxiliaryVerticalLineResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  if (points.length < 2) return [];
  const distance = calculateActualDistance(
    Math.abs(points[1].y - points[0].y),
    context
  );
  return [{ name: '垂直距离', value: distance.toFixed(2), unit: 'mm' }];
}

export function calculateCircleResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  const circle = circleGeometryFromPoints(points);
  if (!circle) return [];
  const radius = calculateActualDistance(getCircleRadius(circle), context);
  return [{ name: '半径', value: radius.toFixed(1), unit: 'mm' }];
}

export function calculateRectangleResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  if (points.length < 2) return [];
  const pixelWidth = Math.abs(points[1].x - points[0].x);
  const pixelHeight = Math.abs(points[1].y - points[0].y);
  let scale = 0.1;

  if (
    context.standardDistance &&
    context.standardDistancePoints.length === 2
  ) {
    const [start, end] = context.standardDistancePoints;
    const standardPixelLength = Math.hypot(end.x - start.x, end.y - start.y);
    scale =
      standardPixelLength > 0
        ? context.standardDistance / standardPixelLength
        : 0.1;
  }

  const width = (pixelWidth * scale).toFixed(1);
  const height = (pixelHeight * scale).toFixed(1);
  return [{ name: '尺寸', value: `${width} × ${height}`, unit: 'mm' }];
}

export const calculateShapeOnlyResults = (): MeasurementResult[] => [];
