import { expect, it } from '@jest/globals';

import {
  AP_VERTEBRA_GROUPS,
  getKeypointGroupsForExamType,
} from '@/app/imaging/features/image-viewer/features/keypoints';

it.each(['左侧曲位', '右侧曲位'])(
  'exposes only AP vertebra corner groups for %s',
  examType => {
    const groups = getKeypointGroupsForExamType(examType);

    expect(groups.map(group => group.name)).toEqual(AP_VERTEBRA_GROUPS);
    expect(groups.some(group => group.name === '姿态点')).toBe(false);
    expect(groups.every(group => group.keypoints.length === 4)).toBe(true);
  }
);
