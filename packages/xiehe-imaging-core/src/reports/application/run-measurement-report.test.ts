import { describe, expect, it, vi } from 'vitest';

import { runMeasurementReport } from './run-measurement-report';

describe('runMeasurementReport', () => {
  it('does not call the report port when there are no measurements', async () => {
    const generate = vi.fn();

    await expect(
      runMeasurementReport({
        study: { imageId: '1', examType: '正位X光片' },
        measurements: [],
        port: { generate },
      })
    ).resolves.toMatchObject({ status: 'empty' });
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns the report generated through the platform port', async () => {
    const generate = vi.fn().mockResolvedValue({ report: '测量报告' });

    await expect(
      runMeasurementReport({
        study: { imageId: '1', examType: '正位X光片' },
        measurements: [{ id: 'm1', type: 'cobb1', value: '20°', points: [] }],
        port: { generate },
      })
    ).resolves.toEqual({ status: 'success', report: '测量报告' });
    expect(generate).toHaveBeenCalledOnce();
  });
});
