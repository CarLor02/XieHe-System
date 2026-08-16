import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_IMAGE_UPLOAD_FILE_CONCURRENCY,
  DEFAULT_IMAGE_UPLOAD_PART_CONCURRENCY,
  parseImageUploadConcurrency,
} from './config';

describe('parseImageUploadConcurrency', () => {
  it('accepts positive integers', () => {
    expect(parseImageUploadConcurrency('6', 2)).toBe(6);
  });

  it.each([undefined, '', '0', '-1', '2.5', 'invalid'])(
    'uses the configured fallback for %s',
    value => {
      expect(
        parseImageUploadConcurrency(
          value,
          DEFAULT_IMAGE_UPLOAD_FILE_CONCURRENCY
        )
      ).toBe(2);
      expect(
        parseImageUploadConcurrency(
          value,
          DEFAULT_IMAGE_UPLOAD_PART_CONCURRENCY
        )
      ).toBe(3);
    }
  );
});
