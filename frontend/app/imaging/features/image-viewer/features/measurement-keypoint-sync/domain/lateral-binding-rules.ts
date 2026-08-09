import type { Point } from '@xiehe/imaging-core/contracts';
import { resolveCobbEndpointPointIds } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain';

import type { MeasurementKeypointBindingRule } from './binding-rule-types';
import { createFixedBindingRule } from './fixed-binding-rule';
import {
  composePointNormalizers,
  normalizeCornerGroups,
  normalizePointPairs,
} from './point-normalization';

const pair =
  (...pairs: Array<readonly [number, number]>) =>
  (points: Point[]) =>
    normalizePointPairs(points, pairs);

const corners =
  (...groups: Array<readonly [number, number, number, number]>) =>
  (points: Point[]) =>
    normalizeCornerGroups(points, groups);

function groupedHint(
  groups: ReadonlyArray<{
    label: string;
    start: number;
    count: number;
  }>
) {
  return (pointIndex: number): string | null => {
    const group = groups.find(
      item => pointIndex >= item.start && pointIndex < item.start + item.count
    );
    if (!group) return null;
    if (group.count === 1) return group.label;
    return `${group.label}待排序点 ${pointIndex - group.start + 1}/${group.count}`;
  };
}

function createTwoEndplateRule(
  typeId: string,
  firstLabel: string,
  secondLabel: string
): MeasurementKeypointBindingRule {
  const keypointIds = resolveCobbEndpointPointIds(
    { type: typeId },
    { examType: '侧位X光片' }
  );
  if (!keypointIds) {
    throw new Error(`侧位命名 Cobb 缺少 resolver: ${typeId}`);
  }
  return createFixedBindingRule({
    typeId,
    examView: 'lateral',
    slots: keypointIds.map((keypointId, pointIndex) => ({
      pointIndex,
      keypointId,
    })),
    normalizePoints: pair([0, 1], [2, 3]),
    getDrawingHint: groupedHint([
      { label: firstLabel, start: 0, count: 2 },
      { label: secondLabel, start: 2, count: 2 },
    ]),
  });
}

export const LATERAL_MEASUREMENT_KEYPOINT_BINDING_RULES: MeasurementKeypointBindingRule[] =
  [
    createFixedBindingRule({
      typeId: 't1-slope',
      examView: 'lateral',
      slots: [
        { pointIndex: 0, keypointId: 'T1-1' },
        { pointIndex: 1, keypointId: 'T1-2' },
      ],
      normalizePoints: pair([0, 1]),
      getDrawingHint: groupedHint([{ label: 'T1 上终板', start: 0, count: 2 }]),
    }),
    createTwoEndplateRule('cl', 'C2 下终板', 'C7 下终板'),
    createTwoEndplateRule('tk-t2-t5', 'T2 上终板', 'T5 下终板'),
    createTwoEndplateRule('tk-t5-t12', 'T5 上终板', 'T12 下终板'),
    createTwoEndplateRule('t10-l2', 'T10 上终板', 'L2 下终板'),
    createTwoEndplateRule('ll-l1-s1', 'L1 上终板', 'S1 终板'),
    createTwoEndplateRule('ll-l1-l4', 'L1 上终板', 'L4 下终板'),
    createTwoEndplateRule('ll-l4-s1', 'L4 上终板', 'S1 终板'),
    createFixedBindingRule({
      typeId: 'sva',
      examView: 'lateral',
      slots: [
        { pointIndex: 0, keypointId: 'C7-1' },
        { pointIndex: 1, keypointId: 'C7-2' },
        { pointIndex: 2, keypointId: 'C7-3' },
        { pointIndex: 3, keypointId: 'C7-4' },
        { pointIndex: 4, keypointId: 'S1-2' },
      ],
      normalizePoints: corners([0, 1, 2, 3]),
      getDrawingHint: groupedHint([
        { label: 'C7 四角', start: 0, count: 4 },
        { label: 'S1-2', start: 4, count: 1 },
      ]),
    }),
    createFixedBindingRule({
      typeId: 'tpa',
      examView: 'lateral',
      slots: [
        { pointIndex: 0, keypointId: 'T1-1' },
        { pointIndex: 1, keypointId: 'T1-2' },
        { pointIndex: 2, keypointId: 'T1-3' },
        { pointIndex: 3, keypointId: 'T1-4' },
        { pointIndex: 4, keypointId: 'CFH' },
        { pointIndex: 5, keypointId: 'S1-1' },
        { pointIndex: 6, keypointId: 'S1-2' },
      ],
      normalizePoints: composePointNormalizers(
        corners([0, 1, 2, 3]),
        pair([5, 6])
      ),
      getDrawingHint: groupedHint([
        { label: 'T1 四角', start: 0, count: 4 },
        { label: 'CFH', start: 4, count: 1 },
        { label: 'S1 终板', start: 5, count: 2 },
      ]),
    }),
    createFixedBindingRule({
      typeId: 'pi',
      examView: 'lateral',
      slots: [
        { pointIndex: 0, keypointId: 'CFH' },
        { pointIndex: 1, keypointId: 'S1-1' },
        { pointIndex: 2, keypointId: 'S1-2' },
      ],
      normalizePoints: pair([1, 2]),
      getDrawingHint: groupedHint([
        { label: 'CFH', start: 0, count: 1 },
        { label: 'S1 终板', start: 1, count: 2 },
      ]),
    }),
    createFixedBindingRule({
      typeId: 'pt',
      examView: 'lateral',
      slots: [
        { pointIndex: 0, keypointId: 'CFH' },
        { pointIndex: 1, keypointId: 'S1-1' },
        { pointIndex: 2, keypointId: 'S1-2' },
      ],
      normalizePoints: pair([1, 2]),
      getDrawingHint: groupedHint([
        { label: 'CFH', start: 0, count: 1 },
        { label: 'S1 终板', start: 1, count: 2 },
      ]),
    }),
    createFixedBindingRule({
      typeId: 'ss',
      examView: 'lateral',
      slots: [
        { pointIndex: 0, keypointId: 'S1-1' },
        { pointIndex: 1, keypointId: 'S1-2' },
      ],
      normalizePoints: pair([0, 1]),
      getDrawingHint: groupedHint([{ label: 'S1 终板', start: 0, count: 2 }]),
    }),
  ];
