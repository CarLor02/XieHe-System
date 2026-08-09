import { describe, expect, it } from 'vitest';

import type { MeasurementData } from '../../src/shared/domain/contracts';
import {
  getMaxCobbSequenceNumber,
  getNextCobbType,
  renumberCobbTypesAfterDelete,
} from '../../src/measurements';

function measurement(id: string, type: string): MeasurementData {
  return { id, type, value: '0.00°', points: [] };
}

describe('Cobb sequence rules', () => {
  it('uses the current maximum instead of the current count', () => {
    const measurements = [
      measurement('cobb-1', 'Cobb1'),
      measurement('cobb-3', 'Cobb3'),
    ];

    expect(getMaxCobbSequenceNumber(measurements)).toBe(3);
    expect(getNextCobbType(measurements)).toBe('cobb4');
  });

  it('renumbers only Cobb types while preserving ids and metadata', () => {
    const measurements = [
      {
        ...measurement('cobb-2', 'Cobb2'),
        upperVertebra: 'T2',
        lowerVertebra: 'T8',
      },
      measurement('other', 'T1 Tilt'),
      measurement('cobb-4', 'Cobb4'),
    ];

    expect(renumberCobbTypesAfterDelete(measurements)).toEqual([
      expect.objectContaining({
        id: 'cobb-2',
        type: 'cobb1',
        upperVertebra: 'T2',
        lowerVertebra: 'T8',
      }),
      measurements[1],
      expect.objectContaining({ id: 'cobb-4', type: 'cobb2' }),
    ]);
  });
});
