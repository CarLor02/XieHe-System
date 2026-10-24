import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, layout } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';

export function Choice({
  title,
  selected,
  onPress,
  disabled = false,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  // ARIA 状态同时适配原生端和 Expo Web，让浏览器也能读取选中状态。
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={!!selected}
      aria-disabled={disabled}
      accessibilityLabel={title}
      disabled={disabled}
      style={[
        styles.choice,
        selected && {
          backgroundColor: colors.primaryLight,
          borderColor: '#D8C5FA',
        },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          layout.body,
          selected && { color: colors.primary, fontWeight: '600' },
        ]}
      >
        {title}
      </Text>
      {selected && <Icon name="checkmark-circle" size={20} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
