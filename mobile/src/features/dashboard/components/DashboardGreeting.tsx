import type { SessionUser } from '@xiehe/api-contracts';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing } from '@/shared/theme';

export function DashboardGreeting({ user }: { user: SessionUser }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="查看个人信息"
        onPress={() => router.push('/profile')}
        style={styles.identity}
      >
        <Text style={styles.greeting} numberOfLines={1}>
          {greeting}，{user.real_name || user.full_name || user.username}
        </Text>
      </Pressable>
      <Text style={styles.date}>
        {now.toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  identity: { flexShrink: 1, maxWidth: '100%' },
  greeting: { fontSize: fontSizes.body, color: colors.text, fontWeight: '500' },
  date: { fontSize: fontSizes.caption, color: colors.muted },
});
