import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  getSpecialRenderImagePoints,
  projectSpecialRenderPoint,
  projectSpecialRenderPoints,
  RENDER_IMAGE_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * Sacral（骶骨倾斜角）渲染器：骶骨连线 + CSVL（中央骶骨垂直线）
 */
export function renderSacralWithPerpendicular(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const projectedPoints = projectSpecialRenderPoints(imagePoints, context);
  const midpoint = {
    x: (imagePoints[0].x + imagePoints[1].x) / 2,
    y: (imagePoints[0].y + imagePoints[1].y) / 2,
  };
  const perpLength = RENDER_IMAGE_LENGTHS.sacralPerpendicularLength;
  const perpStart = projectSpecialRenderPoint(midpoint, context);
  const perpEnd = projectSpecialRenderPoint(
    { x: midpoint.x, y: midpoint.y - perpLength },
    context
  );

  return (
    <>
      <line
        x1={projectedPoints[0].x}
        y1={projectedPoints[0].y}
        x2={projectedPoints[1].x}
        y2={projectedPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={perpStart.x}
        y1={perpStart.y}
        x2={perpEnd.x}
        y2={perpEnd.y}
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
    </>
  );
}
