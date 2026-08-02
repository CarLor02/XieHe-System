import { expect, it } from '@jest/globals';

import { AnnotationSource } from '@/app/imaging/features/image-viewer/shared/types';

import {
  buildBatchExportFiles,
  type ExportImageFile,
} from './build-batch-export-files';

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function buildImage(
  annotation: ExportImageFile['annotation']
): ExportImageFile {
  return {
    id: 12,
    original_filename: 'spine.png',
    patient_id: 9,
    description: '正位X光片',
    created_at: '2026-08-02T08:00:00Z',
    annotation,
  } as ExportImageFile;
}

it('builds annotation-point CSV from the persisted detection layer', async () => {
  const files = await buildBatchExportFiles({
    images: [
      buildImage({
        vertebraeLayer: [
          {
            label: 'T1',
            corners: [
              { x: 10, y: 20 },
              { x: 30, y: 20 },
              { x: 10, y: 40 },
              { x: 30, y: 40 },
            ],
            confidence: 0.9,
            source: AnnotationSource.AI,
          },
        ],
      }),
    ],
    exportContent: 'annotation-points',
  });

  expect(files).toHaveLength(1);
  expect(files[0].filename).toBe('spine.csv');
  const csv = await readBlobAsText(files[0].blob);
  expect(csv).toContain('检测点名称,来源,置信度,X,Y');
  expect(csv).toContain('T1-1,ai,0.9,10,20');
  expect(csv).toContain('T1-4,ai,0.9,30,40');
});

it('keeps an empty annotation-point export as a header-only CSV', async () => {
  const files = await buildBatchExportFiles({
    images: [buildImage({ measurements: [] })],
    exportContent: 'annotation-points',
  });

  const csv = await readBlobAsText(files[0].blob);
  expect(csv.trim().split('\n')).toHaveLength(1);
  expect(csv).toContain('检测点名称,来源,置信度,X,Y');
});
