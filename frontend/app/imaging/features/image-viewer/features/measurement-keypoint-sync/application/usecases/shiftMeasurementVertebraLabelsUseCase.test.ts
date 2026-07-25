import { expect, it } from '@jest/globals';

import { shiftMeasurementVertebraLabels } from './shiftMeasurementVertebraLabelsUseCase';

it('shifts measurement vertebra endpoint fields with the keypoint mapping', () => {
  const shifted = shiftMeasurementVertebraLabels(
    [
      {
        id: 'measurement-1',
        type: 'cobb1',
        value: '10.00°',
        points: [],
        upperVertebra: 'T1',
        lowerVertebra: 'T3',
        apexVertebra: 'T2',
      },
      {
        id: 'measurement-2',
        type: 'PO',
        value: '0.00°',
        points: [],
      },
    ],
    new Map([
      ['T1', 'T2'],
      ['T2', 'T3'],
      ['T3', 'T4'],
    ])
  );

  expect(shifted[0]).toEqual(
    expect.objectContaining({
      upperVertebra: 'T2',
      lowerVertebra: 'T4',
      apexVertebra: 'T3',
    })
  );
  expect(shifted[1]).toEqual(
    expect.objectContaining({
      id: 'measurement-2',
      type: 'PO',
    })
  );
});
