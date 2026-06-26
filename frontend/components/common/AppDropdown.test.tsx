import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from '@jest/globals';

import AppDropdown from './AppDropdown';

it('closes when users click outside or press escape', async () => {
  const user = userEvent.setup();

  render(
    <div>
      <AppDropdown
        trigger={<button type="button">打开菜单</button>}
        contentClassName="w-48"
      >
        <button type="button">菜单项</button>
      </AppDropdown>
      <button type="button">外部区域</button>
    </div>
  );

  await user.click(screen.getByRole('button', { name: '打开菜单' }));
  expect(screen.getByRole('button', { name: '菜单项' })).toBeTruthy();

  await user.click(screen.getByRole('button', { name: '外部区域' }));
  expect(screen.queryByRole('button', { name: '菜单项' })).toBeNull();

  await user.click(screen.getByRole('button', { name: '打开菜单' }));
  expect(screen.getByRole('button', { name: '菜单项' })).toBeTruthy();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('button', { name: '菜单项' })).toBeNull();
});

it('toggles when users click the trigger repeatedly', async () => {
  const user = userEvent.setup();

  render(
    <AppDropdown
      trigger={<button type="button">打开菜单</button>}
      contentClassName="w-48"
    >
      <button type="button">菜单项</button>
    </AppDropdown>
  );

  await user.click(screen.getByRole('button', { name: '打开菜单' }));
  expect(screen.getByRole('button', { name: '菜单项' })).toBeTruthy();

  await user.click(screen.getByRole('button', { name: '打开菜单' }));
  expect(screen.queryByRole('button', { name: '菜单项' })).toBeNull();
});
