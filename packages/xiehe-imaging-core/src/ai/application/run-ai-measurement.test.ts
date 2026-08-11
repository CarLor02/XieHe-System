import { describe, expect, it, vi } from 'vitest';

import { runAiMeasurement } from './run-ai-measurement';

const callbacks = {
  resolveTool: () => ({ id: 't1-tilt', category: 'measurement' as const, pointsNeeded: 2 }),
  calculateValue: () => '10°',
  describeType: () => 'T1 Tilt',
  createId: () => 'measurement-1',
};

describe('runAiMeasurement', () => {
  it('reports an empty result when the service omits measurements', async () => {
    const measure = vi.fn().mockResolvedValue({ vertebrae: [] });

    await expect(
      runAiMeasurement({
        imageId: 9,
        examType: '正位X光片',
        actualImageSize: null,
        port: { measure },
        ...callbacks,
      })
    ).resolves.toEqual({ status: 'empty' });
  });

  it('normalizes the service response into an editor state', async () => {
    const measure = vi.fn().mockResolvedValue({
      imageWidth: 100,
      imageHeight: 200,
      measurements: [
        {
          type: 't1-tilt',
          points: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        },
      ],
      vertebrae: [],
    });

    const result = await runAiMeasurement({
      imageId: 9,
      examType: '正位X光片',
      actualImageSize: null,
      port: { measure },
      ...callbacks,
    });

    expect(result).toMatchObject({
      status: 'ready',
      state: {
        imageSize: { width: 100, height: 200 },
        measurements: [{ id: 'measurement-1', value: '10°' }],
      },
    });
  });
});
