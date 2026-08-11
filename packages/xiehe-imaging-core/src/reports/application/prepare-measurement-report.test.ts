import { describe, expect, it } from 'vitest';

import { prepareMeasurementReport } from './prepare-measurement-report';

describe('prepareMeasurementReport', () => {
  it('rejects empty measurements and maps a ready request', () => {
    expect(
      prepareMeasurementReport({
        study: { imageId: '1', examType: '正位X光片' },
        measurements: [],
      }).status
    ).toBe('empty');
    expect(
      prepareMeasurementReport({
        study: { imageId: '1', examType: '正位X光片' },
        measurements: [{ id: 'm1', type: 'cobb1', value: '20°', points: [] }],
      })
    ).toMatchObject({
      status: 'ready',
      request: {
        imageId: '1',
        measurements: [{ type: 'cobb1', value: '20°' }],
      },
    });
  });
});
