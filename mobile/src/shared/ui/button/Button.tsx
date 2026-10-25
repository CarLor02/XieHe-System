import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import {
  colors,
  fontSizes,
  interactionOpacity,
  radii,
  sizes,
  spacing,
} from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui/icon';

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}) {
  const foreground =
    variant === 'primary'
      ? colors.onPrimary
      : variant === 'danger'
        ? colors.danger
        : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            variant === 'primary'
              ? colors.primary
              : variant === 'danger'
                ? colors.dangerLight
                : variant === 'ghost'
                  ? 'transparent'
                  : colors.primaryLight,
          opacity:
            disabled || loading
              ? interactionOpacity.disabled
              : pressed
                ? interactionOpacity.pressed
                : 1,
          minHeight: compact ? sizes.compactControl : sizes.control,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        icon && <Icon name={icon} color={foreground} size={18} />
      )}
      <Text
        style={{
          color: foreground,
          fontSize: compact ? fontSizes.small : fontSizes.control,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
});
