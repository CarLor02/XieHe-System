import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, sizes, spacing } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui/icon';
import { ButtonSurface } from '@/shared/ui/button-surface';

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
    <ButtonSurface
      label={title}
      disabled={disabled || loading}
      busy={loading}
      icon={icon}
      onPress={onPress}
      size={compact ? 'compact' : 'regular'}
      foregroundColor={foreground}
      backgroundColor={
        variant === 'primary'
          ? colors.primary
          : variant === 'danger'
            ? colors.dangerLight
            : variant === 'ghost'
              ? 'transparent'
              : colors.primaryLight
      }
    >
      {/* Web 的标签；原生端从同一组属性构建原生文字、图标和进度。 */}
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.button,
          { minHeight: compact ? sizes.compactControl : sizes.control },
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
      </View>
    </ButtonSurface>
  );
}

const styles = StyleSheet.create({
  button: {
    pointerEvents: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
});
