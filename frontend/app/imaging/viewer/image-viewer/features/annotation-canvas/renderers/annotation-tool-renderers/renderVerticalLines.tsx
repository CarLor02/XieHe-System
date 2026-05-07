import type { JSX } from 'react';
import type { Point } from '@/app/imaging/viewer/image-viewer/shared/types';
import { renderSVA } from './renderSVA';

/**
 * AVT/TS渲染器：两条垂直线
 */
export function renderVerticalLines(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  return renderSVA(screenPoints, displayColor, imageScale);
}
