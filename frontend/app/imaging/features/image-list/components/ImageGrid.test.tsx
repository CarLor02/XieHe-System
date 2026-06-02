import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import ImageGrid from './ImageGrid';
import type { ImageFile } from '@/services/imageServices/imageFileService';

jest.mock('@/app/imaging/features/image-preview/components/ImagePreview', () => ({
  __esModule: true,
  default: ({ imageFile }: { imageFile: ImageFile }) => (
    <div aria-label={imageFile.original_filename} role="img" />
  ),
}));

jest.mock('@/app/imaging/features/image-actions/components/ImageActionMenu', () => ({
  __esModule: true,
  default: () => null,
}));

function makeImageFile(overrides: Partial<ImageFile> = {}): ImageFile {
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
    uploaded_by: 7,
    uploader_name: '王医生',
    patient_id: 3,
    patient_name: '张三',
    status: 'UPLOADED',
    upload_progress: 100,
    created_at: '2026-06-01T13:25:00',
    ...overrides,
  };
}

function renderImageGrid(imageFile: ImageFile) {
  return render(
    <ImageGrid
      imageFiles={[imageFile]}
      imageUrls={{}}
      previewStates={{}}
      openDropdown={null}
      onPreviewError={jest.fn()}
      onToggleActionMenu={jest.fn()}
      onMoreAction={jest.fn()}
      onOpenChangeTypeModal={jest.fn()}
      onCropEdit={jest.fn()}
    />
  );
}

it('renders patient and uploader names on image cards', () => {
  renderImageGrid(makeImageFile());

  expect(screen.getByText('患者:')).toBeTruthy();
  expect(screen.getByText('张三')).toBeTruthy();
  expect(screen.getByText('上传者:')).toBeTruthy();
  expect(screen.getByText('王医生')).toBeTruthy();
});

it('renders fallback labels when patient or uploader names are missing', () => {
  renderImageGrid(
    makeImageFile({
      patient_name: null,
      uploader_name: null,
    })
  );

  expect(screen.getByText('未知患者')).toBeTruthy();
  expect(screen.getByText('未知用户')).toBeTruthy();
});
