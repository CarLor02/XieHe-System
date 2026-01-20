/**
 * 标注SVG渲染器
 * 为不同类型的标注提供特殊的SVG渲染逻辑
 */

import React from 'react';
import { Point } from './annotationConfig';

/**
 * T1 Tilt 渲染器：椎体线 + 水平参考线 + 角度弧线
 */
export function renderT1Tilt(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  if (screenPoints.length < 2) return null;

  const dx = screenPoints[1].x - screenPoints[0].x;
  const dy = screenPoints[1].y - screenPoints[0].y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  let displayAngle = angle;
  if (displayAngle > 90) displayAngle = displayAngle - 180;
  else if (displayAngle < -90) displayAngle = displayAngle + 180;
  
  const radius = 30 * imageScale;
  const startAngle = 0;
  const endAngle = displayAngle;
  
  const startX = screenPoints[0].x + radius;
  const startY = screenPoints[0].y;
  const endX = screenPoints[0].x + radius * Math.cos(endAngle * Math.PI / 180);
  const endY = screenPoints[0].y + radius * Math.sin(endAngle * Math.PI / 180);
  
  const largeArcFlag = Math.abs(endAngle) > 180 ? 1 : 0;
  const sweepFlag = endAngle > 0 ? 1 : 0;

  return (
    <>
      {/* 椎体上终板线 */}
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
      />
      {/* 水平参考线 */}
      <line
        x1={screenPoints[0].x - 100 * imageScale}
        y1={screenPoints[0].y}
        x2={screenPoints[0].x + 100 * imageScale}
        y2={screenPoints[0].y}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
      />
      {/* 角度弧线 */}
      <path
        d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`}
        fill="none"
        stroke={displayColor}
        strokeWidth="1"
        opacity="0.8"
      />
    </>
  );
}

/**
 * Cobb角/CL/TK/LL系列渲染器：两条独立线段
 */
export function renderTwoLines(
  screenPoints: Point[],
  displayColor: string
): React.ReactNode {
  if (screenPoints.length < 4) return null;

  return (
    <>
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[2].x}
        y1={screenPoints[2].y}
        x2={screenPoints[3].x}
        y2={screenPoints[3].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
    </>
  );
}

/**
 * TPA渲染器：点1、点2、点3-4中点形成夹角
 */
export function renderTPA(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  if (screenPoints.length < 4) return null;

  const midX = (screenPoints[2].x + screenPoints[3].x) / 2;
  const midY = (screenPoints[2].y + screenPoints[3].y) / 2;
  
  const dx1 = screenPoints[0].x - screenPoints[1].x;
  const dy1 = screenPoints[0].y - screenPoints[1].y;
  const angle1 = Math.atan2(dy1, dx1) * (180 / Math.PI);
  
  const dx2 = midX - screenPoints[1].x;
  const dy2 = midY - screenPoints[1].y;
  const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI);
  
  const radius = 40 * imageScale;
  const startX = screenPoints[1].x + radius * Math.cos(angle1 * Math.PI / 180);
  const startY = screenPoints[1].y + radius * Math.sin(angle1 * Math.PI / 180);
  const endX = screenPoints[1].x + radius * Math.cos(angle2 * Math.PI / 180);
  const endY = screenPoints[1].y + radius * Math.sin(angle2 * Math.PI / 180);
  
  let angleDiff = angle2 - angle1;
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;
  
  const sweepFlag = angleDiff > 0 ? 1 : 0;

  return (
    <>
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[1].x}
        y1={screenPoints[1].y}
        x2={midX}
        y2={midY}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[2].x}
        y1={screenPoints[2].y}
        x2={screenPoints[3].x}
        y2={screenPoints[3].y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
      <circle cx={midX} cy={midY} r={4 * imageScale} fill={displayColor} opacity="0.8" />
      <path
        d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`}
        fill="none"
        stroke={displayColor}
        strokeWidth="1.5"
        opacity="0.8"
      />
    </>
  );
}

/**
 * PI（骨盆入射角）渲染器：骶骨中点、股骨头中点、中垂线
 */
