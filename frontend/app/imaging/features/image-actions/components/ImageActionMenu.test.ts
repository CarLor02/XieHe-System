import { expect, it } from '@jest/globals';

import { getClampedMenuPosition } from './ImageActionMenu';

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
