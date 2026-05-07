import type { JSX } from 'react';
import type { Point } from '@/app/imaging/viewer/shared/types';
import { RENDER_SCREEN_LENGTHS } from './annotationToolRendererUtils';

/**
 * SVA渲染器：两条垂直线
 * - 2点模式：显示两个端点的垂直线
 * - 5点模式：基于前4个点计算椎体中心，显示中心与第5个点的垂直线
 */
export function renderSVA(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const height = RENDER_SCREEN_LENGTHS.verticalGuideLength;

  if (screenPoints.length === 5) {
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
    const point5 = screenPoints[4];

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
          x2={centerX}
          y2={centerY + height / 2}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r="3"
          fill={displayColor}
          stroke="#ffffff"
          strokeWidth="1"
          opacity="0.8"
        />
        <line
          x1={point5.x}
          y1={point5.y}
          x2={point5.x}
          y2={point5.y + height / 2}
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
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[0].x}
        y2={screenPoints[0].y + height / 2}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[1].x}
        y1={screenPoints[1].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y + height / 2}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
    </>
  );
}
