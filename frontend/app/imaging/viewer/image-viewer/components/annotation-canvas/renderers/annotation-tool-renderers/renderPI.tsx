import type { JSX } from 'react';
import type { Point } from '../../../../types';
import {
  buildAngleArc,
  getPelvicArcRadius,
  getPelvicMeasurementGeometry,
  pickClosestRayAngle,
  RENDER_SCREEN_LENGTHS,
} from './annotationToolRendererUtils';

/**
 * PI（骨盆入射角）渲染器：骶骨中点、股骨头中点、中垂线
 */
export function renderPI(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  const geometry = getPelvicMeasurementGeometry(screenPoints);
  if (!geometry) return null;

  const normalLength = RENDER_SCREEN_LENGTHS.pelvicNormalLength;
  const showArc = !!geometry.femoralHeadCenter;
  let path: string | null = null;

  if (geometry.femoralHeadCenter) {
    const femoralRayX =
      geometry.femoralHeadCenter.x - geometry.sacralMidpoint.x;
    const femoralRayY =
      geometry.femoralHeadCenter.y - geometry.sacralMidpoint.y;
    const femoralAngle = Math.atan2(femoralRayY, femoralRayX) * (180 / Math.PI);
    const normalAngle = pickClosestRayAngle(femoralAngle, [
      Math.atan2(geometry.sacralNormal.y, geometry.sacralNormal.x) *
        (180 / Math.PI),
      Math.atan2(-geometry.sacralNormal.y, -geometry.sacralNormal.x) *
        (180 / Math.PI),
    ]);
    const femoralDistance = Math.sqrt(
      femoralRayX * femoralRayX + femoralRayY * femoralRayY
    );
    const radius = getPelvicArcRadius(femoralDistance, normalLength, 'outer');

    path = buildAngleArc(
      geometry.sacralMidpoint,
      normalAngle,
      femoralAngle,
      radius
    );
  }

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
        x1={geometry.sacralMidpoint.x}
        y1={geometry.sacralMidpoint.y}
        x2={geometry.sacralMidpoint.x + geometry.sacralNormal.x * normalLength}
        y2={geometry.sacralMidpoint.y + geometry.sacralNormal.y * normalLength}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <circle
        cx={geometry.sacralMidpoint.x}
        cy={geometry.sacralMidpoint.y}
        r="3"
        fill={displayColor}
      />
      {geometry.femoralHeadCenter && (
        <line
          x1={geometry.femoralHeadCenter.x}
          y1={geometry.femoralHeadCenter.y}
          x2={geometry.sacralMidpoint.x}
          y2={geometry.sacralMidpoint.y}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
      )}
      {showArc && path && (
        <path
          d={path}
          fill="none"
          stroke={displayColor}
          strokeWidth="1.5"
          opacity="0.8"
        />
      )}
    </>
  );
}
