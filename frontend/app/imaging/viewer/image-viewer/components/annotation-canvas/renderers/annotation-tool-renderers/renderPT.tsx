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
 * PT（骨盆倾斜角）渲染器：CFH、骶骨中点、过CFH垂直参考线
 */
export function renderPT(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  const geometry = getPelvicMeasurementGeometry(screenPoints);
  if (!geometry) return null;

  const verticalLength = RENDER_SCREEN_LENGTHS.pelvicVerticalHalfLength;
  let path: string | null = null;

  if (geometry.femoralHeadCenter) {
    const cfh = geometry.femoralHeadCenter;
    const connectionRayX = geometry.sacralMidpoint.x - cfh.x;
    const connectionRayY = geometry.sacralMidpoint.y - cfh.y;
    const connectionAngle =
      Math.atan2(connectionRayY, connectionRayX) * (180 / Math.PI);
    const verticalAngle = pickClosestRayAngle(connectionAngle, [-90, 90]);
    const connectionDistance = Math.sqrt(
      connectionRayX * connectionRayX + connectionRayY * connectionRayY
    );
    const radius = getPelvicArcRadius(
      connectionDistance,
      verticalLength,
      'inner'
    );

    path = buildAngleArc(cfh, verticalAngle, connectionAngle, radius);
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
      <circle
        cx={geometry.sacralMidpoint.x}
        cy={geometry.sacralMidpoint.y}
        r="3"
        fill={displayColor}
      />
      {geometry.femoralHeadCenter && (
        <>
          <line
            x1={geometry.femoralHeadCenter.x}
            y1={geometry.femoralHeadCenter.y - verticalLength}
            x2={geometry.femoralHeadCenter.x}
            y2={geometry.femoralHeadCenter.y + verticalLength}
            stroke="#00ff00"
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.7"
          />
          <line
            x1={geometry.femoralHeadCenter.x}
            y1={geometry.femoralHeadCenter.y}
            x2={geometry.sacralMidpoint.x}
            y2={geometry.sacralMidpoint.y}
            stroke={displayColor}
            strokeWidth="2"
            strokeDasharray="3,3"
          />
        </>
      )}
      {path && (
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
