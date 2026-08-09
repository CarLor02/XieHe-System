import { describe, expect, it } from '@jest/globals';

import {
  calculateMeasurementDataValue,
  calculateMeasurementValue,
} from './calculateMeasurementValue';

const context = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: null,
};

describe('calculateMeasurementValue Web adapter', () => {
  it('preserves existing UI fallback strings', () => {
    expect(calculateMeasurementValue('AI检测-T1-1', [], context)).toBe('');
    expect(calculateMeasurementValue('unknown', [], context)).toBe('辅助标注');
    expect(calculateMeasurementValue('angle', [], context)).toBe('辅助标注');
    expect(calculateMeasurementValue('circle', [], context)).toBe(
      'Auxiliary Circle'
    );
  });

  it('preserves stored values for invalid variable-layout measurements', () => {
    expect(
      calculateMeasurementDataValue(
        {
          id: 'cobb-1',
          type: 'Cobb1',
          value: '12.34°',
          points: [],
        },
        { ...context, examType: '正位X光片' }
      )
    ).toBe('12.34°');
  });
});
