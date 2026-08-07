import { describe, expect, it } from '@jest/globals';

import {
  autoCreateS1Bindings,
  getS1BindingPointMap,
} from './annotation-binding';

describe('S1 measurement point mapping', () => {
  it('keeps historical PI/PT on the three-point layout', () => {
    expect(
      getS1BindingPointMap({ type: 'PI', points: [{}, {}, {}] })
    ).toEqual({ left: 1, right: 2 });
  });

  it('maps bilateral PI/PT S1 endpoints to slots 4 and 5', () => {
    const bilateralPi = {
      id: 'pi-1',
      type: 'PI',
      points: Array.from({ length: 6 }, () => ({ x: 0, y: 0 })),
      pelvicMetadata: {
        schemaVersion: 2 as const,
        femoralHeadMode: 'bilateral' as const,
      },
    };

    expect(getS1BindingPointMap(bilateralPi)).toEqual({ left: 4, right: 5 });
    expect(autoCreateS1Bindings([bilateralPi]).syncGroups).toEqual([
      expect.objectContaining({
        id: 'S1-left',
        members: [{ annotationId: 'pi-1', pointIndex: 4 }],
      }),
      expect.objectContaining({
        id: 'S1-right',
        members: [{ annotationId: 'pi-1', pointIndex: 5 }],
      }),
    ]);
  });
});
