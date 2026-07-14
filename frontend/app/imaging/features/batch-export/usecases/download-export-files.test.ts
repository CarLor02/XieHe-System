import { expect, it } from '@jest/globals';
import { TextEncoder } from 'util';

import { createZipBlob } from './download-export-files';

Object.assign(globalThis, {
  TextEncoder,
});

function createBlobLike(text: string): Blob {
  return {
    arrayBuffer: async () => {
      const bytes = new TextEncoder().encode(text);
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      );
    },
  } as Blob;
}

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

it('preserves sanitized folder segments in zip entry names', async () => {
  const zipBlob = await createZipBlob([
    {
      filename: 'P001/spine.png',
      blob: createBlobLike('image'),
    },
    {
      filename: 'P001/spine.json',
      blob: createBlobLike('{}'),
    },
  ]);

  const zipText = await readBlobAsText(zipBlob);

  expect(zipText).toContain('P001/');
  expect(zipText).toContain('P001/spine.png');
  expect(zipText).toContain('P001/spine.json');
  expect(zipText).not.toContain('P001_spine.png');
});
