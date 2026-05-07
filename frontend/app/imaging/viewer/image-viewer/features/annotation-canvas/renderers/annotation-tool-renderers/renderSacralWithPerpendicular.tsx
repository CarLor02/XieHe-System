import type { JSX } from 'react';
import type { Point } from '@/app/imaging/viewer/image-viewer/shared/types';
import { RENDER_SCREEN_LENGTHS } from './annotationToolRendererUtils';

/**
 * Sacral（骶骨倾斜角）渲染器：骶骨连线 + CSVL（中央骶骨垂直线）
 */
export function renderSacralWithPerpendicular(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const midY = (screenPoints[0].y + screenPoints[1].y) / 2;
  const perpLength = RENDER_SCREEN_LENGTHS.sacralPerpendicularLength;

  return (
    <>
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={midX}
        y1={midY}
        x2={midX}
        y2={midY - perpLength}
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
    </>
  );
}
