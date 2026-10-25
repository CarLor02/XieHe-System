import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fieldStyles, spacing } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import type { DateFieldProps } from './types';

export function DateFieldFrame({
  label,
  value,
  onChange,
  disabled,
  clearable = true,
  error,
  children,
}: PropsWithChildren<DateFieldProps>) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.control}>{children}</View>
        {clearable && !!value && (
          <Button
            title={`清空${label}`}
            variant="ghost"
            compact
            disabled={disabled}
            onPress={() => onChange('')}
          />
        )}
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={fieldStyles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  control: { flex: 1, minWidth: 0 },
});
