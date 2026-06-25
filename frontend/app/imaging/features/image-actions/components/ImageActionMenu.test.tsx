import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import ImageActionMenu, { getClampedMenuPosition } from './ImageActionMenu';

it('keeps the image action menu inside the viewport', () => {
  expect(
    getClampedMenuPosition({
      top: 760,
      left: 370,
      menuWidth: 160,
      menuHeight: 180,
      viewportWidth: 390,
      viewportHeight: 844,
      margin: 8,
    })
  ).toEqual({
    top: 656,
    left: 222,
  });
});

it('uses one edit info action instead of separate type and crop actions', () => {
  const onEditInfo = jest.fn();

  render(
    <ImageActionMenu
      imageFileId={1}
      openDropdown={{ id: '1', top: 10, left: 10 }}
      onMoreAction={jest.fn()}
      onCropEdit={onEditInfo}
    />
  );

  expect(screen.queryByText('修改类型')).toBeNull();
  expect(screen.queryByText('裁剪编辑')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /编辑信息/ }));

  expect(onEditInfo).toHaveBeenCalledTimes(1);
});
