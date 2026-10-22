import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import type { TeamSummary } from '@xiehe/api-contracts/generated';
import { useWorkspace } from '../../../application/AppProvider';
import {
  Button,
  Card,
  ChoiceSheet,
  Content,
  EmptyState,
  ErrorState,
  Field,
  Header,
  IconButton,
  InfoRow,
  LoadingState,
  Notice,
  Screen,
  SearchField,
  Tag,
} from '../../../shared/ui';
import { layout } from '../../../shared/theme';
import { useTeams } from '../application/useTeams';
import { TeamFormSheet } from './TeamFormSheet';

export function TeamsScreen() {
  const { services } = useWorkspace();
  const state = useTeams(services.teams);
  const [tab, setTab] = useState<'mine' | 'search' | 'invites'>('mine');
  const [create, setCreate] = useState(false);
  const [target, setTarget] = useState<TeamSummary | null>(null);
  const [message, setMessage] = useState('');
  const resource =
    tab === 'mine'
      ? state.mine
      : tab === 'invites'
        ? state.invitations
        : state.results;
  const open = (id: number) =>
    router.push({ pathname: '/profile/team', params: { id } });
  return (
    <Screen>
      <Header
        title="组织管理"
        subtitle="团队与成员协作"
        back
        right={
          <IconButton
            name="add"
            label="创建团队"
            light
            onPress={() => setCreate(true)}
          />
        }
      />
      <Content>
        <View style={layout.row}>
          {(
            [
              ['mine', '我的团队'],
              ['search', '加入团队'],
              ['invites', '收到的邀请'],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={layout.flex}>
              <Button
                title={label}
                variant={tab === key ? 'primary' : 'secondary'}
                onPress={() => {
                  setTab(key);
                  state.mutation.clear();
                }}
              />
            </View>
          ))}
        </View>
        {tab === 'search' && (
          <SearchField
            value={state.search}
            onChangeText={state.setSearch}
            placeholder="输入至少 2 个字搜索团队"
          />
        )}
        {resource.loading && <LoadingState />}
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {!!state.mutation.error && (
          <ErrorState message={state.mutation.error} />
        )}
        {!!state.mutation.message && <Notice>{state.mutation.message}</Notice>}
        {tab !== 'invites' &&
          (tab === 'mine'
            ? state.mine.data?.items
            : state.results.data?.results
          )?.map(team => (
            <Card key={team.id}>
              <View style={layout.between}>
                <Text style={layout.heading}>{team.name}</Text>
                <Tag
                  text={
                    team.my_role === 'ADMIN'
                      ? '管理员'
                      : team.is_member
                        ? '成员'
                        : '团队'
                  }
                />
              </View>
              <InfoRow
                label="医院 / 科室"
                value={[team.hospital, team.department]
                  .filter(Boolean)
                  .join(' · ')}
              />
              <InfoRow
                label="成员"
                value={`${team.member_count} / ${team.max_members ?? '不限'}`}
              />
              {!!team.description && (
                <Text style={layout.muted}>{team.description}</Text>
              )}
              {team.is_member ? (
                <Button
                  title="查看成员与团队"
                  variant="secondary"
                  onPress={() => open(team.id)}
                />
              ) : team.join_status?.toUpperCase() === 'PENDING' &&
                team.join_request_id ? (
                <Button
                  title="撤销加入申请"
                  variant="secondary"
                  disabled={state.mutation.busy}
                  onPress={() =>
                    void state.cancel(team.id, team.join_request_id!)
                  }
                />
              ) : (
                <Button
                  title="申请加入"
                  disabled={state.mutation.busy}
                  onPress={() => {
                    setMessage('');
                    setTarget(team);
                  }}
                />
              )}
            </Card>
          ))}
        {tab === 'invites' &&
          state.invitations.data?.items.map(invite => (
            <Card key={invite.id}>
              <Text style={layout.heading}>{invite.team_name}</Text>
              <InfoRow label="邀请人" value={invite.inviter_name} />
              <InfoRow
                label="角色"
                value={invite.role === 'ADMIN' ? '管理员' : '成员'}
              />
              <InfoRow label="有效期" value={invite.expires_at} />
              <Text style={layout.body}>{invite.message}</Text>
              <View style={layout.row}>
                <Button
                  title="接受邀请"
                  disabled={state.mutation.busy}
                  onPress={() => void state.respond(invite.id, true)}
                />
                <Button
                  title="拒绝"
                  variant="secondary"
                  disabled={state.mutation.busy}
                  onPress={() => void state.respond(invite.id, false)}
                />
              </View>
            </Card>
          ))}
        {resource.data?.total === 0 && (
          <EmptyState
            title={
              tab === 'mine'
                ? '尚未加入团队'
                : tab === 'invites'
                  ? '没有待处理的邀请'
                  : '没有匹配的团队'
            }
          />
        )}
      </Content>
      {create && (
        <TeamFormSheet
          gateway={services.teams}
          onClose={() => setCreate(false)}
          onSaved={id => {
            setCreate(false);
            state.refresh();
            open(id);
          }}
        />
      )}
      <ChoiceSheet
        open={!!target}
        title={`申请加入 ${target?.name ?? ''}`}
        onClose={() => {
          if (!state.mutation.busy) setTarget(null);
        }}
      >
        <Field
          label="申请说明"
          multiline
          value={message}
          onChangeText={setMessage}
          maxLength={1000}
          editable={!state.mutation.busy}
        />
        {!!state.mutation.error && (
          <ErrorState message={state.mutation.error} />
        )}
        <Button
          title="提交申请"
          loading={state.mutation.busy}
          onPress={() => {
            if (target)
              void state.apply(target.id, message).then(ok => {
                if (ok) setTarget(null);
              });
          }}
        />
      </ChoiceSheet>
    </Screen>
  );
}
