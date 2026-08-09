import type { Point } from '../../../../contracts';
import { calculateHemipelvicWidthRatioGeometry } from './geometry';

/** L/R 的四条纵线均可整体命中，包含少量纵向容差。 */
export function isHemipelvicWidthRatioInRange(
  mousePoint: Point,
  points: Point[],
  tolerance = 10
): boolean {
  const geometry = calculateHemipelvicWidthRatioGeometry(points);
  if (!geometry) return false;
  return geometry.lines.some(line => {
    const minY = Math.min(line.top.y, line.bottom.y) - tolerance;
    const maxY = Math.max(line.top.y, line.bottom.y) + tolerance;
    return (
      Math.abs(mousePoint.x - line.anchor.x) <= tolerance &&
      mousePoint.y >= minY &&
      mousePoint.y <= maxY
    );
  });
}
