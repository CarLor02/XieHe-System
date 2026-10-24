import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Content,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Screen,
  type IconName,
} from '../../../shared/ui';
import { GradientIcon } from '../../../shared/ui/gradient-icon';
import { colors, layout } from '../../../shared/theme';
import { useDashboard } from '../application/useDashboard';
import { ActivityList } from './ActivityList';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSection } from './DashboardSection';
import { PendingTaskList } from './PendingTaskList';

const quickActions = [
  {
    label: '新增患者',
    icon: 'person-add-outline',
    colors: ['#8B5CF6', '#A855F7'],
    route: '/patients/new',
  },
  {
    label: '上传影像',
    icon: 'push-outline',
    colors: ['#38BDF8', '#3B82F6'],
    route: '/images/upload',
  },
  {
    label: '影像中心',
    icon: 'scan-outline',
    colors: ['#34D399', '#14B8A6'],
    route: '/images',
  },
  {
    label: '消息通知',
    icon: 'notifications-outline',
    colors: ['#FB923C', '#F43F5E'],
    route: '/messages',
  },
] as const;

export function DashboardScreen() {
  const { user, stats, tasks, activities, refresh } = useDashboard();
  const summary = stats.data;
  const cards: {
    label: string;
    value?: number;
    icon: IconName;
    gradient: [string, string];
    route: '/patients' | '/images';
  }[] = [
    {
      label: '总患者数',
      value: summary?.total_patients,
      icon: 'people-outline',
      gradient: ['#8B5CF6', '#9333EA'],
      route: '/patients',
    },
    {
      label: '总影像数',
      value: summary?.total_images,
      icon: 'scan-outline',
      gradient: ['#38BDF8', '#3B82F6'],
      route: '/images',
    },
  ];
  return (
    <Screen>
      <DashboardHeader user={user} />
      <Content
        refreshControl={
          <RefreshControl
            refreshing={stats.loading && !!summary}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ gap: 20, paddingTop: 20 }}
      >
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            数据概览
          </Text>
          {!!stats.error && (
            <ErrorState
              message={stats.error}
              onRetry={() => void stats.reload()}
            />
          )}
          {stats.loading && !summary ? (
            <LoadingState />
          ) : (
            <View style={styles.stats}>
              {cards.map(item => (
                <Pressable
                  key={item.label}
                  style={styles.statLink}
                  onPress={() => router.push(item.route)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} ${item.value ?? '未加载'}`}
                >
                  <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.stat}
                  >
                    <View style={styles.statIcon}>
                      <Icon name={item.icon} color="#FFF" size={20} />
                    </View>
                    <Text style={styles.statValue}>
                      {item.value?.toLocaleString() ?? '—'}
                    </Text>
                    <View style={layout.between}>
                      <Text style={styles.statLabel}>{item.label}</Text>
                      <Icon name="arrow-forward" color="#FFFFFFB0" size={12} />
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            快捷入口
          </Text>
          <View style={styles.quickActions}>
            {quickActions.map(item => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => router.push(item.route)}
                style={styles.quick}
              >
                <GradientIcon
                  name={item.icon}
                  colors={item.colors}
                  size={56}
                  iconSize={24}
                  radius={16}
                />
                <Text style={styles.quickLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <DashboardSection
          title="待处理任务"
          accessory={
            <Text style={styles.taskCount}>
              {summary?.pending_images ?? tasks.data?.total ?? '—'} 项待处理
            </Text>
          }
        >
          {tasks.loading && !tasks.data && <LoadingState />}
          {!!tasks.error && (
            <ErrorState
              message={tasks.error}
              onRetry={() => void tasks.reload()}
            />
          )}
          {!!tasks.data?.items.length && (
            <PendingTaskList images={tasks.data.items} />
          )}
          {tasks.data?.total === 0 && (
            <EmptyState
              title="暂无待处理任务"
              description="新上传的影像会出现在这里"
              icon="checkmark-done-outline"
            />
          )}
          <View style={styles.taskFooter}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/images')}
              style={styles.viewAll}
            >
              <Text style={styles.viewAllLabel}>查看全部影像</Text>
              <Icon name="arrow-forward" size={14} />
            </Pressable>
          </View>
        </DashboardSection>
        <DashboardSection title="近期动态" accent="#38BDF8">
          {activities.loading && !activities.data && <LoadingState />}
          {!!activities.error && (
            <ErrorState
              message={activities.error}
              onRetry={() => void activities.reload()}
            />
          )}
          {activities.data?.length ? (
            <ActivityList activities={activities.data.slice(0, 5)} />
          ) : (
            activities.data && <EmptyState title="暂无近期动态" />
          )}
        </DashboardSection>
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  stats: { flexDirection: 'row', gap: 12, paddingBottom: 4 },
  statLink: { flex: 1, minWidth: 0 },
  stat: {
    padding: 16,
    borderRadius: 16,
    boxShadow: '0 4px 8px rgba(139,92,246,0.14)',
  },
  statIcon: {
    height: 36,
    width: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 3,
  },
  statLabel: { fontSize: 11, color: '#FFFFFFCC' },
  quickActions: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, alignItems: 'center', gap: 8 },
  quickLabel: { fontSize: 11, color: colors.muted, fontWeight: '500' },
  taskCount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning,
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  taskFooter: { padding: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  viewAll: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
  },
  viewAllLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
});
