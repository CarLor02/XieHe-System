import { Point } from '@/app/imaging/viewer/shared/types';

export function vertebraCenterRenderer(point: Point, color: string) {
  return <circle cx={point.x} cy={point.y} r="4" fill={color} />;
}
