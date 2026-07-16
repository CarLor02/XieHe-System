import { expect, it } from '@jest/globals';

import {
  getCompleteMeasurementDeriveEndpointGroups,
  getMeasurementDeriveVertebraOrder,
  getLateralCobbEndpointPointIds,
  getLateralNamedCobbMeasurementRuleByEndpoints,
  LATERAL_NAMED_COBB_MEASUREMENT_RULES,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-derive';
import { AnnotationSource } from '@/app/imaging/features/image-viewer/shared/types';

const completeKeypoints = (vertebra: string) =>
  [1, 2, 3, 4].map(index => ({
    id: `${vertebra}-${index}`,
    point: { x: index * 10, y: index * 20 },
    source: AnnotationSource.AI,
    confidence: 0.9,
  }));

it('defines named lateral Cobb measurements with their exact endpoint point ids', () => {
  expect(LATERAL_NAMED_COBB_MEASUREMENT_RULES).toEqual([
    {
      name: 'C2-C7 CL',
      upperVertebra: 'C2',
      lowerVertebra: 'C7',
      endpointPointIds: ['C2-3', 'C2-4', 'C7-3', 'C7-4'],
    },
    {
      name: 'TK T2-T5',
      upperVertebra: 'T2',
      lowerVertebra: 'T5',
      endpointPointIds: ['T2-1', 'T2-2', 'T5-3', 'T5-4'],
    },
    {
      name: 'TK T5-T12',
      upperVertebra: 'T5',
      lowerVertebra: 'T12',
      endpointPointIds: ['T5-1', 'T5-2', 'T12-3', 'T12-4'],
    },
    {
      name: 'T10-L2',
      upperVertebra: 'T10',
      lowerVertebra: 'L2',
      endpointPointIds: ['T10-1', 'T10-2', 'L2-3', 'L2-4'],
    },
    {
      name: 'LL L1-S1',
      upperVertebra: 'L1',
      lowerVertebra: 'S1',
      endpointPointIds: ['L1-1', 'L1-2', 'S1-1', 'S1-2'],
    },
    {
      name: 'LL L1-L4',
      upperVertebra: 'L1',
      lowerVertebra: 'L4',
      endpointPointIds: ['L1-1', 'L1-2', 'L4-3', 'L4-4'],
    },
    {
      name: 'LL L4-S1',
      upperVertebra: 'L4',
      lowerVertebra: 'S1',
      endpointPointIds: ['L4-1', 'L4-2', 'S1-1', 'S1-2'],
    },
  ]);
});

it('uses named lateral Cobb endpoint rules before the generic lateral Cobb rule', () => {
  expect(getLateralCobbEndpointPointIds('C2', 'C7')).toEqual([
    'C2-3',
    'C2-4',
    'C7-3',
    'C7-4',
  ]);
  expect(getLateralCobbEndpointPointIds('T3', 'T8')).toEqual([
    'T3-1',
    'T3-2',
    'T8-3',
    'T8-4',
  ]);
  expect(getLateralNamedCobbMeasurementRuleByEndpoints('T2', 'T5')?.name).toBe(
    'TK T2-T5'
  );
});

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
