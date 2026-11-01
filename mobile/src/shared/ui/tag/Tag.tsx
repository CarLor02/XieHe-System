import { StyleSheet, Text, View } from 'react-native';
import { tagColors, fontSizes, radii, spacing } from '@/shared/theme';

export function Tag({
  text,
  tone = 'primary',
  dot = false,
}: {
  text: string;
  tone?:
    | 'primary'
    | 'success'
    | 'warning'
    | 'muted'
    | 'danger'
    | 'pink'
    | 'sky'
    | 'teal'
    | 'indigo';
  dot?: boolean;
}) {
  const palette = tagColors[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette[0] }]}>
      {dot && (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: palette[1],
          }}
        />
      )}
      <Text
        style={{
          fontSize: fontSizes.badge,
          fontWeight: '600',
          color: palette[1],
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
});
