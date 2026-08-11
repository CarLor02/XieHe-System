import { beforeEach, expect, it } from '@jest/globals';

import {
  cleanupLegacyAnnotationBackups,
  LEGACY_ANNOTATION_BACKUP_CLEANUP_MARKER,
} from './legacyAnnotationBackupCleanup';

beforeEach(() => localStorage.clear());

it('removes only legacy annotation backups and records completion', () => {
  localStorage.setItem('annotations_1', '{}');
  localStorage.setItem('annotation_cache_index', '[]');
  localStorage.setItem('session', 'keep');

  cleanupLegacyAnnotationBackups(localStorage);

  expect(localStorage.getItem('annotations_1')).toBeNull();
  expect(localStorage.getItem('annotation_cache_index')).toBeNull();
  expect(localStorage.getItem('session')).toBe('keep');
  expect(localStorage.getItem(LEGACY_ANNOTATION_BACKUP_CLEANUP_MARKER)).toBe(
    'done'
  );
});

it('does not scan again after the completion marker exists', () => {
  localStorage.setItem(LEGACY_ANNOTATION_BACKUP_CLEANUP_MARKER, 'done');
  localStorage.setItem('annotations_late', '{}');

  cleanupLegacyAnnotationBackups(localStorage);

  expect(localStorage.getItem('annotations_late')).toBe('{}');
});
