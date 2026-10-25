import {
  CircularProgressIndicator,
  Host,
  Shape,
  TextButton,
  IconButton,
  Row,
  Text,
  Box,
  Surface,
} from '@expo/ui/jetpack-compose';
import {
  alpha,
  defaultMinSize,
  fillMaxWidth,
  padding,
  semantics,
  size as nativeSize,
} from '@expo/ui/jetpack-compose/modifiers';
import {
  colors,
  fontSizes,
  interactionOpacity,
  radii,
  shadows,
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
  const buttonColors = {
    containerColor: backgroundColor,
    contentColor: foregroundColor,
    disabledContainerColor: backgroundColor,
    disabledContentColor: foregroundColor,
  };
  const modifiers = [
    ...(iconOnly
      ? [nativeSize(sizes.iconButton, sizes.iconButton)]
      : chip
        ? []
        : [
            ...(!compact ? [fillMaxWidth()] : []),
            defaultMinSize({
              minHeight: compact ? sizes.compactControl : sizes.control,
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
  const content = (
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
  );
  return (
    <Host
      colorScheme="light"
      seedColor={colors.primary}
      matchContents={iconOnly ? false : { vertical: true, horizontal: compact }}
      style={
        iconOnly
          ? { width: sizes.iconButton, height: sizes.iconButton, flexShrink: 0 }
          : chip
            ? {
                alignSelf: 'flex-start',
                borderRadius: radii.pill,
                boxShadow: shadows.filterChip,
              }
            : { alignSelf: 'auto' }
      }
    >
      {chip ? (
        <Surface
          enabled={!disabled}
          onClick={disabled ? undefined : onPress}
          color={backgroundColor}
          contentColor={foregroundColor}
          border={{
            width: 1,
            color: selected ? colors.primary : colors.border,
          }}
          shape={Shape.RoundedCorner({
            cornerRadii: {
              topStart: radii.pill,
              topEnd: radii.pill,
              bottomStart: radii.pill,
              bottomEnd: radii.pill,
            },
          })}
          modifiers={modifiers}
        >
          {/* 内容本身达到最小触控尺寸，避免 Surface 在轮廓外补留白形成双层胶囊。 */}
          <Box
            contentAlignment="center"
            modifiers={[
              defaultMinSize({
                minWidth: sizes.filterChipMinWidth,
                minHeight: sizes.filterChip,
              }),
              padding(spacing.md, spacing.xs, spacing.md, spacing.xs),
            ]}
          >
            {content}
          </Box>
        </Surface>
      ) : iconOnly ? (
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
            top: 0,
            end: spacing.md,
            bottom: 0,
          }}
          shape={Shape.RoundedCorner({
            cornerRadii: {
              topStart: radii.control,
              topEnd: radii.control,
              bottomStart: radii.control,
              bottomEnd: radii.control,
            },
          })}
          modifiers={modifiers}
        >
          {content}
        </TextButton>
      )}
    </Host>
  );
}
