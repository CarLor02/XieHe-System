import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import type { TeamMember } from '@xiehe/api-contracts/generated';
import { canEditTeamMember, canRemoveTeamMember } from '@xiehe/access-core';
import { useWorkspace } from '@/application/AppProvider';
import { useMutation } from '@/shared/hooks/useMutation';
import {
  Button,
  Card,
  Choice,
  ChoiceSheet,
  Content,
  EmptyState,
  ErrorState,
  Field,
  Header,
  InfoRow,
  LoadingState,
  Notice,
  Screen,
  SearchField,
  Tag,
} from '@/shared/ui';
import { layout } from '@/shared/theme';
import { useTeamDetail } from '@/features/teams/application/useTeams';
import type { TeamsGateway } from '@/features/teams/application/ports';
import { TeamFormSheet } from './TeamFormSheet';

export function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services, user } = useWorkspace();
  const state = useTeamDetail(services.teams, Number(id), user);
  const [tab, setTab] = useState<'members' | 'requests'>('members');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState<'edit' | 'invite' | null>(null);
  const [memberAction, setMemberAction] = useState<{
    member: TeamMember;
    action: 'remove' | 'role';
  } | null>(null);
  const data = state.data;
  return (
    <Screen>
      <Header title={data?.team.name || '团队详情'} subtitle="组织管理" back />
      <Content>
        {state.loading && <LoadingState />}
        {!!state.error && (
          <ErrorState
            message={state.error}
            onRetry={() => void state.reload()}
          />
        )}
        {!!state.mutation.error && (
          <ErrorState message={state.mutation.error} />
        )}
        {!!state.mutation.message && <Notice>{state.mutation.message}</Notice>}
        {data && (
          <>
            <Card>
              <InfoRow label="医院" value={data.team.hospital} />
              <InfoRow label="科室" value={data.team.department} />
              <InfoRow label="成员" value={data.team.member_count} />
              <InfoRow label="团队说明" value={data.team.description} />
              {data.canManage && (
                <View style={layout.row}>
                  <Button
                    title="编辑团队"
                    variant="secondary"
                    onPress={() => setSheet('edit')}
                  />
                  <Button
                    title="邀请成员"
                    icon="person-add-outline"
                    onPress={() => setSheet('invite')}
                  />
                </View>
              )}
            </Card>
            <View style={layout.row}>
              <Button
                title={`成员列表 ${data.members.members.length}`}
                variant={tab === 'members' ? 'primary' : 'secondary'}
                onPress={() => setTab('members')}
              />
              {data.canManage && (
                <Button
                  title={`加入申请 ${data.requests?.pending_count ?? 0}`}
                  variant={tab === 'requests' ? 'primary' : 'secondary'}
                  onPress={() => setTab('requests')}
                />
              )}
            </View>
            {tab === 'members' && (
              <>
                <SearchField
                  value={search}
                  onChangeText={setSearch}
                  placeholder="搜索姓名或邮箱"
                />
                {data.members.members
                  .filter(member =>
                    [member.real_name, member.username, member.email].some(
                      value =>
                        value?.toLowerCase().includes(search.toLowerCase())
                    )
                  )
                  .map(member => {
                    const permissions = {
                      actorIsTeamAdmin: data.canManage,
                      member: {
                        role: member.role,
                        isCreator: member.is_creator,
                        isSystemAdmin: member.is_system_admin,
                        systemAdminLevel: member.system_admin_level,
                      },
                    };
                    return (
                      <Card key={member.user_id}>
                        <View style={layout.between}>
                          <Text style={layout.heading}>
                            {member.real_name || member.username}
                            {member.user_id === user.id ? '（我）' : ''}
                          </Text>
                          <Tag
                            text={member.role === 'ADMIN' ? '管理员' : '成员'}
                          />
                        </View>
                        <InfoRow label="邮箱" value={member.email} />
                        <InfoRow label="科室" value={member.department} />
                        {data.canManage && (
                          <View style={layout.row}>
                            {canEditTeamMember(permissions) && (
                              <Button
                                title={
                                  member.role === 'ADMIN'
                                    ? '设为成员'
                                    : '设为管理员'
                                }
                                variant="secondary"
                                disabled={state.mutation.busy}
                                onPress={() =>
                                  setMemberAction({ member, action: 'role' })
                                }
                              />
                            )}
                            {canRemoveTeamMember(permissions) && (
                              <Button
                                title="移除"
                                variant="danger"
                                disabled={state.mutation.busy}
                                onPress={() =>
                                  setMemberAction({ member, action: 'remove' })
                                }
                              />
                            )}
                          </View>
                        )}
                      </Card>
                    );
                  })}
              </>
            )}
            {tab === 'requests' && (
              <>
                {data.requests?.items.map(request => (
                  <Card key={request.id}>
                    <Text style={layout.heading}>
                      {request.applicant_real_name ||
                        request.applicant_username}
                    </Text>
                    <InfoRow label="邮箱" value={request.applicant_email} />
                    <Text style={layout.body}>{request.message}</Text>
                    <View style={layout.row}>
                      <Button
                        title="批准加入"
                        disabled={state.mutation.busy}
                        onPress={() => void state.review(request.id, 'approve')}
                      />
                      <Button
                        title="拒绝申请"
                        variant="secondary"
                        disabled={state.mutation.busy}
                        onPress={() => void state.review(request.id, 'reject')}
                      />
                    </View>
                  </Card>
                ))}
                {data.requests?.total === 0 && (
                  <EmptyState title="没有待处理申请" />
                )}
              </>
            )}
          </>
        )}
      </Content>
      {sheet === 'edit' && data && (
        <TeamFormSheet
          gateway={services.teams}
          team={data.team}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            state.refresh();
          }}
        />
      )}
      {sheet === 'invite' && (
        <InviteSheet
          gateway={services.teams}
          teamId={Number(id)}
          onClose={() => setSheet(null)}
        />
      )}
      <ChoiceSheet
        open={!!memberAction}
        title={
          memberAction?.action === 'remove' ? '移除成员？' : '变更成员角色？'
        }
        dismissible={!state.mutation.busy}
        onClose={() => {
          if (!state.mutation.busy) setMemberAction(null);
        }}
      >
        <Text style={layout.body}>
          请确认对{' '}
          {memberAction?.member.real_name || memberAction?.member.username}{' '}
          的操作。
        </Text>
        {!!state.mutation.error && (
          <ErrorState message={state.mutation.error} />
        )}
        <Button
          title="确认操作"
          loading={state.mutation.busy}
          onPress={() => {
            if (!memberAction) return;
            const { member, action } = memberAction;
            void (
              action === 'remove'
                ? state.remove(member.user_id)
                : state.role(
                    member.user_id,
                    member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
                  )
            ).then(ok => {
              if (ok) setMemberAction(null);
            });
          }}
        />
      </ChoiceSheet>
    </Screen>
  );
}
function InviteSheet({
  gateway,
  teamId,
  onClose,
}: {
  gateway: TeamsGateway;
  teamId: number;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [message, setMessage] = useState('');
  const mutation = useMutation();
  return (
    <ChoiceSheet
      open
      title="邀请成员"
      dismissible={!mutation.busy}
      onClose={() => {
        if (!mutation.busy) onClose();
      }}
    >
      <Field
        label="邮箱"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        editable={!mutation.busy}
      />
      <Field
        label="邀请说明"
        value={message}
        onChangeText={setMessage}
        editable={!mutation.busy}
        maxLength={1000}
      />
      {(['MEMBER', 'ADMIN'] as const).map(value => (
        <Choice
          key={value}
          title={value === 'ADMIN' ? '管理员' : '成员'}
          selected={role === value}
          onPress={() => {
            if (!mutation.busy) setRole(value);
          }}
        />
      ))}
      {!!mutation.error && <ErrorState message={mutation.error} />}
      {!!mutation.message && <Notice>{mutation.message}</Notice>}
      <Button
        title="发送邀请"
        loading={mutation.busy}
        onPress={() =>
          void mutation.run(
            async () => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                throw new Error('请输入有效邮箱');
              return gateway.invite(teamId, email.trim(), role, message);
            },
            () => {
              setEmail('');
              setMessage('');
            },
            '邀请已发送'
          )
        }
      />
    </ChoiceSheet>
  );
}
