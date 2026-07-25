'use client';

import {
  getMyTeams,
  getTeamJoinRequests,
  getTeamMembers,
  type TeamJoinRequestItem,
  type TeamMember,
  type TeamSummary,
} from '@/services/teamService';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

type InitialSelection = 'first' | 'none';
type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseTeamPermissionDataOptions {
  isAuthenticated: boolean;
  currentUserId?: number | string | null;
  initialSelection: InitialSelection;
}

interface TeamsState {
  ownerKey: string | null;
  status: ResourceStatus;
  items: TeamSummary[];
}

interface MembersState {
  teamId: number | null;
  status: ResourceStatus;
  team: TeamSummary | null;
  items: TeamMember[];
}

interface JoinRequestsState {
  teamId: number | null;
  status: ResourceStatus;
  items: TeamJoinRequestItem[];
}

export interface TeamPermissionData {
  myTeams: TeamSummary[];
  selectedTeamId: number | null;
  setSelectedTeamId: Dispatch<SetStateAction<number | null>>;
  selectedTeam: TeamSummary | null;
  currentTeam: TeamSummary | null;
  members: TeamMember[];
  joinRequests: TeamJoinRequestItem[];
  currentMember: TeamMember | null;
  isCurrentUserAdmin: boolean;
  loadingTeams: boolean;
  loadingMembers: boolean;
  loadingJoinRequests: boolean;
  loadError: string | null;
  clearLoadError: () => void;
  refreshTeams: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshJoinRequests: () => Promise<void>;
}

const EMPTY_TEAMS_STATE: TeamsState = {
  ownerKey: null,
  status: 'idle',
  items: [],
};

const EMPTY_MEMBERS_STATE: MembersState = {
  teamId: null,
  status: 'idle',
  team: null,
  items: [],
};

const EMPTY_JOIN_REQUESTS_STATE: JoinRequestsState = {
  teamId: null,
  status: 'idle',
  items: [],
};

/**
 * 编排团队、成员与加入申请的加载链。
 *
 * effect 只负责发起外部请求，状态更新发生在异步结果回调中；展示数据按
 * owner/teamId 派生，因此切换团队时无需在 effect 内同步清空旧状态。
 */
