import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, sizes, spacing } from '@/shared/theme';
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
    <View
      style={[styles.chip, active && styles.active]}
      pointerEvents="box-none"
    >
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
        {/* Web 使用现有标签；原生端从属性构建纯原生内容。外层只负责边框与阴影。 */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    minHeight: sizes.filterChip,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 3px rgba(148,163,184,0.08)',
  },
  content: {
    pointerEvents: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.filterChip - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: fontSizes.small, fontWeight: '500' },
});
