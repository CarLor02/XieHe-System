import { expect, it, jest } from '@jest/globals';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: ({
    onOpenSidebar,
    showMenuButton,
  }: {
    onOpenSidebar?: () => void;
    showMenuButton?: boolean;
  }) => (
    <header>
      {showMenuButton && (
        <button type="button" onClick={onOpenSidebar}>
          打开菜单
        </button>
      )}
      Header
    </header>
  ),
}));

jest.mock('@/components/Sidebar', () => ({
  __esModule: true,
  default: ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav>
      <button type="button" onClick={onNavigate}>
        影像中心
      </button>
    </nav>
  ),
}));

const { default: AppShell } = jest.requireActual<typeof import('./AppShell')>(
  './AppShell'
);

it('renders application content with desktop sidebar spacing', () => {
  render(<AppShell>页面内容</AppShell>);

  expect(screen.getByTestId('app-shell-content').className).toContain(
    'lg:pl-64'
  );
  expect(screen.getByText('页面内容')).not.toBeNull();
});

it('opens and closes the mobile sidebar drawer', async () => {
  const user = userEvent.setup();

  render(<AppShell>页面内容</AppShell>);

  expect(screen.queryByLabelText('移动端导航菜单')).toBeNull();

  await act(async () => {
    await user.click(screen.getByRole('button', { name: '打开菜单' }));
  });

  expect(screen.getByLabelText('移动端导航菜单')).not.toBeNull();

  await act(async () => {
    await user.click(
      within(screen.getByLabelText('移动端导航菜单')).getByRole('button', {
        name: '影像中心',
      })
    );
  });

  expect(screen.queryByLabelText('移动端导航菜单')).toBeNull();
});
