import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text } from 'react-native';
import {
  colors,
  fieldStyles,
  fontSizes,
  interactionOpacity,
  spacing,
} from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { ChoiceSheet } from '@/shared/ui/choice-sheet';
import { Icon } from '@/shared/ui/icon';
import { DateFieldFrame } from './DateFieldFrame';
import {
  formatCalendarDate,
  initialPickerDate,
  parseCalendarDate,
} from './calendarDate';
import type { DateFieldProps } from './types';

export function DateField(props: DateFieldProps) {
  const {
    label,
    value,
    onChange,
    disabled,
    minimumDate,
    maximumDate,
    error,
    placeholder = '请选择日期',
  } = props;
  const [draft, setDraft] = useState<Date | null>(null);
  const close = () => setDraft(null);
  const commit = (date: Date) => {
    if (!disabled) onChange(formatCalendarDate(date));
    close();
  };
  const picker =
    draft && !disabled ? (
      <DateTimePicker
        mode="date"
        value={draft}
        minimumDate={
          minimumDate && parseCalendarDate(formatCalendarDate(minimumDate))
        }
        maximumDate={
          maximumDate && parseCalendarDate(formatCalendarDate(maximumDate))
        }
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        accentColor={colors.primary}
        themeVariant="light"
        positiveButton={{ label: '确定' }}
        negativeButton={{ label: '取消' }}
        onDismiss={close}
        onValueChange={(_, date) =>
          Platform.OS === 'android' ? commit(date) : setDraft(date)
        }
      />
    ) : null;

  return (
    <>
      <DateFieldFrame {...props}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: value || placeholder }}
          accessibilityState={{
            disabled: !!disabled,
            expanded: !!draft && !disabled,
          }}
          disabled={disabled}
          onPress={() => {
            Keyboard.dismiss();
            setDraft(initialPickerDate(value, minimumDate, maximumDate));
          }}
          style={({ pressed }) => [
            fieldStyles.control,
            styles.control,
            !!error && fieldStyles.invalid,
            disabled && fieldStyles.disabled,
            pressed && { opacity: interactionOpacity.pressed },
          ]}
        >
          <Text style={[styles.value, !value && { color: colors.faint }]}>
            {value || placeholder}
          </Text>
          <Icon name="calendar-outline" size={20} />
        </Pressable>
      </DateFieldFrame>
      {Platform.OS === 'android' ? (
        picker
      ) : (
        <ChoiceSheet title={label} open={!!draft && !disabled} onClose={close}>
          {picker}
          <Button title="确定" onPress={() => draft && commit(draft)} />
        </ChoiceSheet>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  control: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  value: { flex: 1, fontSize: fontSizes.control, color: colors.text },
});
