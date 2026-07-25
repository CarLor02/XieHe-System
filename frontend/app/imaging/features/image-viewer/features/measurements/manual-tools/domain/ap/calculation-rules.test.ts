import { describe, expect, it } from '@jest/globals';

import { calculateCaResults } from './ca';
import { calculateLldResults } from './lld';
import { calculateT1TiltResults } from './t1-tilt';
import { calculateTsResults } from './ts';
import { calculateTtsResults } from './tts';

const context = {
  standardDistance: 100,
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ],
  imageNaturalSize: null,
};

describe('AP manual tool calculations', () => {
  it('keeps signed and absolute horizontal-angle semantics separate', () => {
    const descendingLine = [
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ];
    expect(calculateT1TiltResults(descendingLine)[0].value).toBe('-45.00');
    expect(calculateCaResults(descendingLine)[0].value).toBe('45.00');
  });

  it('calculates LLD and current TS/TTS point layouts with calibration', () => {
    expect(
      calculateLldResults(
        [
          { x: 0, y: 0 },
          { x: 0, y: 5 },
        ],
        context
      )[0].value
    ).toBe('50.00');

    const vertebraAndSacrum = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 20 },
    ];
    expect(calculateTsResults(vertebraAndSacrum, context)[0].value).toBe(
      '-100.00'
    );
    expect(
      calculateTtsResults(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 20 },
          { x: 20, y: 20 },
        ],
        context
      )[0].value
    ).toBe('-100.00');
  });

  it('keeps the historical two-point TS calculation path', () => {
    expect(
      calculateTsResults(
        [
          { x: 20, y: 0 },
          { x: 10, y: 0 },
        ],
        context
      )[0].value
    ).toBe('100.00');
  });
});
