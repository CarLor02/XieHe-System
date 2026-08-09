import { describe, expect, it } from 'vitest';

import {
  getMeasurementDeriveVertebraOrder,
  MEASUREMENT_DERIVE_VERTEBRA_ORDER,
} from '../../src/anatomy';

describe('vertebra physiological order', () => {
  it('orders configured vertebrae from cranial to caudal starting at one', () => {
    expect(getMeasurementDeriveVertebraOrder('C2')).toBe(1);
    expect(getMeasurementDeriveVertebraOrder('C7')).toBeLessThan(
      getMeasurementDeriveVertebraOrder('T1') ?? 0
    );
    expect(getMeasurementDeriveVertebraOrder('L5')).toBeLessThan(
      getMeasurementDeriveVertebraOrder('S1') ?? 0
    );
    expect(getMeasurementDeriveVertebraOrder('S1')).toBe(
      MEASUREMENT_DERIVE_VERTEBRA_ORDER.length
    );
  });

  it('returns null for labels outside the domain order', () => {
    expect(getMeasurementDeriveVertebraOrder('姿态点')).toBeNull();
  });
});
