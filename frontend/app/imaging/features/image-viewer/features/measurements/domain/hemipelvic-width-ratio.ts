import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const HEMIPELVIC_WIDTH_RATIO_TOOL_ID = 'hemipelvic-width-ratio';
export const HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT = 4;
export const HEMIPELVIC_WIDTH_RATIO_POINT_COUNT = 12;
export const HEMIPELVIC_WIDTH_RATIO_INITIAL_LINE_LENGTH = 80;

export const HEMIPELVIC_WIDTH_RATIO_LINE_LABELS = [
  '左外缘（ASIS）',
  '左内缘（SI）',
  '右内缘（SI）',
  '右外缘（ASIS）',
] as const;

export interface HemipelvicVerticalLine {
  sourceIndex: number;
  anchorIndex: number;
  topPointIndex: number;
  bottomPointIndex: number;
  anchor: Point;
  top: Point;
  bottom: Point;
}

export interface SortedHemipelvicVerticalLine extends HemipelvicVerticalLine {
  displayIndex: number;
  label: (typeof HEMIPELVIC_WIDTH_RATIO_LINE_LABELS)[number];
}

export interface HemipelvicWidthRatioGeometry {
  lines: SortedHemipelvicVerticalLine[];
  dLPixels: number;
  dRPixels: number;
  ratio: number | null;
}

function copyPoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

export function createHemipelvicWidthRatioPoints(
  anchors: Point[],
  lineLength = HEMIPELVIC_WIDTH_RATIO_INITIAL_LINE_LENGTH
): Point[] {
  if (anchors.length !== HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT) {
    throw new Error('L/R measurement requires exactly four anatomical anchors');
  }

  const halfLength = Math.max(0, lineLength) / 2;
  return [
    ...anchors.map(copyPoint),
    ...anchors.flatMap(anchor => [
      { x: anchor.x, y: anchor.y - halfLength },
      { x: anchor.x, y: anchor.y + halfLength },
    ]),
  ];
}

export function getHemipelvicVerticalLines(
  points: Point[]
): HemipelvicVerticalLine[] {
  if (points.length !== HEMIPELVIC_WIDTH_RATIO_POINT_COUNT) {
    return [];
  }

  return Array.from(
    { length: HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT },
    (_, sourceIndex) => {
      const topPointIndex =
        HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT + sourceIndex * 2;
      const bottomPointIndex = topPointIndex + 1;
      return {
        sourceIndex,
        anchorIndex: sourceIndex,
        topPointIndex,
        bottomPointIndex,
        anchor: points[sourceIndex],
        top: points[topPointIndex],
        bottom: points[bottomPointIndex],
      };
    }
  );
}

export function sortHemipelvicVerticalLines(
  lines: HemipelvicVerticalLine[]
): SortedHemipelvicVerticalLine[] {
  return [...lines]
    .sort(
      (left, right) =>
        left.anchor.x - right.anchor.x || left.sourceIndex - right.sourceIndex
    )
    .map((line, displayIndex) => ({
      ...line,
      displayIndex,
      label: HEMIPELVIC_WIDTH_RATIO_LINE_LABELS[displayIndex],
    }));
}

export function calculateHemipelvicWidthRatioGeometry(
  points: Point[]
): HemipelvicWidthRatioGeometry | null {
  const lines = sortHemipelvicVerticalLines(getHemipelvicVerticalLines(points));
  if (lines.length !== HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT) {
    return null;
  }

  const dLPixels = Math.abs(lines[1].anchor.x - lines[0].anchor.x);
  const dRPixels = Math.abs(lines[3].anchor.x - lines[2].anchor.x);

  return {
    lines,
    dLPixels,
    dRPixels,
    ratio: dRPixels === 0 ? null : dLPixels / dRPixels,
  };
}

export function updateHemipelvicInteractivePoint(
  points: Point[],
  pointIndex: number,
  target: Point
): Point[] {
  const lines = getHemipelvicVerticalLines(points);
  if (lines.length !== HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT) {
    return points;
  }

  const nextPoints = points.map(copyPoint);

  if (pointIndex >= 0 && pointIndex < HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT) {
    const line = lines[pointIndex];
    const deltaX = target.x - line.anchor.x;
    const deltaY = target.y - line.anchor.y;
    nextPoints[line.anchorIndex] = copyPoint(target);
    nextPoints[line.topPointIndex] = {
      x: line.top.x + deltaX,
      y: line.top.y + deltaY,
    };
    nextPoints[line.bottomPointIndex] = {
      x: line.bottom.x + deltaX,
      y: line.bottom.y + deltaY,
    };
    return nextPoints;
  }

  const line = lines.find(
    item =>
      item.topPointIndex === pointIndex || item.bottomPointIndex === pointIndex
  );
  if (!line) {
    return points;
  }

  const isTopEndpoint = line.topPointIndex === pointIndex;
  nextPoints[pointIndex] = {
    x: line.anchor.x,
    y: isTopEndpoint
      ? Math.min(target.y, line.anchor.y)
      : Math.max(target.y, line.anchor.y),
  };
  return nextPoints;
}

export function moveHemipelvicVerticalLine(
  points: Point[],
  sourceIndex: number,
  targetX: number
): Point[] {
  const line = getHemipelvicVerticalLines(points).find(
    item => item.sourceIndex === sourceIndex
  );
  if (!line) {
    return points;
  }

  const nextPoints = points.map(copyPoint);
  nextPoints[line.anchorIndex].x = targetX;
  nextPoints[line.topPointIndex].x = targetX;
  nextPoints[line.bottomPointIndex].x = targetX;
  return nextPoints;
}
