/**
 * 医学标注工具 renderer。
 * 原先聚合在 annotation-renderers.tsx 的实现现在下沉到文档允许的 renderer 目录中。
 */

import type { JSX } from 'react';
import { Point } from '../../../../types';

type PelvicMeasurementGeometry = {
  femoralHeadCenter: Point | null;
  sacralLeft: Point;
  sacralRight: Point;
  sacralMidpoint: Point;
  sacralNormal: Point;
};

function getPelvicMeasurementGeometry(
  screenPoints: Point[]
): PelvicMeasurementGeometry | null {
  if (screenPoints.length < 2) return null;

  const femoralHeadCenter = screenPoints.length >= 3 ? screenPoints[0] : null;
  const sacralLeft =
    screenPoints.length >= 3 ? screenPoints[1] : screenPoints[0];
  const sacralRight =
    screenPoints.length >= 3 ? screenPoints[2] : screenPoints[1];
  const endplateDx = sacralRight.x - sacralLeft.x;
  const endplateDy = sacralRight.y - sacralLeft.y;
  const endplateLength = Math.sqrt(
    endplateDx * endplateDx + endplateDy * endplateDy
  );

  if (endplateLength === 0) return null;

  return {
    femoralHeadCenter,
    sacralLeft,
    sacralRight,
    sacralMidpoint: {
      x: (sacralLeft.x + sacralRight.x) / 2,
      y: (sacralLeft.y + sacralRight.y) / 2,
    },
    sacralNormal: {
      x: -endplateDy / endplateLength,
      y: endplateDx / endplateLength,
    },
  };
}

function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

