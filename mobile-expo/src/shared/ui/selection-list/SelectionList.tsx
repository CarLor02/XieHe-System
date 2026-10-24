import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Choice } from '../choice';

export type SelectionValue = string | number | null | undefined;

export interface SelectionOption<TValue extends SelectionValue> {
  // 同一列表中的值必须唯一；空字符串、null 和 undefined 都可以作为有效选项。
  value: TValue;
  label: string;
  disabled?: boolean;
}

export interface SelectionListProps<TValue extends SelectionValue> {
  options: readonly SelectionOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SelectionList<TValue extends SelectionValue>({
  options,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
  style,
}: SelectionListProps<TValue>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.list, style]}
    >
      {options.map(option => (
        <Choice
          key={`${typeof option.value}:${String(option.value)}`}
          title={option.label}
          selected={option.value === value}
          disabled={disabled || option.disabled}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
