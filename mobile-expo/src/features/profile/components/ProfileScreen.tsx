import { useState } from 'react';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApp, useWorkspace } from '../../../application/AppProvider';
import { useProfile } from '../application/useProfile';
import {
  Button,
  Card,
  ChoiceSheet,
  Content,
  ErrorState,
  Header,
  Icon,
  IconButton,
  Screen,
  Tag,
  type IconName,
} from '../../../shared/ui';
import { GradientIcon } from '../../../shared/ui/GradientIcon';
import { colors, layout } from '../../../shared/theme';

const menu: {
  title: string;
  icon: IconName;
  colors: [string, string];
  route:
    | '/profile/info'
    | '/profile/teams'
    | '/profile/password'
    | '/profile/settings';
}[] = [
  {
    title: '个人信息',
    icon: 'person-outline',
    colors: ['#A78BFA', '#8B5CF6'],
    route: '/profile/info',
  },
  {
    title: '组织管理',
    icon: 'business-outline',
    colors: ['#C084FC', '#A855F7'],
    route: '/profile/teams',
  },
  {
    title: '修改密码',
    icon: 'lock-closed-outline',
    colors: ['#FBBF24', '#F59E0B'],
    route: '/profile/password',
  },
  {
    title: '系统设置',
    icon: 'settings-outline',
    colors: ['#34D399', '#10B981'],
    route: '/profile/settings',
  },
];

export function ProfileScreen() {
  const { user, services } = useWorkspace();
  const app = useApp();
  const [confirm, setConfirm] = useState(false);
  const { stats, busy, error, logout } = useProfile(
    services.dashboard,
    app.logout
  );
  const summary = stats.data;
  const figures = [
    {
      label: '管理患者',
      value: summary?.total_patients.toLocaleString(),
      route: '/patients',
    },
    {
      label: '已处理影像',
      value: summary?.processed_images.toLocaleString(),
      route: '/images',
    },
    {
      label: '完成率',
      value: summary ? `${summary.completion_rate}%` : undefined,
      route: '/images',
    },
  ] as const;
  return (
    <Screen>
      <Header
        title="个人中心"
        roundedBottom
        right={
          <IconButton
            name="notifications-outline"
            label="消息通知"
            light
            onPress={() => router.push('/messages')}
          />
        }
      />
      <Content
        refreshControl={
          <RefreshControl
            refreshing={stats.loading && !!summary}
            onRefresh={() => void stats.reload()}
            tintColor={colors.primary}
          />
        }
      >
        <Card style={{ padding: 20 }}>
          <View style={[layout.row, { gap: 16 }]}>
            <GradientIcon
              name="person-outline"
              colors={['#A78BFA', '#A855F7']}
              size={64}
              iconSize={30}
              radius={16}
            />
            <View style={[layout.flex, { gap: 8, minWidth: 0 }]}>
              <Text style={styles.name} numberOfLines={1}>
                {user.real_name || user.full_name || user.username}
              </Text>
              <View style={[layout.row, { gap: 8, flexWrap: 'wrap' }]}>
                <Tag
                  text={
                    user.is_system_admin || user.is_superuser
                      ? '系统管理员'
                      : user.title || '成员'
                  }
                />
                <Tag text="已登录" tone="success" />
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="账号信息"
              onPress={() => router.push('/profile/info')}
              style={styles.accountButton}
            >
              <Icon name="id-card-outline" color={colors.muted} size={18} />
            </Pressable>
          </View>
          <View style={styles.figures}>
            {figures.map((item, index) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} ${item.value ?? '加载中'}`}
                onPress={() => router.push(item.route)}
                style={[styles.figure, index === 1 && styles.middleFigure]}
              >
                <Text style={styles.value}>{item.value ?? '—'}</Text>
                <Text style={styles.figureLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
        {!!stats.error && (
          <ErrorState
            message={stats.error}
            onRetry={() => void stats.reload()}
          />
        )}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {menu.map((item, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              key={item.route}
              onPress={() => router.push(item.route)}
              style={[styles.menuRow, index > 0 && styles.menuDivider]}
            >
              <GradientIcon name={item.icon} colors={item.colors} />
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Icon name="chevron-forward" color="#CBD5E1" size={18} />
            </Pressable>
          ))}
        </Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="退出登录"
          onPress={() => setConfirm(true)}
          style={({ pressed }) => [
            styles.logout,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="log-out-outline" color="#EF4444" size={18} />
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </Content>
      <ChoiceSheet
        open={confirm}
        title="确定退出登录？"
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <Text style={[layout.body, { marginBottom: 15 }]}>
          退出后需要重新登录才能继续查看患者与影像数据。
        </Text>
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, marginBottom: 14 }}
          >
            {error}
          </Text>
        )}
        <Button
          title="退出登录"
          variant="danger"
          loading={busy}
          onPress={() => void logout()}
        />
        <Button
          title="继续使用"
          variant="ghost"
          disabled={busy}
          onPress={() => setConfirm(false)}
        />
      </ChoiceSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  accountButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  figures: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  figure: { flex: 1, alignItems: 'center', gap: 5 },
  middleFigure: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  value: { fontSize: 21, fontWeight: '700', color: colors.text },
  figureLabel: { fontSize: 12, color: colors.muted },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuDivider: { borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  menuTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: '#334155' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 4px 16px rgba(148,163,184,0.10)',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});
