import type { JSX } from 'react';
import type { Point } from '@xiehe/imaging-core/contracts';
import {
  getVertebraCenterGeometry,
  type VertebraCorners,
} from '@xiehe/imaging-core/geometry';

interface RenderVertebraCenterGeometryOptions {
  corners: VertebraCorners;
  displayColor: string;
  projectPoint?: (point: Point) => Point;
  strokeWidth?: number;
  opacity?: number;
  centerRadius?: number;
  centerStroke?: string;
}

const identity = (point: Point) => point;

/**
 * 统一绘制椎体中心语义：四边形周长、两条对边中点连线和中心圆点。
 * 边中点只参与几何计算，不作为独立标记显示。
 */
export function renderVertebraCenterGeometry({
  corners,
  displayColor,
  projectPoint = identity,
  strokeWidth = 1,
  opacity = 0.5,
  centerRadius = 3,
  centerStroke,
}: RenderVertebraCenterGeometryOptions): JSX.Element {
  const geometry = getVertebraCenterGeometry(corners);
  const perimeter = geometry.perimeter.map(projectPoint);
  const topBottomMidline = geometry.topBottomMidline.map(projectPoint);
  const leftRightMidline = geometry.leftRightMidline.map(projectPoint);
  const center = projectPoint(geometry.center);

  return (
    <g data-vertebra-center-geometry="true">
      {perimeter.map((point, index) => {
        const nextPoint = perimeter[(index + 1) % perimeter.length];
        return (
          <line
            key={`perimeter-${index}`}
            data-vertebra-geometry-part="perimeter"
            x1={point.x}
            y1={point.y}
            x2={nextPoint.x}
            y2={nextPoint.y}
            stroke={displayColor}
            strokeWidth={strokeWidth}
            strokeDasharray="5,5"
            opacity={opacity}
          />
        );
      })}
      <line
        data-vertebra-geometry-part="midline"
        x1={topBottomMidline[0].x}
        y1={topBottomMidline[0].y}
        x2={topBottomMidline[1].x}
        y2={topBottomMidline[1].y}
        stroke={displayColor}
        strokeWidth={strokeWidth}
        strokeDasharray="5,5"
        opacity={opacity}
      />
      <line
        data-vertebra-geometry-part="midline"
        x1={leftRightMidline[0].x}
        y1={leftRightMidline[0].y}
        x2={leftRightMidline[1].x}
        y2={leftRightMidline[1].y}
        stroke={displayColor}
        strokeWidth={strokeWidth}
        strokeDasharray="5,5"
        opacity={opacity}
      />
      <circle
        data-vertebra-geometry-part="center"
        cx={center.x}
        cy={center.y}
        r={centerRadius}
        fill={displayColor}
        stroke={centerStroke}
        strokeWidth={centerStroke ? 1 : undefined}
        opacity={Math.min(1, opacity + 0.3)}
      />
    </g>
  );
}
