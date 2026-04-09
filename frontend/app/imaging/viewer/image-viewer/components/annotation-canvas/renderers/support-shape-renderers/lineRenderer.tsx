import { Point } from '../../../../types';

export function lineRenderer([start, end]: Point[], color: string) {
  if (!start || !end) return null;
  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={color}
      strokeWidth="2"
    />
  );
}
