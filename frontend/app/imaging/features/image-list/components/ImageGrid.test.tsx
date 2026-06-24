import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';
import type { ComponentProps } from 'react';

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

function renderImageGrid(
  imageFile: ImageFile,
  overrides: Partial<ComponentProps<typeof ImageGrid>> = {}
) {
  const props: ComponentProps<typeof ImageGrid> = {
    imageFiles: [imageFile],
    viewerReturnTo: '/imaging?page=3&uploaded_by=7',
    imageUrls: {},
    previewStates: {},
    openDropdown: null,
    onPreviewError: jest.fn(),
    onToggleActionMenu: jest.fn(),
    onMoreAction: jest.fn(),
    onOpenChangeTypeModal: jest.fn(),
    onCropEdit: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<ImageGrid {...props} />),
    props,
  };
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

it('passes the current imaging URL to the viewer return target', () => {
  renderImageGrid(makeImageFile());

  const viewerLink = screen.getByRole('link', { name: /标注分析/ });

  expect(viewerLink.getAttribute('href')).toBe(
    '/imaging/viewer?id=1&returnTo=%2Fimaging%3Fpage%3D3%26uploaded_by%3D7'
  );
});

it('keeps the image preview linked to the viewer outside batch export mode', () => {
  renderImageGrid(makeImageFile());

  const viewerHref =
    '/imaging/viewer?id=1&returnTo=%2Fimaging%3Fpage%3D3%26uploaded_by%3D7';
  const viewerLinks = screen
    .getAllByRole('link')
    .filter(link => link.getAttribute('href') === viewerHref);

  expect(viewerLinks.length).toBe(2);
});

it('replaces card actions with an export checkbox in batch export mode', async () => {
  const onToggleExportSelection = jest.fn();
  renderImageGrid(makeImageFile(), {
    isBatchExportMode: true,
    selectedExportIds: new Set<number>([1]),
    onToggleExportSelection,
  });

  expect(screen.queryByRole('link', { name: /标注分析/ })).not.toBeTruthy();
  expect(screen.queryByRole('button', { name: /更多/ })).not.toBeTruthy();

  const checkbox = screen.getByRole('checkbox', { name: /选择导出 xray\.png/ });
  expect((checkbox as HTMLInputElement).checked).toBe(true);

  await userEvent.click(checkbox);
  expect(onToggleExportSelection).toHaveBeenCalledWith(1);
});

it('selects the image instead of opening the viewer when clicking the preview in batch export mode', async () => {
  const onToggleExportSelection = jest.fn();
  renderImageGrid(makeImageFile(), {
    isBatchExportMode: true,
    selectedExportIds: new Set<number>(),
    onToggleExportSelection,
  });

  const viewerHref =
    '/imaging/viewer?id=1&returnTo=%2Fimaging%3Fpage%3D3%26uploaded_by%3D7';
  const viewerLinks = screen
    .queryAllByRole('link')
    .filter(link => link.getAttribute('href') === viewerHref);
  expect(viewerLinks.length).toBe(0);

  await userEvent.click(
    screen.getByRole('button', { name: /选择导出图像 xray\.png/ })
  );

  expect(onToggleExportSelection).toHaveBeenCalledWith(1);
});
