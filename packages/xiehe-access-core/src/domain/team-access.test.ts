import { describe, expect, it } from 'vitest';

import { canManageTeam, canUseUploaderView } from './team-access';

describe('team access', () => {
  const member = { is_member: true, my_status: 'ACTIVE' };

  it('allows system and active team administrators', () => {
    expect(canManageTeam({ is_system_admin: true }, member)).toBe(true);
    expect(canManageTeam({}, { ...member, my_role: 'ADMIN' })).toBe(true);
    expect(canUseUploaderView({}, [{ ...member, my_role: 'ADMIN' }])).toBe(
      true
    );
  });

  it('rejects ordinary members', () => {
    expect(canManageTeam({}, { ...member, my_role: 'MEMBER' })).toBe(false);
    expect(canUseUploaderView({}, [{ ...member, my_role: 'MEMBER' }])).toBe(
      false
    );
  });

  it('does not grant team settings to a creator without the admin role', () => {
    expect(
      canManageTeam({}, { ...member, is_creator: true, my_role: 'MEMBER' })
    ).toBe(false);
  });

  it('preserves uploader access when either API membership field is active', () => {
    expect(
      canUseUploaderView({}, [
        { is_member: false, my_status: 'ACTIVE', my_role: 'ADMIN' },
      ])
    ).toBe(true);
  });

  it('does not let a global team_admin role manage unrelated teams', () => {
    const unrelatedTeam = { is_member: false, my_role: 'MEMBER' };
    expect(canManageTeam({ role: 'team_admin' }, unrelatedTeam)).toBe(false);
    expect(canUseUploaderView({ role: 'team_admin' })).toBe(true);
  });
});
