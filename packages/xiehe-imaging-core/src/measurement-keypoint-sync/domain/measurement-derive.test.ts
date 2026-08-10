import { expect, it } from 'vitest';

import {
  getMeasurementDeriveEndpointGroups,
  getMeasurementDeriveVertebraOrder,
} from './measurement-derive';
import { AnnotationSource } from '../../shared/domain/contracts';

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
    getMeasurementDeriveEndpointGroups(
      [
        ...completeKeypoints('C3'),
        ...completeKeypoints('C6'),
        ...completeKeypoints('C7'),
      ],
      '侧位X光片',
      'upper'
    )
  ).toEqual(['C3', 'C6', 'C7']);
});

it.each(['左侧曲位', '右侧曲位'])(
  'uses AP vertebrae as complete Cobb endpoints for %s',
  examType => {
    expect(
      getMeasurementDeriveEndpointGroups(
        [
          ...completeKeypoints('C7'),
          ...completeKeypoints('T1'),
          ...completeKeypoints('L5'),
        ],
        examType,
        'upper'
      )
    ).toEqual(['C7', 'T1', 'L5']);
  }
);

it('requires only the endpoint points used by the selected Cobb role', () => {
  const keypoints = [
    ...completeKeypoints('T2').slice(0, 2),
    ...completeKeypoints('T4').slice(2),
    ...completeKeypoints('S1').slice(0, 2),
  ];

  expect(
    getMeasurementDeriveEndpointGroups(keypoints, '侧位X光片', 'upper')
  ).toEqual(['T2', 'S1']);
  expect(
    getMeasurementDeriveEndpointGroups(keypoints, '侧位X光片', 'lower')
  ).toEqual(['T4', 'S1']);
});
