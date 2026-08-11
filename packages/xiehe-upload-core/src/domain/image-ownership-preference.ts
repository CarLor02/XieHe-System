export type ImageOwnershipPreferenceScope = 'personal' | 'team';
export type ImageOwnershipPreferenceKind = 'upload';

export interface ImageOwnershipPreference {
  version: 1;
  scope: ImageOwnershipPreferenceScope;
  teamIds: number[];
  updatedAt: string;
}

const STORAGE_PREFIX = 'xiehe:image-ownership-preference';

export function normalizeTeamIds(teamIds: readonly number[]): number[] {
  return Array.from(
    new Set(
      teamIds
        .map(teamId => Number(teamId))
        .filter(teamId => Number.isInteger(teamId) && teamId > 0)
    )
  ).sort((left, right) => left - right);
}

export function getImageOwnershipPreferenceKey(
  userId: number | null | undefined,
  kind: ImageOwnershipPreferenceKind
): string | null {
  const normalizedUserId =
    Number.isInteger(userId) && Number(userId) > 0 ? Number(userId) : null;
  return normalizedUserId
    ? `${STORAGE_PREFIX}:${normalizedUserId}:${kind}`
    : null;
}

export function createImageOwnershipPreference(input: {
  scope: ImageOwnershipPreferenceScope;
  teamIds: readonly number[];
  updatedAt: string;
}): ImageOwnershipPreference {
  const teamIds = normalizeTeamIds(input.teamIds);
  const scope =
    input.scope === 'team' && teamIds.length > 0 ? 'team' : 'personal';
  return {
    version: 1,
    scope,
    teamIds: scope === 'team' ? teamIds : [],
    updatedAt: input.updatedAt,
  };
}

export function decodeImageOwnershipPreference(
  rawValue: string | null | undefined
): ImageOwnershipPreference | null {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue) as Partial<ImageOwnershipPreference>;
    if (parsed.version !== 1) return null;
    if (parsed.scope !== 'personal' && parsed.scope !== 'team') return null;
    return createImageOwnershipPreference({
      scope: parsed.scope,
      teamIds: Array.isArray(parsed.teamIds) ? parsed.teamIds : [],
      updatedAt:
        typeof parsed.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date(0).toISOString(),
    });
  } catch {
    return null;
  }
}
