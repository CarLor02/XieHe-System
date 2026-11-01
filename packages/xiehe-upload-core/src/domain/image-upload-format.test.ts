import { describe, expect, it } from 'vitest';
import { isSupportedImageUploadFilename } from './image-upload-format';

describe('new image upload formats', () => {
  it.each(['image.jpg', 'image.JPEG', 'image.PNG'])('accepts %s', name => {
    expect(isSupportedImageUploadFilename(name)).toBe(true);
  });
  it.each([
    'image.tif',
    'image.tiff',
    'image.gif',
    'image.dcm',
    'image.dicom',
    'image.png.exe',
    'image',
  ])('rejects %s', name => {
    expect(isSupportedImageUploadFilename(name)).toBe(false);
  });
});
