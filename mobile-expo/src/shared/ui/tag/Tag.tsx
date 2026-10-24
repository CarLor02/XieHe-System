import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/theme';

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
  const palette = {
    primary: [colors.primaryLight, colors.primary],
    success: [colors.successLight, colors.success],
    warning: [colors.warningLight, colors.warning],
    muted: [colors.background, colors.muted],
    danger: [colors.dangerLight, colors.danger],
    pink: ['#FDF2F8', '#DB2777'],
    sky: ['#F0F9FF', '#0284C7'],
    teal: ['#F0FDFA', '#0D9488'],
    indigo: ['#EEF2FF', '#4F46E5'],
  }[tone];
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
      <Text style={{ fontSize: 10, fontWeight: '600', color: palette[1] }}>
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
