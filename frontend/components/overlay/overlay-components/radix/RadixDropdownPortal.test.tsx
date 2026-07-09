import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, jest } from '@jest/globals';

import type { OverlayContainerState } from '../../OverlayProvider';

const mockUseOverlayContainer = jest.fn<() => OverlayContainerState>();

jest.mock('../../OverlayProvider', () => ({
  __esModule: true,
  useOverlayContainer: () => mockUseOverlayContainer(),
}));

async function renderDropdownPortal() {
  const { default: RadixDropdownPortal } = await import('./RadixDropdownPortal');

  render(
    <DropdownMenu.Root open>
      <RadixDropdownPortal>
        <div>Radix Portal Content</div>
      </RadixDropdownPortal>
    </DropdownMenu.Root>
  );
}

beforeEach(() => {
  mockUseOverlayContainer.mockReset();
});

it('does not render while the overlay provider is waiting for its host element', async () => {
  mockUseOverlayContainer.mockReturnValue({
    type: 'waiting-host',
    shouldRenderPortal: false,
    container: undefined,
  } satisfies OverlayContainerState);

  await renderDropdownPortal();

  expect(screen.queryByText('Radix Portal Content')).toBeNull();
});

it('renders into the overlay host when the host element is ready', async () => {
  const hostElement = document.createElement('div');
  document.body.appendChild(hostElement);
  mockUseOverlayContainer.mockReturnValue({
    type: 'ready',
    shouldRenderPortal: true,
    container: hostElement,
  } satisfies OverlayContainerState);

  await renderDropdownPortal();

  expect(hostElement.textContent).toContain('Radix Portal Content');
});
