import { describe, expect, it } from 'vitest';

import {
  canEditTeamMember,
  canRemoveTeamMember,
  normalizeTeamForm,
} from '../index';

describe('team member access', () => {
  const rootAdmin = {
    isSystemAdmin: true,
    systemAdminLevel: 1,
  };

  it('protects the root administrator and team creator', () => {
    expect(
      canEditTeamMember({ actorIsTeamAdmin: true, member: rootAdmin })
    ).toBe(false);
    expect(
      canRemoveTeamMember({
        actorIsTeamAdmin: true,
        member: { isCreator: true },
      })
    ).toBe(false);
  });

  it('allows team administrators to manage ordinary members', () => {
    expect(
      canEditTeamMember({ actorIsTeamAdmin: true, member: { role: 'MEMBER' } })
    ).toBe(true);
    expect(
      canRemoveTeamMember({
        actorIsTeamAdmin: true,
        member: { role: 'MEMBER' },
      })
    ).toBe(true);
  });
});

describe('team form normalization', () => {
  it('trims values and preserves edit-time field clearing', () => {
    expect(
      normalizeTeamForm(
        {
          name: '  Team A ',
          description: ' ',
          hospital: '',
          department: ' Spine ',
          maxMembers: '20',
        },
        'edit'
      )
    ).toEqual({
      valid: true,
      value: {
        name: 'Team A',
        description: '',
        hospital: '',
        department: 'Spine',
        max_members: 20,
      },
    });
  });
});
