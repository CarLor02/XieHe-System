export function formatCalendarDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseCalendarDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return undefined;
  // 日历日期不能按 UTC 字符串解析；本地正午也避开常见夏令时午夜切换。
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return formatCalendarDate(date) === value ? date : undefined;
}

export function initialPickerDate(
  value: string,
  minimumDate?: Date,
  maximumDate?: Date,
  now = new Date()
): Date {
  let selected = parseCalendarDate(value) ?? now;
  if (
    minimumDate &&
    formatCalendarDate(selected) < formatCalendarDate(minimumDate)
  ) {
    selected = minimumDate;
  }
  if (
    maximumDate &&
    formatCalendarDate(selected) > formatCalendarDate(maximumDate)
  ) {
    selected = maximumDate;
  }
  return parseCalendarDate(formatCalendarDate(selected)) ?? selected;
}
