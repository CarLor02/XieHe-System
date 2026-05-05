import type { JSX } from 'react';
import type { Point } from '../../../../types';
import { RENDER_SCREEN_LENGTHS } from './annotationToolRendererUtils';

/**
 * TS 渲染器（正面）：
 * - 前4个点连线形成锥体区域（虚线），中心点作为第一条垂直线
 * - 后2个点连线及中点作为第二条垂直线
 * - 两条垂直线之间显示水平测量线
 */
export function renderC7Offset(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  const height = RENDER_SCREEN_LENGTHS.verticalGuideLength;
  if (screenPoints.length >= 2 && screenPoints.length < 6) {
    const reference = screenPoints[0];
    const center = screenPoints[1];
    const topY = Math.min(reference.y, center.y) - height / 2;
    const bottomY = Math.max(reference.y, center.y) + height / 2;
    const measurementY = (reference.y + center.y) / 2;

    return (
      <>
        <line
          x1={reference.x}
          y1={topY}
          x2={reference.x}
          y2={bottomY}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        <line
          x1={center.x}
          y1={topY}
          x2={center.x}
          y2={bottomY}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        <line
          x1={reference.x}
          y1={measurementY}
          x2={center.x}
          y2={measurementY}
          stroke={displayColor}
          strokeWidth="2"
        />
        <circle cx={reference.x} cy={measurementY} r="3" fill={displayColor} />
        <circle cx={center.x} cy={measurementY} r="3" fill={displayColor} />
      </>
    );
  }

  const has4 = screenPoints.length >= 4;
  const has6 = screenPoints.length >= 6;

  const centerX = has4
    ? (screenPoints[0].x +
        screenPoints[1].x +
        screenPoints[2].x +
        screenPoints[3].x) /
      4
    : screenPoints[0].x;
  const centerY = has4
    ? (screenPoints[0].y +
        screenPoints[1].y +
        screenPoints[2].y +
        screenPoints[3].y) /
      4
    : screenPoints[0].y;

  const midX = has6 ? (screenPoints[4].x + screenPoints[5].x) / 2 : null;
  const midY = has6 ? (screenPoints[4].y + screenPoints[5].y) / 2 : null;

  return (
    <>
      {has4 && (
        <>
          <line
            x1={screenPoints[0].x}
            y1={screenPoints[0].y}
            x2={screenPoints[1].x}
            y2={screenPoints[1].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />
          <line
            x1={screenPoints[1].x}
            y1={screenPoints[1].y}
            x2={screenPoints[2].x}
            y2={screenPoints[2].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />
          <line
            x1={screenPoints[2].x}
            y1={screenPoints[2].y}
            x2={screenPoints[3].x}
            y2={screenPoints[3].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />
          <line
            x1={screenPoints[3].x}
            y1={screenPoints[3].y}
            x2={screenPoints[0].x}
            y2={screenPoints[0].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r="3"
            fill={displayColor}
            opacity="0.8"
          />
        </>
      )}
      <line
        x1={centerX}
        y1={centerY}
        x2={centerX}
        y2={centerY + height}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      {screenPoints.length >= 5 && has6 && (
        <>
          <line
            x1={screenPoints[4].x}
            y1={screenPoints[4].y}
            x2={screenPoints[5].x}
            y2={screenPoints[5].y}
            stroke={displayColor}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.5"
          />
          <circle
            cx={midX!}
            cy={midY!}
            r="3"
            fill={displayColor}
            opacity="0.8"
          />
          <line
            x1={midX!}
            y1={midY! - height}
            x2={midX!}
            y2={midY!}
            stroke={displayColor}
            strokeWidth="2"
            strokeDasharray="3,3"
          />
        </>
      )}
    </>
  );
}
