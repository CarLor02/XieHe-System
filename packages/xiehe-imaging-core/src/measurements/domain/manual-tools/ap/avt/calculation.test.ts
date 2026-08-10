import { expect, it } from 'vitest';
import { createAvtMetadata } from './target-rules';
import { getAvtGeometry } from './measurement-geometry';
import { calculateAvtValue } from './calculation';

const calculationContext = {
  standardDistance: 100,
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ],
  imageNaturalSize: { width: 1000, height: 2000 },
};

it('calculates disc AVT from the manual line midpoint to the selected reference', () => {
  const measurement = {
    points: [
      { x: 80, y: 100 },
      { x: 120, y: 100 },
      { x: 180, y: 300 },
      { x: 220, y: 300 },
    ],
    apexVertebra: null,
    avtMetadata: createAvtMetadata({
      type: 'disc',
      upperVertebra: 'T12',
      lowerVertebra: 'L1',
    }),
  };

  expect(getAvtGeometry(measurement)?.targetCenter).toEqual({
    x: 100,
    y: 100,
  });
  expect(calculateAvtValue(measurement, calculationContext)).toBe('-100.00mm');
});

it('uses edge-midpoint intersections for vertebra and C7PL centers', () => {
  const measurement = {
    points: [
      { x: 0, y: 0 },
      { x: 8, y: 2 },
      { x: 2, y: 10 },
      { x: 14, y: 8 },
      { x: 20, y: 0 },
      { x: 28, y: 2 },
      { x: 22, y: 10 },
      { x: 34, y: 8 },
    ],
    apexVertebra: 'T4',
    avtMetadata: createAvtMetadata({ type: 'vertebra', vertebra: 'T4' }),
  };

  const geometry = getAvtGeometry(measurement);
  expect(geometry?.targetCenter).toEqual({ x: 6, y: 5 });
  expect(geometry?.referenceCenter).toEqual({ x: 26, y: 5 });
  expect(calculateAvtValue(measurement, calculationContext)).toBe('-20.00mm');
});
