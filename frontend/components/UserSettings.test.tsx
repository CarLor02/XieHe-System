import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PasswordChangeData, UserInfo } from '@/services/userService';
import type { TeamSummary } from '@/services/teamService';

const changeCurrentUserPasswordMock = jest.fn<
  (data: PasswordChangeData) => Promise<void>
>();
const getCurrentUserMock = jest.fn<() => Promise<UserInfo>>();
const getMyTeamsMock = jest.fn<() => Promise<{ items: TeamSummary[] }>>();
const fetchUserInfoMock = jest.fn<() => Promise<void>>();

jest.mock('@/services/userService', () => ({
  changeCurrentUserPassword: changeCurrentUserPasswordMock,
  deleteCurrentUserAvatar: jest.fn(),
  getCurrentUser: getCurrentUserMock,
  updateCurrentUser: jest.fn(),
  uploadCurrentUserAvatar: jest.fn(),
}));

jest.mock('@/services/teamService', () => ({
  getMyTeams: getMyTeamsMock,
}));

jest.mock('@/lib/api', () => ({
  useSessionStore: () => ({
    fetchUserInfo: fetchUserInfoMock,
  }),
}));

const UserSettings = jest.requireActual<typeof import('./UserSettings')>(
  './UserSettings'
).default;

describe('UserSettings password tab', () => {
  beforeEach(() => {
    changeCurrentUserPasswordMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: 7,
      username: 'doctor',
      email: 'doctor@example.com',
      full_name: 'Doctor',
      is_active: true,
      roles: ['doctor'],
      is_system_admin: false,
      system_admin_level: 0,
    });
    getMyTeamsMock.mockResolvedValue({ items: [] });
    fetchUserInfoMock.mockReset();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('submits the password change request from the password tab', async () => {
    changeCurrentUserPasswordMock.mockResolvedValue(undefined);

    await act(async () => {
      render(<UserSettings isOpen onClose={jest.fn()} type="password" />);
    });

    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: '修改密码' }) as HTMLButtonElement)
          .disabled
      ).toBe(false);
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('请输入当前密码'), {
        target: { value: 'old-password' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入新密码'), {
        target: { value: 'new-password' },
      });
      fireEvent.change(screen.getByPlaceholderText('请再次输入新密码'), {
        target: { value: 'new-password' },
      });
      fireEvent.click(screen.getByRole('button', { name: '修改密码' }));
    });

    await waitFor(() => {
      expect(changeCurrentUserPasswordMock).toHaveBeenCalledWith({
        current_password: 'old-password',
        new_password: 'new-password',
        confirm_password: 'new-password',
      });
    });
  });
});
