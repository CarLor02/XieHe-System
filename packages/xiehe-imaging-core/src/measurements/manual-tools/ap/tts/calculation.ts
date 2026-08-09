import type {
  CalculationContext,
  MeasurementResult,
} from '@xiehe/imaging-core/measurements';
import { calculateActualDistance } from '@xiehe/imaging-core/measurements';
import type { Point } from '@xiehe/imaging-core/contracts';

/** TTS 比较躯干水平线中点与骶骨参考线中点的水平偏移。 */
export function calculateTtsResults(
  points: Point[],
  context: CalculationContext
): MeasurementResult[] {
  if (points.length < 4) return [];
  const trunkMidX = (points[0].x + points[1].x) / 2;
  const sacralMidX = (points[2].x + points[3].x) / 2;
  const pixelOffset = trunkMidX - sacralMidX;
  const distance = calculateActualDistance(Math.abs(pixelOffset), context);
  return [
    {
      name: 'TTS',
      value: (pixelOffset < 0 ? -distance : distance).toFixed(2),
      unit: 'mm',
    },
  ];
}
