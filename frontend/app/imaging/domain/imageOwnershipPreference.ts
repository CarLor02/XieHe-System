export type ImageOwnershipPreferenceScope = 'personal' | 'team';
export type ImageOwnershipPreferenceKind = 'upload';

export interface ImageOwnershipPreference {
  version: 1;
  scope: ImageOwnershipPreferenceScope;
  teamIds: number[];
  updatedAt: string;
}

const STORAGE_PREFIX = 'xiehe:image-ownership-preference';

function normalizeUserId(userId: number | null | undefined) {
  return Number.isInteger(userId) && Number(userId) > 0 ? Number(userId) : null;
}

function normalizeTeamIds(teamIds: number[]) {
  return Array.from(
    new Set(
      teamIds
        .map(teamId => Number(teamId))
        .filter(teamId => Number.isInteger(teamId) && teamId > 0)
    )
  ).sort((a, b) => a - b);
}

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

export function getImageOwnershipPreferenceKey(
  userId: number | null | undefined,
  kind: ImageOwnershipPreferenceKind
) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;
  return `${STORAGE_PREFIX}:${normalizedUserId}:${kind}`;
}

export function readImageOwnershipPreference(
  userId: number | null | undefined,
  kind: ImageOwnershipPreferenceKind
): ImageOwnershipPreference | null {
  const key = getImageOwnershipPreferenceKey(userId, kind);
  const storage = getStorage();
  if (!key || !storage) return null;

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<ImageOwnershipPreference>;
    if (parsed.version !== 1) return null;
    if (parsed.scope !== 'personal' && parsed.scope !== 'team') return null;

    const teamIds = Array.isArray(parsed.teamIds)
      ? normalizeTeamIds(parsed.teamIds)
      : [];
    const scope =
      parsed.scope === 'team' && teamIds.length > 0 ? 'team' : 'personal';

    return {
      version: 1,
      scope,
      teamIds: scope === 'team' ? teamIds : [],
      updatedAt:
        typeof parsed.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeImageOwnershipPreference(
  userId: number | null | undefined,
  kind: ImageOwnershipPreferenceKind,
  scope: ImageOwnershipPreferenceScope,
  teamIds: number[]
) {
  const key = getImageOwnershipPreferenceKey(userId, kind);
  const storage = getStorage();
  if (!key || !storage) return;

  const normalizedTeamIds = normalizeTeamIds(teamIds);
  const normalizedScope =
    scope === 'team' && normalizedTeamIds.length > 0 ? 'team' : 'personal';
  const preference: ImageOwnershipPreference = {
    version: 1,
    scope: normalizedScope,
    teamIds: normalizedScope === 'team' ? normalizedTeamIds : [],
    updatedAt: new Date().toISOString(),
  };

  try {
    storage.setItem(key, JSON.stringify(preference));
  } catch {
    // Preference storage is best-effort and must never block upload/edit flows.
  }
}
