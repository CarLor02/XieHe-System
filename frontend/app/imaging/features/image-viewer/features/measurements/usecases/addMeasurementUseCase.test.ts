import { expect, it } from '@jest/globals';
import type { Dispatch, SetStateAction } from 'react';

import { addMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/usecases/addMeasurementUseCase';
import type {
  MeasurementData,
  Point,
  Tool,
} from '@/app/imaging/features/image-viewer/shared/types';

const imageNaturalSize = { width: 1000, height: 1000 };
const cobbPoints: Point[] = [
  { x: 100, y: 100 },
  { x: 200, y: 100 },
  { x: 100, y: 250 },
  { x: 200, y: 280 },
];

it('adds manual Cobb measurements after the current maximum Cobb number', () => {
  const initialMeasurements: MeasurementData[] = [
    {
      id: 'manual-cobb-1',
      type: 'cobb1',
      value: '10.00°',
      points: [],
    },
    {
      id: 'manual-cobb-3',
      type: 'cobb3',
      value: '20.00°',
      points: [],
    },
  ];
  let measurements = initialMeasurements;
  const setMeasurements: Dispatch<SetStateAction<MeasurementData[]>> = next => {
    measurements =
      typeof next === 'function'
        ? next(measurements)
        : (next as MeasurementData[]);
  };
  const tools: Tool[] = [];

  addMeasurement(
    'cobb',
    cobbPoints,
    initialMeasurements,
    setMeasurements,
    tools,
    null,
    [],
    imageNaturalSize
  );

  expect(measurements.map(measurement => measurement.type)).toEqual([
    'cobb1',
    'cobb3',
    'cobb4',
  ]);
});

it('keeps lateral manual Cobb measurements non-unique and numbered', () => {
  let measurements: MeasurementData[] = [];
  const setMeasurements: Dispatch<SetStateAction<MeasurementData[]>> = next => {
    measurements =
      typeof next === 'function'
        ? next(measurements)
        : (next as MeasurementData[]);
  };
  const tools: Tool[] = [
    {
      id: 'lateral-cobb',
      name: 'Cobb',
      icon: 'medical-cobb',
      description: '任意两节段Cobb角测量',
      pointsNeeded: 4,
    },
  ];

  addMeasurement(
    'lateral-cobb',
    cobbPoints,
    measurements,
    setMeasurements,
    tools,
    null,
    [],
    imageNaturalSize
  );
  addMeasurement(
    'lateral-cobb',
    cobbPoints,
    measurements,
    setMeasurements,
    tools,
    null,
    [],
    imageNaturalSize
  );

  expect(measurements.map(measurement => measurement.type)).toEqual([
    'lateral-cobb1',
    'lateral-cobb2',
  ]);
});
