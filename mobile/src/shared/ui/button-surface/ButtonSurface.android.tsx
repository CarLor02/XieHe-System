import {
  CircularProgressIndicator,
  Host,
  Shape,
  TextButton,
  IconButton,
  Row,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  alpha,
  defaultMinSize,
  fillMaxWidth,
  semantics,
  size as nativeSize,
} from '@expo/ui/jetpack-compose/modifiers';
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
  const cornerRadius = chip ? radii.pill : radii.control;
  const glyph = useIoniconGlyph(icon);
  const buttonColors = {
    containerColor: backgroundColor,
    contentColor: foregroundColor,
    disabledContainerColor: backgroundColor,
    disabledContentColor: foregroundColor,
  };
  const modifiers = [
    ...(iconOnly
      ? [nativeSize(sizes.iconButton, sizes.iconButton)]
      : [
          ...(!compact ? [fillMaxWidth()] : []),
          defaultMinSize({
            minHeight: chip
              ? sizes.filterChip - 2
              : compact
                ? sizes.compactControl
                : sizes.control,
          }),
        ]),
    alpha(disabled ? interactionOpacity.disabled : 1),
    semantics({
      // 当前 Expo semantics 未开放 selected，直接朗读条件状态，保留按钮的动作语义。
      contentDescription: busy
        ? `${label}，正在处理`
        : chip && selected
          ? `${label}，已筛选`
          : label,
    }),
  ];
  // 按钮内部保持纯 Compose，避免 RNHostView 让显示尺寸与原生命中区域分属两套布局。
  const iconContent = glyph ? (
    <Text
      color={foregroundColor}
      style={{
        fontFamily: glyph.family,
        fontSize: iconOnly ? 21 : chip ? 14 : 18,
      }}
    >
      {glyph.character}
    </Text>
  ) : null;
  return (
    <Host
      colorScheme="light"
      seedColor={colors.primary}
      matchContents={iconOnly ? false : { vertical: true, horizontal: compact }}
      style={
        iconOnly
          ? { width: sizes.iconButton, height: sizes.iconButton, flexShrink: 0 }
          : { alignSelf: chip ? 'flex-start' : 'auto' }
      }
    >
      {iconOnly ? (
        <IconButton
          enabled={!disabled}
          onClick={disabled ? undefined : onPress}
          colors={buttonColors}
          shape={Shape.Circle({
            // Android 原生默认半径为 0；显式填满轮廓，避免背景和图标被裁掉。
            radius: 1,
          })}
          modifiers={modifiers}
        >
          {iconContent}
        </IconButton>
      ) : (
        <TextButton
          enabled={!disabled}
          onClick={disabled ? undefined : onPress}
          colors={buttonColors}
          contentPadding={{
            start: spacing.md,
            top: chip ? spacing.xs : 0,
            end: spacing.md,
            bottom: chip ? spacing.xs : 0,
          }}
          shape={Shape.RoundedCorner({
            cornerRadii: {
              topStart: cornerRadius,
              topEnd: cornerRadius,
              bottomStart: cornerRadius,
              bottomEnd: cornerRadius,
            },
          })}
          modifiers={modifiers}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: spacing.xs }}
          >
            {busy ? (
              <CircularProgressIndicator
                color={foregroundColor}
                strokeWidth={2}
                modifiers={[nativeSize(18, 18)]}
              />
            ) : (
              iconContent
            )}
            <Text
              color={foregroundColor}
              style={{
                fontSize: compact ? fontSizes.small : fontSizes.control,
                fontWeight: chip ? '500' : '600',
              }}
            >
              {label}
            </Text>
          </Row>
        </TextButton>
      )}
    </Host>
  );
}
