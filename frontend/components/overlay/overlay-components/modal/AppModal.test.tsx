import { render, screen, waitFor } from '@testing-library/react';
import { expect, it } from '@jest/globals';

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
