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
 * 水平线段渲染器：优先渲染2点线段（兼容旧数据时1点退化为短线）
 */
export function renderSingleHorizontalLine(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const projectedPoints = projectSpecialRenderPoints(imagePoints, context);

  if (imagePoints.length >= 2) {
    return (
      <line
        x1={projectedPoints[0].x}
        y1={projectedPoints[0].y}
        x2={projectedPoints[1].x}
        y2={projectedPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
    );
  }

  const point = imagePoints[0];
  const lineLength = RENDER_IMAGE_LENGTHS.fallbackGuideLength;
  const start = projectSpecialRenderPoint(
    { x: point.x - lineLength / 2, y: point.y },
    context
  );
  const end = projectSpecialRenderPoint(
    { x: point.x + lineLength / 2, y: point.y },
    context
  );

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={displayColor}
      strokeWidth="2"
      strokeDasharray="5,5"
      opacity="0.8"
    />
  );
}
