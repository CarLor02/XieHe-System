/**
 * 标注SVG渲染器
 * 为不同类型的标注提供特殊的SVG渲染逻辑
 */

import React from 'react';
import { Point } from './annotationConfig';

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
  if (screenPoints.length < 7) return null;

  // 计算前4个点的中心作为实际的第1个点
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

  // 第6和第7个点的中点
  const midX = (screenPoints[5].x + screenPoints[6].x) / 2;
  const midY = (screenPoints[5].y + screenPoints[6].y) / 2;

  // 第5个点作为顶点
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
      {/* 前4个点连线形成区域 */}
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

      {/* 中心点到顶点的线 */}
      <line
        x1={centerX}
        y1={centerY}
        x2={vertexX}
        y2={vertexY}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />

      {/* 顶点到第6、7个点中点的线 */}
      <line
        x1={vertexX}
        y1={vertexY}
        x2={midX}
        y2={midY}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />

      {/* 第6和第7个点的连线 */}
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

      {/* 角度弧线 */}
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
      <line
        x1={geometry.sacralMidpoint.x - geometry.sacralNormal.x * normalLength}
        y1={geometry.sacralMidpoint.y - geometry.sacralNormal.y * normalLength}
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
): React.ReactNode {
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
): React.ReactNode {
  return renderT1Tilt(screenPoints, displayColor, imageScale);
}

/**
 * CA/Pelvic/Sacral/SS渲染器：单线 + 水平参考线
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
 * SS渲染器：骶骨终板 + 水平参考线 + 中点 + 法线
 */
export function renderSS(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
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
): React.ReactNode {
  if (screenPoints.length < 2) return null;

  const height = 150 * imageScale;

  // 5点模式：锥体中心 + 第5个点的垂直线
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
        {/* 前4个点连线形成区域 */}
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

        {/* 通过锥体中心的垂直线 */}
        <line
          x1={centerX}
          y1={centerY - height / 2}
          x2={centerX}
          y2={centerY + height / 2}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        {/* 锥体中心点 */}
        <circle
          cx={centerX}
          cy={centerY}
          r="3"
          fill={displayColor}
          stroke="#ffffff"
          strokeWidth="1"
          opacity="0.8"
        />

        {/* 通过第5个点的垂直线 */}
        <line
          x1={point5.x}
          y1={point5.y - height / 2}
          x2={point5.x}
          y2={point5.y + height / 2}
          stroke={displayColor}
          strokeWidth="2"
          strokeDasharray="3,3"
        />
      </>
    );
  }

  // 2点模式：原有逻辑
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

/**
 * Sacral（骶骨倾斜角）渲染器：骶骨连线 + 过中点的垂直线参考线
 * 垂直线覆盖整个图片高度，用于辅助其他标注
 */
export function renderSacralWithPerpendicular(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
  if (screenPoints.length < 2) return null;

  // 计算两点的中点
  const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const midY = (screenPoints[0].y + screenPoints[1].y) / 2;

  // 垂直线长度设置为适中值，足够覆盖图片高度但不过长
  // 使用 800 像素的基础长度，会随着缩放自动调整
  const perpLength = 800 * imageScale;

  return (
    <>
      {/* 骶骨倾斜角的连线 */}
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
      />
      {/* 过中点的垂直线参考线 - 覆盖图片高度 */}
      <line
        x1={midX}
        y1={midY - perpLength}
        x2={midX}
        y2={midY + perpLength}
        stroke="#00ff00"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.7"
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
): React.ReactNode {
  if (screenPoints.length < 1) return null;

  const height = 150 * imageScale;

  // 前4个点（锥体四角）——够4个点才画
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
      {/* 前4个点连线（虚线矩形代表锥体轮廓） */}
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
          {/* 锥体中心点 */}
          <circle
            cx={centerX}
            cy={centerY}
            r="3"
            fill={displayColor}
            opacity="0.8"
          />
        </>
      )}

      {/* 锥体中心处的垂直线 */}
      <line
        x1={centerX}
        y1={centerY - height / 2}
        x2={centerX}
        y2={centerY + height / 2}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />

      {/* 后两个点的连线及中点垂直线 */}
      {screenPoints.length >= 5 && (
        <>
          {has6 && (
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
              {/* 中点标记 */}
              <circle
                cx={midX!}
                cy={midY!}
                r="3"
                fill={displayColor}
                opacity="0.8"
              />
              {/* 中点处的垂直线 */}
              <line
                x1={midX!}
                y1={midY! - height / 2}
                x2={midX!}
                y2={midY! + height / 2}
                stroke={displayColor}
                strokeWidth="2"
                strokeDasharray="3,3"
              />
            </>
          )}
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
): React.ReactNode {
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
): React.ReactNode {
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
    <>
      {/* 通过点的水平线 */}
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
    </>
  );
}

/**
 * 垂直线段渲染器：优先渲染2点线段（兼容旧数据时1点退化为短线）
 */
export function renderSingleVerticalLine(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode {
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
    <>
      {/* 通过点的垂直线 */}
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
    </>
  );
}