export function renderPI(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  if (screenPoints.length < 3) return null;

  const mid12X = screenPoints[0].x;
  const mid12Y = screenPoints[0].y;
  const mid34X = (screenPoints[1].x + screenPoints[2].x) / 2;
  const mid34Y = (screenPoints[1].y + screenPoints[2].y) / 2;
  
  const line23DX = screenPoints[2].x - screenPoints[1].x;
  const line23DY = screenPoints[2].y - screenPoints[1].y;
  const line23Length = Math.sqrt(line23DX * line23DX + line23DY * line23DY);
  
  const perpDX = -line23DY / line23Length;
  const perpDY = line23DX / line23Length;
  const perpLength = 80 * imageScale;
  
  const lineVectorX = mid12X - mid34X;
  const lineVectorY = mid12Y - mid34Y;
  const lineAngle = Math.atan2(lineVectorY, lineVectorX) * (180 / Math.PI);
  const perpAngle = Math.atan2(perpDY, perpDX) * (180 / Math.PI);
  
  const radius = 50 * imageScale;
  const startX = mid34X + radius * Math.cos(perpAngle * Math.PI / 180);
  const startY = mid34Y + radius * Math.sin(perpAngle * Math.PI / 180);
  const endX = mid34X + radius * Math.cos(lineAngle * Math.PI / 180);
  const endY = mid34Y + radius * Math.sin(lineAngle * Math.PI / 180);
  
  let angleDiff = lineAngle - perpAngle;
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;
  const sweepFlag = angleDiff > 0 ? 1 : 0;

  return (
    <>
      <line
        x1={screenPoints[1].x}
        y1={screenPoints[1].y}
        x2={screenPoints[2].x}
        y2={screenPoints[2].y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={mid12X}
        y1={mid12Y}
        x2={mid34X}
        y2={mid34Y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={mid34X - perpDX * perpLength}
        y1={mid34Y - perpDY * perpLength}
        x2={mid34X + perpDX * perpLength}
        y2={mid34Y + perpDY * perpLength}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <path
        d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`}
        fill="none"
        stroke={displayColor}
        strokeWidth="1.5"
        opacity="0.8"
      />
      <circle cx={mid12X} cy={mid12Y} r={4 * imageScale} fill={displayColor} opacity="0.8" />
      <circle cx={mid34X} cy={mid34Y} r={4 * imageScale} fill={displayColor} opacity="0.8" />
    </>
  );
}

/**
 * PT（骨盆倾斜角）渲染器：骶骨中点、股骨头中点、垂直参考线
 */
export function renderPT(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  if (screenPoints.length < 3) return null;

  const mid12X = screenPoints[0].x;
  const mid12Y = screenPoints[0].y;
  const mid34X = (screenPoints[1].x + screenPoints[2].x) / 2;
  const mid34Y = (screenPoints[1].y + screenPoints[2].y) / 2;
  
  const dx = mid34X - mid12X;
  const dy = mid34Y - mid12Y;
  const lineAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  const verticalAngle = -90;
  
  const radius = 50 * imageScale;
  const startX = mid12X + radius * Math.cos(verticalAngle * Math.PI / 180);
  const startY = mid12Y + radius * Math.sin(verticalAngle * Math.PI / 180);
  const endX = mid12X + radius * Math.cos(lineAngle * Math.PI / 180);
  const endY = mid12Y + radius * Math.sin(lineAngle * Math.PI / 180);
  
  let angleDiff = lineAngle - verticalAngle;
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;
  const sweepFlag = angleDiff > 0 ? 1 : 0;

  return (
    <>
      <line
        x1={screenPoints[1].x}
        y1={screenPoints[1].y}
        x2={screenPoints[2].x}
        y2={screenPoints[2].y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={mid12X}
        y1={mid12Y}
        x2={mid34X}
        y2={mid34Y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={mid12X}
        y1={mid12Y - 80 * imageScale}
        x2={mid12X}
        y2={mid12Y + 80 * imageScale}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
      />
      <path
        d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`}
        fill="none"
        stroke={displayColor}
        strokeWidth="1.5"
        opacity="0.8"
      />
      <circle cx={mid12X} cy={mid12Y} r={4 * imageScale} fill={displayColor} opacity="0.8" />
      <circle cx={mid34X} cy={mid34Y} r={4 * imageScale} fill={displayColor} opacity="0.8" />
    </>
  );
}

/**
 * T1 Slope渲染器（侧位）：椎体线 + 水平参考线 + 角度弧线
 */
export function renderT1Slope(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  return renderT1Tilt(screenPoints, displayColor, imageScale);
}

/**
 * RSH/Pelvic/Sacral/SS渲染器：单线 + 水平参考线
 */
export function renderSingleLineWithHorizontal(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  if (screenPoints.length < 2) return null;

  return (
    <>
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={screenPoints[0].x - 100 * imageScale}
        y1={screenPoints[0].y}
        x2={screenPoints[0].x + 100 * imageScale}
        y2={screenPoints[0].y}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
      />
    </>
  );
}

/**
 * SVA渲染器：两条垂直线
 */
export function renderSVA(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  if (screenPoints.length < 2) return null;

  const height = 150 * imageScale;
  
  return (
    <>
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y - height / 2}
        x2={screenPoints[0].x}
        y2={screenPoints[0].y + height / 2}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[1].x}
        y1={screenPoints[1].y - height / 2}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y + height / 2}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
    </>
  );
}

/**
 * AVT/TS渲染器：两条垂直线
 */
export function renderVerticalLines(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  return renderSVA(screenPoints, displayColor, imageScale);
}
