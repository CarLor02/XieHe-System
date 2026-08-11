import type { CalculationContext } from './calculation-types';
import type { Point } from '../../shared/domain/contracts';

export interface StandardDistanceDefaults {
  distance: number;
  points: readonly Point[];
}

export const STANDARD_DISTANCE_DEFAULTS: StandardDistanceDefaults = {
  distance: 100,
  points: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ],
};

/**
 * 将图像像素距离换算为毫米。
 *
 * 无标准距离时保留历史默认比例，确保旧标注在未设置标尺时数值不发生变化。
 */
export function calculateActualDistance(
  pixelDistance: number,
  context: CalculationContext
): number {
  if (context.standardDistance && context.standardDistancePoints.length === 2) {
    const [start, end] = context.standardDistancePoints;
    const standardPixelLength = Math.hypot(end.x - start.x, end.y - start.y);
    if (standardPixelLength > 0) {
      return (pixelDistance / standardPixelLength) * context.standardDistance;
    }
  }

  return (pixelDistance / 1000) * 300;
}
