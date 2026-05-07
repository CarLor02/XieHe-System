import type { JSX } from 'react';
import type { Point } from '@/app/imaging/viewer/shared/types';
import {
  buildAngleArc,
  getPelvicMeasurementGeometry,
  RENDER_SCREEN_LENGTHS,
} from './annotationToolRendererUtils';

/**
 * SS渲染器：骶骨终板 + 过端点水平参考线 + 角度弧
 */
export function renderSS(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const geometry = getPelvicMeasurementGeometry(screenPoints);
  if (!geometry) return null;

  const vertex =
    geometry.sacralRight.x >= geometry.sacralLeft.x
      ? geometry.sacralRight
      : geometry.sacralLeft;
  const opposite =
    vertex === geometry.sacralRight
      ? geometry.sacralLeft
      : geometry.sacralRight;
  const rayDx = vertex.x - opposite.x;
  const rayDy = vertex.y - opposite.y;
  const rayLength = Math.sqrt(rayDx * rayDx + rayDy * rayDy);

  if (rayLength === 0) return null;

  const rayUnit = {
    x: rayDx / rayLength,
    y: rayDy / rayLength,
  };
  const horizontalAngle = rayUnit.x < 0 ? 180 : 0;
  const reverseEndplateAngle =
    Math.atan2(rayUnit.y, rayUnit.x) * (180 / Math.PI);
  const reverseGuideEnd = {
    x: vertex.x + rayUnit.x * RENDER_SCREEN_LENGTHS.ssReverseGuideLength,
    y: vertex.y + rayUnit.y * RENDER_SCREEN_LENGTHS.ssReverseGuideLength,
  };
  const arcPath = buildAngleArc(
    vertex,
    horizontalAngle,
    reverseEndplateAngle,
    RENDER_SCREEN_LENGTHS.ssArcRadius
  );

  return (
    <>
      <line
        x1={geometry.sacralLeft.x}
        y1={geometry.sacralLeft.y}
        x2={geometry.sacralRight.x}
        y2={geometry.sacralRight.y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={vertex.x - RENDER_SCREEN_LENGTHS.pelvicReferenceHalfWidth}
        y1={vertex.y}
        x2={vertex.x + RENDER_SCREEN_LENGTHS.pelvicReferenceHalfWidth}
        y2={vertex.y}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
      />
      <line
        x1={vertex.x}
        y1={vertex.y}
        x2={reverseGuideEnd.x}
        y2={reverseGuideEnd.y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="3,3"
        opacity="0.8"
      />
      <path
        d={arcPath}
        fill="none"
        stroke={displayColor}
        strokeWidth="1.5"
        opacity="0.85"
      />
      <circle cx={vertex.x} cy={vertex.y} r="3" fill={displayColor} />
    </>
  );
}
