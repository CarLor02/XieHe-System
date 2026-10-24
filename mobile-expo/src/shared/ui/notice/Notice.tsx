import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, layout } from '../../theme';
import { Icon } from '../icon';

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
    gap: 8,
    padding: 13,
    borderRadius: 13,
  },
});
