import { Point } from '../../../../types';

export function rectangleRenderer([start, end]: Point[], color: string) {
  if (!start || !end) return null;
  return (
    <rect
      x={Math.min(start.x, end.x)}
      y={Math.min(start.y, end.y)}
      width={Math.abs(end.x - start.x)}
      height={Math.abs(end.y - start.y)}
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  );
}
