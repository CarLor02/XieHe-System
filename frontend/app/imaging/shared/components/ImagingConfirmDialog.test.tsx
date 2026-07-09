import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import ImagingConfirmDialog from './ImagingConfirmDialog';

it('renders above the image edit overlay through the modal overlay layer', () => {
  render(
    <ImagingConfirmDialog
      open
      message="裁剪上传后的影像后, 影像标注内容会被清空, 是否继续?"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />
  );

  const overlay = screen
    .getByText('裁剪上传后的影像后, 影像标注内容会被清空, 是否继续?')
    .closest('[data-overlay-layer="modal"]');
  expect(overlay?.className).toContain('z-[11000]');
});
