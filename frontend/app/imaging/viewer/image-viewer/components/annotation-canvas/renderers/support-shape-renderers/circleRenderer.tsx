import { Point } from '../../../../types';

export function circleRenderer([center, edge]: Point[], color: string) {
  if (!center || !edge) return null;
  const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
  return (
    <circle
      cx={center.x}
      cy={center.y}
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  );
}
