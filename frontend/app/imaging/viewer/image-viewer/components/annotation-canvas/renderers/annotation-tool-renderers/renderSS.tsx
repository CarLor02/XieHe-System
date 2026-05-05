import type { JSX } from 'react';
import type { Point } from '../../../../types';
import {
  getPelvicMeasurementGeometry,
  RENDER_SCREEN_LENGTHS,
} from './annotationToolRendererUtils';

/**
 * SS渲染器：骶骨终板 + 水平参考线 + 中点 + 法线
 */
export function renderSS(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const geometry = getPelvicMeasurementGeometry(screenPoints);
  if (!geometry) return null;

  const normalLength = RENDER_SCREEN_LENGTHS.pelvicNormalLength;

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
        x1={
          geometry.sacralLeft.x - RENDER_SCREEN_LENGTHS.pelvicReferenceHalfWidth
        }
        y1={geometry.sacralLeft.y}
        x2={
          geometry.sacralLeft.x + RENDER_SCREEN_LENGTHS.pelvicReferenceHalfWidth
        }
        y2={geometry.sacralLeft.y}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
      />
      <line
        x1={geometry.sacralMidpoint.x - geometry.sacralNormal.x * normalLength}
        y1={geometry.sacralMidpoint.y - geometry.sacralNormal.y * normalLength}
        x2={geometry.sacralMidpoint.x + geometry.sacralNormal.x * normalLength}
        y2={geometry.sacralMidpoint.y + geometry.sacralNormal.y * normalLength}
        stroke={displayColor}
        strokeWidth="1.5"
        strokeDasharray="3,3"
        opacity="0.8"
      />
      <circle
        cx={geometry.sacralMidpoint.x}
        cy={geometry.sacralMidpoint.y}
        r="3"
        fill={displayColor}
      />
    </>
  );
}
