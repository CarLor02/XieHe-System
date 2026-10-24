import { Pressable, Text, View } from 'react-native';
import { colors, layout } from '@/shared/theme';

export function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={layout.between}>
      <Text accessibilityRole="header" style={layout.heading}>
        {title}
      </Text>
      {!!action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ paddingVertical: 8 }}
        >
          <Text style={{ color: colors.primary, fontSize: 12 }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
