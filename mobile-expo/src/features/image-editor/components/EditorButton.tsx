import { Pressable, StyleSheet, Text } from 'react-native';
import { Icon, type IconName } from '../../../shared/ui';
import { editorColors as c } from './editorTheme';

export function EditorButton({
  label,
  icon,
  onPress,
  active = false,
  disabled = false,
  danger = false,
  compact = false,
  primary = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  compact?: boolean;
  primary?: boolean;
}) {
  const color = danger ? c.danger : active ? c.blueLight : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        active && styles.active,
        primary && { backgroundColor: c.blue, borderColor: c.blue },
        { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          color={primary ? '#FFF' : color}
          size={compact ? 20 : 18}
        />
      )}
      {!compact && (
        <Text style={[styles.label, { color: primary ? '#FFF' : color }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: c.panel,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  compact: { width: 44, paddingHorizontal: 0 },
  active: { backgroundColor: '#172D52', borderColor: '#3B82F6' },
  label: { fontSize: 12, fontWeight: '600' },
});
