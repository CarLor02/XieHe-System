import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  getSpecialRenderImagePoints,
  projectSpecialRenderPoint,
  RENDER_IMAGE_LENGTHS,
  RENDER_SCREEN_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * T1 Tilt 渲染器：椎体线 + 水平参考线 + 角度弧线
 */
export function renderT1Tilt(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const [lineStart, lineEnd] =
    imagePoints[0].x <= imagePoints[1].x
      ? [imagePoints[0], imagePoints[1]]
      : [imagePoints[1], imagePoints[0]];
  const lineStartScreen = projectSpecialRenderPoint(lineStart, context);
  const lineEndScreen = projectSpecialRenderPoint(lineEnd, context);
  const referenceStart = projectSpecialRenderPoint(
    {
      x: lineStart.x - RENDER_IMAGE_LENGTHS.t1TiltReferenceHalfWidth,
      y: lineStart.y,
    },
    context
  );
  const referenceEnd = projectSpecialRenderPoint(
    {
      x: lineStart.x + RENDER_IMAGE_LENGTHS.t1TiltReferenceHalfWidth,
      y: lineStart.y,
    },
    context
  );
  const dx = lineEndScreen.x - lineStartScreen.x;
  const dy = lineEndScreen.y - lineStartScreen.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  let displayAngle = angle;
  if (displayAngle > 90) displayAngle -= 180;
  else if (displayAngle < -90) displayAngle += 180;

  const radius = RENDER_SCREEN_LENGTHS.t1TiltArcRadius;
  const endAngle = displayAngle;

  const startX = lineStartScreen.x + radius;
  const startY = lineStartScreen.y;
  const endX =
    lineStartScreen.x + radius * Math.cos((endAngle * Math.PI) / 180);
  const endY =
    lineStartScreen.y + radius * Math.sin((endAngle * Math.PI) / 180);

  const largeArcFlag = Math.abs(endAngle) > 180 ? 1 : 0;
  const sweepFlag = endAngle > 0 ? 1 : 0;

  return (
    <>
      <line
        x1={lineStartScreen.x}
        y1={lineStartScreen.y}
        x2={lineEndScreen.x}
        y2={lineEndScreen.y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={referenceStart.x}
        y1={referenceStart.y}
        x2={referenceEnd.x}
        y2={referenceEnd.y}
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