function getShortestAngleDiff(fromAngle: number, toAngle: number): number {
  let diff = normalizeAngle(toAngle) - normalizeAngle(fromAngle);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function pickClosestRayAngle(
  baseAngle: number,
  candidateAngles: number[]
): number {
  return candidateAngles.reduce((best, current) =>
    Math.abs(getShortestAngleDiff(baseAngle, current)) <
    Math.abs(getShortestAngleDiff(baseAngle, best))
      ? current
      : best
  );
}

function buildAngleArc(
  vertex: Point,
  firstRayAngle: number,
  secondRayAngle: number,
  radius: number
): string {
  const startX = vertex.x + radius * Math.cos((firstRayAngle * Math.PI) / 180);
  const startY = vertex.y + radius * Math.sin((firstRayAngle * Math.PI) / 180);
  const endX = vertex.x + radius * Math.cos((secondRayAngle * Math.PI) / 180);
  const endY = vertex.y + radius * Math.sin((secondRayAngle * Math.PI) / 180);
  const angleDiff = getShortestAngleDiff(firstRayAngle, secondRayAngle);
  const sweepFlag = angleDiff > 0 ? 1 : 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`;
}

function getPelvicArcRadius(
  imageScale: number,
  referenceLength: number,
  guideLength: number,
  layer: 'inner' | 'outer'
): number {
  const baseRadius = Math.max(
    12 * imageScale,
    Math.min(36 * imageScale, referenceLength * 0.35, guideLength * 0.45)
  );

  if (layer === 'inner') {
    return Math.max(9 * imageScale, baseRadius - 10 * imageScale);
  }

  return baseRadius;
}

/**
 * T1 Tilt 渲染器：椎体线 + 水平参考线 + 角度弧线
 */
export function renderT1Tilt(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const dx = screenPoints[1].x - screenPoints[0].x;
  const dy = screenPoints[1].y - screenPoints[0].y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  let displayAngle = angle;
  if (displayAngle > 90) displayAngle -= 180;
  else if (displayAngle < -90) displayAngle += 180;

  const radius = 30 * imageScale;
  const endAngle = displayAngle;

  const startX = screenPoints[0].x + radius;
  const startY = screenPoints[0].y;
  const endX =
    screenPoints[0].x + radius * Math.cos((endAngle * Math.PI) / 180);
  const endY =
    screenPoints[0].y + radius * Math.sin((endAngle * Math.PI) / 180);

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
): JSX.Element | null {
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
): JSX.Element | null {
  if (screenPoints.length < 7) return null;

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
  const midX = (screenPoints[5].x + screenPoints[6].x) / 2;
  const midY = (screenPoints[5].y + screenPoints[6].y) / 2;
  const vertexX = screenPoints[4].x;
  const vertexY = screenPoints[4].y;

  const dx1 = centerX - vertexX;
  const dy1 = centerY - vertexY;
  const angle1 = Math.atan2(dy1, dx1) * (180 / Math.PI);
  const dx2 = midX - vertexX;
  const dy2 = midY - vertexY;
  const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI);

  const radius = 40 * imageScale;
  const startX = vertexX + radius * Math.cos((angle1 * Math.PI) / 180);
  const startY = vertexY + radius * Math.sin((angle1 * Math.PI) / 180);
  const endX = vertexX + radius * Math.cos((angle2 * Math.PI) / 180);
  const endY = vertexY + radius * Math.sin((angle2 * Math.PI) / 180);

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
        x2={vertexX}
        y2={vertexY}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={vertexX}
        y1={vertexY}
        x2={midX}
        y2={midY}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[5].x}
        y1={screenPoints[5].y}
        x2={screenPoints[6].x}
        y2={screenPoints[6].y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
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
): JSX.Element | null {
  const geometry = getPelvicMeasurementGeometry(screenPoints);
  if (!geometry) return null;

  const normalLength = 80 * imageScale;
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
    const radius = getPelvicArcRadius(
      imageScale,
      femoralDistance,
      normalLength,
      'outer'
    );

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
      {/* 骶骨中垂线：只显示下方部分（骶骨上终板下方） */}
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

/**
 * PT（骨盆倾斜角）渲染器：骶骨中点、股骨头中点、垂直参考线
 */
export function renderPT(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  const geometry = getPelvicMeasurementGeometry(screenPoints);
  if (!geometry) return null;

  const verticalLength = 80 * imageScale;
  let path: string | null = null;

  if (geometry.femoralHeadCenter) {
    const femoralRayX =
      geometry.femoralHeadCenter.x - geometry.sacralMidpoint.x;
    const femoralRayY =
      geometry.femoralHeadCenter.y - geometry.sacralMidpoint.y;
    const femoralAngle = Math.atan2(femoralRayY, femoralRayX) * (180 / Math.PI);
    const verticalAngle = pickClosestRayAngle(femoralAngle, [-90, 90]);
    const femoralDistance = Math.sqrt(
      femoralRayX * femoralRayX + femoralRayY * femoralRayY
    );
    const radius = getPelvicArcRadius(
      imageScale,
      femoralDistance,
      verticalLength,
      'inner'
    );

    path = buildAngleArc(
      geometry.sacralMidpoint,
      verticalAngle,
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
      <circle
        cx={geometry.sacralMidpoint.x}
        cy={geometry.sacralMidpoint.y}
        r="3"
        fill={displayColor}
      />
      <line
        x1={geometry.sacralMidpoint.x}
        y1={geometry.sacralMidpoint.y - verticalLength}
        x2={geometry.sacralMidpoint.x}
        y2={geometry.sacralMidpoint.y + verticalLength}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
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

/**
 * T1 Slope渲染器（侧位）：椎体线 + 水平参考线 + 角度弧线
 */
export function renderT1Slope(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  return renderT1Tilt(screenPoints, displayColor, imageScale);
}

/**
 * CA/Pelvic/Sacral/SS渲染器：单线（不带水平参考线）
 */
export function renderSingleLineWithHorizontal(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  return (
    <line
      x1={screenPoints[0].x}
      y1={screenPoints[0].y}
      x2={screenPoints[1].x}
      y2={screenPoints[1].y}
      stroke={displayColor}
      strokeWidth="2"
    />
  );
}

/**
 * SS渲染器：骶骨终板 + 水平参考线 + 中点 + 法线
 */
export function renderSS(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const geometry = getPelvicMeasurementGeometry(screenPoints);
  if (!geometry) return null;

  const normalLength = 80 * imageScale;

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
        x1={geometry.sacralLeft.x - 100 * imageScale}
        y1={geometry.sacralLeft.y}
        x2={geometry.sacralLeft.x + 100 * imageScale}
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

/**
 * SVA渲染器：两条垂直线
 * - 2点模式：显示两个端点的垂直线
 * - 5点模式：基于前4个点计算锥体中心，显示中心与第5个点的垂直线
 */
export function renderSVA(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const height = 150 * imageScale;

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
        {/* C7铅垂线（C7PL）：仅显示下半部分 */}
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
        {/* 骶椎后缘铅垂线：仅显示下半部分 */}
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
      {/* 第一条垂直线：仅显示下半部分 */}
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[0].x}
        y2={screenPoints[0].y + height / 2}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      {/* 第二条垂直线：仅显示下半部分 */}
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

/**
 * AVT/TS渲染器：两条垂直线
 */
export function renderVerticalLines(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  return renderSVA(screenPoints, displayColor, imageScale);
}

/**
 * Sacral（骶骨倾斜角）渲染器：骶骨连线 + CSVL（中央骶骨垂直线）
 * CSVL只显示下方部分，用于辅助AVT/TS等测量
 */
export function renderSacralWithPerpendicular(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const midY = (screenPoints[0].y + screenPoints[1].y) / 2;
  const perpLength = 300 * imageScale; // 缩短CSVL长度，从800改为300

  return (
    <>
      {/* 骶骨连线（使用displayColor，通常是粉色） */}
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
      />
      {/* CSVL（中央骶骨垂直线）：统一绿色，仅显示连线上方部分 */}
      <line
        x1={midX}
        y1={midY}
        x2={midX}
        y2={midY - perpLength}
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
    </>
  );
}

/**
 * C7 Offset渲染器（正面）：
 * - 前4个点连线形成锥体区域（虚线），中心点作为第一条垂直线
 * - 后2个点连线及中点作为第二条垂直线
 * - 两条垂直线之间显示水平测量线
 */
export function renderC7Offset(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  const height = 150 * imageScale;
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
          <circle cx={midX!} cy={midY!} r="3" fill={displayColor} opacity="0.8" />
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

/**
 * TTS渲染器（4点法）：
 * - 前2个点连线为躯干参考水平线，过中点画垂直线
 * - 后2个点为骶骨参考线（继承自Sacral），过中点画垂直线
 * - 两条垂直线之间画水平连接箭头
 */
export function renderTTS(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  const height = 150 * imageScale;
  const has2 = screenPoints.length >= 2;
  const has4 = screenPoints.length >= 4;

  const trunkMidX = has2
    ? (screenPoints[0].x + screenPoints[1].x) / 2
    : (screenPoints[0]?.x ?? 0);
  const trunkMidY = has2
    ? (screenPoints[0].y + screenPoints[1].y) / 2
    : (screenPoints[0]?.y ?? 0);

  const sacralMidX = has4
    ? (screenPoints[2].x + screenPoints[3].x) / 2
    : null;
  const sacralMidY = has4
    ? (screenPoints[2].y + screenPoints[3].y) / 2
    : null;

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
            points={`${Math.min(trunkMidX, sacralMidX)},${connectorY} ${Math.min(trunkMidX, sacralMidX) + 6 * imageScale},${connectorY - 4 * imageScale} ${Math.min(trunkMidX, sacralMidX) + 6 * imageScale},${connectorY + 4 * imageScale}`}
            fill={displayColor}
          />
          <polygon
            points={`${Math.max(trunkMidX, sacralMidX)},${connectorY} ${Math.max(trunkMidX, sacralMidX) - 6 * imageScale},${connectorY - 4 * imageScale} ${Math.max(trunkMidX, sacralMidX) - 6 * imageScale},${connectorY + 4 * imageScale}`}
            fill={displayColor}
          />
        </>
      )}
    </>
  );
}

/**
 * LLD 双下肢不等长渲染器：两条水平线
 */
export function renderHorizontalLines(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const width = 150 * imageScale;

  return (
    <>
      <line
        x1={screenPoints[0].x - width / 2}
        y1={screenPoints[0].y}
        x2={screenPoints[0].x + width / 2}
        y2={screenPoints[0].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[1].x - width / 2}
        y1={screenPoints[1].y}
        x2={screenPoints[1].x + width / 2}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
    </>
  );
}

/**
 * 水平线段渲染器：优先渲染2点线段（兼容旧数据时1点退化为短线）
 */
export function renderSingleHorizontalLine(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  if (screenPoints.length >= 2) {
    return (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
    );
  }

  const point = screenPoints[0];
  const lineLength = 80 * imageScale;

  return (
    <line
      x1={point.x - lineLength / 2}
      y1={point.y}
      x2={point.x + lineLength / 2}
      y2={point.y}
      stroke={displayColor}
      strokeWidth="2"
      strokeDasharray="5,5"
      opacity="0.8"
    />
  );
}

/**
 * 垂直线段渲染器：优先渲染2点线段（兼容旧数据时1点退化为短线）
 */
export function renderSingleVerticalLine(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 1) return null;

  if (screenPoints.length >= 2) {
    return (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
    );
  }

  const point = screenPoints[0];
  const lineLength = 80 * imageScale;

  return (
    <line
      x1={point.x}
      y1={point.y - lineLength / 2}
      x2={point.x}
      y2={point.y + lineLength / 2}
      stroke={displayColor}
      strokeWidth="2"
      strokeDasharray="5,5"
      opacity="0.8"
    />
  );
}
