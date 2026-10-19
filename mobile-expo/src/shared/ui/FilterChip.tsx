import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';
import { Icon, type IconName } from './index';

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
  const foreground = active ? '#FFF' : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.active,
        { opacity: pressed ? 0.7 : 1 },
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
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 3px rgba(148,163,184,0.08)',
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: 13, fontWeight: '500' },
});
