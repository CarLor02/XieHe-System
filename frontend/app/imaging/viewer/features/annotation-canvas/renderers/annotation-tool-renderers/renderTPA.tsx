import type { JSX } from 'react';
import type { Point } from '@/app/imaging/viewer/shared/types';
import { RENDER_SCREEN_LENGTHS } from './annotationToolRendererUtils';

/**
 * TPA渲染器：点1、点2、点3-4中点形成夹角
 */
export function renderTPA(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 7) return null;

  const centerX =
    (screenPoints[0].x +
      screenPoints[1].x +
      screenPoints[2].x +
      screenPoints[3].x) /
    4;
  const centerY =
    (screenPoints[0].y +
      screenPoints[1].y +
      screenPoints[2].y +
      screenPoints[3].y) /
    4;
  const midX = (screenPoints[5].x + screenPoints[6].x) / 2;
  const midY = (screenPoints[5].y + screenPoints[6].y) / 2;
  const vertexX = screenPoints[4].x;
  const vertexY = screenPoints[4].y;

  const dx1 = centerX - vertexX;
  const dy1 = centerY - vertexY;
  const angle1 = Math.atan2(dy1, dx1) * (180 / Math.PI);
  const dx2 = midX - vertexX;
  const dy2 = midY - vertexY;
  const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI);

  const radius = RENDER_SCREEN_LENGTHS.tpaArcRadius;
  const startX = vertexX + radius * Math.cos((angle1 * Math.PI) / 180);
  const startY = vertexY + radius * Math.sin((angle1 * Math.PI) / 180);
  const endX = vertexX + radius * Math.cos((angle2 * Math.PI) / 180);
  const endY = vertexY + radius * Math.sin((angle2 * Math.PI) / 180);

  let angleDiff = angle2 - angle1;
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;

  const sweepFlag = angleDiff > 0 ? 1 : 0;

  return (
    <>
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.3"
      />
      <line
        x1={screenPoints[1].x}
        y1={screenPoints[1].y}
        x2={screenPoints[2].x}
        y2={screenPoints[2].y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.3"
      />
      <line
        x1={screenPoints[2].x}
        y1={screenPoints[2].y}
        x2={screenPoints[3].x}
        y2={screenPoints[3].y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.3"
      />
      <line
        x1={screenPoints[3].x}
        y1={screenPoints[3].y}
        x2={screenPoints[0].x}
        y2={screenPoints[0].y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.3"
      />
      <line
        x1={centerX}
        y1={centerY}
        x2={vertexX}
        y2={vertexY}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={vertexX}
        y1={vertexY}
        x2={midX}
        y2={midY}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[5].x}
        y1={screenPoints[5].y}
        x2={screenPoints[6].x}
        y2={screenPoints[6].y}
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
