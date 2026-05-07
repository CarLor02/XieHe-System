import type { JSX } from 'react';
import type { Point } from '@/app/imaging/viewer/shared/types';
import { RENDER_SCREEN_LENGTHS } from './annotationToolRendererUtils';

/**
 * TTS渲染器（4点法）：
 * - 前2个点连线为躯干参考水平线，过中点画垂直线
 * - 后2个点为骶骨参考线（继承自Sacral），过中点画垂直线
 * - 两条垂直线之间画水平连接箭头
 */
export function renderTTS(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  const height = RENDER_SCREEN_LENGTHS.verticalGuideLength;
  const has2 = screenPoints.length >= 2;
  const has4 = screenPoints.length >= 4;

  const trunkMidX = has2
    ? (screenPoints[0].x + screenPoints[1].x) / 2
    : (screenPoints[0]?.x ?? 0);
  const trunkMidY = has2
    ? (screenPoints[0].y + screenPoints[1].y) / 2
    : (screenPoints[0]?.y ?? 0);

  const sacralMidX = has4 ? (screenPoints[2].x + screenPoints[3].x) / 2 : null;
  const sacralMidY = has4 ? (screenPoints[2].y + screenPoints[3].y) / 2 : null;

  const connectorY =
    has4 && sacralMidY !== null ? (trunkMidY + sacralMidY) / 2 : trunkMidY;

  return (
    <>
      {has2 && (
        <line
          x1={screenPoints[0].x}
          y1={screenPoints[0].y}
          x2={screenPoints[1].x}
          y2={screenPoints[1].y}
          stroke={displayColor}
          strokeWidth="2"
        />
      )}
      {has2 && (
        <line
          x1={trunkMidX}
          y1={trunkMidY}
          x2={trunkMidX}
          y2={trunkMidY + height}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="4,4"
        />
      )}
      {has4 && sacralMidX !== null && sacralMidY !== null && (
        <>
          <line
            x1={screenPoints[2].x}
            y1={screenPoints[2].y}
            x2={screenPoints[3].x}
            y2={screenPoints[3].y}
            stroke={displayColor}
            strokeWidth="2"
            opacity="0.6"
          />
          <line
            x1={sacralMidX}
            y1={sacralMidY - height}
            x2={sacralMidX}
            y2={sacralMidY}
            stroke={displayColor}
            strokeWidth="2"
            strokeDasharray="4,4"
            opacity="0.7"
          />
          <line
            x1={trunkMidX}
            y1={connectorY}
            x2={sacralMidX}
            y2={connectorY}
            stroke={displayColor}
            strokeWidth="1.5"
          />
          <polygon
            points={`${Math.min(trunkMidX, sacralMidX)},${connectorY} ${Math.min(trunkMidX, sacralMidX) + RENDER_SCREEN_LENGTHS.arrowHeadLength},${connectorY - RENDER_SCREEN_LENGTHS.arrowHeadHalfHeight} ${Math.min(trunkMidX, sacralMidX) + RENDER_SCREEN_LENGTHS.arrowHeadLength},${connectorY + RENDER_SCREEN_LENGTHS.arrowHeadHalfHeight}`}
            fill={displayColor}
          />
          <polygon
            points={`${Math.max(trunkMidX, sacralMidX)},${connectorY} ${Math.max(trunkMidX, sacralMidX) - RENDER_SCREEN_LENGTHS.arrowHeadLength},${connectorY - RENDER_SCREEN_LENGTHS.arrowHeadHalfHeight} ${Math.max(trunkMidX, sacralMidX) - RENDER_SCREEN_LENGTHS.arrowHeadLength},${connectorY + RENDER_SCREEN_LENGTHS.arrowHeadHalfHeight}`}
            fill={displayColor}
          />
        </>
      )}
    </>
  );
}
