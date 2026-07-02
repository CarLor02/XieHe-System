import { describe, expect, it } from '@jest/globals';

import { canManageTeam } from './team-management-permissions';
import type { SessionUser } from '@/lib/api/session/userSession';
import type { TeamSummary } from '@/services/teamService';

function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 1,
    username: 'doctor',
    email: 'doctor@example.com',
    full_name: 'Doctor',
    role: 'doctor',
    permissions: [],
    is_active: true,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeTeam(overrides: Partial<TeamSummary> = {}): TeamSummary {
  return {
    id: 1,
    name: '骨科团队',
    member_count: 3,
    max_members: 20,
    is_member: true,
    my_status: 'ACTIVE',
    ...overrides,
  };
}

describe('canManageTeam', () => {
  it('allows system administrators to manage any team', () => {
    expect(
      canManageTeam(makeUser({ is_system_admin: true }), makeTeam({ my_role: 'MEMBER' }))
    ).toBe(true);
  });

  it('allows active team administrators to manage their team', () => {
    expect(canManageTeam(makeUser(), makeTeam({ my_role: 'ADMIN' }))).toBe(true);
  });

  it('does not allow ordinary active members to manage their team', () => {
    expect(canManageTeam(makeUser(), makeTeam({ my_role: 'MEMBER' }))).toBe(false);
  });
});
