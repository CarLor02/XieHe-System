import {
  Host,
  RNHostView,
  Shape,
  TextButton,
  IconButton,
} from '@expo/ui/jetpack-compose';
import {
  alpha,
  fillMaxWidth,
  semantics,
  size as nativeSize,
} from '@expo/ui/jetpack-compose/modifiers';
import { colors, interactionOpacity, radii, sizes } from '@/shared/theme';
import type { ButtonSurfaceProps } from './types';

export function ButtonSurface({
  label,
  onPress,
  disabled,
  busy,
  backgroundColor,
  foregroundColor,
  size,
  children,
}: ButtonSurfaceProps) {
  const iconOnly = size === 'icon';
  const compact = size === 'compact';
  const buttonColors = {
    containerColor: backgroundColor,
    contentColor: foregroundColor,
    // 统一用透明度表达禁用，避免 Material 默认灰色覆盖应用主题。
    disabledContainerColor: backgroundColor,
    disabledContentColor: foregroundColor,
  };
  const modifiers = [
    ...(iconOnly
      ? [nativeSize(sizes.iconButton, sizes.iconButton)]
      : compact
        ? []
        : [fillMaxWidth()]),
    alpha(disabled ? interactionOpacity.disabled : 1),
    semantics({ contentDescription: busy ? `${label}，正在处理` : label }),
  ];
  const content = <RNHostView matchContents>{children}</RNHostView>;
  return (
    <Host
      colorScheme="light"
      seedColor={colors.primary}
      matchContents={iconOnly ? false : { vertical: true, horizontal: compact }}
      style={
        iconOnly
          ? { width: sizes.iconButton, height: sizes.iconButton }
          : { alignSelf: 'auto' }
      }
    >
      {iconOnly ? (
        <IconButton
          enabled={!disabled}
          onClick={disabled ? undefined : onPress}
          colors={buttonColors}
          shape={Shape.Circle({})}
          modifiers={modifiers}
        >
          {content}
        </IconButton>
      ) : (
        <TextButton
          enabled={!disabled}
          onClick={disabled ? undefined : onPress}
          colors={buttonColors}
          contentPadding={{ start: 0, top: 0, end: 0, bottom: 0 }}
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
