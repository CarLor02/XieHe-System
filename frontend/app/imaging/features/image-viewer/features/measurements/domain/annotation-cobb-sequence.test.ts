import { expect, it } from '@jest/globals';

import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-calculation';
import { renumberCobbMeasurementsAfterDelete } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-cobb-sequence';
import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

const calculationContext = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: { width: 1000, height: 1000 },
};
const cobbPoints: Point[] = [
  { x: 100, y: 100 },
  { x: 200, y: 100 },
  { x: 100, y: 250 },
  { x: 200, y: 280 },
];

function cobbMeasurement(
  id: string,
  type: string,
  value = 'stale-value'
): MeasurementData {
  return {
    id,
    type,
    value,
    points: cobbPoints,
    upperVertebra: 'T12',
    lowerVertebra: 'L5',
    apexVertebra: 'L3',
  };
}

it('renumbers remaining Cobb measurements after deletion while preserving ids and vertebra metadata', () => {
  const nonCobb: MeasurementData = {
    id: 'pelvic',
    type: 'pelvic',
    value: '辅助标注',
    points: [],
  };
  const remainingAfterDelete: MeasurementData[] = [
    cobbMeasurement('cobb-one', 'cobb1', 'existing-value'),
    nonCobb,
    cobbMeasurement('cobb-three', 'cobb3'),
    cobbMeasurement('cobb-four', 'cobb4'),
  ];

  const renumbered = renumberCobbMeasurementsAfterDelete(
    remainingAfterDelete,
    calculationContext
  );

  expect(renumbered.map(measurement => measurement.id)).toEqual([
    'cobb-one',
    'pelvic',
    'cobb-three',
    'cobb-four',
  ]);
  expect(renumbered.map(measurement => measurement.type)).toEqual([
    'cobb1',
    'pelvic',
    'cobb2',
    'cobb3',
  ]);
  expect(renumbered[2]).toEqual(
    expect.objectContaining({
      id: 'cobb-three',
      type: 'cobb2',
      upperVertebra: 'T12',
      lowerVertebra: 'L5',
      apexVertebra: 'L3',
      value: calculateMeasurementValue(
        'cobb2',
        cobbPoints,
        calculationContext
      ),
    })
  );
  expect(renumbered[3]).toEqual(
    expect.objectContaining({
      id: 'cobb-four',
      type: 'cobb3',
      upperVertebra: 'T12',
      lowerVertebra: 'L5',
      apexVertebra: 'L3',
      value: calculateMeasurementValue(
        'cobb3',
        cobbPoints,
        calculationContext
      ),
    })
  );
});

it('renumbers lateral Cobb measurements while preserving the lateral type prefix', () => {
  const renumbered = renumberCobbMeasurementsAfterDelete(
    [
      cobbMeasurement('lateral-cobb-two', 'lateral-cobb2'),
      cobbMeasurement('lateral-cobb-four', 'lateral-cobb4'),
    ],
    calculationContext
  );

  expect(renumbered.map(measurement => measurement.type)).toEqual([
    'lateral-cobb1',
    'lateral-cobb2',
  ]);
});
