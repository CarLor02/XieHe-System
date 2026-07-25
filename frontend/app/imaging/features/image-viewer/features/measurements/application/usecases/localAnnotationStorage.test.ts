import { afterEach, expect, it, jest } from '@jest/globals';

import {
  LOCAL_ANNOTATION_CACHE_INDEX_KEY,
  saveLocalAnnotationBackup,
} from './localAnnotationStorage';

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

function makeBackupPayload(imageId: string, text = imageId) {
  return {
    imageId,
    imageWidth: 100,
    imageHeight: 100,
    measurements: [{ id: `measurement-${imageId}`, type: 'cobb1', text }],
    standardDistance: null,
    standardDistancePoints: null,
    pointBindings: { syncGroups: [] },
  };
}

it('writes annotation backup and records it in the LRU index', () => {
  const result = saveLocalAnnotationBackup('898', makeBackupPayload('898'), {
    now: () => 1000,
  });

  expect(result).toEqual({ saved: true });
  expect(JSON.parse(localStorage.getItem('annotations_898') || '{}')).toEqual(
    makeBackupPayload('898')
  );
  expect(
    JSON.parse(localStorage.getItem(LOCAL_ANNOTATION_CACHE_INDEX_KEY) || '[]')
  ).toEqual([
    {
      key: 'annotations_898',
      imageId: '898',
      size: expect.any(Number),
      updatedAt: 1000,
    },
  ]);
});

it('removes oldest annotation backups when the cache exceeds the entry limit', () => {
  saveLocalAnnotationBackup('oldest', makeBackupPayload('oldest'), {
    maxEntries: 2,
    now: () => 1,
  });
  saveLocalAnnotationBackup('newer', makeBackupPayload('newer'), {
    maxEntries: 2,
    now: () => 2,
  });
  localStorage.setItem('auth-store', 'keep-me');

  saveLocalAnnotationBackup('current', makeBackupPayload('current'), {
    maxEntries: 2,
    now: () => 3,
  });

  expect(localStorage.getItem('annotations_oldest')).toBeNull();
  expect(localStorage.getItem('annotations_newer')).not.toBeNull();
  expect(localStorage.getItem('annotations_current')).not.toBeNull();
  expect(localStorage.getItem('auth-store')).toBe('keep-me');
});

it('uses legacy annotation keys without an index as cleanup candidates', () => {
  localStorage.setItem('annotations_legacy', JSON.stringify({ imageId: 'legacy' }));
  localStorage.setItem('auth-store', 'keep-me');

  saveLocalAnnotationBackup('current', makeBackupPayload('current'), {
    maxEntries: 1,
    now: () => 3,
  });

  expect(localStorage.getItem('annotations_legacy')).toBeNull();
  expect(localStorage.getItem('annotations_current')).not.toBeNull();
  expect(localStorage.getItem('auth-store')).toBe('keep-me');
});

it('cleans old annotation backups and retries once after a quota failure', () => {
  localStorage.setItem('annotations_old', JSON.stringify({ imageId: 'old' }));
  const originalSetItem = Storage.prototype.setItem;
  let failed = false;
  jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function setItemWithOneQuotaFailure(
      this: Storage,
      key,
      value
    ) {
      if (key === 'annotations_current' && !failed) {
        failed = true;
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    });

  const result = saveLocalAnnotationBackup(
    'current',
    makeBackupPayload('current'),
    { maxEntries: 5, now: () => 10 }
  );

  expect(result).toEqual({ saved: true });
  expect(localStorage.getItem('annotations_old')).toBeNull();
  expect(localStorage.getItem('annotations_current')).not.toBeNull();
});

it('returns a quota result without throwing when retry still cannot write', () => {
  localStorage.setItem('annotations_old', JSON.stringify({ imageId: 'old' }));
  const originalSetItem = Storage.prototype.setItem;
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
    if (key === 'annotations_current') {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    }
    return originalSetItem.call(localStorage, key, value);
  });

  const result = saveLocalAnnotationBackup(
    'current',
    makeBackupPayload('current'),
    { maxEntries: 5, now: () => 10 }
  );

  expect(result).toEqual({ saved: false, reason: 'quota' });
  expect(localStorage.getItem('annotations_old')).toBeNull();
  expect(localStorage.getItem('annotations_current')).toBeNull();
});
