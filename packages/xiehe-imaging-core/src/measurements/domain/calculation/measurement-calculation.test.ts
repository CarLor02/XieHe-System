import { describe, expect, it } from 'vitest';

import type { MeasurementData } from '../../../shared/domain/contracts';
import {
  calculateMeasurementResults,
  calculateMeasurementTypeResults,
} from './measurement-calculation';

const context = {
  standardDistance: 100,
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ],
  imageNaturalSize: null,
};

describe('measurement calculation dispatch', () => {
  it('normalizes numbered AP Cobb types before calculation', () => {
    const outcome = calculateMeasurementTypeResults(
      'Cobb12',
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 20 },
      ],
      context
    );

    expect(outcome).toEqual({
      status: 'calculated',
      results: [{ name: 'Cobb角', value: '45.00', unit: '°' }],
    });
  });

  it('dispatches lateral and auxiliary calculations without UI metadata', () => {
    const slope = calculateMeasurementTypeResults(
      'T1 Slope',
      [
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ],
      context
    );
    const distance = calculateMeasurementTypeResults(
      'aux-length',
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
      context
    );

    expect(slope.status === 'calculated' && slope.results[0].value).toBe(
      '45.00'
    );
    expect(distance.status === 'calculated' && distance.results[0].value).toBe(
      '50.00'
    );
  });

  it('separates unknown tools from known tools with invalid point layouts', () => {
    expect(calculateMeasurementTypeResults('unknown', [], context)).toEqual({
      status: 'unsupported',
      typeId: 'unknown',
    });
    expect(
      calculateMeasurementTypeResults('circle', [], context)
    ).toMatchObject({ status: 'invalid', typeId: 'circle' });
  });

  it('calculates a complete measurement entity through the same registry', () => {
    const measurement: MeasurementData = {
      id: 'ca-1',
      type: 'CA',
      value: '',
      points: [
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ],
    };

    expect(calculateMeasurementResults(measurement, context)).toEqual({
      status: 'calculated',
      results: [{ name: 'CA', value: '45.00', unit: '°' }],
    });
  });
});
