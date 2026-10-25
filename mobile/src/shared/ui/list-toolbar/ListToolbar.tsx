import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/shared/theme';

export function ListToolbar({
  search,
  children,
}: PropsWithChildren<{ search: ReactNode }>) {
  return (
    // 放在 Content 外作为同级区域，搜索与筛选保持固定，不参与列表滚动。
    <View style={styles.toolbar}>
      {search}
      {!!children && <View style={styles.filters}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
