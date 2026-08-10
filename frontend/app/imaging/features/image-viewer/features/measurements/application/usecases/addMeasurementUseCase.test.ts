import { expect, it } from '@jest/globals';
import type { Dispatch, SetStateAction } from 'react';

import { addMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/addMeasurementUseCase';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import type { Tool } from '@/app/imaging/features/image-viewer/shared/types';

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
    setMeasurements,
    tools,
    null,
    [],
    imageNaturalSize
  );
  addMeasurement(
    'lateral-cobb',
    cobbPoints,
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

it('stores selected endpoints on a partially bound lateral Cobb', () => {
  let measurements: MeasurementData[] = [];
  const setMeasurements: Dispatch<SetStateAction<MeasurementData[]>> = next => {
    measurements =
      typeof next === 'function'
        ? next(measurements)
        : (next as MeasurementData[]);
  };

  addMeasurement(
    'lateral-cobb',
    cobbPoints,
    setMeasurements,
    [],
    null,
    [],
    imageNaturalSize,
    {
      cobbEndpoints: {
        upperVertebra: 'T2',
        lowerVertebra: null,
      },
    }
  );

  expect(measurements[0]).toMatchObject({
    type: 'lateral-cobb1',
    upperVertebra: 'T2',
    lowerVertebra: null,
  });
});

it('marks a newly added bound measurement as keypoint-synced', () => {
  let measurements: MeasurementData[] = [];
  const setMeasurements: Dispatch<SetStateAction<MeasurementData[]>> = next => {
    measurements =
      typeof next === 'function'
        ? next(measurements)
        : (next as MeasurementData[]);
  };

  addMeasurement(
    'tts',
    [
      { x: 100, y: 50 },
      { x: 180, y: 50 },
      { x: 300, y: 200 },
      { x: 200, y: 200 },
    ],
    setMeasurements,
    [],
    null,
    [],
    imageNaturalSize,
    { keypointSynced: true }
  );

  expect(measurements[0]?.keypointSynced).toBe(true);
});

it('does not create another measurement when the new points satisfy it', () => {
  let measurements: MeasurementData[] = [
    {
      id: 'ss-existing',
      type: 'ss',
      value: '0.00°',
      points: [
        { x: 100, y: 220 },
        { x: 220, y: 210 },
      ],
    },
  ];
  const setMeasurements: Dispatch<SetStateAction<MeasurementData[]>> = next => {
    measurements =
      typeof next === 'function'
        ? next(measurements)
        : (next as MeasurementData[]);
  };
  const tools: Tool[] = [
    {
      id: 'pi',
      name: 'PI',
      icon: 'test',
      description: 'PI',
      pointsNeeded: 3,
    },
    {
      id: 'pt',
      name: 'PT',
      icon: 'test',
      description: 'PT',
      pointsNeeded: 3,
    },
  ];

  addMeasurement(
    'pi',
    [
      { x: 150, y: 80 },
      { x: 100, y: 220 },
      { x: 220, y: 210 },
    ],
    setMeasurements,
    tools,
    null,
    [],
    imageNaturalSize,
    { keypointSynced: true }
  );

  expect(measurements.map(measurement => measurement.type)).toEqual([
    'ss',
    'pi',
  ]);
});
