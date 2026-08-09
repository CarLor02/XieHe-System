import { calculateAngleToHorizontal } from '../../../../geometry';
import type { MeasurementResult } from '../../../shared-rules';
import { isTwoPointLineInRange } from '../../../../geometry';
import type { Point } from '../../../../contracts';

/**
 * 侧位片按屏幕左到右排列 T1 上终板点，患者面朝左且图像 Y 轴向下。
 * 该坐标系中的原始有向角会把临床定义的前倾记为负值，因此取反以保持前倾为正。
 */
export function calculateT1SlopeResults(points: Point[]): MeasurementResult[] {
  if (points.length < 2) return [];
  const clinicalAngle = -calculateAngleToHorizontal(points[0], points[1]);
  return [{ name: 'T1 Slope', value: clinicalAngle.toFixed(2), unit: '°' }];
}

export const isT1SlopeInRange = isTwoPointLineInRange;
