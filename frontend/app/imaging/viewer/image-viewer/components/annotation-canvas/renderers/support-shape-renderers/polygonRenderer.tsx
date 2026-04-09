import { Point } from '../../../../types';

export function polygonRenderer(points: Point[], color: string) {
  if (points.length < 2) return null;
  return (
    <polygon
      points={points.map(point => `${point.x},${point.y}`).join(' ')}
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  );
}
