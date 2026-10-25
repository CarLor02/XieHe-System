import { Button, Host } from '@expo/ui';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  colors,
  interactionOpacity,
  radii,
  shadows,
  sizes,
} from '@/shared/theme';
import type { ButtonSurfaceProps } from './types';

// Web 使用 Expo 通用按钮；原生入口分别处理 Compose 和 SwiftUI 的主题与布局。
export function ButtonSurface({
  label,
  onPress,
  disabled,
  busy,
  backgroundColor,
  size,
  children,
  selected,
}: ButtonSurfaceProps) {
  const iconOnly = size === 'icon';
  // Expo 通用 Web Button 暂不转发选中状态；保留筛选入口的可访问语义。
  if (size === 'chip') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: !!selected, disabled }}
        aria-pressed={!!selected}
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
        style={({ pressed }) => ({
          backgroundColor,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: selected ? colors.primary : colors.border,
          boxShadow: shadows.filterChip,
          minWidth: sizes.filterChipMinWidth,
          minHeight: sizes.filterChip,
          alignSelf: 'flex-start',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled
            ? interactionOpacity.disabled
            : pressed
              ? interactionOpacity.pressed
              : 1,
        })}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <Host
      colorScheme="light"
      seedColor={colors.primary}
      ignoreSafeArea="all"
      aria-busy={!!busy}
      style={
        iconOnly
          ? { width: sizes.iconButton, height: sizes.iconButton }
          : undefined
      }
    >
      <Button
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
        variant="text"
        style={{
          height: iconOnly ? sizes.iconButton : 'auto',
          paddingHorizontal: 0,
          paddingVertical: 0,
          backgroundColor,
          borderRadius: iconOnly ? radii.pill : radii.control,
        }}
      >
        <Text style={styles.accessibleLabel}>{label}</Text>
        {children}
      </Button>
    </Host>
  );
}

const styles = StyleSheet.create({
  accessibleLabel: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});
