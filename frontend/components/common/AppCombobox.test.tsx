import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from '@jest/globals';

import OverlayProvider from '@/components/overlay/OverlayProvider';
import AppCombobox from './AppCombobox';

function ControlledCombobox() {
  const [open, setOpen] = useState(false);

  return (
    <AppCombobox
      open={open}
      onOpenChange={setOpen}
      trigger={<button type="button">选择项目</button>}
    >
      <input aria-label="搜索项目" />
    </AppCombobox>
  );
}

it('toggles and closes from outside click or escape', async () => {
  const user = userEvent.setup();

  render(
    <div>
      <ControlledCombobox />
      <button type="button">外部区域</button>
    </div>
  );

  await user.click(screen.getByRole('button', { name: '选择项目' }));
  expect(screen.getByRole('textbox', { name: '搜索项目' })).toBeTruthy();

  await user.click(screen.getByRole('button', { name: '外部区域' }));
  expect(screen.queryByRole('textbox', { name: '搜索项目' })).toBeNull();

  await user.click(screen.getByRole('button', { name: '选择项目' }));
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('textbox', { name: '搜索项目' })).toBeNull();

  await user.click(screen.getByRole('button', { name: '选择项目' }));
  await user.click(screen.getByRole('button', { name: '选择项目' }));
  expect(screen.queryByRole('textbox', { name: '搜索项目' })).toBeNull();
});

it('renders into the global overlay host', async () => {
  const user = userEvent.setup();

  render(
    <OverlayProvider>
      <ControlledCombobox />
    </OverlayProvider>
  );

  const host = screen.getByTestId('xiehe-overlay-host');
  await user.click(screen.getByRole('button', { name: '选择项目' }));

  const searchInput = await screen.findByRole('textbox', {
    name: '搜索项目',
  });
  expect(host.contains(searchInput)).toBe(true);
  expect(host.querySelector('.z-\\[10001\\]')).toBeTruthy();
});
