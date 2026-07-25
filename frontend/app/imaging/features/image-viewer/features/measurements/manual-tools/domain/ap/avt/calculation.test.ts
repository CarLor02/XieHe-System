import { expect, it } from '@jest/globals';
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
