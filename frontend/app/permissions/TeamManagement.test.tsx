import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { TeamListResponse, TeamMembersResponse, TeamSummary } from '@/services/teamService';

const getMyTeamsMock = jest.fn<() => Promise<TeamListResponse>>();
const getTeamMembersMock = jest.fn<(teamId: number) => Promise<TeamMembersResponse>>();
const updateTeamMock = jest.fn<
  (teamId: number, payload: Record<string, unknown>) => Promise<TeamSummary>
>();
const createTeamMock = jest.fn<
  (payload: Record<string, unknown>) => Promise<TeamSummary>
>();
const mockUseUser = jest.fn();
let mockCurrentUser: Record<string, unknown> = {
  id: 1,
  username: 'doctor',
  is_system_admin: false,
};

jest.mock('@/lib/api', () => ({
  __esModule: true,
  useUser: () => mockUseUser(),
}));

jest.mock('./TeamInvitations', () => ({
  __esModule: true,
  default: () => <div>我的邀请列表</div>,
}));

jest.mock('@/services/teamService', () => ({
  __esModule: true,
  applyToJoinTeam: jest.fn(),
  cancelTeamJoinRequest: jest.fn(),
  createTeam: (payload: Record<string, unknown>) => createTeamMock(payload),
  getMyTeams: () => getMyTeamsMock(),
  getTeamJoinRequests: jest.fn(async () => ({
    items: [],
    total: 0,
    pending_count: 0,
  })),
  getTeamMembers: (teamId: number) => getTeamMembersMock(teamId),
  inviteTeamMember: jest.fn(),
  removeMember: jest.fn(),
  reviewTeamJoinRequest: jest.fn(),
  searchTeams: jest.fn(),
  updateMemberRole: jest.fn(),
  updateTeam: (teamId: number, payload: Record<string, unknown>) =>
    updateTeamMock(teamId, payload),
}));

function makeTeam(overrides: Partial<TeamSummary> = {}): TeamSummary {
  return {
    id: 11,
    name: 'hanjialuo课题标注团队',
    description: null,
    hospital: '协和医院',
    department: '骨科',
    creator_name: '系统管理员',
    member_count: 3,
    max_members: 20,
    is_member: true,
    my_role: 'MEMBER',
    my_status: 'ACTIVE',
    is_creator: false,
    created_at: '2026-06-01T00:00:00',
    ...overrides,
  };
}

describe('TeamManagement team settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: 1,
      username: 'doctor',
      is_system_admin: false,
    };
    mockUseUser.mockReturnValue({
      isAuthenticated: true,
      user: mockCurrentUser,
    });
    getTeamMembersMock.mockResolvedValue({
      team: makeTeam(),
      members: [],
    });
    createTeamMock.mockResolvedValue(makeTeam({ id: 99, name: '新团队' }));
    updateTeamMock.mockResolvedValue(
      makeTeam({
        name: '更新后的团队',
        description: '更新后的描述',
        max_members: 30,
      })
    );
  });

  it('hides the settings action from ordinary team members', async () => {
    getMyTeamsMock.mockResolvedValue({
      items: [makeTeam({ my_role: 'MEMBER' })],
      total: 1,
    });

    const { default: TeamManagement } = await import('./TeamManagement');

    render(<TeamManagement />);

    expect(await screen.findByText('hanjialuo课题标注团队')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /设置/ })).not.toBeTruthy();
  });

  it('opens an edit form from the team settings action and submits updates', async () => {
    const editableTeam = makeTeam({
      my_role: 'ADMIN',
      description: '暂无描述',
    });
    getMyTeamsMock.mockResolvedValue({
      items: [editableTeam],
      total: 1,
    });
    const user = userEvent.setup();

    const { default: TeamManagement } = await import('./TeamManagement');

    render(<TeamManagement />);

    await user.click(await screen.findByRole('button', { name: /设置/ }));

    expect(screen.getByRole('heading', { name: /编辑团队/ })).toBeTruthy();
    expect(screen.getByDisplayValue('hanjialuo课题标注团队')).toBeTruthy();
    expect(screen.getByDisplayValue('协和医院')).toBeTruthy();
    expect(screen.getByDisplayValue('骨科')).toBeTruthy();
    expect(screen.getByDisplayValue('20')).toBeTruthy();

    await user.clear(screen.getByLabelText('团队名称'));
    await user.type(screen.getByLabelText('团队名称'), '更新后的团队');
    await user.clear(screen.getByLabelText('最大成员数'));
    await user.type(screen.getByLabelText('最大成员数'), '30');
    await user.click(screen.getByRole('button', { name: /保存修改/ }));

    await waitFor(() => {
      expect(updateTeamMock).toHaveBeenCalledWith(11, {
        name: '更新后的团队',
        description: '暂无描述',
        hospital: '协和医院',
        department: '骨科',
        max_members: 30,
      });
    });
  });
});
