import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useWorkspace } from '../../../application/AppProvider';
import { useResource } from '../../../shared/hooks/useResource';
import {
  Card,
  Content,
  EmptyState,
  ErrorState,
  Header,
  Icon,
  InfoRow,
  LoadingState,
  Screen,
  Tag,
} from '../../../shared/ui';
import { layout } from '../../../shared/theme';

export function TeamsScreen() {
  const { services } = useWorkspace();
  const load = useCallback(() => services.teams.listMine(), [services]);
  const resource = useResource(load);
  return (
    <Screen>
      <Header title="我的团队" subtitle="查看当前账号所属的团队" back />
      <Content>
        {resource.loading && !resource.data && <LoadingState />}
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {resource.data?.items.map(team => (
          <Card key={team.id}>
            <View style={[layout.row, { marginBottom: 12 }]}>
              <Icon name="people-outline" />
              <Text style={[layout.heading, layout.flex]}>{team.name}</Text>
              <Tag text={team.my_role === 'ADMIN' ? '管理员' : '成员'} />
            </View>
            <InfoRow label="医院" value={team.hospital} />
            <InfoRow label="科室" value={team.department} />
            <InfoRow label="成员数" value={team.member_count} />
            {!!team.description && (
              <Text style={layout.muted}>{team.description}</Text>
            )}
          </Card>
        ))}
        {resource.data?.total === 0 && (
          <EmptyState
            title="尚未加入团队"
            description="可在 Web 端加入或创建团队"
            icon="people-outline"
          />
        )}
      </Content>
    </Screen>
  );
}
