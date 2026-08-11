import {
  createImageOwnershipPreference,
  decodeImageOwnershipPreference,
  getImageOwnershipPreferenceKey,
  type ImageOwnershipPreference,
  type ImageOwnershipPreferenceKind,
  type ImageOwnershipPreferenceScope,
} from '@xiehe/upload-core';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

export function readImageOwnershipPreference(
  userId: number | null | undefined,
  kind: ImageOwnershipPreferenceKind
): ImageOwnershipPreference | null {
  const key = getImageOwnershipPreferenceKey(userId, kind);
  const storage = getStorage();
  if (!key || !storage) return null;

  try {
    return decodeImageOwnershipPreference(storage.getItem(key));
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

  const preference = createImageOwnershipPreference({
    scope,
    teamIds,
    updatedAt: new Date().toISOString(),
  });

  try {
    storage.setItem(key, JSON.stringify(preference));
  } catch {
    // Preference storage is best-effort and must never block upload/edit flows.
  }
}
