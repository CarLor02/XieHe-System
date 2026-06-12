import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import ImageListRows from './ImageListRows';
import type { ImageFile } from '@/services/imageServices/imageFileService';

jest.mock('@/app/imaging/features/image-preview/components/ImagePreview', () => ({
  __esModule: true,
  default: ({ imageFile }: { imageFile: ImageFile }) => (
    <div aria-label={imageFile.original_filename} role="img" />
  ),
}));

function makeImageFile(overrides: Partial<ImageFile> = {}): ImageFile {
  return {
    id: 1,
    file_uuid: 'file-1',
    original_filename: '1061问题图像很长很长.png',
    file_type: 'PNG',
    mime_type: 'image/png',
    file_size: 1024,
    storage_bucket: 'medical-image-files',
    object_key: 'objects/xray.png',
    storage_etag: 'etag-1',
    uploaded_by: 7,
    uploader_name: '系统管理员',
    patient_id: 3,
    patient_name: '李老先生',
    status: 'UPLOADED',
    upload_progress: 100,
    created_at: '2026-06-11T16:05:00',
    description: '正位X光片',
    ...overrides,
  };
}

it('keeps all image row actions in one line on phone-sized screens', () => {
  const { container } = render(
    <ImageListRows
      imageFiles={[makeImageFile()]}
      viewerReturnTo="/imaging?page=2&search=abc"
      imageUrls={{}}
      previewStates={{}}
      onPreviewError={jest.fn()}
      onMoreAction={jest.fn()}
      onCropEdit={jest.fn()}
    />
  );

  expect(screen.getByText('1061问题图像很长很长.png')).toBeTruthy();
  expect(screen.getByText('正位X光片')).toBeTruthy();
  expect(screen.getByText('李老先生')).toBeTruthy();
  expect(screen.getByText('系统管理员')).toBeTruthy();

  const row = container.firstElementChild?.firstElementChild;
  expect(row?.className).toContain('p-4');
  expect(row?.className).toContain('sm:p-6');

  const actions = screen.getByRole('link', { name: /标注分析/ }).parentElement;
  expect(actions?.className).toContain('grid');
  expect(actions?.className).toContain('grid-cols-4');
  expect(actions?.className).toContain('sm:flex');
});

it('passes the current imaging URL to the row viewer return target', () => {
  render(
    <ImageListRows
      imageFiles={[makeImageFile()]}
      viewerReturnTo="/imaging?page=2&search=abc"
      imageUrls={{}}
      previewStates={{}}
      onPreviewError={jest.fn()}
      onMoreAction={jest.fn()}
      onCropEdit={jest.fn()}
    />
  );

  const viewerLink = screen.getByRole('link', { name: /标注分析/ });

  expect(viewerLink.getAttribute('href')).toBe(
    '/imaging/viewer?id=1&returnTo=%2Fimaging%3Fpage%3D2%26search%3Dabc'
  );
});
