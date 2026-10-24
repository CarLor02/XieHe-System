import type { SessionUser } from '@xiehe/api-contracts';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconButton } from '@/shared/ui';

export function DashboardHeader({ user }: { user: SessionUser }) {
  const insets = useSafeAreaInsets();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  return (
    <LinearGradient
      colors={['#7C3AED', '#6D28D9', '#5B21B6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="查看个人信息"
        onPress={() => router.push('/profile')}
        style={styles.identity}
      >
        <View style={styles.avatar}>
          <Icon name="person" color="#FFF" size={22} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.name} numberOfLines={1}>
            {user.real_name || user.full_name || user.username}
          </Text>
        </View>
      </Pressable>
      <View style={styles.dateBlock}>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </Text>
        <Text style={styles.brand}>脊柱影像分析系统</Text>
      </View>
      <IconButton
        name="notifications-outline"
        label="消息通知"
        light
        onPress={() => router.push('/messages')}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF4D',
    backgroundColor: '#FFFFFF33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 11, color: '#DDD6FE', marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  dateBlock: { alignItems: 'flex-end', gap: 4 },
  date: { fontSize: 10, fontWeight: '500', color: '#FFFFFFE6' },
  brand: { fontSize: 9, color: '#DDD6FE' },
});
