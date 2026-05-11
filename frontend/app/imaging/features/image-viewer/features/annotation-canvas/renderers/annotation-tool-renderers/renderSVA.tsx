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
 * SVA渲染器：两条垂直线
 * - 2点模式：显示两个端点的垂直线
 * - 5点模式：基于前4个点计算椎体中心，显示中心与第5个点的垂直线
 */
export function renderSVA(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const projectedPoints = projectSpecialRenderPoints(imagePoints, context);
  const height = RENDER_IMAGE_LENGTHS.verticalGuideLength;

  if (imagePoints.length === 5) {
    const centerImage = {
      x:
        (imagePoints[0].x +
          imagePoints[1].x +
          imagePoints[2].x +
          imagePoints[3].x) /
        4,
      y:
        (imagePoints[0].y +
          imagePoints[1].y +
          imagePoints[2].y +
          imagePoints[3].y) /
        4,
    };
    const center = projectSpecialRenderPoint(centerImage, context);
    const centerGuideEnd = projectSpecialRenderPoint(
      { x: centerImage.x, y: centerImage.y + height / 2 },
      context
    );
    const point5Image = imagePoints[4];
    const point5 = projectedPoints[4];
    const point5GuideEnd = projectSpecialRenderPoint(
      { x: point5Image.x, y: point5Image.y + height / 2 },
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
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.3"
        />
        <line
          x1={projectedPoints[1].x}
          y1={projectedPoints[1].y}
          x2={projectedPoints[2].x}
          y2={projectedPoints[2].y}
          stroke={displayColor}
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.3"
        />
        <line
          x1={projectedPoints[2].x}
          y1={projectedPoints[2].y}
          x2={projectedPoints[3].x}
          y2={projectedPoints[3].y}
          stroke={displayColor}
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.3"
        />
        <line
          x1={projectedPoints[3].x}
          y1={projectedPoints[3].y}
          x2={projectedPoints[0].x}
          y2={projectedPoints[0].y}
          stroke={displayColor}
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.3"
        />
        <line
          x1={center.x}
          y1={center.y}
          x2={centerGuideEnd.x}
          y2={centerGuideEnd.y}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        <circle
          cx={center.x}
          cy={center.y}
          r="3"
          fill={displayColor}
          stroke="#ffffff"
          strokeWidth="1"
          opacity="0.8"
        />
        <line
          x1={point5.x}
          y1={point5.y}
          x2={point5GuideEnd.x}
          y2={point5GuideEnd.y}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
      </>
    );
  }

  return (
    <>
      <line
        x1={projectedPoints[0].x}
        y1={projectedPoints[0].y}
        x2={projectSpecialRenderPoint(
          { x: imagePoints[0].x, y: imagePoints[0].y + height / 2 },
          context
        ).x}
        y2={projectSpecialRenderPoint(
          { x: imagePoints[0].x, y: imagePoints[0].y + height / 2 },
          context
        ).y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={projectedPoints[1].x}
        y1={projectedPoints[1].y}
        x2={projectSpecialRenderPoint(
          { x: imagePoints[1].x, y: imagePoints[1].y + height / 2 },
          context
        ).x}
        y2={projectSpecialRenderPoint(
          { x: imagePoints[1].x, y: imagePoints[1].y + height / 2 },
          context
        ).y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
    </>
  );
}
