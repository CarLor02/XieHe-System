import { expect, it } from '@jest/globals';

import {
  getLateralCobbEndpointPointIds,
  getLateralNamedCobbMeasurementRuleByEndpoints,
  LATERAL_NAMED_COBB_MEASUREMENT_RULES,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-derive';

it('defines named lateral Cobb measurements with their exact endpoint point ids', () => {
  expect(LATERAL_NAMED_COBB_MEASUREMENT_RULES).toEqual([
    {
      name: 'C2-C7 CL',
      upperVertebra: 'C2',
      lowerVertebra: 'C7',
      endpointPointIds: ['C2-4', 'C2-3', 'C7-4', 'C7-3'],
    },
    {
      name: 'TK T2-T5',
      upperVertebra: 'T2',
      lowerVertebra: 'T5',
      endpointPointIds: ['T2-2', 'T2-1', 'T5-4', 'T5-3'],
    },
    {
      name: 'TK T5-T12',
      upperVertebra: 'T5',
      lowerVertebra: 'T12',
      endpointPointIds: ['T5-2', 'T5-1', 'T12-4', 'T12-3'],
    },
    {
      name: 'T10-L2',
      upperVertebra: 'T10',
      lowerVertebra: 'L2',
      endpointPointIds: ['T10-2', 'T10-1', 'L2-4', 'L2-3'],
    },
    {
      name: 'LL L1-S1',
      upperVertebra: 'L1',
      lowerVertebra: 'S1',
      endpointPointIds: ['L1-2', 'L1-1', 'S1-1', 'S1-2'],
    },
    {
      name: 'LL L1-L4',
      upperVertebra: 'L1',
      lowerVertebra: 'L4',
      endpointPointIds: ['L1-2', 'L1-1', 'L4-4', 'L4-3'],
    },
    {
      name: 'LL L4-S1',
      upperVertebra: 'L4',
      lowerVertebra: 'S1',
      endpointPointIds: ['L4-2', 'L4-1', 'S1-1', 'S1-2'],
    },
  ]);
});

it('uses named lateral Cobb endpoint rules before the generic lateral Cobb rule', () => {
  expect(getLateralCobbEndpointPointIds('C2', 'C7')).toEqual([
    'C2-4',
    'C2-3',
    'C7-4',
    'C7-3',
  ]);
  expect(getLateralCobbEndpointPointIds('T3', 'T8')).toEqual([
    'T3-2',
    'T3-1',
    'T8-4',
    'T8-3',
  ]);
  expect(getLateralNamedCobbMeasurementRuleByEndpoints('T2', 'T5')?.name).toBe(
    'TK T2-T5'
  );
});
