import { expect, it } from '@jest/globals';

import {
  buildLabelMeAnnotationPayload,
} from '@/app/imaging/features/batch-export/domain/labelme-export-domain';
import {
  AnnotationSource,
  type VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

function makeVertebra(
  label: string,
  corners: VertebraAnnotation['corners']
): VertebraAnnotation {
  return {
    label,
    corners,
    confidence: 0.9,
    source: AnnotationSource.AI,
  };
}

it('builds LabelMe polygon points with pixel coordinates and ring order', () => {
  const payload = buildLabelMeAnnotationPayload({
    imagePath: 'spine.png',
    vertebraeLayer: [
      makeVertebra('T1', [
        { x: 10, y: 20 },
        { x: 30, y: 20 },
        { x: 10, y: 60 },
        { x: 30, y: 60 },
      ]),
    ],
    sourceSize: { width: 100, height: 200 },
    targetSize: { width: 200, height: 400 },
  });

  expect(payload.imagePath).toBe('spine.png');
  expect(payload.imageData).toBeNull();
  expect(payload.imageWidth).toBe(200);
  expect(payload.imageHeight).toBe(400);
  expect(payload.shapes).toEqual([
    expect.objectContaining({
      label: 'T1',
      shape_type: 'polygon',
      points: [
        [20, 40],
        [60, 40],
        [60, 120],
        [20, 120],
      ],
    }),
  ]);
});

it('exports lateral S1 points as a LabelMe line', () => {
  const payload = buildLabelMeAnnotationPayload({
    imagePath: 'spine.png',
    vertebraeLayer: [
      makeVertebra('S1-1', [
        { x: 12, y: 20 },
        { x: 12, y: 20 },
        { x: 12, y: 20 },
        { x: 12, y: 20 },
      ]),
      makeVertebra('S1-2', [
        { x: 24, y: 32 },
        { x: 24, y: 32 },
        { x: 24, y: 32 },
        { x: 24, y: 32 },
      ]),
    ],
    sourceSize: { width: 100, height: 100 },
    targetSize: { width: 100, height: 100 },
  });

  expect(payload.shapes).toEqual([
    expect.objectContaining({
      label: 'S1',
      shape_type: 'line',
      points: [
        [12, 20],
        [24, 32],
      ],
    }),
  ]);
});

it('exports cfhAnnotation when CFH is not already in vertebraeLayer', () => {
  const payload = buildLabelMeAnnotationPayload({
    imagePath: 'spine.png',
    vertebraeLayer: [],
    cfhAnnotation: {
      center: { x: 50, y: 80 },
      confidence: 0.8,
      source: AnnotationSource.AI,
    },
    sourceSize: { width: 100, height: 200 },
    targetSize: { width: 100, height: 200 },
  });

  expect(payload.shapes).toEqual([
    expect.objectContaining({
      label: 'CFH',
      shape_type: 'point',
      points: [[50, 80]],
    }),
  ]);
});
