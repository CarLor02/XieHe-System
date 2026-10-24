import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme';
import { Icon, type IconName } from '../icon';

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
      ? '#FFF'
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
          opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1,
          minHeight: compact ? 42 : 50,
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
          fontSize: compact ? 13 : 15,
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
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
});
