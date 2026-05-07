import type { JSX } from 'react';
import type { Point } from '@/app/imaging/viewer/shared/types';
import { renderT1Tilt } from './renderT1Tilt';

/**
 * T1 Slope 渲染器（侧位）：椎体线 + 水平参考线 + 角度弧线
 */
export function renderT1Slope(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  return renderT1Tilt(screenPoints, displayColor, imageScale);
}
