import type { JSX } from 'react';
import type { Point } from '../../../../types';

/**
 * CA/Pelvic/Sacral/SS渲染器：单线（不带水平参考线）
 */
export function renderSingleLineWithHorizontal(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  return (
    <line
      x1={screenPoints[0].x}
      y1={screenPoints[0].y}
      x2={screenPoints[1].x}
      y2={screenPoints[1].y}
      stroke={displayColor}
      strokeWidth="2"
    />
  );
}
