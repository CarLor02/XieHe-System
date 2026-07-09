import { render, screen, waitFor } from '@testing-library/react';
import { expect, it } from '@jest/globals';

import OverlayProvider from './OverlayProvider';
import OverlayPortal from './OverlayPortal';

it('renders portal content into the global overlay host with the requested layer', async () => {
  render(
    <OverlayProvider>
      <OverlayPortal layer="modal" className="fixed inset-0">
        <div>全局浮层</div>
      </OverlayPortal>
    </OverlayProvider>
  );

  const host = screen.getByTestId('xiehe-overlay-host');

  await waitFor(() => {
    expect(host.querySelector('[data-overlay-layer="modal"]')).toBeTruthy();
  });
  expect(
    host.querySelector('[data-overlay-layer="modal"]')?.className
  ).toContain('z-[11000]');
});

it('falls back to document body when rendered outside the overlay provider', () => {
  render(
    <OverlayPortal layer="blocking" className="fixed inset-0">
      <div>独立浮层</div>
    </OverlayPortal>
  );

  const portal = document.body.querySelector('[data-overlay-layer="blocking"]');
  expect(portal).toBeTruthy();
  expect(portal?.className).toContain('z-[10000]');
});
