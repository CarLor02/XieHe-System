import type { MeasurementResult } from '../../../shared-rules';
import type { Point } from '@xiehe/imaging-core/contracts';
import { calculateHemipelvicWidthRatioGeometry } from './geometry';

/** L/R 使用按水平方向排序后的第1-2线宽与第3-4线宽之比。 */
export function calculateHemipelvicWidthRatioResults(
  points: Point[]
): MeasurementResult[] {
  const geometry = calculateHemipelvicWidthRatioGeometry(points);
  if (!geometry) return [];
  return [
    {
      name: 'L/R',
      value: geometry.ratio === null ? '--' : geometry.ratio.toFixed(2),
      unit: '',
    },
  ];
}
