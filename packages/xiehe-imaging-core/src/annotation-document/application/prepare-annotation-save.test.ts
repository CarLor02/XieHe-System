import { describe, expect, it } from 'vitest';

import { createEmptyBindings } from '../../bindings/domain';
import { prepareAnnotationSave } from './prepare-annotation-save';

describe('prepareAnnotationSave', () => {
  it('creates a versioned empty annotation document', () => {
    const plan = prepareAnnotationSave({
      imageNaturalSize: { width: 100, height: 200 },
      standardDistance: null,
      standardDistancePoints: null,
      pointBindings: createEmptyBindings(),
      measurements: [],
      reportText: '',
      savedAt: '2026-08-11T00:00:00.000Z',
    });
    expect(plan.document).toMatchObject({
      schemaVersion: 1,
      measurements: [],
      imageWidth: 100,
      imageHeight: 200,
    });
    expect(plan.hasSavedAnnotationContent).toBe(false);
    expect(plan.successMessage).toBe('空标注已保存到本地和影像标注');
  });
});
