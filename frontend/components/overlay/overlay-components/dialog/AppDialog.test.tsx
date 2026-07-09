import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';

import OverlayProvider from '../../OverlayProvider';
import AppDialog from './AppDialog';
import { AppConfirmDialog, AppMessageDialog } from './presets';

it('renders dialog content into the overlay host', async () => {
  render(
    <OverlayProvider>
      <AppDialog open title="测试弹窗">
        弹窗内容
      </AppDialog>
    </OverlayProvider>
  );

  const host = screen.getByTestId('xiehe-overlay-host');

  await waitFor(() => {
    expect(host.textContent).toContain('弹窗内容');
  });
  expect(host.querySelector('[data-overlay-layer="modal"]')).toBeTruthy();
});

it('runs the message dialog close action', async () => {
  const user = userEvent.setup();
  const handleClose = jest.fn();

  render(
    <OverlayProvider>
      <AppMessageDialog open message="消息内容" onClose={handleClose} />
    </OverlayProvider>
  );

  await user.click(await screen.findByRole('button', { name: '知道了' }));

  expect(handleClose).toHaveBeenCalledTimes(1);
});

it('runs confirm dialog cancel and confirm actions', async () => {
  const user = userEvent.setup();
  const handleCancel = jest.fn();
  const handleConfirm = jest.fn();

  render(
    <OverlayProvider>
      <AppConfirmDialog
        open
        message="确认内容"
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </OverlayProvider>
  );

  await user.click(await screen.findByRole('button', { name: '取消' }));
  await user.click(screen.getByRole('button', { name: '确定' }));

  expect(handleCancel).toHaveBeenCalledTimes(1);
  expect(handleConfirm).toHaveBeenCalledTimes(1);
});
