import type { Point } from '../contracts';

export interface NormalizedMeasurementPoints {
  points: Point[];
  /** 标准点位索引对应原始 points[] 的索引，用于拖拽后识别关键点语义。 */
  sourceIndices: number[];
}

interface IndexedPoint {
  point: Point;
  sourceIndex: number;
}

function cloneIndexedPoints(points: Point[]): IndexedPoint[] {
  return points.map((point, sourceIndex) => ({
    point: { ...point },
    sourceIndex,
  }));
}

export function keepMeasurementPointOrder(
  points: Point[]
): NormalizedMeasurementPoints {
  return {
    points: points.map(point => ({ ...point })),
    sourceIndices: points.map((_, index) => index),
  };
}

function replaceGroup(
  current: IndexedPoint[],
  indices: readonly number[],
  sorted: IndexedPoint[]
) {
  indices.forEach((targetIndex, index) => {
    current[targetIndex] = sorted[index];
  });
}

/** 将指定的两点组按屏幕 X 坐标从左到右排列。 */
export function normalizePointPairs(
  points: Point[],
  pairs: ReadonlyArray<readonly [number, number]>
): NormalizedMeasurementPoints {
  const normalized = cloneIndexedPoints(points);

  pairs.forEach(indices => {
    if (indices.some(index => !normalized[index])) return;
    const sorted = indices
      .map(index => normalized[index])
      .sort(
        (left, right) =>
          left.point.x - right.point.x || left.point.y - right.point.y
      );
    replaceGroup(normalized, indices, sorted);
  });

  return {
    points: normalized.map(item => item.point),
    sourceIndices: normalized.map(item => item.sourceIndex),
  };
}

/**
 * 按几何位置将四点归一化为 [TL, TR, BL, BR]。
 *
 * 该算法沿用 AI 检测已有规则：先按 Y 分为上下两组，再在组内按 X 排序。
 */
export function sortCornersGeometrically(
  points: readonly Point[]
): [Point, Point, Point, Point] {
  if (points.length !== 4) {
    throw new Error('sortCornersGeometrically requires exactly four points');
  }
  const sorted = points
    .map(point => ({ ...point }))
    .sort((left, right) => left.y - right.y || left.x - right.x);
  const top = sorted
    .slice(0, 2)
    .sort((left, right) => left.x - right.x);
  const bottom = sorted
    .slice(2, 4)
    .sort((left, right) => left.x - right.x);
  return [top[0], top[1], bottom[0], bottom[1]];
}

/** 将指定的四点组归一化为 [TL, TR, BL, BR]。 */
export function normalizeCornerGroups(
  points: Point[],
  groups: ReadonlyArray<readonly [number, number, number, number]>
): NormalizedMeasurementPoints {
  const normalized = cloneIndexedPoints(points);

  groups.forEach(indices => {
    if (indices.some(index => !normalized[index])) return;
    const byY = indices
      .map(index => normalized[index])
      .sort(
        (left, right) =>
          left.point.y - right.point.y || left.point.x - right.point.x
      );
    const top = byY
      .slice(0, 2)
      .sort((left, right) => left.point.x - right.point.x);
    const bottom = byY
      .slice(2, 4)
      .sort((left, right) => left.point.x - right.point.x);
    replaceGroup(normalized, indices, [...top, ...bottom]);
  });

  return {
    points: normalized.map(item => item.point),
    sourceIndices: normalized.map(item => item.sourceIndex),
  };
}

export function composePointNormalizers(
  ...normalizers: Array<
    (points: Point[]) => NormalizedMeasurementPoints
  >
): (points: Point[]) => NormalizedMeasurementPoints {
  return points => {
    let normalized = keepMeasurementPointOrder(points);
    let sourceIndices = normalized.sourceIndices;

    normalizers.forEach(normalizer => {
      const next = normalizer(normalized.points);
      sourceIndices = next.sourceIndices.map(index => sourceIndices[index]);
      normalized = {
        points: next.points,
        sourceIndices,
      };
    });

    return normalized;
  };
}
