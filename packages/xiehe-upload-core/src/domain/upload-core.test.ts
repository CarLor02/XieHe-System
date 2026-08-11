import { describe, expect, it } from 'vitest';

import {
  createImageOwnershipPreference,
  decodeImageOwnershipPreference,
  getImageOwnershipPreferenceKey,
  summarizeUploadQueue,
} from '../index';

describe('image ownership preference', () => {
  it('normalizes duplicate team ids and falls back to personal ownership', () => {
    expect(
      createImageOwnershipPreference({
        scope: 'team',
        teamIds: [3, 1, 3, -1],
        updatedAt: '2026-08-11T00:00:00.000Z',
      })
    ).toEqual({
      version: 1,
      scope: 'team',
      teamIds: [1, 3],
      updatedAt: '2026-08-11T00:00:00.000Z',
    });
    expect(
      createImageOwnershipPreference({
        scope: 'team',
        teamIds: [],
        updatedAt: '2026-08-11T00:00:00.000Z',
      }).scope
    ).toBe('personal');
  });

  it('decodes persisted data without browser storage', () => {
    expect(
      decodeImageOwnershipPreference(
        JSON.stringify({
          version: 1,
          scope: 'team',
          teamIds: [2],
          updatedAt: 'now',
        })
      )?.teamIds
    ).toEqual([2]);
    expect(decodeImageOwnershipPreference('{bad json')).toBeNull();
    expect(getImageOwnershipPreferenceKey(8, 'upload')).toContain(':8:upload');
  });
});

describe('upload queue summary', () => {
  it('requires a non-empty fully completed queue', () => {
    expect(summarizeUploadQueue([]).allCompleted).toBe(false);
    expect(
      summarizeUploadQueue([{ status: 'completed' }, { status: 'completed' }])
        .allCompleted
    ).toBe(true);
    expect(
      summarizeUploadQueue([{ status: 'pending' }, { status: 'error' }])
    ).toMatchObject({ pendingCount: 1, failedCount: 1, allCompleted: false });
  });
});
