import { render } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import ImagingConfirmDialog from './ImagingConfirmDialog';

it('renders above the image edit overlay', () => {
  const { container } = render(
    <ImagingConfirmDialog
      open
      message="裁剪上传后的影像后, 影像标注内容会被清空, 是否继续?"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />
  );

  expect(container.firstElementChild?.className).toContain('z-[11000]');
});
