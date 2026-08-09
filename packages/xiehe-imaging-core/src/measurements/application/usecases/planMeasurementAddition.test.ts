import { describe, expect, it } from 'vitest';

import type { MeasurementValueCalculator } from '../ports';
import { planMeasurementAddition } from './planMeasurementAddition';

const calculator: MeasurementValueCalculator = {
  calculateType: type => `${type}-value`,
  calculateMeasurement: measurement => measurement.value,
};

const dependencies = {
  calculator,
  createId: () => 'new-id',
  getDescription: (typeId: string) => `${typeId}-description`,
  getDefaultValue: () => 'fallback',
};

const calculationContext = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: null,
};

describe('planMeasurementAddition', () => {
  it('uses the current maximum Cobb sequence when creating a measurement', () => {
    const result = planMeasurementAddition({
      type: 'cobb',
      points: [],
      measurements: [
        { id: 'one', type: 'cobb1', value: '', points: [] },
        { id: 'three', type: 'cobb3', value: '', points: [] },
      ],
      tools: [],
      calculationContext,
      dependencies,
    });

    expect(result.status).toBe('created');
    expect(result.status !== 'duplicate' && result.measurement.type).toBe(
      'cobb4'
    );
  });

  it('returns duplicate without changing a unique measurement collection', () => {
    const measurements = [{ id: 'ss-1', type: 'ss', value: '1°', points: [] }];
    const result = planMeasurementAddition({
      type: 'ss',
      measurements,
      tools: [{ id: 'ss', name: 'SS' }],
      calculationContext,
      dependencies,
    });

    expect(result).toEqual({ status: 'duplicate', measurements });
  });

  it('replaces a unique measurement when replacement is allowed', () => {
    const result = planMeasurementAddition({
      type: 'ss',
      measurements: [{ id: 'old', type: 'ss', value: '1°', points: [] }],
      tools: [{ id: 'ss', name: 'SS' }],
      calculationContext,
      options: { allowReplace: true, keypointSynced: true },
      dependencies,
    });

    expect(result.status).toBe('replaced');
    expect(result.measurements).toEqual([
      expect.objectContaining({ id: 'new-id', keypointSynced: true }),
    ]);
  });
});
