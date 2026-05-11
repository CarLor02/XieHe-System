import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  buildAngleArc,
  getSpecialRenderImagePoints,
  getPelvicMeasurementGeometry,
  projectSpecialRenderPoint,
  RENDER_SCREEN_LENGTHS,
  RENDER_IMAGE_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * SS渲染器：骶骨终板 + 过端点水平参考线 + 角度弧
 */
export function renderSS(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const geometry = getPelvicMeasurementGeometry(imagePoints);
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
  const reverseGuideEnd = {
    x: vertex.x + rayUnit.x * RENDER_IMAGE_LENGTHS.ssReverseGuideLength,
    y: vertex.y + rayUnit.y * RENDER_IMAGE_LENGTHS.ssReverseGuideLength,
  };
  const sacralLeft = projectSpecialRenderPoint(geometry.sacralLeft, context);
  const sacralRight = projectSpecialRenderPoint(geometry.sacralRight, context);
  const vertexScreen = projectSpecialRenderPoint(vertex, context);
  const oppositeScreen = projectSpecialRenderPoint(opposite, context);
  const reverseGuideEndScreen = projectSpecialRenderPoint(reverseGuideEnd, context);
  const horizontalStart = projectSpecialRenderPoint(
    {
      x: vertex.x - RENDER_IMAGE_LENGTHS.pelvicReferenceHalfWidth,
      y: vertex.y,
    },
    context
  );
  const horizontalEnd = projectSpecialRenderPoint(
    {
      x: vertex.x + RENDER_IMAGE_LENGTHS.pelvicReferenceHalfWidth,
      y: vertex.y,
    },
    context
  );
  const screenRayAngle =
    Math.atan2(
      vertexScreen.y - oppositeScreen.y,
      vertexScreen.x - oppositeScreen.x
    ) *
    (180 / Math.PI);
  const arcPath = buildAngleArc(
    vertexScreen,
    horizontalAngle,
    screenRayAngle,
    RENDER_SCREEN_LENGTHS.ssArcRadius
  );

  return (
    <>
      <line
        x1={sacralLeft.x}
        y1={sacralLeft.y}
        x2={sacralRight.x}
        y2={sacralRight.y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={horizontalStart.x}
        y1={horizontalStart.y}
        x2={horizontalEnd.x}
        y2={horizontalEnd.y}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
      />
      <line
        x1={vertexScreen.x}
        y1={vertexScreen.y}
        x2={reverseGuideEndScreen.x}
        y2={reverseGuideEndScreen.y}
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
      <circle cx={vertexScreen.x} cy={vertexScreen.y} r="3" fill={displayColor} />
    </>
  );
}
