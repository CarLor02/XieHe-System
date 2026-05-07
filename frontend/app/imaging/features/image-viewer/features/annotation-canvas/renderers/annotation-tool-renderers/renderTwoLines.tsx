import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

/**
 * Cobb角/CL/TK/LL系列渲染器：两条独立线段
 */
export function renderTwoLines(
  screenPoints: Point[],
  displayColor: string
): JSX.Element | null {
  if (screenPoints.length < 4) return null;

  return (
    <>
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[2].x}
        y1={screenPoints[2].y}
        x2={screenPoints[3].x}
        y2={screenPoints[3].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
    </>
  );
}
