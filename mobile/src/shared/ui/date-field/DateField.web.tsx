import type { CSSProperties } from 'react';
import { colors, fieldStyles } from '@/shared/theme';
import { DateFieldFrame } from './DateFieldFrame';
import { formatCalendarDate } from './calendarDate';
import type { DateFieldProps } from './types';

export function DateField(props: DateFieldProps) {
  const { label, value, onChange, disabled, minimumDate, maximumDate, error } =
    props;
  return (
    <DateFieldFrame {...props}>
      {/* Expo 日期控件在 Web 不渲染，使用浏览器原生日期输入保留选择和键盘操作。 */}
      <input
        type="date"
        aria-label={label}
        aria-invalid={!!error}
        value={value}
        disabled={disabled}
        min={minimumDate && formatCalendarDate(minimumDate)}
        max={maximumDate && formatCalendarDate(maximumDate)}
        onChange={event => onChange(event.currentTarget.value)}
        style={{
          ...styles.input,
          ...(disabled ? fieldStyles.disabled : {}),
          ...(error ? fieldStyles.invalid : {}),
        }}
      />
    </DateFieldFrame>
  );
}

const styles = {
  input: {
    ...fieldStyles.control,
    borderStyle: 'solid',
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
    fontFamily: 'inherit',
    colorScheme: 'light',
    accentColor: colors.primary,
  } satisfies CSSProperties,
};
