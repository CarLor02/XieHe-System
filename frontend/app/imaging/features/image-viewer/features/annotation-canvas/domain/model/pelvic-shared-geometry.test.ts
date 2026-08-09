import { describe, expect, it } from '@jest/globals';

import { getBilateralPelvicGeometryOwnerId } from './pelvic-shared-geometry';
import { getBilateralPelvicGeometryForMeasurement } from '@xiehe/imaging-core/measurements/lateral';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';

function bilateralMeasurement(
  id: string,
  type: 'PI' | 'PT' | 'TPA'
): MeasurementData {
  const pelvicPoints = [
    { x: 10, y: 10 },
    { x: 20, y: 10 },
    { x: 50, y: 30 },
    { x: 50, y: 40 },
    { x: 10, y: 100 },
    { x: 60, y: 100 },
  ];
  return {
    id,
    type,
    value: '0.00°',
    points:
      type === 'TPA'
        ? [
            { x: 10, y: 0 },
            { x: 20, y: 0 },
            { x: 10, y: 5 },
            { x: 20, y: 5 },
            ...pelvicPoints,
          ]
        : pelvicPoints,
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

  it('allows bilateral TPA to own shared FH circles', () => {
    const measurements = [
      bilateralMeasurement('tpa', 'TPA'),
      bilateralMeasurement('pi', 'PI'),
    ];

    expect(getBilateralPelvicGeometryOwnerId(measurements)).toBe('tpa');
  });

  it('extracts the pelvic suffix before resolving bilateral TPA geometry', () => {
    const geometry = getBilateralPelvicGeometryForMeasurement(
      bilateralMeasurement('tpa', 'TPA')
    );

    expect(geometry?.mode).toBe('bilateral');
    expect(geometry?.femoralHeadCenter).toEqual({ x: 30, y: 20 });
    expect(geometry?.sacralMidpoint).toEqual({ x: 35, y: 100 });
  });
});
