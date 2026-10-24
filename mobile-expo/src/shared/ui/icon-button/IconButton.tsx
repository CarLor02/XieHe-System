import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { Icon, type IconName } from '../icon';

export function IconButton({
  name,
  label,
  onPress,
  light = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  light?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: light ? '#FFFFFF25' : colors.primaryLight,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Icon name={name} color={light ? '#FFF' : colors.primary} size={21} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});
