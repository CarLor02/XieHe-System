import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  getSpecialRenderImagePoints,
  projectSpecialRenderPoint,
  RENDER_IMAGE_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * LLD 双下肢不等长渲染器：两条水平线
 */
export function renderHorizontalLines(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const width = RENDER_IMAGE_LENGTHS.horizontalGuideWidth;
  const firstStart = projectSpecialRenderPoint(
    { x: imagePoints[0].x - width / 2, y: imagePoints[0].y },
    context
  );
  const firstEnd = projectSpecialRenderPoint(
    { x: imagePoints[0].x + width / 2, y: imagePoints[0].y },
    context
  );
  const secondStart = projectSpecialRenderPoint(
    { x: imagePoints[1].x - width / 2, y: imagePoints[1].y },
    context
  );
  const secondEnd = projectSpecialRenderPoint(
    { x: imagePoints[1].x + width / 2, y: imagePoints[1].y },
    context
  );

  return (
    <>
      <line
        x1={firstStart.x}
        y1={firstStart.y}
        x2={firstEnd.x}
        y2={firstEnd.y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={secondStart.x}
        y1={secondStart.y}
        x2={secondEnd.x}
        y2={secondEnd.y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
    </>
  );
}
