import { StyleSheet, Text, View } from 'react-native';
import { layout, spacing } from '@/shared/theme';

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={layout.muted}>{label}</Text>
      <Text selectable style={[layout.body, { flex: 1, textAlign: 'right' }]}>
        {value ?? '未填写'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
});
