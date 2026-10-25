import { Pressable, StyleSheet, Text } from 'react-native';
import {
  colors,
  fontSizes,
  interactionOpacity,
  radii,
  spacing,
} from '@/shared/theme';
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.active,
        { opacity: pressed ? interactionOpacity.pressed : 1 },
      ]}
    >
      <Icon name={icon} size={14} color={foreground} />
      <Text style={[styles.label, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 3px rgba(148,163,184,0.08)',
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: fontSizes.small, fontWeight: '500' },
});
