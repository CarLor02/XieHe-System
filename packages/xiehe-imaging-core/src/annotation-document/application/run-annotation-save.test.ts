import { describe, expect, it, vi } from 'vitest';

import { createEmptyBindings } from '../../bindings/domain';
import { runAnnotationSave } from './run-annotation-save';

describe('runAnnotationSave', () => {
  it('builds the annotation document and persists it through the server port', async () => {
    const save = vi.fn().mockResolvedValue({ version: 4 });

    const result = await runAnnotationSave({
      imageId: 12,
      expectedVersion: 3,
      snapshot: {
        imageNaturalSize: { width: 100, height: 200 },
        standardDistance: null,
        standardDistancePoints: null,
        pointBindings: createEmptyBindings(),
        measurements: [],
        reportText: '',
        savedAt: '2026-08-11T00:00:00.000Z',
      },
      port: { save },
    });

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        imageId: 12,
        expectedVersion: 3,
        annotation: expect.objectContaining({ schemaVersion: 1 }),
      })
    );
    expect(result.result).toEqual({ version: 4 });
    expect(result.plan.successMessage).toBe('空标注已保存到服务器');
  });
});
