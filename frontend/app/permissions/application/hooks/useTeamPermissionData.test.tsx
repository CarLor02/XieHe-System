import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import {
  type TeamJoinRequestListResponse,
  type TeamListResponse,
  type TeamMember,
  type TeamMembersResponse,
  type TeamSummary,
} from '@/services/teamService';

const getMyTeamsMock = jest.fn<() => Promise<TeamListResponse>>();
const getTeamMembersMock =
  jest.fn<(teamId: number) => Promise<TeamMembersResponse>>();
const getTeamJoinRequestsMock =
  jest.fn<(teamId: number) => Promise<TeamJoinRequestListResponse>>();
let useTeamPermissionData: typeof import('./useTeamPermissionData').useTeamPermissionData;

jest.mock('@/services/teamService', () => ({
  __esModule: true,
  getMyTeams: () => getMyTeamsMock(),
  getTeamMembers: (teamId: number) => getTeamMembersMock(teamId),
  getTeamJoinRequests: (teamId: number) =>
    getTeamJoinRequestsMock(teamId),
}));

beforeAll(async () => {
  ({ useTeamPermissionData } = await import('./useTeamPermissionData'));
});

function makeTeam(id: number): TeamSummary {
  return {
    id,
    name: `团队${id}`,
    member_count: 1,
    max_members: 10,
    is_member: true,
  };
}

function makeMember(
  userId: number,
  role: TeamMember['role']
): TeamMember {
  return {
    user_id: userId,
    username: `user-${userId}`,
    role,
    status: 'ACTIVE',
    is_creator: role === 'ADMIN',
    is_system_admin: false,
    system_admin_level: 0,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(promiseResolve => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('useTeamPermissionData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTeamJoinRequestsMock.mockResolvedValue({
      items: [],
      total: 0,
      pending_count: 0,
    });
  });

  it('selects the first team and loads admin-only join requests', async () => {
    const team = makeTeam(11);
    getMyTeamsMock.mockResolvedValue({ items: [team], total: 1 });
    getTeamMembersMock.mockResolvedValue({
      team,
      members: [makeMember(7, 'ADMIN')],
    });

    const { result } = renderHook(() =>
      useTeamPermissionData({
        isAuthenticated: true,
        currentUserId: 7,
        initialSelection: 'first',
      })
    );

    await waitFor(() => {
      expect(result.current.selectedTeamId).toBe(11);
      expect(result.current.isCurrentUserAdmin).toBe(true);
      expect(result.current.loadingJoinRequests).toBe(false);
    });
    expect(getTeamMembersMock).toHaveBeenCalledWith(11);
    expect(getTeamJoinRequestsMock).toHaveBeenCalledWith(11);
  });

  it('keeps TeamManagement unselected until the user chooses a team', async () => {
    getMyTeamsMock.mockResolvedValue({
      items: [makeTeam(11)],
      total: 1,
    });

    const { result } = renderHook(() =>
      useTeamPermissionData({
        isAuthenticated: true,
        currentUserId: 7,
        initialSelection: 'none',
      })
    );

    await waitFor(() => {
      expect(result.current.loadingTeams).toBe(false);
    });
    expect(result.current.selectedTeamId).toBeNull();
    expect(getTeamMembersMock).not.toHaveBeenCalled();
  });

  it('does not let an older member response overwrite the selected team', async () => {
    const firstTeam = makeTeam(11);
    const secondTeam = makeTeam(12);
    const firstResponse = deferred<TeamMembersResponse>();
    const secondResponse = deferred<TeamMembersResponse>();
    getMyTeamsMock.mockResolvedValue({
      items: [firstTeam, secondTeam],
      total: 2,
    });
    getTeamMembersMock.mockImplementation(teamId =>
      teamId === 11 ? firstResponse.promise : secondResponse.promise
    );

    const { result } = renderHook(() =>
      useTeamPermissionData({
        isAuthenticated: true,
        currentUserId: 7,
        initialSelection: 'none',
      })
    );
    await waitFor(() => expect(result.current.loadingTeams).toBe(false));

    act(() => result.current.setSelectedTeamId(11));
    await waitFor(() => expect(getTeamMembersMock).toHaveBeenCalledWith(11));
    act(() => result.current.setSelectedTeamId(12));
    await waitFor(() => expect(getTeamMembersMock).toHaveBeenCalledWith(12));

    await act(async () => {
      secondResponse.resolve({
        team: secondTeam,
        members: [makeMember(7, 'MEMBER')],
      });
      await secondResponse.promise;
    });
    expect(result.current.currentTeam?.id).toBe(12);

    await act(async () => {
      firstResponse.resolve({
        team: firstTeam,
        members: [makeMember(7, 'ADMIN')],
      });
      await firstResponse.promise;
    });
    expect(result.current.currentTeam?.id).toBe(12);
    expect(result.current.isCurrentUserAdmin).toBe(false);
  });

  it('hides protected data after logout and skips requests for ordinary members', async () => {
    const team = makeTeam(11);
    getMyTeamsMock.mockResolvedValue({ items: [team], total: 1 });
    getTeamMembersMock.mockResolvedValue({
      team,
      members: [makeMember(7, 'MEMBER')],
    });

    const { result, rerender } = renderHook(
      ({ isAuthenticated }) =>
        useTeamPermissionData({
          isAuthenticated,
          currentUserId: 7,
          initialSelection: 'first',
        }),
      { initialProps: { isAuthenticated: true } }
    );

    await waitFor(() => {
      expect(result.current.members).toHaveLength(1);
    });
    expect(getTeamJoinRequestsMock).not.toHaveBeenCalled();

    rerender({ isAuthenticated: false });
    expect(result.current.myTeams).toEqual([]);
    expect(result.current.members).toEqual([]);
    expect(result.current.joinRequests).toEqual([]);
    expect(result.current.selectedTeamId).toBeNull();
  });
});
