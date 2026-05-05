import type { JSX } from 'react';
import type { Point } from '../../../../types';
import { RENDER_SCREEN_LENGTHS } from './annotationToolRendererUtils';

/**
 * T1 Tilt 渲染器：椎体线 + 水平参考线 + 角度弧线
 */
export function renderT1Tilt(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const [lineStart, lineEnd] =
    screenPoints[0].x <= screenPoints[1].x
      ? [screenPoints[0], screenPoints[1]]
      : [screenPoints[1], screenPoints[0]];
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  let displayAngle = angle;
  if (displayAngle > 90) displayAngle -= 180;
  else if (displayAngle < -90) displayAngle += 180;

  const radius = RENDER_SCREEN_LENGTHS.t1TiltArcRadius;
  const endAngle = displayAngle;

  const startX = lineStart.x + radius;
  const startY = lineStart.y;
  const endX = lineStart.x + radius * Math.cos((endAngle * Math.PI) / 180);
  const endY = lineStart.y + radius * Math.sin((endAngle * Math.PI) / 180);

  const largeArcFlag = Math.abs(endAngle) > 180 ? 1 : 0;
  const sweepFlag = endAngle > 0 ? 1 : 0;

  return (
    <>
      <line
        x1={lineStart.x}
        y1={lineStart.y}
        x2={lineEnd.x}
        y2={lineEnd.y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={lineStart.x - RENDER_SCREEN_LENGTHS.t1TiltReferenceHalfWidth}
        y1={lineStart.y}
        x2={lineStart.x + RENDER_SCREEN_LENGTHS.t1TiltReferenceHalfWidth}
        y2={lineStart.y}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
      />
      <path
        d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`}
        fill="none"
        stroke={displayColor}
        strokeWidth="1"
        opacity="0.8"
      />
    </>
  );
}
