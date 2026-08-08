import { describe, expect, it } from '@jest/globals';

import { getBilateralPelvicGeometryOwnerId } from './pelvic-shared-geometry';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

function bilateralMeasurement(id: string, type: 'PI' | 'PT'): MeasurementData {
  return {
    id,
    type,
    value: '0.00°',
    points: [
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 50, y: 30 },
      { x: 50, y: 40 },
      { x: 10, y: 100 },
      { x: 60, y: 100 },
    ],
    pelvicMetadata: {
      schemaVersion: 2,
      femoralHeadMode: 'bilateral',
    },
  };
}

describe('bilateral pelvic shared geometry ownership', () => {
  it('uses the first visible PI/PT measurement as the only owner', () => {
    const measurements = [
      bilateralMeasurement('pi', 'PI'),
      bilateralMeasurement('pt', 'PT'),
    ];

    expect(getBilateralPelvicGeometryOwnerId(measurements)).toBe('pi');
    expect(
      getBilateralPelvicGeometryOwnerId(
        measurements,
        measurement => measurement.id === 'pi'
      )
    ).toBe('pt');
  });
});
