import { describe, expect, it } from '@jest/globals';

import {
  applyPointBindings,
  autoCreateS1Bindings,
  type PointSyncGroup,
} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

import { autoCreateInheritanceBindings } from './annotationInheritanceUseCase';

const bilateralMetadata = {
  schemaVersion: 2 as const,
  femoralHeadMode: 'bilateral' as const,
};

function bilateralMeasurement(id: string, type: 'PI' | 'PT'): MeasurementData {
  return {
    id,
    type,
    value: '0.00°',
    points: Array.from({ length: 6 }, (_, index) => ({
      x: index * 10,
      y: index * 20,
    })),
    pelvicMetadata: bilateralMetadata,
  };
}

function findGroupContaining(
  groups: PointSyncGroup[],
  annotationId: string,
  pointIndex: number
): PointSyncGroup | undefined {
  return groups.find(group =>
    group.members.some(
      member =>
        member.annotationId === annotationId && member.pointIndex === pointIndex
    )
  );
}

describe('pelvic shared anatomical point bindings', () => {
  it('keeps bilateral PI/PT S1 bindings on slots 4 and 5', () => {
    const measurements: MeasurementData[] = [
      bilateralMeasurement('pi-1', 'PI'),
      bilateralMeasurement('pt-1', 'PT'),
      {
        id: 'ss-1',
        type: 'SS',
        value: '0.00°',
        points: [
          { x: 100, y: 200 },
          { x: 200, y: 200 },
        ],
      },
    ];

    const bindings = autoCreateInheritanceBindings(
      measurements,
      autoCreateS1Bindings(measurements)
    );
    const leftGroup = findGroupContaining(bindings.syncGroups, 'ss-1', 0);
    const rightGroup = findGroupContaining(bindings.syncGroups, 'ss-1', 1);

    expect(leftGroup?.members).toEqual(
      expect.arrayContaining([
        { annotationId: 'pi-1', pointIndex: 4 },
        { annotationId: 'pt-1', pointIndex: 4 },
      ])
    );
    expect(rightGroup?.members).toEqual(
      expect.arrayContaining([
        { annotationId: 'pi-1', pointIndex: 5 },
        { annotationId: 'pt-1', pointIndex: 5 },
      ])
    );
    expect(leftGroup?.members).not.toEqual(
      expect.arrayContaining([
        { annotationId: 'pi-1', pointIndex: 1 },
        { annotationId: 'pt-1', pointIndex: 1 },
      ])
    );
    expect(rightGroup?.members).not.toEqual(
      expect.arrayContaining([
        { annotationId: 'pi-1', pointIndex: 2 },
        { annotationId: 'pt-1', pointIndex: 2 },
      ])
    );

    const moved = applyPointBindings(
      measurements,
      'ss-1',
      1,
      240,
      210,
      bindings
    );
    const movedPi = moved.find(measurement => measurement.id === 'pi-1');
    expect(movedPi?.points[5]).toEqual({ x: 240, y: 210 });
    expect(movedPi?.points[1]).toEqual({ x: 10, y: 20 });
  });

  it('does not bind a bilateral FH center to the derived effectiveCFH slot', () => {
    const measurements: MeasurementData[] = [
      bilateralMeasurement('pi-1', 'PI'),
      bilateralMeasurement('pt-1', 'PT'),
      {
        id: 'tpa-1',
        type: 'TPA',
        value: '0.00°',
        points: Array.from({ length: 7 }, (_, index) => ({
          x: index * 10,
          y: index * 20,
        })),
        pelvicMetadata: bilateralMetadata,
      },
    ];

    const bindings = autoCreateInheritanceBindings(measurements);
    const effectiveCfhGroup = findGroupContaining(
      bindings.syncGroups,
      'tpa-1',
      4
    );

    expect(effectiveCfhGroup).toBeUndefined();
  });

  it('retains legacy single-FH PI/PT point indices', () => {
    const measurements: MeasurementData[] = [
      {
        id: 'pi-legacy',
        type: 'PI',
        value: '0.00°',
        points: [
          { x: 50, y: 50 },
          { x: 100, y: 200 },
          { x: 200, y: 200 },
        ],
      },
      {
        id: 'pt-legacy',
        type: 'PT',
        value: '0.00°',
        points: [
          { x: 50, y: 50 },
          { x: 100, y: 200 },
          { x: 200, y: 200 },
        ],
      },
    ];

    const bindings = autoCreateInheritanceBindings(measurements);
    const centerGroup = findGroupContaining(
      bindings.syncGroups,
      'pi-legacy',
      0
    );

    expect(centerGroup?.members).toEqual(
      expect.arrayContaining([
        { annotationId: 'pt-legacy', pointIndex: 0 },
      ])
    );
  });
});
