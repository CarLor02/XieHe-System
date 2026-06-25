import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, jest } from '@jest/globals';
import type { ReactNode } from 'react';

const mockLogout = jest.fn();
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/api', () => ({
  useUser: () => ({
    user: {
      id: 7,
      username: 'doctor',
      full_name: '王医生',
      email: 'doctor@example.com',
      role: 'doctor',
    },
  }),
  useAuth: () => ({ logout: mockLogout }),
}));

jest.mock('@/services/notificationServices', () => ({
  getNotificationMessages: jest.fn(async () => []),
}));

jest.mock('@/services/teamService', () => ({
  getMyInvitations: jest.fn(async () => ({ items: [] })),
}));

jest.mock('@/components/UserSettings', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./ui/Tooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

beforeEach(() => {
  mockLogout.mockReset();
  mockPush.mockReset();
});

it('closes header dropdowns when escape is pressed', async () => {
  const user = userEvent.setup();
  const { default: Header } = await import('./Header');

  render(<Header />);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /王医生/ })).toBeTruthy();
  });

  await user.click(screen.getByRole('button', { name: /王医生/ }));
  expect(screen.getByRole('button', { name: '个人设置' })).toBeTruthy();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('button', { name: '个人设置' })).toBeNull();

  await user.click(screen.getByRole('button', { name: /消息通知/ }));
  expect(screen.getByText('系统消息')).toBeTruthy();

  await user.keyboard('{Escape}');
  expect(screen.queryByText('系统消息')).toBeNull();
});
