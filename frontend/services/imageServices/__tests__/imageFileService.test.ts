import { afterEach, expect, it } from '@jest/globals';

import { formatDate } from '../imageFileService';

const originalDisplayTimeZone = process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE;

afterEach(() => {
  if (originalDisplayTimeZone === undefined) {
    delete process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE;
  } else {
    process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE = originalDisplayTimeZone;
  }
});

it('formats timezone-less API timestamps as UTC in the configured display timezone', () => {
  process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE = 'Asia/Shanghai';

  expect(formatDate('2026-06-01T05:25:00')).toMatch(
    /2026.*06.*01.*13.*25/
  );
});

it('does not apply an extra offset to timestamps that already include a timezone', () => {
  process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE = 'Asia/Shanghai';

  expect(formatDate('2026-06-01T13:25:00+08:00')).toMatch(
    /2026.*06.*01.*13.*25/
  );
});
