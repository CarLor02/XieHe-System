import { Button, Host, HStack, ProgressView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityAddTraits,
  accessibilityHidden,
  accessibilityLabel,
  accessibilityValue,
  background,
  buttonStyle,
  contentShape,
  disabled as nativeDisabled,
  font,
  foregroundStyle,
  frame,
  opacity,
  padding,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import {
  colors,
  fontSizes,
  interactionOpacity,
  radii,
  sizes,
  spacing,
} from '@/shared/theme';
import type { ButtonSurfaceProps } from './types';
import { useIoniconGlyph } from './useIoniconGlyph';

export function ButtonSurface({
  label,
  onPress,
  disabled,
  busy,
  icon,
  backgroundColor,
  foregroundColor,
  size,
  selected,
}: ButtonSurfaceProps) {
  const iconOnly = size === 'icon';
  const chip = size === 'chip';
  const compact = size === 'compact' || chip;
  const glyph = useIoniconGlyph(icon);
  const shape = shapes.roundedRectangle({
    cornerRadius: iconOnly || chip ? radii.pill : radii.control,
  });
  return (
    <Host
      colorScheme="light"
      seedColor={colors.primary}
      ignoreSafeArea="all"
      matchContents={iconOnly ? false : { vertical: true, horizontal: compact }}
      style={
        iconOnly
          ? { width: sizes.iconButton, height: sizes.iconButton, flexShrink: 0 }
          : { alignSelf: chip ? 'flex-start' : 'auto' }
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
          ...(chip && selected ? [accessibilityAddTraits(['isSelected'])] : []),
        ]}
      >
        {/* 标签、背景和命中区域都由 SwiftUI 布局，不嵌套 RN 视图。 */}
        <HStack
          spacing={spacing.xs}
          alignment="center"
          modifiers={[
            ...(!iconOnly ? [padding({ horizontal: spacing.md })] : []),
            ...(chip ? [padding({ vertical: spacing.xs })] : []),
            iconOnly
              ? frame({ width: sizes.iconButton, height: sizes.iconButton })
              : frame({
                  minHeight: chip
                    ? sizes.filterChip - 2
                    : compact
                      ? sizes.compactControl
                      : sizes.control,
                  ...(!compact ? { maxWidth: Infinity } : {}),
                }),
            background(backgroundColor, shape),
            contentShape(shape),
          ]}
        >
          {busy ? (
            <ProgressView
              modifiers={[
                tint(foregroundColor),
                frame({ width: 18, height: 18 }),
              ]}
            />
          ) : glyph ? (
            <Text
              modifiers={[
                font({
                  family: glyph.family,
                  size: iconOnly ? 21 : chip ? 14 : 18,
                }),
                foregroundStyle(foregroundColor),
                accessibilityHidden(),
              ]}
            >
              {glyph.character}
            </Text>
          ) : null}
          {!iconOnly && (
            <Text
              modifiers={[
                font({
                  size: compact ? fontSizes.small : fontSizes.control,
                  weight: chip ? 'medium' : 'semibold',
                }),
                foregroundStyle(foregroundColor),
              ]}
            >
              {label}
            </Text>
          )}
        </HStack>
      </Button>
    </Host>
  );
}
