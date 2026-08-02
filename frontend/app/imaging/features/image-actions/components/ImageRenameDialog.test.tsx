import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';

import ImageRenameDialog from './ImageRenameDialog';
import type { ImageFile } from '@/services/imageServices/imageFileService';

const imageFile: ImageFile = {
  id: 1,
  file_uuid: 'file-1',
  original_filename: 'original.scan.png',
  file_type: 'PNG',
  mime_type: 'image/png',
  file_size: 1024,
  storage_bucket: 'medical-image-files',
  object_key: 'objects/file-1',
  uploaded_by: 7,
  status: 'UPLOADED',
  upload_progress: 100,
  has_annotation: false,
  created_at: '2026-07-29T10:00:00',
};

it('shows the original filename and keeps the extension read-only', () => {
  render(
    <ImageRenameDialog
      imageFile={imageFile}
      basename="original.scan"
      extension=".png"
      error={null}
      saving={false}
      onBasenameChange={jest.fn()}
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />
  );

  expect(screen.getByText('重命名影像')).toBeTruthy();
  expect(screen.getByText('original.scan.png')).toBeTruthy();
  expect(screen.getByText('.png')).toBeTruthy();
  expect(
    (screen.getByLabelText('新影像名') as HTMLInputElement).value
  ).toBe('original.scan');
});

it('submits and cancels through the dialog controls', async () => {
  const user = userEvent.setup();
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  render(
    <ImageRenameDialog
      imageFile={imageFile}
      basename="renamed"
      extension=".png"
      error={null}
      saving={false}
      onBasenameChange={jest.fn()}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );

  await user.click(screen.getByRole('button', { name: '确认' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole('button', { name: '取消' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});
