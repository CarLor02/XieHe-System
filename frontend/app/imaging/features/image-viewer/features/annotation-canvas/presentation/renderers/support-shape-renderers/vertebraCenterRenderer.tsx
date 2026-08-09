import { Point } from '@xiehe/imaging-core/contracts';

export function vertebraCenterRenderer(point: Point, color: string) {
  return <circle cx={point.x} cy={point.y} r="4" fill={color} />;
}
