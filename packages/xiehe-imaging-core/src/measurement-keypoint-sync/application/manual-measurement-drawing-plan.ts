import type { ReferenceLines } from '../../canvas/domain';
import {
  createHemipelvicWidthRatioPoints,
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
} from '../../measurements/domain/manual-tools/ap';
import type { Point } from '../../shared/domain/contracts';
import { resolveNextManualMeasurementPoint } from './usecases';

export type MeasurementReferenceLineKey = keyof ReferenceLines;

export interface ManualMeasurementDrawingPlan {
  clickedPoints: Point[];
  completedPoints: Point[] | null;
  referenceLineUpdate?: {
    key: MeasurementReferenceLineKey;
    point: Point | null;
  };
}

export function assembleInheritedMeasurementPoints(
  pointsNeeded: number,
  inheritedPoints: ReadonlyMap<number, Point>,
  clickedPoints: readonly Point[]
): Point[] {
  const points: Point[] = [];
  let clickedIndex = 0;
  for (let index = 0; index < pointsNeeded; index += 1) {
    const inherited = inheritedPoints.get(index);
    points[index] = inherited ?? clickedPoints[clickedIndex++];
  }
  return points;
}

function getReferenceLineKey(
  toolId: string
): MeasurementReferenceLineKey | null {
  if (toolId.includes('t1-tilt') || toolId.includes('t1-slope')) {
    return 't1Tilt';
  }
  if (toolId.includes('ca')) return 'ca';
  if (toolId === 'po') return 'po';
  if (toolId === 'css') return 'css';
  if (toolId.includes('ss')) return 'ss';
  if (toolId.includes('sva')) return 'sva';
  if (toolId.includes('avt')) return 'avt';
  if (toolId.includes('lld')) return 'lld';
  return null;
}

/**
 * 规划一次普通手动测量点击。
 * 特殊 AVT 椎间盘、骨盆和 Cobb 放置会话由各自应用用例先行处理。
 */
export function planManualMeasurementPointClick(input: {
  toolId: string;
  pointsNeeded: number;
  inheritedPoints: ReadonlyMap<number, Point>;
  clickedPoints: readonly Point[];
  rawPoint: Point;
}): ManualMeasurementDrawingPlan {
  const { toolId, pointsNeeded, inheritedPoints, clickedPoints, rawPoint } =
    input;
  const effectiveNeeded = pointsNeeded - inheritedPoints.size;
  if (effectiveNeeded === 0) {
    return {
      clickedPoints: [],
      completedPoints: assembleInheritedMeasurementPoints(
        pointsNeeded,
        inheritedPoints,
        []
      ),
    };
  }

  const resolved = resolveNextManualMeasurementPoint({
    toolId,
    pointsNeeded,
    inheritedPoints: new Map(inheritedPoints),
    clickedPoints: [...clickedPoints],
    rawPoint,
  });
  const nextClickedPoints = [...clickedPoints, resolved?.point ?? rawPoint];
  const referenceLineKey = getReferenceLineKey(toolId);

  // AVT/LLD 的历史两点交互仍由这条兼容分支读取；新 AVT 会话先于本函数处理。
  if (toolId.includes('avt') || toolId.includes('lld')) {
    return nextClickedPoints.length === 2
      ? {
          clickedPoints: [],
          completedPoints: nextClickedPoints,
          referenceLineUpdate: referenceLineKey
            ? { key: referenceLineKey, point: null }
            : undefined,
        }
      : {
          clickedPoints: nextClickedPoints,
          completedPoints: null,
          referenceLineUpdate: referenceLineKey
            ? { key: referenceLineKey, point: nextClickedPoints[0] }
            : undefined,
        };
  }

  const isComplete = nextClickedPoints.length === effectiveNeeded;
  let completedPoints = isComplete
    ? assembleInheritedMeasurementPoints(
        pointsNeeded,
        inheritedPoints,
        nextClickedPoints
      )
    : null;
  if (completedPoints && toolId === HEMIPELVIC_WIDTH_RATIO_TOOL_ID) {
    completedPoints = createHemipelvicWidthRatioPoints(completedPoints);
  }

  const opensReferenceLine =
    nextClickedPoints.length === 1 &&
    effectiveNeeded > 1 &&
    toolId !== 'ts' &&
    referenceLineKey !== null;
  const referenceLineUpdate = opensReferenceLine
    ? { key: referenceLineKey, point: nextClickedPoints[0] }
    : isComplete && referenceLineKey
      ? { key: referenceLineKey, point: null }
      : undefined;
  return {
    clickedPoints: isComplete ? [] : nextClickedPoints,
    completedPoints,
    referenceLineUpdate,
  };
}
