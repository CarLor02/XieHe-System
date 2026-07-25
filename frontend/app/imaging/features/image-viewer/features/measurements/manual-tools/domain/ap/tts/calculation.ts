import type { CalculationContext, MeasurementResult } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { calculateActualDistance } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/calibration';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

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
