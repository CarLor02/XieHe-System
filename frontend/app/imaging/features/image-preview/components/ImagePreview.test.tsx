import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import ImagePreview from './ImagePreview';
import type { ImageFile } from '@/services/imageServices/imageFileService';

function makeImageFile(): ImageFile {
  return {
    id: 1,
    file_uuid: 'file-1',
    original_filename: 'xray.png',
    file_type: 'PNG',
    mime_type: 'image/png',
    file_size: 1024,
    storage_bucket: 'medical-image-files',
    object_key: 'objects/xray.png',
    storage_etag: 'etag-1',
    uploaded_by: 1,
    status: 'UPLOADED',
    upload_progress: 100,
    created_at: '2026-05-10T00:00:00',
  };
}

it('renders direct image URLs as lazy loaded images', () => {
  render(
    <ImagePreview
      imageFile={makeImageFile()}
      imageUrls={{ 1: '/medical-image-files/objects/xray.png?sig=1' }}
      previewStates={{}}
      imgClassName="preview"
      loadingIconClassName="loading"
      fallbackIconClassName="fallback"
      onPreviewError={jest.fn()}
    />
  );

  const image = screen.getByRole('img', { name: 'xray.png' });

  expect(image.getAttribute('src')).toBe('/medical-image-files/objects/xray.png?sig=1');
  expect(image.getAttribute('loading')).toBe('lazy');
});
