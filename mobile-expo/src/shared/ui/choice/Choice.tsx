import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, layout } from '../../theme';
import { Icon } from '../icon';

export function Choice({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={title}
      style={[
        styles.choice,
        selected && {
          backgroundColor: colors.primaryLight,
          borderColor: '#D8C5FA',
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          layout.body,
          selected && { color: colors.primary, fontWeight: '600' },
        ]}
      >
        {title}
      </Text>
      {selected && <Icon name="checkmark-circle" size={20} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
