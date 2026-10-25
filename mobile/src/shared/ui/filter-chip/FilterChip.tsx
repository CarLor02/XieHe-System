import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing } from '@/shared/theme';
import { ButtonSurface } from '@/shared/ui/button-surface';
import { Icon, type IconName } from '@/shared/ui/icon';

export function FilterChip({
  title,
  icon,
  active,
  onPress,
}: {
  title: string;
  icon: IconName;
  active?: boolean;
  onPress: () => void;
}) {
  const foreground = active ? colors.onPrimary : colors.muted;
  return (
    <ButtonSurface
      label={title}
      icon={icon}
      size="chip"
      selected={!!active}
      disabled={false}
      onPress={onPress}
      backgroundColor={active ? colors.primary : colors.card}
      foregroundColor={foreground}
    >
      {/* 外观和点击区域由同一个平台控件负责；这里的标签只供 Web 使用。 */}
      <View
        style={styles.content}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon name={icon} size={14} color={foreground} />
        <Text style={[styles.label, { color: foreground }]}>{title}</Text>
      </View>
    </ButtonSurface>
  );
}

const styles = StyleSheet.create({
  content: {
    pointerEvents: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: { fontSize: fontSizes.small, fontWeight: '500' },
});
