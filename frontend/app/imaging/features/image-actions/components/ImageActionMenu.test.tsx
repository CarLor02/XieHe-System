import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';

import ImageActionMenu from './ImageActionMenu';

it('uses one edit info action instead of separate type and crop actions', () => {
  const onEditInfo = jest.fn();

  render(
    <ImageActionMenu
      imageFileId={1}
      onMoreAction={jest.fn()}
      onCropEdit={onEditInfo}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: '更多' }));

  expect(screen.queryByText('修改类型')).toBeNull();
  expect(screen.queryByText('裁剪编辑')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /编辑信息/ }));

  expect(onEditInfo).toHaveBeenCalledTimes(1);
});

it('closes the image action menu from outside click and escape', async () => {
  const user = userEvent.setup();

  render(
    <div>
      <ImageActionMenu
        imageFileId={1}
        onMoreAction={jest.fn()}
        onCropEdit={jest.fn()}
      />
      <button type="button">外部区域</button>
    </div>
  );

  await user.click(screen.getByRole('button', { name: '更多' }));
  expect(screen.getByRole('button', { name: /下载/ })).toBeTruthy();

  await user.click(screen.getByRole('button', { name: '外部区域' }));
  expect(screen.queryByRole('button', { name: /下载/ })).toBeNull();

  await user.click(screen.getByRole('button', { name: '更多' }));
  expect(screen.getByRole('button', { name: /下载/ })).toBeTruthy();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('button', { name: /下载/ })).toBeNull();
});
