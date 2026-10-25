import { StyleSheet, View } from 'react-native';
import { colors, sizes } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui/icon';
import { ButtonSurface } from '@/shared/ui/button-surface';

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
    <ButtonSurface
      label={label}
      disabled={disabled}
      onPress={onPress}
      size="icon"
      backgroundColor={light ? '#FFFFFF25' : colors.primaryLight}
      foregroundColor={light ? colors.onPrimary : colors.primary}
    >
      <View
        style={styles.iconButton}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon
          name={name}
          color={light ? colors.onPrimary : colors.primary}
          size={21}
        />
      </View>
    </ButtonSurface>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    pointerEvents: 'none',
    height: sizes.iconButton,
    width: sizes.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
