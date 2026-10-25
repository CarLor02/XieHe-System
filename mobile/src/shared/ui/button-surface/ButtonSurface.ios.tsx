import { Button, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  accessibilityValue,
  background,
  buttonStyle,
  contentShape,
  disabled as nativeDisabled,
  frame,
  opacity,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { colors, interactionOpacity, radii, sizes } from '@/shared/theme';
import type { ButtonSurfaceProps } from './types';

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
  const compact = size === 'compact';
  const shape = shapes.roundedRectangle({
    cornerRadius: iconOnly ? radii.pill : radii.control,
  });
  return (
    <Host
      colorScheme="light"
      seedColor={colors.primary}
      ignoreSafeArea="all"
      matchContents={iconOnly ? false : { vertical: true, horizontal: compact }}
      style={
        iconOnly
          ? { width: sizes.iconButton, height: sizes.iconButton }
          : { alignSelf: 'auto' }
      }
    >
      <Button
        onPress={disabled ? undefined : onPress}
        modifiers={[
          buttonStyle('plain'),
          nativeDisabled(disabled),
          opacity(disabled ? interactionOpacity.disabled : 1),
          accessibilityElement('ignore'),
          accessibilityLabel(label),
          accessibilityValue(busy ? '正在处理' : ''),
        ]}
      >
        {/* 把背景和命中区域放在按钮 label 内，确保整块色面都可点击。 */}
        <Group
          modifiers={[
            ...(iconOnly
              ? [frame({ width: sizes.iconButton, height: sizes.iconButton })]
              : compact
                ? []
                : [frame({ maxWidth: Infinity })]),
            background(backgroundColor, shape),
            contentShape(shape),
          ]}
        >
          <RNHostView matchContents>{children}</RNHostView>
        </Group>
      </Button>
    </Host>
  );
}
