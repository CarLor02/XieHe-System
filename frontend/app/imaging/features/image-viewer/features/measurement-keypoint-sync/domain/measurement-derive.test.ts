import { expect, it } from '@jest/globals';

import {
  getCompleteMeasurementDeriveEndpointGroups,
  getMeasurementDeriveVertebraOrder,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-derive';
import { AnnotationSource } from '@xiehe/imaging-core/contracts';

const completeKeypoints = (vertebra: string) =>
  [1, 2, 3, 4].map(index => ({
    id: `${vertebra}-${index}`,
    point: { x: index * 10, y: index * 20 },
    source: AnnotationSource.AI,
    confidence: 0.9,
  }));

it('uses C3-C6 in lateral Cobb derivation endpoint order', () => {
  expect(getMeasurementDeriveVertebraOrder('C2')).toBeLessThan(
    getMeasurementDeriveVertebraOrder('C3')!
  );
  expect(getMeasurementDeriveVertebraOrder('C6')).toBeLessThan(
    getMeasurementDeriveVertebraOrder('C7')!
  );
  expect(
    getCompleteMeasurementDeriveEndpointGroups(
      [
        ...completeKeypoints('C3'),
        ...completeKeypoints('C6'),
        ...completeKeypoints('C7'),
      ],
      '侧位X光片'
    )
  ).toEqual(['C3', 'C6', 'C7']);
});

it.each(['左侧曲位', '右侧曲位'])(
  'uses AP vertebrae as complete Cobb endpoints for %s',
  examType => {
    expect(
      getCompleteMeasurementDeriveEndpointGroups(
        [
          ...completeKeypoints('C7'),
          ...completeKeypoints('T1'),
          ...completeKeypoints('L5'),
        ],
        examType
      )
    ).toEqual(['C7', 'T1', 'L5']);
  }
);
