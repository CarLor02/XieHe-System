import { useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useWorkspace } from '../../../application/AppProvider';
import { useResource } from '../../../shared/hooks/useResource';
import {
  Card,
  Content,
  EmptyState,
  ErrorState,
  Header,
  Icon,
  IconButton,
  LoadingState,
  Screen,
  SectionTitle,
  Tag,
  type IconName,
} from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';
import { ImageCard } from '../../imaging';

const quickActions = [
  {
    label: '新增患者',
    icon: 'person-add-outline' as IconName,
    color: '#9461F5',
    route: '/patients/new' as const,
  },
  {
    label: '上传影像',
    icon: 'cloud-upload-outline' as IconName,
    color: '#3AA4ED',
    route: '/images/upload' as const,
  },
  {
    label: '诊断报告',
    icon: 'document-text-outline' as IconName,
    color: '#1BBFA1',
    route: '/reports' as const,
  },
  {
    label: '我的团队',
    icon: 'people-outline' as IconName,
    color: '#EC9673',
    route: '/profile/teams' as const,
  },
];

export function DashboardScreen() {
  const { services, user } = useWorkspace();
  const statsLoad = useCallback(
    () => services.dashboard.getStats(),
    [services]
  );
  const tasksLoad = useCallback(
    () =>
      services.imaging.list({ page: 1, page_size: 5, file_status: 'UPLOADED' }),
    [services]
  );
  const activityLoad = useCallback(
    () => services.dashboard.getRecentActivities(),
    [services]
  );
  const stats = useResource(statsLoad);
  const tasks = useResource(tasksLoad);
  const activities = useResource(activityLoad);
  const summary = stats.data;
  const cards: {
    label: string;
    value?: number;
    icon: IconName;
    gradient: [string, string];
    onPress: () => void;
  }[] = [
    {
      label: '总患者数',
      value: summary?.total_patients,
      icon: 'people-outline',
      gradient: ['#A365F5', '#8041E9'],
      onPress: () => router.push('/patients'),
    },
    {
      label: '总影像数',
      value: summary?.total_images,
      icon: 'scan-outline',
      gradient: ['#49BDEB', '#388CEE'],
      onPress: () => router.push('/images'),
    },
    {
      label: '待处理影像',
      value: summary?.pending_images,
      icon: 'time-outline',
      gradient: ['#F3BA6C', '#EE9655'],
      onPress: () => router.push('/images'),
    },
    {
      label: '已处理影像',
      value: summary?.processed_images,
      icon: 'checkmark-done-outline',
      gradient: ['#43C9B3', '#24AE98'],
      onPress: () => router.push('/images'),
    },
  ];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';
  return (
    <Screen>
      <Header
        title={`${greeting}，${user.real_name || user.full_name || user.username}`}
        subtitle={new Date().toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
        right={
          <IconButton
            name="person-outline"
            label="个人中心"
            light
            onPress={() => router.push('/profile')}
          />
        }
      />
      <Content
        refreshControl={
          <RefreshControl
            refreshing={stats.loading && !!stats.data}
            onRefresh={() => {
              void stats.reload();
              void tasks.reload();
              void activities.reload();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <SectionTitle title="数据概览" />
        {!!stats.error && (
          <ErrorState
            message={stats.error}
            onRetry={() => void stats.reload()}
          />
        )}
        {stats.loading && !summary ? (
          <LoadingState />
        ) : (
          summary && (
            <View style={styles.grid}>
              {cards.map(item => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} ${item.value}`}
                  style={styles.statWrap}
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
                      <Icon name="arrow-forward" color="#FFFFFFB0" size={14} />
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          )
        )}
        <SectionTitle title="快捷入口" />
        <View style={[layout.row, { justifyContent: 'space-between', gap: 4 }]}>
          {quickActions.map(item => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => router.push(item.route)}
              style={styles.quick}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color }]}>
                <Icon name={item.icon} color="#FFF" size={24} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <SectionTitle
          title="待处理影像"
          action="查看全部"
          onPress={() => router.push('/images')}
        />
        {tasks.loading && !tasks.data && <LoadingState />}
        {!!tasks.error && (
          <ErrorState
            message={tasks.error}
            onRetry={() => void tasks.reload()}
          />
        )}
        {tasks.data?.items.map(image => (
          <ImageCard key={image.id} image={image} compact />
        ))}
        {tasks.data?.total === 0 && (
          <Card>
            <EmptyState
              title="暂时没有待处理影像"
              description="新上传的影像会出现在这里"
              icon="checkmark-done-outline"
            />
          </Card>
        )}
        <SectionTitle title="近期动态" />
        {activities.loading && !activities.data && <LoadingState />}
        {!!activities.error && (
          <ErrorState
            message={activities.error}
            onRetry={() => void activities.reload()}
          />
        )}
        {activities.data && (
          <Card style={{ gap: 18 }}>
            {activities.data.length ? (
              activities.data.slice(0, 8).map(activity => (
                <View key={activity.id} style={layout.row}>
                  <View style={styles.activityIcon}>
                    <Icon name="pulse-outline" size={18} />
                  </View>
                  <View style={layout.flex}>
                    <Text style={[layout.body, { fontWeight: '600' }]}>
                      {activity.title}
                    </Text>
                    {!!activity.description && (
                      <Text style={layout.muted}>{activity.description}</Text>
                    )}
                  </View>
                  <Tag
                    text={new Date(activity.created_at).toLocaleDateString(
                      'zh-CN',
                      { month: '2-digit', day: '2-digit' }
                    )}
                    tone="muted"
                  />
                </View>
              ))
            ) : (
              <EmptyState title="暂无近期动态" />
            )}
          </Card>
        )}
      </Content>
    </Screen>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: -4 },
  statWrap: { flexBasis: '46%', flexGrow: 1 },
  stat: { padding: 18, borderRadius: 20, gap: 8 },
  statIcon: {
    height: 33,
    width: 33,
    borderRadius: 11,
    backgroundColor: '#FFFFFF25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  statValue: { color: '#FFF', fontSize: 29, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#FFFFFFDB' },
  quick: { alignItems: 'center', gap: 9, paddingVertical: 2, minWidth: 62 },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 11, color: colors.muted },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
