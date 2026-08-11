import { describe, expect, it } from 'vitest';

import { AnnotationSource } from '../../shared/domain/contracts';
import { prepareAiEditorState } from './prepare-ai-editor-state';

describe('prepareAiEditorState', () => {
  it('hydrates measurements and AP keypoints as one editor state', () => {
    const result = prepareAiEditorState({
      response: {
        imageWidth: 100,
        imageHeight: 100,
        measurements: [
          {
            type: 'cobb',
            points: Array.from({ length: 4 }, (_, index) => ({
              x: index,
              y: index,
            })),
          },
        ],
        vertebrae: [
          {
            label: 'T1',
            corners: [
              { x: 1, y: 1 },
              { x: 2, y: 1 },
              { x: 1, y: 2 },
              { x: 2, y: 2 },
            ],
            confidence: 1,
            source: AnnotationSource.AI,
          },
        ],
      },
      examType: '正位X光片',
      actualImageSize: { width: 100, height: 100 },
      resolveTool: type =>
        type === 'cobb'
          ? { id: 'cobb', category: 'measurement', pointsNeeded: 4 }
          : null,
      calculateValue: () => '10°',
      describeType: () => 'Cobb',
      createId: () => 'measurement-1',
    });

    expect(result.measurements).toHaveLength(1);
    expect(result.keypoints.map(keypoint => keypoint.id)).toEqual([
      'T1-1',
      'T1-2',
      'T1-3',
      'T1-4',
    ]);
    expect(result.showVertebraeLayer).toBe(true);
  });
});
