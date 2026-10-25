import { Button, Host } from '@expo/ui';
import { StyleSheet, Text } from 'react-native';
import { colors, radii, sizes } from '@/shared/theme';
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
}: ButtonSurfaceProps) {
  const iconOnly = size === 'icon';
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
