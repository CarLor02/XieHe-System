import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  getSpecialRenderImagePoints,
  projectSpecialRenderPoint,
  projectSpecialRenderPoints,
  RENDER_IMAGE_LENGTHS,
  RENDER_SCREEN_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * TTS渲染器（4点法）：
 * - 前2个点连线为躯干参考水平线，过中点画垂直线
 * - 后2个点为骶骨参考线（继承自Sacral），过中点画垂直线
 * - 两条垂直线之间画水平连接箭头
 */
export function renderTTS(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const projectedPoints = projectSpecialRenderPoints(imagePoints, context);
  const height = RENDER_IMAGE_LENGTHS.verticalGuideLength;
  const has2 = imagePoints.length >= 2;
  const has4 = imagePoints.length >= 4;

  const trunkMidX = has2
    ? (imagePoints[0].x + imagePoints[1].x) / 2
    : (imagePoints[0]?.x ?? 0);
  const trunkMidY = has2
    ? (imagePoints[0].y + imagePoints[1].y) / 2
    : (imagePoints[0]?.y ?? 0);

  const sacralMidX = has4 ? (imagePoints[2].x + imagePoints[3].x) / 2 : null;
  const sacralMidY = has4 ? (imagePoints[2].y + imagePoints[3].y) / 2 : null;

  const connectorY =
    has4 && sacralMidY !== null ? (trunkMidY + sacralMidY) / 2 : trunkMidY;
  const trunkMid = projectSpecialRenderPoint(
    { x: trunkMidX, y: trunkMidY },
    context
  );
  const trunkGuideEnd = projectSpecialRenderPoint(
    { x: trunkMidX, y: trunkMidY + height },
    context
  );
  const sacralMid =
    sacralMidX !== null && sacralMidY !== null
      ? projectSpecialRenderPoint({ x: sacralMidX, y: sacralMidY }, context)
      : null;
  const sacralGuideStart =
    sacralMidX !== null && sacralMidY !== null
      ? projectSpecialRenderPoint({ x: sacralMidX, y: sacralMidY - height }, context)
      : null;
  const connectorStart =
    sacralMidX !== null
      ? projectSpecialRenderPoint({ x: trunkMidX, y: connectorY }, context)
      : null;
  const connectorEnd =
    sacralMidX !== null
      ? projectSpecialRenderPoint({ x: sacralMidX, y: connectorY }, context)
      : null;

  return (
    <>
      {has2 && (
        <line
          x1={projectedPoints[0].x}
          y1={projectedPoints[0].y}
          x2={projectedPoints[1].x}
          y2={projectedPoints[1].y}
          stroke={displayColor}
          strokeWidth="2"
        />
      )}
      {has2 && (
        <line
          x1={trunkMid.x}
          y1={trunkMid.y}
          x2={trunkGuideEnd.x}
          y2={trunkGuideEnd.y}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="4,4"
        />
      )}
      {has4 &&
        sacralMidX !== null &&
        sacralMidY !== null &&
        sacralMid &&
        sacralGuideStart &&
        connectorStart &&
        connectorEnd && (
        <>
          <line
            x1={projectedPoints[2].x}
            y1={projectedPoints[2].y}
            x2={projectedPoints[3].x}
            y2={projectedPoints[3].y}
            stroke={displayColor}
            strokeWidth="2"
            opacity="0.6"
          />
          <line
            x1={sacralGuideStart.x}
            y1={sacralGuideStart.y}
            x2={sacralMid.x}
            y2={sacralMid.y}
            stroke={displayColor}
            strokeWidth="2"
            strokeDasharray="4,4"
            opacity="0.7"
          />
          <line
            x1={connectorStart.x}
            y1={connectorStart.y}
            x2={connectorEnd.x}
            y2={connectorEnd.y}
            stroke={displayColor}
            strokeWidth="1.5"
          />
          <polygon
            points={`${Math.min(connectorStart.x, connectorEnd.x)},${connectorStart.y} ${Math.min(connectorStart.x, connectorEnd.x) + RENDER_SCREEN_LENGTHS.arrowHeadLength},${connectorStart.y - RENDER_SCREEN_LENGTHS.arrowHeadHalfHeight} ${Math.min(connectorStart.x, connectorEnd.x) + RENDER_SCREEN_LENGTHS.arrowHeadLength},${connectorStart.y + RENDER_SCREEN_LENGTHS.arrowHeadHalfHeight}`}
            fill={displayColor}
          />
          <polygon
            points={`${Math.max(connectorStart.x, connectorEnd.x)},${connectorStart.y} ${Math.max(connectorStart.x, connectorEnd.x) - RENDER_SCREEN_LENGTHS.arrowHeadLength},${connectorStart.y - RENDER_SCREEN_LENGTHS.arrowHeadHalfHeight} ${Math.max(connectorStart.x, connectorEnd.x) - RENDER_SCREEN_LENGTHS.arrowHeadLength},${connectorStart.y + RENDER_SCREEN_LENGTHS.arrowHeadHalfHeight}`}
            fill={displayColor}
          />
        </>
      )}
    </>
  );
}
