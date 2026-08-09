import {
  createHemipelvicWidthRatioPoints,
  getHemipelvicVerticalLines,
  HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT,
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
  sortHemipelvicVerticalLines,
} from '../../measurements/domain/manual-tools/ap';
import type { Point } from '../../shared/domain/contracts';

import type { MeasurementKeypointBindingRule } from './binding-rule-types';
import { createFixedBindingRule } from './fixed-binding-rule';
import {
  composePointNormalizers,
  keepMeasurementPointOrder,
  normalizeCornerGroups,
  normalizePointPairs,
} from './point-normalization';

export const HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS = [
  'ASIS_L',
  'SI_L',
  'SI_R',
  'ASIS_R',
] as const;

const pair =
  (...pairs: Array<readonly [number, number]>) =>
  (points: Point[]) =>
    normalizePointPairs(points, pairs);

const corners =
  (...groups: Array<readonly [number, number, number, number]>) =>
  (points: Point[]) =>
    normalizeCornerGroups(points, groups);

function pendingGroupHint(label: string, start: number, count: number) {
  return (pointIndex: number): string | null => {
    if (pointIndex < start || pointIndex >= start + count) return null;
    return `${label}待排序点 ${pointIndex - start + 1}/${count}`;
  };
}

function moveHemipelvicLineToAnchor(
  points: Point[],
  sourceIndex: number,
  target: Point
): Point[] {
  const line = getHemipelvicVerticalLines(points).find(
    item => item.sourceIndex === sourceIndex
  );
  if (!line) return points;

  const nextPoints = points.map(point => ({ ...point }));
  const delta = {
    x: target.x - line.anchor.x,
    y: target.y - line.anchor.y,
  };
  nextPoints[line.anchorIndex] = { ...target };
  nextPoints[line.topPointIndex] = {
    x: line.top.x + delta.x,
    y: line.top.y + delta.y,
  };
  nextPoints[line.bottomPointIndex] = {
    x: line.bottom.x + delta.x,
    y: line.bottom.y + delta.y,
  };
  return nextPoints;
}

const HEMIPELVIC_WIDTH_RATIO_BINDING_RULE: MeasurementKeypointBindingRule = {
  typeId: HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
  examView: 'ap',
  requiredKeypointIds: HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS,
  autoDerive: true,
  normalizePoints: keepMeasurementPointOrder,
  getKeypointUpdates: (points, changedPointIndex) => {
    if (
      changedPointIndex !== undefined &&
      changedPointIndex >= HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT
    ) {
      return [];
    }
    const sortedLines = sortHemipelvicVerticalLines(
      getHemipelvicVerticalLines(points)
    );
    if (sortedLines.length !== HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT) return [];

    const changedLine =
      changedPointIndex === undefined
        ? null
        : sortedLines.find(line => line.sourceIndex === changedPointIndex);
    return sortedLines
      .filter(line => changedLine === null || line === changedLine)
      .map(line => ({
        keypointId:
          HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS[sortedLines.indexOf(line)],
        point: line.anchor,
      }));
  },
  buildMeasurementPoints: (byId, existingPoints) => {
    const anchors = HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS.map(
      keypointId => byId.get(keypointId)?.point
    );
    if (!anchors.every((point): point is Point => point !== undefined)) {
      return null;
    }

    const sortedExistingLines = existingPoints
      ? sortHemipelvicVerticalLines(getHemipelvicVerticalLines(existingPoints))
      : [];
    if (
      !existingPoints ||
      sortedExistingLines.length !== HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT
    ) {
      return createHemipelvicWidthRatioPoints(anchors);
    }

    return sortedExistingLines.reduce(
      (points, line, index) =>
        moveHemipelvicLineToAnchor(points, line.sourceIndex, anchors[index]),
      existingPoints
    );
  },
  getAvailableMeasurementPointMap: byId =>
    new Map(
      HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS.flatMap((keypointId, pointIndex) => {
        const keypoint = byId.get(keypointId);
        return keypoint
          ? ([[pointIndex, { ...keypoint.point }]] as const)
          : [];
      })
    ),
  getDrawingHint: pendingGroupHint('半骨盆锚点', 0, 4),
};

export const AP_MEASUREMENT_KEYPOINT_BINDING_RULES: MeasurementKeypointBindingRule[] =
  [
    createFixedBindingRule({
      typeId: 't1-tilt',
      examView: 'ap',
      slots: [
        { pointIndex: 0, keypointId: 'T1-1' },
        { pointIndex: 1, keypointId: 'T1-2' },
      ],
      normalizePoints: pair([0, 1]),
      getDrawingHint: pendingGroupHint('T1 上终板', 0, 2),
    }),
    createFixedBindingRule({
      typeId: 'ca',
      examView: 'ap',
      slots: [
        { pointIndex: 0, keypointId: 'CL' },
        { pointIndex: 1, keypointId: 'CR' },
      ],
      normalizePoints: pair([0, 1]),
      getDrawingHint: pendingGroupHint('锁骨点', 0, 2),
    }),
    createFixedBindingRule({
      typeId: 'po',
      examView: 'ap',
      slots: [
        { pointIndex: 0, keypointId: 'IL' },
        { pointIndex: 1, keypointId: 'IR' },
      ],
      normalizePoints: pair([0, 1]),
      getDrawingHint: pendingGroupHint('骨盆点', 0, 2),
    }),
    createFixedBindingRule({
      typeId: 'css',
      examView: 'ap',
      slots: [
        { pointIndex: 0, keypointId: 'SL' },
        { pointIndex: 1, keypointId: 'SR' },
      ],
      normalizePoints: pair([0, 1]),
      getDrawingHint: pendingGroupHint('骶骨点', 0, 2),
    }),
    createFixedBindingRule({
      typeId: 'ts',
      examView: 'ap',
      slots: [
        { pointIndex: 0, keypointId: 'C7-1' },
        { pointIndex: 1, keypointId: 'C7-2' },
        { pointIndex: 2, keypointId: 'C7-3' },
        { pointIndex: 3, keypointId: 'C7-4' },
        { pointIndex: 4, keypointId: 'SL' },
        { pointIndex: 5, keypointId: 'SR' },
      ],
      normalizePoints: composePointNormalizers(
        corners([0, 1, 2, 3]),
        pair([4, 5])
      ),
      getDrawingHint: pointIndex =>
        pendingGroupHint('C7 四角', 0, 4)(pointIndex) ??
        pendingGroupHint('骶骨点', 4, 2)(pointIndex),
    }),
    createFixedBindingRule({
      typeId: 'tts',
      examView: 'ap',
      slots: [
        { pointIndex: 2, keypointId: 'SL' },
        { pointIndex: 3, keypointId: 'SR' },
      ],
      autoDerive: false,
      normalizePoints: pair([0, 1], [2, 3]),
      getDrawingHint: pointIndex =>
        pointIndex < 2
          ? `躯干水平线端点 ${pointIndex + 1}/2`
          : pendingGroupHint('骶骨点', 2, 2)(pointIndex),
    }),
    HEMIPELVIC_WIDTH_RATIO_BINDING_RULE,
  ];
