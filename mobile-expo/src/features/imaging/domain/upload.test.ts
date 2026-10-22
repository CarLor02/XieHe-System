import { describe, expect, it } from 'vitest';
import { mimeTypeForFilename, validateUploadFile } from './upload';
import { requireSupportedImage } from './supportedImage';

describe('mobile raster file boundary', () => {
  it.each(['png', 'jpg', 'jpeg', 'tif', 'tiff'])('accepts %s', extension => {
    expect(() => validateUploadFile({ name: `scan.${extension}`, size: 1024 })).not.toThrow();
    expect(mimeTypeForFilename(`scan.${extension}`)).toMatch(/^image\//);
  });
  it.each(['dcm', 'dicom', 'pdf'])('rejects unsupported %s before upload', extension => {
    expect(() => validateUploadFile({ name: `scan.${extension}`, size: 1024 })).toThrow('支持');
    expect(() => mimeTypeForFilename(`scan.${extension}`)).toThrow('不支持');
    expect(() => requireSupportedImage(extension.toUpperCase())).toThrow('仅支持');
  });
});
