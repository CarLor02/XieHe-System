import * as Popover from '@radix-ui/react-popover';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, jest } from '@jest/globals';

import type { OverlayContainerState } from '../../OverlayProvider';

const mockUseOverlayContainer = jest.fn<() => OverlayContainerState>();

jest.mock('../../OverlayProvider', () => ({
  __esModule: true,
  useOverlayContainer: () => mockUseOverlayContainer(),
}));

async function renderPopoverPortal() {
  const { default: RadixPopoverPortal } = await import('./RadixPopoverPortal');

  render(
    <Popover.Root open>
      <RadixPopoverPortal>
        <div>Radix Popover Content</div>
      </RadixPopoverPortal>
    </Popover.Root>
  );
}

beforeEach(() => {
  mockUseOverlayContainer.mockReset();
});

it('does not render while the scoped overlay host is waiting', async () => {
  mockUseOverlayContainer.mockReturnValue({
    type: 'waiting-host',
    shouldRenderPortal: false,
    container: undefined,
  } satisfies OverlayContainerState);

  await renderPopoverPortal();

  expect(screen.queryByText('Radix Popover Content')).toBeNull();
});

it('renders into the resolved overlay host', async () => {
  const hostElement = document.createElement('div');
  document.body.appendChild(hostElement);
  mockUseOverlayContainer.mockReturnValue({
    type: 'ready',
    shouldRenderPortal: true,
    container: hostElement,
  } satisfies OverlayContainerState);

  await renderPopoverPortal();

  expect(hostElement.textContent).toContain('Radix Popover Content');
});
