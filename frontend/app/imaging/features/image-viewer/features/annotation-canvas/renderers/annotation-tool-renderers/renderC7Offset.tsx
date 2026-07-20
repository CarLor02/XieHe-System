import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  getSpecialRenderImagePoints,
  projectSpecialRenderPoint,
  projectSpecialRenderPoints,
  RENDER_IMAGE_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * TS 渲染器（正面）：
 * - 前4个点连线形成锥体区域（虚线），中心点作为第一条垂直线
 * - 后2个点连线及中点作为第二条垂直线
 * - 两条垂直线之间显示水平测量线
 */
export function renderC7Offset(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const projectedPoints = projectSpecialRenderPoints(imagePoints, context);
  const height = RENDER_IMAGE_LENGTHS.verticalGuideLength;

  if (imagePoints.length >= 2 && imagePoints.length < 6) {
    // 历史兼容：旧 TS/AVT 标注只保存两条参考线的中心点，无法还原当前6点轮廓。
    // 这里保留两点图形渲染，确保历史标注仍可显示；新建标注不会使用该数据结构。
    const reference = imagePoints[0];
    const center = imagePoints[1];
    const topY = Math.min(reference.y, center.y) - height / 2;
    const bottomY = Math.max(reference.y, center.y) + height / 2;
    const measurementY = (reference.y + center.y) / 2;
    const referenceTop = projectSpecialRenderPoint(
      { x: reference.x, y: topY },
      context
    );
    const referenceBottom = projectSpecialRenderPoint(
      { x: reference.x, y: bottomY },
      context
    );
    const centerTop = projectSpecialRenderPoint(
      { x: center.x, y: topY },
      context
    );
    const centerBottom = projectSpecialRenderPoint(
      { x: center.x, y: bottomY },
      context
    );
    const measurementStart = projectSpecialRenderPoint(
      { x: reference.x, y: measurementY },
      context
    );
    const measurementEnd = projectSpecialRenderPoint(
      { x: center.x, y: measurementY },
      context
    );

    return (
      <>
        <line
          x1={referenceTop.x}
          y1={referenceTop.y}
          x2={referenceBottom.x}
          y2={referenceBottom.y}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        <line
          x1={centerTop.x}
          y1={centerTop.y}
          x2={centerBottom.x}
          y2={centerBottom.y}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        <line
          x1={measurementStart.x}
          y1={measurementStart.y}
          x2={measurementEnd.x}
          y2={measurementEnd.y}
          stroke={displayColor}
          strokeWidth="2"
        />
        <circle
          cx={measurementStart.x}
          cy={measurementStart.y}
          r="3"
          fill={displayColor}
        />
        <circle
          cx={measurementEnd.x}
          cy={measurementEnd.y}
          r="3"
          fill={displayColor}
        />
      </>
    );
  }

  const has4 = imagePoints.length >= 4;
  const has6 = imagePoints.length >= 6;

  const centerX = has4
    ? (imagePoints[0].x +
        imagePoints[1].x +
        imagePoints[2].x +
        imagePoints[3].x) /
      4
    : imagePoints[0].x;
  const centerY = has4
    ? (imagePoints[0].y +
        imagePoints[1].y +
        imagePoints[2].y +
        imagePoints[3].y) /
      4
    : imagePoints[0].y;

  const centerPoint = projectSpecialRenderPoint(
    { x: centerX, y: centerY },
    context
  );
  const centerGuideEnd = projectSpecialRenderPoint(
    { x: centerX, y: centerY + height },
    context
  );
  const midX = has6 ? (imagePoints[4].x + imagePoints[5].x) / 2 : null;
  const midY = has6 ? (imagePoints[4].y + imagePoints[5].y) / 2 : null;
  const midpoint =
    midX !== null && midY !== null
      ? projectSpecialRenderPoint({ x: midX, y: midY }, context)
      : null;
  const midpointGuideStart =
    midX !== null && midY !== null
      ? projectSpecialRenderPoint({ x: midX, y: midY - height }, context)
      : null;

  return (
    <>
      {has4 && (
        <>
          <line
            x1={projectedPoints[0].x}
            y1={projectedPoints[0].y}
            x2={projectedPoints[1].x}
            y2={projectedPoints[1].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />
          <line
            x1={projectedPoints[1].x}
            y1={projectedPoints[1].y}
            x2={projectedPoints[2].x}
            y2={projectedPoints[2].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />
          <line
            x1={projectedPoints[2].x}
            y1={projectedPoints[2].y}
            x2={projectedPoints[3].x}
            y2={projectedPoints[3].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />
          <line
            x1={projectedPoints[3].x}
            y1={projectedPoints[3].y}
            x2={projectedPoints[0].x}
            y2={projectedPoints[0].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />
          <circle
            cx={centerPoint.x}
            cy={centerPoint.y}
            r="3"
            fill={displayColor}
            opacity="0.8"
          />
        </>
      )}
      <line
        x1={centerPoint.x}
        y1={centerPoint.y}
        x2={centerGuideEnd.x}
        y2={centerGuideEnd.y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      {imagePoints.length >= 5 && has6 && midpoint && midpointGuideStart && (
        <>
          <line
            x1={projectedPoints[4].x}
            y1={projectedPoints[4].y}
            x2={projectedPoints[5].x}
            y2={projectedPoints[5].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.5"
          />
          <circle
            cx={midpoint.x}
            cy={midpoint.y}
            r="3"
            fill={displayColor}
            opacity="0.8"
          />
          <line
            x1={midpointGuideStart.x}
            y1={midpointGuideStart.y}
            x2={midpoint.x}
            y2={midpoint.y}
            stroke={displayColor}
            strokeWidth="2"
            strokeDasharray="3,3"
          />
        </>
      )}
    </>
  );
}
