import type { Point, VertebraAnnotation } from '../../../shared/domain/contracts';
import {
  isSinglePointKeypointLabel,
  keypointIdToRenderCornerRef,
} from '../../../keypoints/domain';

export interface VertebraDragMember {
  vertebraLabel: string;
  cornerIndex: number;
}

export function isCompleteVertebraFrame(
  vertebra: VertebraAnnotation
): boolean {
  if (vertebra.label === 'S1') return false;
  if (isSinglePointKeypointLabel(vertebra.label)) return false;
  return new Set(vertebra.corners.map(point => `${point.x}:${point.y}`)).size === 4;
}

export function isPointInsidePolygon(
  point: Point,
  polygon: readonly Point[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const current = polygon[i];
    const previous = polygon[j];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function findNearestVertebraCorner(input: {
  layer: readonly VertebraAnnotation[];
  screenPoint: Point;
  hitRadius: number;
  imageToScreen: (point: Point) => Point;
}): VertebraDragMember | null {
  let best: VertebraDragMember | null = null;
  let bestDistance = input.hitRadius;
  input.layer.forEach(vertebra => {
    vertebra.corners.forEach((corner, cornerIndex) => {
      const screenCorner = input.imageToScreen(corner);
      const distance = Math.hypot(
        screenCorner.x - input.screenPoint.x,
        screenCorner.y - input.screenPoint.y
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { vertebraLabel: vertebra.label, cornerIndex };
      }
    });
  });
  return best;
}

export function findVertebraFrameMembers(input: {
  layer: readonly VertebraAnnotation[];
  screenPoint: Point;
  imageToScreen: (point: Point) => Point;
}): VertebraDragMember[] | null {
  for (const vertebra of input.layer) {
    if (!isCompleteVertebraFrame(vertebra)) continue;
    const [tl, tr, bl, br] = vertebra.corners.map(input.imageToScreen);
    if (!isPointInsidePolygon(input.screenPoint, [tl, tr, br, bl])) continue;
    return [0, 1, 2, 3].map(cornerIndex => ({
      vertebraLabel: vertebra.label,
      cornerIndex,
    }));
  }
  return null;
}

export function updateVertebraLayerCorner(
  layer: readonly VertebraAnnotation[],
  member: VertebraDragMember,
  imagePoint: Point
): VertebraAnnotation[] {
  return layer.map(vertebra => {
    if (vertebra.label !== member.vertebraLabel) return vertebra;
    const corners = [...vertebra.corners] as [Point, Point, Point, Point];
    if (vertebra.label === 'S1') {
      const indices =
        member.cornerIndex === 1 || member.cornerIndex === 3 ? [1, 3] : [0, 2];
      indices.forEach(index => {
        corners[index] = imagePoint;
      });
    } else if (isSinglePointKeypointLabel(vertebra.label)) {
      corners.fill(imagePoint);
    } else {
      corners[member.cornerIndex] = imagePoint;
    }
    return { ...vertebra, corners };
  });
}

export function shouldStartPointerDrag(
  startPoint: Point,
  currentPoint: Point,
  threshold: number
): boolean {
  return (
    Math.hypot(currentPoint.x - startPoint.x, currentPoint.y - startPoint.y) >
    threshold
  );
}

export function keypointIdsToVertebraDragMembers(input: {
  keypointIds: readonly string[];
  layer: readonly VertebraAnnotation[];
}): VertebraDragMember[] {
  const seen = new Set<string>();
  return input.keypointIds
    .map(keypointId =>
      keypointIdToRenderCornerRef(keypointId, [...input.layer])
    )
    .filter((value): value is { label: string; index: number } => value !== null)
    .map(value => ({
      vertebraLabel: value.label,
      cornerIndex: value.index,
    }))
    .filter(member => {
      const key = `${member.vertebraLabel}:${member.cornerIndex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
