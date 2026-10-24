import { useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { useWorkspace } from '@/application/AppProvider';
import { useResource } from '@/shared/hooks/useResource';
import {
  Card,
  Content,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Notice,
  Screen,
} from '@/shared/ui';
import { colors } from '@/shared/theme';
import { ActivityList } from './ActivityList';

export function ActivityScreen() {
  const { services } = useWorkspace();
  const resource = useResource(
    useCallback(() => services.dashboard.getRecentActivities(), [services])
  );
  return (
    <Screen>
      <Header title="消息通知" subtitle="查看近期业务动态" back />
      <Content
        refreshControl={
          <RefreshControl
            refreshing={resource.loading && !!resource.data}
            onRefresh={() => void resource.reload()}
            tintColor={colors.primary}
          />
        }
      >
        <Notice>这里展示患者、影像和报告的近期动态，暂不包含推送通知。</Notice>
        {resource.loading && !resource.data && <LoadingState />}
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {!!resource.data?.length && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <ActivityList activities={resource.data} />
          </Card>
        )}
        {resource.data?.length === 0 && (
          <EmptyState
            title="暂无消息"
            description="新的业务动态会出现在这里"
            icon="notifications-outline"
          />
        )}
      </Content>
    </Screen>
  );
}
