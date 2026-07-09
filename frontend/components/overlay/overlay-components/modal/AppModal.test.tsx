import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from '@jest/globals';

import AppDropdown from '@/components/common/AppDropdown';
import OverlayProvider from '../../OverlayProvider';
import AppModal from './AppModal';

it('renders modal content into the overlay host', async () => {
  render(
    <OverlayProvider>
      <AppModal open title="工作流弹窗">
        <div className="modal-panel">工作流内容</div>
      </AppModal>
    </OverlayProvider>
  );

  const host = screen.getByTestId('xiehe-overlay-host');

  await waitFor(() => {
    expect(host.textContent).toContain('工作流内容');
  });
  expect(host.querySelector('[data-overlay-layer="modal"]')).toBeTruthy();
});

it('renders nested dropdown content into the modal scoped overlay host', async () => {
  const user = userEvent.setup();

  render(
    <OverlayProvider>
      <AppModal open title="工作流弹窗">
        <AppDropdown trigger={<button type="button">打开菜单</button>}>
          <button type="button">菜单项</button>
        </AppDropdown>
      </AppModal>
    </OverlayProvider>
  );

  const globalHost = screen.getByTestId('xiehe-overlay-host');
  const scopedHost = await screen.findByTestId('xiehe-overlay-scoped-host');

  await user.click(screen.getByRole('button', { name: '打开菜单' }));

  await waitFor(() => {
    expect(scopedHost.textContent).toContain('菜单项');
  });
  expect(
    screen.getByRole('button', { name: '菜单项' }).closest('[data-overlay-host="scoped"]')
  ).toBe(scopedHost);
  expect(globalHost.querySelector('[data-overlay-host="scoped"]')).toBe(scopedHost);
});
