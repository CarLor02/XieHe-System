import { describe, expect, it } from 'vitest';

import {
  advanceUploadOptions,
  enqueueUploadOptions,
  markPendingUploadsStarted,
  removeFromUploadOptions,
  validateUploadStart,
} from './upload-workflow';

describe('upload options queue', () => {
  it('keeps one active item and advances deterministically', () => {
    const queued = enqueueUploadOptions(
      { activeFileId: null, queuedFileIds: [] },
      ['a', 'b', 'c']
    );
    expect(queued).toEqual({ activeFileId: 'a', queuedFileIds: ['b', 'c'] });
    expect(advanceUploadOptions(queued)).toEqual({
      activeFileId: 'b',
      queuedFileIds: ['c'],
    });
    expect(removeFromUploadOptions(queued, 'a')).toEqual({
      activeFileId: 'b',
      queuedFileIds: ['c'],
    });
  });
});

describe('upload start policy', () => {
  const pending = [
    { id: 'a', status: 'pending' as const, examType: '正位X光片' },
  ];

  it('validates required context and marks pending files as uploading', () => {
    expect(validateUploadStart('', pending)).toBe('missing-patient');
    expect(validateUploadStart('1', [])).toBe('no-pending-files');
    expect(validateUploadStart('1', [{ ...pending[0], examType: '' }])).toBe(
      'missing-exam-type'
    );
    expect(validateUploadStart('1', pending)).toBeNull();
    expect(markPendingUploadsStarted(pending)[0].status).toBe('uploading');
  });
});
