import { Pressable, StyleSheet, Text } from 'react-native';
import {
  colors,
  interactionOpacity,
  layout,
  radii,
  sizes,
  spacing,
} from '@/shared/theme';
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
          borderColor: colors.selectedBorder,
        },
        disabled && { opacity: interactionOpacity.disabled },
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
    minHeight: sizes.control,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
});
