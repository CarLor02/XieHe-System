import { describe, expect, it } from '@jest/globals';
import { createAiImageUploadFile } from '../aiMeasurementService';

describe('aiMeasurementService', () => {
  it('wraps non-image blobs as image/png before model upload', () => {
    const source = new Blob(['not inspected here'], {
      type: 'application/octet-stream',
    });

    const uploadFile = createAiImageUploadFile(source);

    expect(uploadFile.type).toBe('image/png');
    expect(uploadFile.name).toBe('image.png');
  });

  it('keeps jpeg blobs as image/jpeg before model upload', () => {
    const source = new Blob(['jpeg bytes'], { type: 'image/jpeg' });

    const uploadFile = createAiImageUploadFile(source);

    expect(uploadFile.type).toBe('image/jpeg');
    expect(uploadFile.name).toBe('image.jpg');
  });
});
