import {
  circleGeometryFromPoints,
  getCircleRadius,
} from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

interface CircleRendererOptions {
  fill?: string;
  fillOpacity?: number | string;
  opacity?: number | string;
  strokeWidth?: number | string;
}

export function circleRenderer(
  points: Point[],
  color: string,
  options: CircleRendererOptions = {}
) {
  const circle = circleGeometryFromPoints(points);
  if (!circle) return null;
  return (
    <circle
      cx={circle.center.x}
      cy={circle.center.y}
      r={getCircleRadius(circle)}
      fill={options.fill ?? 'none'}
      fillOpacity={options.fillOpacity}
      stroke={color}
      strokeWidth={options.strokeWidth ?? 2}
      opacity={options.opacity}
    />
  );
}
