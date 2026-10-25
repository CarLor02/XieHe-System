import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, layout, radii, spacing } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';

export function Notice({
  children,
  tone = 'primary',
}: PropsWithChildren<{ tone?: 'primary' | 'warning' }>) {
  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor:
            tone === 'primary' ? colors.primaryLight : colors.warningLight,
        },
      ]}
    >
      <Icon
        name="information-circle-outline"
        size={18}
        color={tone === 'primary' ? colors.primary : colors.warning}
      />
      <Text
        style={[
          layout.muted,
          {
            flex: 1,
            color: tone === 'primary' ? colors.primaryDark : colors.warning,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.control,
  },
});
