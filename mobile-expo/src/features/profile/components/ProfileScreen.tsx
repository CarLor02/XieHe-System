import { useState } from 'react';
import { router } from 'expo-router';
import { getApiErrorMessage } from '@xiehe/api-client';
import { Pressable, Text, View } from 'react-native';
import { useApp, useWorkspace } from '../../../application/AppProvider';
import {
  Button,
  Card,
  ChoiceSheet,
  Content,
  Header,
  Icon,
  Notice,
  Screen,
  Tag,
  type IconName,
} from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';

const menu: {
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  route:
    | '/profile/info'
    | '/profile/teams'
    | '/profile/password'
    | '/profile/settings';
}[] = [
  {
    title: '个人信息',
    subtitle: '查看与维护个人资料',
    icon: 'person-outline',
    color: '#9B6BEF',
    route: '/profile/info',
  },
  {
    title: '我的团队',
    subtitle: '查看所属团队与组织',
    icon: 'people-outline',
    color: '#5B9DE8',
    route: '/profile/teams',
  },
  {
    title: '修改密码',
    subtitle: '更新账号登录密码',
    icon: 'lock-closed-outline',
    color: '#E9AA56',
    route: '/profile/password',
  },
  {
    title: '连接与版本',
    subtitle: '服务器地址与应用信息',
    icon: 'settings-outline',
    color: '#36B9A2',
    route: '/profile/settings',
  },
];

export function ProfileScreen() {
  const { user } = useWorkspace();
  const app = useApp();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logout = async () => {
    setBusy(true);
    setError('');
    try {
      await app.logout();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="个人中心" subtitle="专注每一次诊疗" />
      <Content>
        <Card>
          <View style={layout.row}>
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 22,
                backgroundColor: colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="person" size={31} />
            </View>
            <View style={[layout.flex, { gap: 8 }]}>
              <Text style={[layout.title, { fontSize: 23 }]}>
                {user.real_name || user.full_name || user.username}
              </Text>
              <View style={[layout.row, { gap: 8 }]}>
                <Tag
                  text={
                    user.is_system_admin || user.is_superuser
                      ? '系统管理员'
                      : user.title || '医生'
                  }
                />
                <Tag text="已登录" tone="success" />
              </View>
              <Text style={layout.muted}>
                {[user.department, user.position].filter(Boolean).join(' · ') ||
                  user.username}
              </Text>
            </View>
          </View>
        </Card>
        <Card style={{ paddingVertical: 2 }}>
          {menu.map((item, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              key={item.route}
              onPress={() => router.push(item.route)}
              style={[
                layout.row,
                {
                  paddingVertical: 18,
                  borderBottomWidth: index === menu.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={{
                  height: 42,
                  width: 42,
                  backgroundColor: item.color,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={item.icon} color="#FFF" size={21} />
              </View>
              <View style={[layout.flex, { gap: 3 }]}>
                <Text style={layout.body}>{item.title}</Text>
                <Text style={[layout.muted, { fontSize: 11 }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Icon name="chevron-forward" color={colors.faint} size={17} />
            </Pressable>
          ))}
        </Card>
        <Notice>
          手机与 Web 端共享账号及业务数据。首版的手动标注与审核流程请在 Web
          端完成。
        </Notice>
        <Button
          title="退出登录"
          icon="log-out-outline"
          variant="danger"
          onPress={() => setConfirm(true)}
        />
      </Content>
      <ChoiceSheet
        open={confirm}
        title="退出当前账号？"
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <Text style={[layout.body, { marginBottom: 15 }]}>
          退出后将清除本机保存的登录状态。
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
          title="确认退出"
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
