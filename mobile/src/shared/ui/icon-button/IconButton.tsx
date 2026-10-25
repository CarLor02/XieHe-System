import { Pressable, StyleSheet } from 'react-native';
import { colors, interactionOpacity, radii, sizes } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui/icon';

export function IconButton({
  name,
  label,
  onPress,
  light = false,
  disabled = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  light?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: light ? '#FFFFFF25' : colors.primaryLight,
          opacity: disabled
            ? interactionOpacity.disabled
            : pressed
              ? interactionOpacity.pressed
              : 1,
        },
      ]}
    >
      <Icon
        name={name}
        color={light ? colors.onPrimary : colors.primary}
        size={21}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    height: sizes.iconButton,
    width: sizes.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
});
