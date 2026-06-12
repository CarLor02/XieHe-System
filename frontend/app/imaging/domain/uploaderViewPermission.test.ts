import { describe, expect, it } from '@jest/globals';

import { canUseUploaderView } from './uploaderViewPermission';
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
    member_count: 1,
    is_member: true,
    ...overrides,
  };
}

describe('canUseUploaderView', () => {
  it('allows system administrators from the session user fields', () => {
    expect(canUseUploaderView(makeUser({ is_system_admin: true }), [])).toBe(true);
  });

  it('allows team administrators from team memberships', () => {
    expect(
      canUseUploaderView(makeUser(), [
        makeTeam({
          my_role: 'ADMIN',
          my_status: 'ACTIVE',
        }),
      ])
    ).toBe(true);
  });

  it('does not allow ordinary team members', () => {
    expect(
      canUseUploaderView(makeUser(), [
        makeTeam({
          my_role: 'MEMBER',
          my_status: 'ACTIVE',
        }),
      ])
    ).toBe(false);
  });
});
