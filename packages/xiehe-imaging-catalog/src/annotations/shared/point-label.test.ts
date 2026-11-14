import { describe, expect, it } from 'vitest';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import { getMeasurementPointLabel } from '@xiehe/imaging-catalog/annotations';

function measurement(type: string, count: number): MeasurementData {
  return {
    type,
    id: type,
    value: 'T1',
    points: Array.from({ length: count }, (_, i) => ({
      x: i * 10,
      y: (i % 2) * 4,
    })),
  };
}

function labels(items: MeasurementData[]) {
  return items.map((m, i) =>
    m.points.map((_, p) => getMeasurementPointLabel(m, p, items, i))
  );
}

describe('measurement point labels', () => {
  it('numbers completed measurements and respects tools with custom point labels', () => {
    expect(
      labels([
        measurement('cobb1', 4),
        measurement('hemipelvic-width-ratio', 4),
        measurement('AI检测-T1', 1),
      ])
    ).toEqual([['1', '2', '3', '4'], Array(4).fill(undefined), ['T1']]);
  });
  it('uses the first measurement as the owner of shared PI, PT and SS labels', () => {
    expect(
      labels([measurement('pi', 3), measurement('pt', 3), measurement('ss', 2)])
    ).toEqual([
      ['3', '1', '2'],
      Array(3).fill(undefined),
      Array(2).fill(undefined),
    ]);
    expect(labels([measurement('pi', 6), measurement('pt', 6)])).toEqual([
      [undefined, 'R1', undefined, 'R2', undefined, undefined],
      Array(6).fill(undefined),
    ]);
  });
});
