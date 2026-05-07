import { Point } from '@/app/imaging/viewer/image-viewer/shared/types';

export function ellipseRenderer([center, edge]: Point[], color: string) {
  if (!center || !edge) return null;
  return (
    <ellipse
      cx={center.x}
      cy={center.y}
      rx={Math.abs(edge.x - center.x)}
      ry={Math.abs(edge.y - center.y)}
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  );
}
