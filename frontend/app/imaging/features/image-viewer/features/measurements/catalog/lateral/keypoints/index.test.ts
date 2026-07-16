import { expect, it } from '@jest/globals';

import {
  LATERAL_CENTER_VERTEBRA_GROUPS,
  getLateralKeypointGroups,
  parseLateralVertebraKeypointId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/keypoints';
import { getKeypointGroupsForExamType } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

it('exposes C3-C6 as lateral four-corner vertebra keypoint groups', () => {
  const groups = getLateralKeypointGroups();

  ['C3', 'C4', 'C5', 'C6'].forEach(vertebra => {
    const group = groups.find(item => item.name === vertebra);
    expect(group?.keypoints.map(keypoint => keypoint.id)).toEqual([
      `${vertebra}-1`,
      `${vertebra}-2`,
      `${vertebra}-3`,
      `${vertebra}-4`,
    ]);
  });
});

it('parses C3-C6 lateral vertebra keypoint ids', () => {
  expect(parseLateralVertebraKeypointId('C3-1')).toEqual({
    group: 'C3',
    pointIndex: 0,
  });
  expect(parseLateralVertebraKeypointId('C6-4')).toEqual({
    group: 'C6',
    pointIndex: 3,
  });
});

it('allows C3-C6 in selectable lateral vertebra groups', () => {
  expect(LATERAL_CENTER_VERTEBRA_GROUPS).toEqual(
    expect.arrayContaining(['C3', 'C4', 'C5', 'C6'])
  );
});

it('exposes C3-C6 only through the lateral exam keypoint catalog', () => {
  const lateralGroups = getKeypointGroupsForExamType('侧位X光片').map(
    group => group.name
  );
  const anteriorGroups = getKeypointGroupsForExamType('正位X光片').map(
    group => group.name
  );

  expect(lateralGroups).toEqual(expect.arrayContaining(['C3', 'C6']));
  expect(anteriorGroups).not.toEqual(expect.arrayContaining(['C3', 'C6']));
});
