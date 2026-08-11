import { describe, expect, it } from 'vitest';
import {
  AnnotationSource,
  type VertebraAnnotation,
} from '../../shared/domain/contracts';
import {
  buildLabelMeAnnotationPayload,
  normalizeVertebraeLayerForLabelMe,
} from './labelme';

function point(label: string, x: number, y: number): VertebraAnnotation {
  const value = { x, y };
  return {
    label,
    corners: [value, value, value, value],
    confidence: 1,
    source: AnnotationSource.AI,
  };
}

describe('LabelMe export', () => {
  it('groups legacy corner records into one vertebra', () => {
    const result = normalizeVertebraeLayerForLabelMe([
      point('T5-1', 10, 20),
      point('T5-2', 30, 20),
      point('T5-3', 10, 60),
      point('T5-4', 30, 60),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('T5');
  });

  it('scales polygon coordinates to the exported image size', () => {
    const payload = buildLabelMeAnnotationPayload({
      imagePath: 'spine.png',
      vertebraeLayer: [
        {
          label: 'T1',
          corners: [
            { x: 10, y: 20 },
            { x: 30, y: 20 },
            { x: 10, y: 60 },
            { x: 30, y: 60 },
          ],
          confidence: 1,
          source: AnnotationSource.MANUAL,
        },
      ],
      sourceSize: { width: 100, height: 200 },
      targetSize: { width: 200, height: 400 },
    });
    expect(payload.shapes[0].points).toEqual([
      [20, 40],
      [60, 40],
      [60, 120],
      [20, 120],
    ]);
  });
});
