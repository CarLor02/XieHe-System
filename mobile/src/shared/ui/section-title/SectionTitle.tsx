import { Pressable, Text, View } from 'react-native';
import { colors, fontSizes, layout, spacing } from '@/shared/theme';

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
          style={{ paddingVertical: spacing.xs }}
        >
          <Text style={{ color: colors.primary, fontSize: fontSizes.caption }}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
