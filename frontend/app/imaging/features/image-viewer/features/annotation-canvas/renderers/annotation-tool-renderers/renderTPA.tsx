import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  getSpecialRenderImagePoints,
  projectSpecialRenderPoint,
  projectSpecialRenderPoints,
  RENDER_SCREEN_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * TPA渲染器：点1、点2、点3-4中点形成夹角
 */
export function renderTPA(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 7) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const projectedPoints = projectSpecialRenderPoints(imagePoints, context);
  const centerX =
    (imagePoints[0].x + imagePoints[1].x + imagePoints[2].x + imagePoints[3].x) /
    4;
  const centerY =
    (imagePoints[0].y + imagePoints[1].y + imagePoints[2].y + imagePoints[3].y) /
    4;
  const midX = (imagePoints[5].x + imagePoints[6].x) / 2;
  const midY = (imagePoints[5].y + imagePoints[6].y) / 2;
  const center = projectSpecialRenderPoint({ x: centerX, y: centerY }, context);
  const midpoint = projectSpecialRenderPoint({ x: midX, y: midY }, context);
  const vertex = projectedPoints[4];

  const dx1 = center.x - vertex.x;
  const dy1 = center.y - vertex.y;
  const angle1 = Math.atan2(dy1, dx1) * (180 / Math.PI);
  const dx2 = midpoint.x - vertex.x;
  const dy2 = midpoint.y - vertex.y;
  const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI);

  const radius = RENDER_SCREEN_LENGTHS.tpaArcRadius;
  const startX = vertex.x + radius * Math.cos((angle1 * Math.PI) / 180);
  const startY = vertex.y + radius * Math.sin((angle1 * Math.PI) / 180);
  const endX = vertex.x + radius * Math.cos((angle2 * Math.PI) / 180);
  const endY = vertex.y + radius * Math.sin((angle2 * Math.PI) / 180);

  let angleDiff = angle2 - angle1;
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;

  const sweepFlag = angleDiff > 0 ? 1 : 0;

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
        x2={vertex.x}
        y2={vertex.y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={vertex.x}
        y1={vertex.y}
        x2={midpoint.x}
        y2={midpoint.y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={projectedPoints[5].x}
        y1={projectedPoints[5].y}
        x2={projectedPoints[6].x}
        y2={projectedPoints[6].y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
      <path
        d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`}
        fill="none"
        stroke={displayColor}
        strokeWidth="1.5"
        opacity="0.8"
      />
    </>
  );
}
