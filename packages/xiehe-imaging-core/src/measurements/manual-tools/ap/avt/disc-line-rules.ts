import type { Point } from '@xiehe/imaging-core/contracts';

export function createHorizontalDiscAnchors(
  firstClick: Point,
  secondClick: Point
): [Point, Point] {
  const horizontalSecond = { x: secondClick.x, y: firstClick.y };
  return firstClick.x <= horizontalSecond.x
    ? [{ ...firstClick }, horizontalSecond]
    : [horizontalSecond, { ...firstClick }];
}

export function updateHorizontalDiscAnchors(
  anchors: readonly [Point, Point],
  movedIndex: number,
  nextPoint: Point
): [Point, Point] {
  const next: [Point, Point] = [{ ...anchors[0] }, { ...anchors[1] }];
  next[movedIndex] = { ...nextPoint };
  next[1 - movedIndex] = {
    ...next[1 - movedIndex],
    y: nextPoint.y,
  };
  return next[0].x <= next[1].x ? next : [next[1], next[0]];
}
