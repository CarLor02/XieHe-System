import { expect, it } from '@jest/globals';

import { createAvtPlacementSession } from './placement-rules';

it('places missing C7PL points before target vertebra points', () => {
  const target = { type: 'vertebra', vertebra: 'T4' } as const;

  expect(
    createAvtPlacementSession(target, new Set(['C7-1', 'C7-2', 'T4-1', 'T4-2']))
      ?.step
  ).toEqual({
    kind: 'keypoint',
    phase: 'reference',
    label: 'C7PL',
    keypointId: 'C7-3',
    completedCount: 2,
    totalCount: 4,
  });

  expect(
    createAvtPlacementSession(
      target,
      new Set(['C7-1', 'C7-2', 'C7-3', 'C7-4', 'T4-1', 'T4-2'])
    )?.step
  ).toEqual({
    kind: 'keypoint',
    phase: 'target',
    label: 'T4',
    keypointId: 'T4-3',
    completedCount: 2,
    totalCount: 4,
  });
});

it('uses left-to-right SL then SR placement while keeping disc anchors last', () => {
  const target = {
    type: 'disc',
    upperVertebra: 'T12',
    lowerVertebra: 'L1',
  } as const;

  expect(createAvtPlacementSession(target, new Set())?.step).toEqual({
    kind: 'keypoint',
    phase: 'reference',
    label: 'CSVL',
    keypointId: 'SL',
    completedCount: 0,
    totalCount: 2,
  });
  expect(createAvtPlacementSession(target, new Set(['SL']))?.step).toEqual({
    kind: 'keypoint',
    phase: 'reference',
    label: 'CSVL',
    keypointId: 'SR',
    completedCount: 1,
    totalCount: 2,
  });
  expect(
    createAvtPlacementSession(target, new Set(['SL', 'SR']))?.step
  ).toEqual({
    kind: 'disc',
    label: 'T12-L1',
  });
});
