import { describe, expect, it } from 'vitest';
import {
  formatCalendarDate,
  initialPickerDate,
  parseCalendarDate,
} from './calendarDate';

describe('date field calendar values', () => {
  it.each([
    '2000-02-29',
    '2026-01-01',
    '2026-03-08',
    '2026-11-01',
    '0099-12-31',
  ])(
    'round-trips a local calendar date without shifting the day: %s',
    value => {
      const date = parseCalendarDate(value)!;
      expect(formatCalendarDate(date)).toBe(value);
      expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual(
        value.split('-').map(Number)
      );
    }
  );

  it.each([
    '',
    '2001-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-00-01',
    '0000-01-01',
    '2000-2-1',
    '2000-01-01T00:00:00Z',
  ])('does not silently normalize invalid or non-calendar input: %s', value =>
    expect(parseCalendarDate(value)).toBeUndefined()
  );

  it('formats the selected local date rather than its UTC day', () => {
    expect(formatCalendarDate(new Date(2000, 1, 29, 0, 30))).toBe('2000-02-29');
    expect(formatCalendarDate(new Date(2000, 1, 29, 23, 30))).toBe(
      '2000-02-29'
    );
  });

  it('opens an empty field at today without changing its controlled value', () => {
    expect(
      formatCalendarDate(
        initialPickerDate('', undefined, undefined, new Date(2026, 9, 25))
      )
    ).toBe('2026-10-25');
  });

  it('clamps the picker start to the supplied calendar boundaries', () => {
    const min = new Date(2000, 0, 1);
    const max = new Date(2026, 9, 25);
    expect(formatCalendarDate(initialPickerDate('1990-01-01', min, max))).toBe(
      '2000-01-01'
    );
    expect(formatCalendarDate(initialPickerDate('2027-01-01', min, max))).toBe(
      '2026-10-25'
    );
    expect(formatCalendarDate(initialPickerDate('2026-10-25', min, max))).toBe(
      '2026-10-25'
    );
  });
});
