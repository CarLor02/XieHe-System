import type { JSX } from 'react';
import type { Point } from '../../../../types';
import { RENDER_SCREEN_LENGTHS } from './annotationToolRendererUtils';

/**
 * 垂直线段渲染器：优先渲染2点线段（兼容旧数据时1点退化为短线）
 */
export function renderSingleVerticalLine(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  if (screenPoints.length >= 2) {
    return (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
    );
  }

  const point = screenPoints[0];
  const lineLength = RENDER_SCREEN_LENGTHS.fallbackGuideLength;

  return (
    <line
      x1={point.x}
      y1={point.y - lineLength / 2}
      x2={point.x}
      y2={point.y + lineLength / 2}
      stroke={displayColor}
      strokeWidth="2"
      strokeDasharray="5,5"
      opacity="0.8"
    />
  );
}
