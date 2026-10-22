import { useCallback, useState } from 'react';
import { useResource } from '../../../shared/hooks/useResource';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { useMutation } from '../../../shared/hooks/useMutation';
import { canManageTeam } from '@xiehe/access-core';
import type { AccessUser } from '@xiehe/access-core';
import type { TeamsGateway } from './ports';

export function useTeams(gateway: TeamsGateway) {
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search);
  const mine = useResource(useCallback(() => gateway.listMine(), [gateway]));
  const invitations = useResource(
    useCallback(() => gateway.listInvitations(), [gateway])
  );
  const results = useResource(
    useCallback(
      () =>
        query.trim().length >= 2
          ? gateway.search(query.trim())
          : Promise.resolve({ results: [], total: 0 }),
      [gateway, query]
    )
  );
  const mutation = useMutation();
  const refresh = () => {
    void mine.reload();
    void invitations.reload();
    void results.reload();
  };
  return {
    mine,
    invitations,
    results,
    search,
    setSearch,
    mutation,
    refresh,
    apply: (id: number, message: string) =>
      mutation.run(() => gateway.apply(id, message), refresh, '申请已提交'),
    cancel: (teamId: number, requestId: number) =>
      mutation.run(
        () => gateway.cancelJoinRequest(teamId, requestId),
        refresh,
        '申请已撤销'
      ),
    respond: (id: number, accept: boolean) =>
      mutation.run(
        () => gateway.respondToInvitation(id, accept),
        refresh,
        accept ? '已加入团队' : '已拒绝邀请'
      ),
  };
}
export function useTeamDetail(
  gateway: TeamsGateway,
  teamId: number,
  user: AccessUser
) {
  const resource = useResource(
    useCallback(async () => {
      const team = (await gateway.listMine()).items.find(
        item => item.id === teamId
      );
      if (!team) throw new Error('未找到可访问的团队');
      const canManage = canManageTeam(user, team);
      const [members, requests] = await Promise.all([
        gateway.getMembers(teamId),
        canManage
          ? gateway.getJoinRequests(teamId, 'pending')
          : Promise.resolve(null),
      ]);
      return { team, canManage, members, requests };
    }, [gateway, teamId, user])
  );
  const mutation = useMutation();
  const refresh = () => {
    void resource.reload();
  };
  return {
    ...resource,
    mutation,
    refresh,
    review: (requestId: number, decision: 'approve' | 'reject') =>
      mutation.run(
        () => gateway.reviewJoinRequest(teamId, requestId, decision),
        refresh,
        '申请已处理'
      ),
    role: (userId: number, role: 'ADMIN' | 'MEMBER') =>
      mutation.run(
        () => gateway.updateMemberRole(teamId, userId, role),
        refresh,
        '成员角色已更新'
      ),
    remove: (userId: number) =>
      mutation.run(
        () => gateway.removeMember(teamId, userId),
        refresh,
        '成员已移除'
      ),
  };
}
