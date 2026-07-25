import type { MeasurementResult } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { calculateAngleToHorizontal } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/geometry';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/** 两点水平角工具的共享计算模板，工具模块负责传入名称和符号策略。 */
export function calculateHorizontalAngleResults(
  name: string,
  points: Point[],
  useAbsoluteValue = false
): MeasurementResult[] {
  if (points.length < 2) return [];
  const rawAngle = calculateAngleToHorizontal(points[0], points[1]);
  const angle = useAbsoluteValue ? Math.abs(rawAngle) : rawAngle;
  return [{ name, value: angle.toFixed(2), unit: '°' }];
}