export function useTeamPermissionData({
  isAuthenticated,
  currentUserId,
  initialSelection,
}: UseTeamPermissionDataOptions): TeamPermissionData {
  const ownerKey = isAuthenticated
    ? String(currentUserId ?? 'authenticated-user')
    : null;
  const [teamsState, setTeamsState] =
    useState<TeamsState>(EMPTY_TEAMS_STATE);
  const [membersState, setMembersState] =
    useState<MembersState>(EMPTY_MEMBERS_STATE);
  const [joinRequestsState, setJoinRequestsState] =
    useState<JoinRequestsState>(EMPTY_JOIN_REQUESTS_STATE);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerKey) return;

    let cancelled = false;
    const loadTeams = async () => {
      try {
        const response = await getMyTeams();
        if (cancelled) return;

        const items = response?.items ?? [];
        setTeamsState({ ownerKey, status: 'success', items });
        setLoadError(null);
        if (initialSelection === 'first') {
          setSelectedTeamId(previous => previous ?? items[0]?.id ?? null);
        }
      } catch {
        if (cancelled) return;
        setTeamsState({ ownerKey, status: 'error', items: [] });
        setLoadError('获取团队列表失败，请稍后重试');
      }
    };

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, [initialSelection, ownerKey]);

  const myTeams =
    ownerKey && teamsState.ownerKey === ownerKey ? teamsState.items : [];
  const effectiveSelectedTeamId = isAuthenticated ? selectedTeamId : null;
  const selectedTeam =
    myTeams.find(team => team.id === effectiveSelectedTeamId) ?? null;

  useEffect(() => {
    if (!ownerKey || !effectiveSelectedTeamId) return;

    let cancelled = false;
    const teamId = effectiveSelectedTeamId;
    const loadMembers = async () => {
      try {
        const response = await getTeamMembers(teamId);
        if (cancelled) return;

        setMembersState({
          teamId,
          status: 'success',
          team: response?.team ?? null,
          items: response?.members ?? [],
        });
        setLoadError(null);
      } catch {
        if (cancelled) return;
        setMembersState({
          teamId,
          status: 'error',
          team: null,
          items: [],
        });
        setLoadError('获取成员列表失败，请稍后重试');
      }
    };

    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedTeamId, ownerKey]);

  const members = useMemo(
    () =>
      effectiveSelectedTeamId &&
      membersState.teamId === effectiveSelectedTeamId &&
      membersState.status === 'success'
        ? membersState.items
        : [],
    [
      effectiveSelectedTeamId,
      membersState.items,
      membersState.status,
      membersState.teamId,
    ]
  );
  const currentTeam =
    effectiveSelectedTeamId &&
    membersState.teamId === effectiveSelectedTeamId
      ? membersState.team
      : null;
  const normalizedCurrentUserId =
    currentUserId === null || currentUserId === undefined
      ? null
      : String(currentUserId);
  const currentMember = useMemo(
    () =>
      members.find(
        member => String(member.user_id) === normalizedCurrentUserId
      ) ?? null,
    [members, normalizedCurrentUserId]
  );
  const isCurrentUserAdmin = currentMember?.role === 'ADMIN';
  const shouldLoadJoinRequests =
    Boolean(ownerKey && effectiveSelectedTeamId) &&
    membersState.teamId === effectiveSelectedTeamId &&
    membersState.status === 'success' &&
    members.length > 0 &&
    isCurrentUserAdmin;

  useEffect(() => {
    if (!shouldLoadJoinRequests || !effectiveSelectedTeamId) return;

    let cancelled = false;
    const teamId = effectiveSelectedTeamId;
    const loadJoinRequests = async () => {
      try {
        const response = await getTeamJoinRequests(teamId);
        if (cancelled) return;

        setJoinRequestsState({
          teamId,
          status: 'success',
          items: response.items,
        });
        setLoadError(null);
      } catch {
        if (cancelled) return;
        setJoinRequestsState({ teamId, status: 'error', items: [] });
        setLoadError('获取加入申请列表失败，请稍后重试');
      }
    };

    void loadJoinRequests();
    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedTeamId, shouldLoadJoinRequests]);

  const joinRequests =
    shouldLoadJoinRequests &&
    joinRequestsState.teamId === effectiveSelectedTeamId &&
    joinRequestsState.status === 'success'
      ? joinRequestsState.items
      : [];

  const refreshTeams = useCallback(async () => {
    if (!ownerKey) return;

    setTeamsState(previous => ({
      ownerKey,
      status: 'loading',
      items: previous.ownerKey === ownerKey ? previous.items : [],
    }));
    try {
      const response = await getMyTeams();
      const items = response?.items ?? [];
      setTeamsState({ ownerKey, status: 'success', items });
      setLoadError(null);
      if (initialSelection === 'first') {
        setSelectedTeamId(previous => previous ?? items[0]?.id ?? null);
      }
    } catch {
      setTeamsState({ ownerKey, status: 'error', items: [] });
      setLoadError('获取团队列表失败，请稍后重试');
    }
  }, [initialSelection, ownerKey]);

  const refreshMembers = useCallback(async () => {
    if (!ownerKey || !effectiveSelectedTeamId) return;

    const teamId = effectiveSelectedTeamId;
    setMembersState(previous => ({
      teamId,
      status: 'loading',
      team: previous.teamId === teamId ? previous.team : null,
      items: previous.teamId === teamId ? previous.items : [],
    }));
    try {
      const response = await getTeamMembers(teamId);
      setMembersState({
        teamId,
        status: 'success',
        team: response?.team ?? null,
        items: response?.members ?? [],
      });
      setLoadError(null);
    } catch {
      setMembersState({
        teamId,
        status: 'error',
        team: null,
        items: [],
      });
      setLoadError('获取成员列表失败，请稍后重试');
    }
  }, [effectiveSelectedTeamId, ownerKey]);

  const refreshJoinRequests = useCallback(async () => {
    if (
      !ownerKey ||
      !effectiveSelectedTeamId ||
      !isCurrentUserAdmin
    ) {
      return;
    }

    const teamId = effectiveSelectedTeamId;
    setJoinRequestsState(previous => ({
      teamId,
      status: 'loading',
      items: previous.teamId === teamId ? previous.items : [],
    }));
    try {
      const response = await getTeamJoinRequests(teamId);
      setJoinRequestsState({
        teamId,
        status: 'success',
        items: response.items,
      });
      setLoadError(null);
    } catch {
      setJoinRequestsState({ teamId, status: 'error', items: [] });
      setLoadError('获取加入申请列表失败，请稍后重试');
    }
  }, [effectiveSelectedTeamId, isCurrentUserAdmin, ownerKey]);

  return {
    myTeams,
    selectedTeamId: effectiveSelectedTeamId,
    setSelectedTeamId,
    selectedTeam,
    currentTeam,
    members,
    joinRequests,
    currentMember,
    isCurrentUserAdmin,
    loadingTeams:
      Boolean(ownerKey) &&
      (teamsState.ownerKey !== ownerKey ||
        teamsState.status === 'idle' ||
        teamsState.status === 'loading'),
    loadingMembers:
      Boolean(ownerKey && effectiveSelectedTeamId) &&
      (membersState.teamId !== effectiveSelectedTeamId ||
        membersState.status === 'idle' ||
        membersState.status === 'loading'),
    loadingJoinRequests:
      shouldLoadJoinRequests &&
      (joinRequestsState.teamId !== effectiveSelectedTeamId ||
        joinRequestsState.status === 'idle' ||
        joinRequestsState.status === 'loading'),
    loadError,
    clearLoadError: () => setLoadError(null),
    refreshTeams,
    refreshMembers,
    refreshJoinRequests,
  };
}
