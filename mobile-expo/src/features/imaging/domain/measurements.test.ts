import { describe, expect, it } from 'vitest';
import type { PredictMeasurementsResponse } from '@xiehe/api-contracts';
import { predictedMeasurements } from './measurements';

describe('mobile AI measurements', () => {
  it('retains the backend value when legacy angle has the opposite sign', () => {
    const response: PredictMeasurementsResponse = {
      imageId: '1',
      imageWidth: 100,
      imageHeight: 200,
      measurements: [
        { type: 'Cobb', points: [], value: '23.5°', angle: -23.5 },
      ],
    };
    expect(predictedMeasurements(response, '正位X光片')[0].value).toBe('23.5°');
  });
  it('does not invent a value for an incomplete AI result', () => {
    const response: PredictMeasurementsResponse = {
      imageId: '1',
      imageWidth: 100,
      imageHeight: 200,
      measurements: [{ type: 'Cobb', points: [], angle: 10 }],
    };
    expect(predictedMeasurements(response, '正位X光片')[0].value).toBe('');
  });
});
