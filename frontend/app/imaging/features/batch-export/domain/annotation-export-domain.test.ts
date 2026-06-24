import { expect, it } from '@jest/globals';

import { buildTrainingLabelBlob } from '@/app/imaging/features/batch-export/domain/annotation-export-domain';
import { AnnotationSource, VertebraAnnotation } from '@/app/imaging/features/image-viewer/shared/types';
import { ImageFile } from '@/services/imageServices/imageFileService';

const image = {
  id: 12,
  original_filename: 'spine.png',
} as ImageFile;

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

it('includes detection point source in training label export', async () => {
  const vertebraeLayer: VertebraAnnotation[] = [
    {
      label: 'T1',
      corners: [
        { x: 10, y: 20 },
        { x: 30, y: 20 },
        { x: 10, y: 60 },
        { x: 30, y: 60 },
      ],
      confidence: 0.9,
      source: AnnotationSource.MANUAL,
    },
    {
      label: 'SR',
      corners: [
        { x: 50, y: 80 },
        { x: 50, y: 80 },
        { x: 50, y: 80 },
        { x: 50, y: 80 },
      ],
      confidence: 0.8,
      source: AnnotationSource.AI,
    },
  ];

  const blob = buildTrainingLabelBlob(image, vertebraeLayer, 100, 200);
  const payload = JSON.parse(await readBlobAsText(blob));

  expect(payload.vertebrae).toEqual([
    expect.objectContaining({
      label: 'T1',
      source: AnnotationSource.MANUAL,
    }),
    expect.objectContaining({
      label: 'SR',
      source: AnnotationSource.AI,
    }),
  ]);
});
